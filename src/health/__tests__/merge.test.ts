import type { WeighIn } from '@/engine';

import { importedId, isEmptyPlan, planHealthSync } from '../merge';
import type { HealthBatch, HealthSample } from '../types';

const sample = (externalId: string, weightKg = 80, extra: Partial<HealthSample> = {}): HealthSample => ({
  externalId,
  timestamp: '2026-11-10T07:00:00+01:00',
  weightKg,
  ...extra,
});

const batch = (samples: HealthSample[], extra: Partial<HealthBatch> = {}): HealthBatch => ({
  full: false,
  samples,
  deletedIds: [],
  token: 't',
  ...extra,
});

const imported = (externalId: string, weightKg = 80, extra: Partial<WeighIn> = {}): WeighIn => ({
  id: importedId('apple_health', externalId),
  timestamp: '2026-11-10T07:00:00+01:00',
  weightKg,
  source: 'apple_health',
  externalId,
  excluded: false,
  ...extra,
});

const manual = (id: string, externalId?: string): WeighIn => ({
  id,
  timestamp: '2026-11-10T07:00:00+01:00',
  weightKg: 81,
  source: 'manual',
  excluded: false,
  ...(externalId && { externalId }),
});

describe('planHealthSync', () => {
  it('imports new samples with the Health source, external id and origin app', () => {
    const plan = planHealthSync([], 'apple_health', batch([sample('a', 80.4, { originApp: 'Withings' })]));
    expect(plan.inserts).toEqual([
      {
        id: 'apple_health:a',
        timestamp: '2026-11-10T07:00:00+01:00',
        weightKg: 80.4,
        source: 'apple_health',
        externalId: 'a',
        originApp: 'Withings',
        excluded: false,
      },
    ]);
  });

  it('never imports a sample twice', () => {
    const plan = planHealthSync([imported('a')], 'apple_health', batch([sample('a'), sample('b'), sample('b')]));
    expect(plan.inserts.map((w) => w.externalId)).toEqual(['b']);
    expect(plan.updates).toEqual([]);
  });

  it('skips samples the app wrote back itself', () => {
    const plan = planHealthSync([manual('m1', 'hk-m1')], 'apple_health', batch([sample('hk-m1', 81)]));
    expect(isEmptyPlan(plan)).toBe(true);
  });

  it('updates a changed sample but keeps the note and excluded flag', () => {
    const local = imported('a', 80, { note: 'after travel', excluded: true, originApp: 'Withings' });
    const plan = planHealthSync([local], 'apple_health', batch([sample('a', 79.6)]));
    expect(plan.updates).toEqual([
      {
        id: 'apple_health:a',
        timestamp: '2026-11-10T07:00:00+01:00',
        weightKg: 79.6,
        source: 'apple_health',
        externalId: 'a',
        note: 'after travel',
        excluded: true,
      },
    ]);
  });

  it('deletes imported weigh-ins deleted in Health and unlinks written-back manual ones', () => {
    const plan = planHealthSync(
      [imported('a'), manual('m1', 'hk-m1'), manual('m2')],
      'apple_health',
      batch([], { deletedIds: ['a', 'hk-m1', 'unknown'] }),
    );
    expect(plan.deletes).toEqual(['apple_health:a']);
    expect(plan.unlinks).toEqual(['m1']);
    expect(plan.inserts).toEqual([]);
  });

  it('lets a deletion win over an upsert of the same sample', () => {
    const plan = planHealthSync([], 'apple_health', batch([sample('a')], { deletedIds: ['a'] }));
    expect(isEmptyPlan(plan)).toBe(true);
  });

  it('treats a full read as a snapshot', () => {
    const plan = planHealthSync(
      [imported('a'), imported('gone'), manual('m1', 'hk-gone')],
      'apple_health',
      batch([sample('a'), sample('new')], { full: true }),
    );
    expect(plan.deletes).toEqual(['apple_health:gone']);
    expect(plan.unlinks).toEqual(['m1']);
    expect(plan.inserts.map((w) => w.externalId)).toEqual(['new']);
  });

  it('keeps imported data when a full read comes back empty (iOS hides a denied read)', () => {
    const plan = planHealthSync([imported('a'), manual('m1', 'hk-m1')], 'apple_health', batch([], { full: true }));
    expect(isEmptyPlan(plan)).toBe(true);
  });

  it('ignores weigh-ins from the other platform', () => {
    const other: WeighIn = { ...imported('a'), id: 'health_connect:a', source: 'health_connect' };
    const plan = planHealthSync([other], 'apple_health', batch([], { full: true, samples: [sample('b')] }));
    expect(plan.deletes).toEqual([]);
    expect(plan.inserts.map((w) => w.externalId)).toEqual(['b']);
  });
});
