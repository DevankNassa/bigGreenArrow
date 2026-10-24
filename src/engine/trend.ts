import { OUTLIER_PCT } from './constants';
import type { DailyWeight, Rate, Smoothing, TrendPoint } from './types';

export function computeTrend(daily: readonly DailyWeight[], smoothing: Smoothing): TrendPoint[] {
  return smoothing.method === 'ema' ? ema(daily, smoothing.alpha) : sma(daily, smoothing.windowDays);
}

/**
 * Time-aware EMA: a gap of Δd days decays the old trend as much as Δd daily
 * steps would, so missed days don't distort it.
 */
function ema(daily: readonly DailyWeight[], alpha: number): TrendPoint[] {
  const out: TrendPoint[] = [];
  for (const d of daily) {
    const prev = out[out.length - 1];
    const trendKg = prev
      ? prev.trendKg + (1 - (1 - alpha) ** (d.day - prev.day)) * (d.weightKg - prev.trendKg)
      : d.weightKg;
    out.push({ ...d, trendKg });
  }
  return out;
}

/** Mean of the weigh-ins in the trailing `windowDays` calendar days. */
function sma(daily: readonly DailyWeight[], windowDays: number): TrendPoint[] {
  let start = 0;
  let sum = 0;
  return daily.map((d, i) => {
    sum += d.weightKg;
    while (daily[start].day <= d.day - windowDays) {
      sum -= daily[start].weightKg;
      start++;
    }
    return { ...d, trendKg: sum / (i - start + 1) };
  });
}

/**
 * Least-squares slope of the trend over the `lookbackDays` calendar days
 * ending at `trend[endIndex]`. Null when fewer than two points fall inside.
 */
export function computeRate(
  trend: readonly TrendPoint[],
  endIndex: number,
  lookbackDays: number,
): Rate | null {
  const end = trend[endIndex];
  const fromDay = end.day - lookbackDays;

  let n = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = endIndex; i >= 0 && trend[i].day > fromDay; i--) {
    // Center x on the end day to keep the sums small.
    const x = trend[i].day - end.day;
    const y = trend[i].trendKg;
    n++;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  if (n < 2) return null;

  const slopePerDay = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const kgPerWeek = slopePerDay * 7;
  return { kgPerWeek, pctPerWeek: (kgPerWeek / end.trendKg) * 100, points: n };
}

/** True when an entry is far enough from the trend to be worth confirming (likely a typo). */
export function isLikelyOutlier(weightKg: number, trendKg: number, pct = OUTLIER_PCT): boolean {
  return (Math.abs(weightKg - trendKg) / trendKg) * 100 > pct;
}
