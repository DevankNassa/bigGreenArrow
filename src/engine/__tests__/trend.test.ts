import { computeRate, computeTrend, isLikelyOutlier } from '../trend';
import type { DailyWeight, TrendPoint } from '../types';

const days = (weights: [day: number, kg: number][]): DailyWeight[] =>
  weights.map(([day, weightKg]) => ({ date: `d${day}`, day, weightKg }));

const ema = { method: 'ema', alpha: 0.1 } as const;

describe('computeTrend (EMA)', () => {
  it('seeds with the first weigh-in', () => {
    expect(computeTrend(days([[0, 82.4]]), ema)[0].trendKg).toBe(82.4);
  });

  it('moves alpha of the way toward each new daily weight', () => {
    const trend = computeTrend(days([[0, 80], [1, 81]]), ema);
    expect(trend[1].trendKg).toBeCloseTo(80.1, 10);
  });

  it('stays put when the weight is constant', () => {
    const trend = computeTrend(days([[0, 75], [1, 75], [5, 75], [6, 75]]), ema);
    trend.forEach((p) => expect(p.trendKg).toBeCloseTo(75, 10));
  });

  it('treats a skipped day like two daily steps at the new weight', () => {
    const withGap = computeTrend(days([[0, 80], [2, 81]]), ema);
    const daily = computeTrend(days([[0, 80], [1, 81], [2, 81]]), ema);
    expect(withGap[1].trendKg).toBeCloseTo(daily[2].trendKg, 10);
  });
});

describe('computeTrend (SMA)', () => {
  const sma = { method: 'sma', windowDays: 7 } as const;

  it('averages the trailing window of calendar days', () => {
    const trend = computeTrend(days(Array.from({ length: 10 }, (_, i) => [i, 80 + i])), sma);
    expect(trend[9].trendKg).toBeCloseTo(86, 10); // mean of days 3..9
  });

  it('only uses weigh-ins inside the window after a gap', () => {
    const trend = computeTrend(days([[0, 90], [10, 80]]), sma);
    expect(trend[1].trendKg).toBe(80);
  });
});

describe('computeRate', () => {
  const linear = (n: number, kgPerDay: number): TrendPoint[] =>
    Array.from({ length: n }, (_, day) => ({
      date: `d${day}`,
      day,
      weightKg: 100 + kgPerDay * day,
      trendKg: 100 + kgPerDay * day,
    }));

  it('recovers the slope of a straight trend', () => {
    const trend = linear(21, -0.1);
    const rate = computeRate(trend, 20, 14)!;
    expect(rate.kgPerWeek).toBeCloseTo(-0.7, 10);
    expect(rate.pctPerWeek).toBeCloseTo((-0.7 / 98) * 100, 10);
  });

  it('only uses points inside the lookback window', () => {
    expect(computeRate(linear(21, -0.1), 20, 14)!.points).toBe(14);
    expect(computeRate(linear(21, -0.1), 20, 7)!.points).toBe(7);
  });

  it('needs at least two points', () => {
    expect(computeRate(linear(1, 0), 0, 14)).toBeNull();
    const sparse: TrendPoint[] = [
      { date: 'a', day: 0, weightKg: 80, trendKg: 80 },
      { date: 'b', day: 20, weightKg: 79, trendKg: 79 },
    ];
    expect(computeRate(sparse, 1, 14)).toBeNull();
  });
});

describe('isLikelyOutlier', () => {
  it('flags entries more than 3% from the trend', () => {
    expect(isLikelyOutlier(8.24, 82.4)).toBe(true);
    expect(isLikelyOutlier(85.0, 82.4)).toBe(true);
    expect(isLikelyOutlier(84.0, 82.4)).toBe(false);
  });
});
