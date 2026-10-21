import type { DailyWeight, IsoDate, SameDayRule, WeighIn } from './types';

const MS_PER_DAY = 86_400_000;

/** Local calendar date of a weigh-in, taken from its offset-bearing timestamp. */
export function localDate(timestamp: string): IsoDate {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(timestamp);
  if (!match) throw new Error(`Invalid timestamp: ${timestamp}`);
  return match[1];
}

export function dayNumber(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

/** One weight per local day, oldest first. Excluded weigh-ins are dropped. */
export function toDailyWeights(weighIns: readonly WeighIn[], rule: SameDayRule): DailyWeight[] {
  const byDate = new Map<IsoDate, WeighIn[]>();
  for (const w of weighIns) {
    if (w.excluded) continue;
    const date = localDate(w.timestamp);
    const entries = byDate.get(date);
    if (entries) entries.push(w);
    else byDate.set(date, [w]);
  }

  const daily: DailyWeight[] = [];
  for (const [date, entries] of byDate) {
    entries.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    daily.push({ date, day: dayNumber(date), weightKg: pick(entries, rule) });
  }
  return daily.sort((a, b) => a.day - b.day);
}

function pick(sorted: WeighIn[], rule: SameDayRule): number {
  switch (rule) {
    case 'first':
      return sorted[0].weightKg;
    case 'last':
      return sorted[sorted.length - 1].weightKg;
    case 'average':
      return sorted.reduce((sum, w) => sum + w.weightKg, 0) / sorted.length;
  }
}
