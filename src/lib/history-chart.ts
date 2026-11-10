import { arrowAngle, type AnalyzedPoint, type ArrowState, type Goal, type IsoDate } from '@/engine';

import { addDays } from './dates';

export const HISTORY_RANGES = [
  { value: '1M', label: '1M', days: 30, words: '1 month' },
  { value: '3M', label: '3M', days: 91, words: '3 months' },
  { value: '6M', label: '6M', days: 182, words: '6 months' },
  { value: '1Y', label: '1Y', days: 365, words: '1 year' },
] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number]['value'];

/** The trend points inside the last `days` days up to `today`. */
export function pointsInRange<T extends { date: IsoDate }>(series: readonly T[], days: number, today: IsoDate): T[] {
  const from = addDays(today, -days);
  return series.filter((p) => p.date > from && p.date <= today);
}

/** Monday of the week `date` falls in. */
export function weekStart(date: IsoDate): IsoDate {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return addDays(date, -weekday);
}

export interface WeekReading {
  /** Monday of the week. */
  week: IsoDate;
  state: ArrowState;
  pctPerWeek: number;
  angleDeg: number;
}

/** Where the arrow stood at the end of each week, newest first. */
export function weeklyReadings(points: readonly AnalyzedPoint[], goal: Goal): WeekReading[] {
  const byWeek = new Map<IsoDate, WeekReading>();
  for (const p of points) {
    if (!p.state || !p.rate) continue;
    // Points are oldest first, so the last one seen in a week wins.
    byWeek.set(weekStart(p.date), {
      week: weekStart(p.date),
      state: p.state,
      pctPerWeek: p.rate.pctPerWeek,
      angleDeg: arrowAngle(goal, p.rate.pctPerWeek),
    });
  }
  return [...byWeek.values()].reverse();
}

/** Round grid values for a weight axis from `lo` to `hi`: two or three lines, about evenly spaced. */
export function gridValues(lo: number, hi: number): number[] {
  const span = hi - lo;
  const step = [0.5, 1, 2, 5, 10, 20, 50].find((s) => span / s <= 3) ?? 100;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(2)));
  return out;
}
