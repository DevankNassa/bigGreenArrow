import { localDate, type WeighIn } from '@/engine';

const quote = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** Every weigh-in as CSV, oldest first, weights in kg. */
export function weighInsCsv(weighIns: readonly WeighIn[]): string {
  const rows = [...weighIns]
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((w) =>
      [localDate(w.timestamp), w.timestamp, w.weightKg.toFixed(2), w.source, w.excluded ? 'yes' : 'no', quote(w.note ?? '')].join(','),
    );
  return ['date,timestamp,weight_kg,source,excluded,note', ...rows].join('\n') + '\n';
}
