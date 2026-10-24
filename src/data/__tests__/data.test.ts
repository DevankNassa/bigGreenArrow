import type { WeighIn } from '@/engine';

import { migrate, type Db } from '../db';
import { DEFAULT_PREFERENCES, getPreferences, setPreference } from '../preferences';
import {
  deleteWeighIn,
  insertWeighIn,
  listWeighIns,
  newManualWeighIn,
  updateWeighIn,
} from '../weigh-ins';
import { openTestDb } from '../__fixtures__/test-db';

jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: () => `uuid-${++n}` };
});

let db: Db;
beforeEach(async () => {
  db = openTestDb();
  await migrate(db);
});

const manual = (timestamp: string, weightKg: number, note?: string) =>
  newManualWeighIn({ timestamp, weightKg, note });

describe('migrate', () => {
  it('sets the schema version and is safe to run again', async () => {
    await migrate(db);
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(1);
  });
});

describe('weigh-ins', () => {
  it('round-trips every field', async () => {
    const full: WeighIn = {
      id: 'hk-1',
      timestamp: '2026-10-21T07:00:00+02:00',
      weightKg: 82.4,
      source: 'apple_health',
      externalId: 'ABC-123',
      originApp: 'Withings',
      note: 'after travel',
      excluded: true,
    };
    await insertWeighIn(db, full);
    expect(await listWeighIns(db)).toEqual([full]);
  });

  it('omits optional fields that are not set', async () => {
    await insertWeighIn(db, manual('2026-10-21T07:00:00+02:00', 82.4));
    const [w] = await listWeighIns(db);
    expect(Object.keys(w).sort()).toEqual(['excluded', 'id', 'source', 'timestamp', 'weightKg']);
  });

  it('lists oldest first', async () => {
    await insertWeighIn(db, manual('2026-10-21T07:00:00+02:00', 82));
    await insertWeighIn(db, manual('2026-10-19T07:00:00+02:00', 83));
    expect((await listWeighIns(db)).map((w) => w.weightKg)).toEqual([83, 82]);
  });

  it('updates and deletes', async () => {
    const w = manual('2026-10-21T07:00:00+02:00', 82.4);
    await insertWeighIn(db, w);
    await updateWeighIn(db, { ...w, weightKg: 82.1, note: 'fixed typo', excluded: true });
    expect(await listWeighIns(db)).toEqual([{ ...w, weightKg: 82.1, note: 'fixed typo', excluded: true }]);

    await deleteWeighIn(db, w.id);
    expect(await listWeighIns(db)).toEqual([]);
  });

  it('refuses the same Health sample twice', async () => {
    const sample: WeighIn = {
      id: 'a',
      timestamp: '2026-10-21T07:00:00+02:00',
      weightKg: 82.4,
      source: 'health_connect',
      externalId: 'hc-1',
      excluded: false,
    };
    await insertWeighIn(db, sample);
    await expect(insertWeighIn(db, { ...sample, id: 'b' })).rejects.toThrow();
  });

  it('trims notes and drops blank ones', () => {
    expect(manual('2026-10-21T07:00:00+02:00', 82, '  ate late  ').note).toBe('ate late');
    expect(manual('2026-10-21T07:00:00+02:00', 82, '   ')).not.toHaveProperty('note');
  });
});

describe('preferences', () => {
  it('falls back to defaults', async () => {
    expect(await getPreferences(db)).toEqual(DEFAULT_PREFERENCES);
  });

  it('stores and overwrites individual keys', async () => {
    await setPreference(db, 'unit', 'lb');
    await setPreference(db, 'unit', 'kg');
    const goal = { ...DEFAULT_PREFERENCES.goal, type: 'gain' as const, targetKg: 75 };
    await setPreference(db, 'goal', goal);

    const prefs = await getPreferences(db);
    expect(prefs.unit).toBe('kg');
    expect(prefs.goal).toEqual(goal);
    expect(prefs.trend).toEqual(DEFAULT_PREFERENCES.trend);
  });
});
