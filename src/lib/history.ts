import { localDate, type IsoDate, type TrendPoint, type WeighIn } from '@/engine';

export interface HistoryRow {
  weighIn: WeighIn;
  date: IsoDate;
  /** Trend on this weigh-in's day; null when excluded or the day has no trend point. */
  trendKg: number | null;
  /** Scale weight minus trend. */
  diffKg: number | null;
}

/** Every weigh-in, newest first, next to the trend for its day. */
export function historyRows(weighIns: readonly WeighIn[], series: readonly TrendPoint[]): HistoryRow[] {
  const trendByDate = new Map(series.map((p) => [p.date, p.trendKg]));
  return [...weighIns]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .map((weighIn) => {
      const date = localDate(weighIn.timestamp);
      const trendKg = weighIn.excluded ? null : (trendByDate.get(date) ?? null);
      return { weighIn, date, trendKg, diffKg: trendKg === null ? null : weighIn.weightKg - trendKg };
    });
}

/** Health owns samples it synced; the app can only exclude them, not change them. */
export function isEditable(w: WeighIn): boolean {
  return w.source === 'manual' || w.source === 'import';
}
