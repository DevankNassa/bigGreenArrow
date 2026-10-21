import { DEFAULT_TREND_SETTINGS, analyze, type WeighIn } from '@/engine';
import { loseGoal } from '@/engine/__fixtures__/weigh-ins';

import { historyRows, isEditable } from '../history';

const w = (id: string, timestamp: string, weightKg: number, extra: Partial<WeighIn> = {}): WeighIn => ({
  id,
  timestamp,
  weightKg,
  source: 'manual',
  excluded: false,
  ...extra,
});

const weighIns = [
  w('mon', '2026-10-19T07:00:00+02:00', 83.0),
  w('tue', '2026-10-20T07:00:00+02:00', 82.0),
  w('tue-pm', '2026-10-20T21:00:00+02:00', 83.5),
  w('wed', '2026-10-21T07:00:00+02:00', 90.0, { excluded: true }),
];
const { series } = analyze(weighIns, loseGoal, DEFAULT_TREND_SETTINGS, '2026-10-21');

describe('historyRows', () => {
  const rows = historyRows(weighIns, series);

  it('lists every weigh-in, newest first', () => {
    expect(rows.map((r) => r.weighIn.id)).toEqual(['wed', 'tue-pm', 'tue', 'mon']);
  });

  it("pairs each weigh-in with its day's trend", () => {
    const tue = rows.find((r) => r.weighIn.id === 'tue')!;
    const tuePm = rows.find((r) => r.weighIn.id === 'tue-pm')!;
    expect(tue.trendKg).toBeCloseTo(82.9, 10); // 83 + 0.1 × (82 − 83), first of the day
    expect(tuePm.trendKg).toBe(tue.trendKg);
    expect(tuePm.diffKg).toBeCloseTo(0.6, 10);
  });

  it('shows no trend for excluded weigh-ins', () => {
    const wed = rows.find((r) => r.weighIn.id === 'wed')!;
    expect(wed).toMatchObject({ date: '2026-10-21', trendKg: null, diffKg: null });
  });
});

describe('isEditable', () => {
  it('allows editing manual and imported entries, not Health samples', () => {
    expect(isEditable(w('a', '2026-10-21T07:00:00Z', 80))).toBe(true);
    expect(isEditable(w('b', '2026-10-21T07:00:00Z', 80, { source: 'import' }))).toBe(true);
    expect(isEditable(w('c', '2026-10-21T07:00:00Z', 80, { source: 'apple_health' }))).toBe(false);
    expect(isEditable(w('d', '2026-10-21T07:00:00Z', 80, { source: 'health_connect' }))).toBe(false);
  });
});
