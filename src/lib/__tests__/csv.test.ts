import type { WeighIn } from '@/engine';

import { weighInsCsv } from '../csv';

const w = (timestamp: string, weightKg: number, extra: Partial<WeighIn> = {}): WeighIn => ({
  id: timestamp,
  timestamp,
  weightKg,
  source: 'manual',
  excluded: false,
  ...extra,
});

describe('weighInsCsv', () => {
  it('lists weigh-ins oldest first and quotes notes that need it', () => {
    const csv = weighInsCsv([
      w('2026-11-02T07:00:00+05:30', 81.4, { note: 'after "cheat" day, oops', excluded: true }),
      w('2026-11-01T07:00:00+05:30', 82),
    ]);
    expect(csv.split('\n')).toEqual([
      'date,timestamp,weight_kg,source,excluded,note',
      '2026-11-01,2026-11-01T07:00:00+05:30,82.00,manual,no,',
      '2026-11-02,2026-11-02T07:00:00+05:30,81.40,manual,yes,"after ""cheat"" day, oops"',
      '',
    ]);
  });
});
