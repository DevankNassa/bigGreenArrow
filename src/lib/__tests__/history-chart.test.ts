import type { AnalyzedPoint } from '@/engine';

import { gridValues, pointsInRange, weekStart, weeklyReadings } from '../history-chart';

const goal = { type: 'lose', optimalMinPct: 0.5, optimalMaxPct: 1, flatBandPct: 0.15, targetBandPct: 2 } as const;

function point(date: string, pct: number | null): AnalyzedPoint {
  return {
    date,
    day: 0,
    weightKg: 80,
    trendKg: 80,
    rate: pct === null ? null : { kgPerWeek: 0, pctPerWeek: pct, points: 5 },
    state: pct === null ? null : pct <= -0.5 ? 'optimal' : 'slow_right',
  };
}

describe('weekStart', () => {
  it('goes back to Monday', () => {
    expect(weekStart('2026-11-10')).toBe('2026-11-09'); // Tuesday
    expect(weekStart('2026-11-09')).toBe('2026-11-09'); // Monday
    expect(weekStart('2026-11-15')).toBe('2026-11-09'); // Sunday
  });
});

describe('pointsInRange', () => {
  it('keeps the last n days up to today', () => {
    const pts = ['2026-10-01', '2026-10-11', '2026-10-12', '2026-11-10', '2026-11-11'].map((d) => ({ date: d }));
    expect(pointsInRange(pts, 30, '2026-11-10').map((p) => p.date)).toEqual(['2026-10-12', '2026-11-10']);
  });
});

describe('weeklyReadings', () => {
  it('takes the last reading of each week, newest first', () => {
    const weeks = weeklyReadings(
      [point('2026-11-02', null), point('2026-11-03', -0.3), point('2026-11-05', -0.6), point('2026-11-10', -0.2)],
      goal,
    );
    expect(weeks.map((w) => [w.week, w.state, w.pctPerWeek])).toEqual([
      ['2026-11-09', 'slow_right', -0.2],
      ['2026-11-02', 'optimal', -0.6],
    ]);
    expect(weeks[1].angleDeg).toBe(-90);
  });
});

describe('gridValues', () => {
  it('picks round steps', () => {
    expect(gridValues(78, 86.1)).toEqual([80, 85]);
    expect(gridValues(81.2, 82.4)).toEqual([81.5, 82]);
  });
});
