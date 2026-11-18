import { migrate, type Db } from '@/data/db';
import { getPreferences, setPreference } from '@/data/preferences';
import { insertWeighIn, listWeighIns, newManualWeighIn } from '@/data/weigh-ins';
import { openTestDb } from '@/data/__fixtures__/test-db';

import { pullFromHealth, pushToHealth, removeFromHealth, serialize } from '../sync';
import { HealthPermissionError, type HealthAdapter, type HealthBatch, type HealthSample } from '../types';

jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: () => `uuid-${++n}` };
});

const sample = (externalId: string, weightKg: number, day = 10): HealthSample => ({
  externalId,
  timestamp: `2026-11-${day}T07:00:00+01:00`,
  weightKg,
});

/** A health store held in memory. `reads` answers each read in turn. */
function fakeAdapter(reads: (HealthBatch | Error)[] = [], canWrite = true) {
  const written: { timestamp: string; weightKg: number }[] = [];
  const removed: string[] = [];
  const tokens: (string | undefined)[] = [];
  const adapter: HealthAdapter = {
    source: 'apple_health',
    name: 'Apple Health',
    isAvailable: async () => true,
    requestAccess: async () => true,
    canWrite: async () => canWrite,
    async read(token) {
      tokens.push(token);
      const next = reads.shift();
      if (!next) throw new Error('unexpected read');
      if (next instanceof Error) throw next;
      return next;
    },
    async write(timestamp, weightKg) {
      written.push({ timestamp, weightKg });
      return `hk-${written.length}`;
    },
    async remove(ids) {
      removed.push(...ids);
    },
    openSettings: () => undefined,
  };
  return { adapter, written, removed, tokens };
}

let db: Db;
beforeEach(async () => {
  db = openTestDb();
  await migrate(db);
  await setPreference(db, 'health', { read: true, writeBack: true });
});

describe('pullFromHealth', () => {
  it('imports the full history first, then only changes since the saved token', async () => {
    const { adapter, tokens } = fakeAdapter([
      { full: true, samples: [sample('a', 80), sample('b', 79.8, 11)], deletedIds: [], token: 'anchor-1' },
      { full: false, samples: [sample('c', 79.5, 12)], deletedIds: ['a'], token: 'anchor-2' },
    ]);

    expect(await pullFromHealth(db, adapter)).toBe(2);
    expect(await pullFromHealth(db, adapter)).toBe(1);

    expect(tokens).toEqual([undefined, 'anchor-1']);
    expect((await listWeighIns(db)).map((w) => [w.source, w.externalId, w.weightKg])).toEqual([
      ['apple_health', 'b', 79.8],
      ['apple_health', 'c', 79.5],
    ]);
    const { health } = await getPreferences(db);
    expect(health.syncToken).toBe('anchor-2');
    expect(health.lastSyncAt).toBeDefined();
  });

  it('re-reads everything when asked for a full sync', async () => {
    await setPreference(db, 'health', { read: true, writeBack: true, syncToken: 'old' });
    const { adapter, tokens } = fakeAdapter([{ full: true, samples: [], deletedIds: [], token: 'new' }]);
    await pullFromHealth(db, adapter, true);
    expect(tokens).toEqual([undefined]);
  });

  it('does nothing while reading is off', async () => {
    await setPreference(db, 'health', { read: false, writeBack: true });
    const { adapter, tokens } = fakeAdapter();
    expect(await pullFromHealth(db, adapter)).toBe(0);
    expect(tokens).toEqual([]);
  });

  it('switches reading off but keeps imported data when permission is gone', async () => {
    const { adapter } = fakeAdapter([
      { full: true, samples: [sample('a', 80)], deletedIds: [], token: 't1' },
      new HealthPermissionError(),
    ]);
    await pullFromHealth(db, adapter);
    await expect(pullFromHealth(db, adapter)).rejects.toBeInstanceOf(HealthPermissionError);

    expect((await getPreferences(db)).health.read).toBe(false);
    expect(await listWeighIns(db)).toHaveLength(1);
  });

  it('leaves the database and token untouched when a read fails', async () => {
    const { adapter } = fakeAdapter([new Error('HealthKit is busy')]);
    await expect(pullFromHealth(db, adapter)).rejects.toThrow('HealthKit is busy');
    expect(await listWeighIns(db)).toEqual([]);
    expect((await getPreferences(db)).health).toEqual({ read: true, writeBack: true });
  });
});

describe('write-back', () => {
  it('links a manual weigh-in to its sample, so the next sync skips it', async () => {
    const w = newManualWeighIn({ timestamp: '2026-11-12T07:00:00+01:00', weightKg: 79.4 });
    await insertWeighIn(db, w);
    const { adapter, written } = fakeAdapter([
      { full: false, samples: [sample('hk-1', 79.4, 12)], deletedIds: [], token: 't' },
    ]);

    expect(await pushToHealth(db, adapter, w)).toBe('hk-1');
    expect(written).toEqual([{ timestamp: w.timestamp, weightKg: 79.4 }]);
    expect(await pullFromHealth(db, adapter)).toBe(0);

    const all = await listWeighIns(db);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ source: 'manual', externalId: 'hk-1' });
  });

  it('skips writing without permission, and never writes imported weigh-ins', async () => {
    const w = newManualWeighIn({ timestamp: '2026-11-12T07:00:00+01:00', weightKg: 79.4 });
    const denied = fakeAdapter([], false);
    expect(await pushToHealth(db, denied.adapter, w)).toBeUndefined();

    const allowed = fakeAdapter();
    const fromHealth = { ...w, source: 'apple_health' as const, externalId: 'x' };
    expect(await pushToHealth(db, allowed.adapter, fromHealth)).toBeUndefined();
    expect([...denied.written, ...allowed.written]).toEqual([]);
  });

  it('removes a written-back sample and unlinks the weigh-in', async () => {
    const w = { ...newManualWeighIn({ timestamp: '2026-11-12T07:00:00+01:00', weightKg: 79.4 }), externalId: 'hk-9' };
    await insertWeighIn(db, w);
    const { adapter, removed } = fakeAdapter();
    await removeFromHealth(db, adapter, w);
    expect(removed).toEqual(['hk-9']);
    expect((await listWeighIns(db))[0].externalId).toBeUndefined();
  });
});

describe('serialize', () => {
  it('runs jobs one at a time, in order, even after a failure', async () => {
    const order: string[] = [];
    let release!: () => void;
    const first = serialize(
      () =>
        new Promise<void>((resolve) => {
          order.push('first start');
          release = () => {
            order.push('first end');
            resolve();
          };
        }),
    );
    const failing = serialize(async () => {
      order.push('second');
      throw new Error('boom');
    });
    const third = serialize(async () => {
      order.push('third');
    });

    await Promise.resolve();
    release();
    await first;
    await expect(failing).rejects.toThrow('boom');
    await third;
    expect(order).toEqual(['first start', 'first end', 'second', 'third']);
  });
});
