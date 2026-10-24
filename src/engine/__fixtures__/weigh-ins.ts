import type { Goal, IsoDate, WeighIn } from '../types';

export function addDays(date: IsoDate, n: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weighIn(date: IsoDate, weightKg: number, overrides: Partial<WeighIn> = {}): WeighIn {
  return {
    id: `${date}-${weightKg}`,
    timestamp: `${date}T07:00:00+00:00`,
    weightKg,
    source: 'manual',
    excluded: false,
    ...overrides,
  };
}

/** One weigh-in every `everyDays` days for `days` days, weight given by day index. */
export function series(
  start: IsoDate,
  days: number,
  kgOnDay: (i: number) => number,
  everyDays = 1,
): WeighIn[] {
  const out: WeighIn[] = [];
  for (let i = 0; i < days; i += everyDays) out.push(weighIn(addDays(start, i), kgOnDay(i)));
  return out;
}

/** Deterministic day-to-day scale noise of roughly ±`amplitude` kg. */
export function noise(i: number, amplitude = 0.6): number {
  return Math.sin(i * 2.3) * amplitude * 0.7 + Math.sin(i * 0.9 + 1) * amplitude * 0.3;
}

const base = { targetBandPct: 1.5, flatBandPct: 0.15 };

export const loseGoal: Goal = { ...base, type: 'lose', optimalMinPct: 0.5, optimalMaxPct: 1.0 };
export const gainGoal: Goal = { ...base, type: 'gain', optimalMinPct: 0.25, optimalMaxPct: 0.5 };
export const maintainGoal: Goal = {
  ...base,
  type: 'maintain',
  targetKg: 80,
  optimalMinPct: 0.5,
  optimalMaxPct: 1.0,
};
