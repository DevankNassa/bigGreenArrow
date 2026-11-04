import type { IsoDate } from '@/engine';

const pad = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, '0');

/** Local calendar date of `d`, e.g. `2026-10-21`. */
export function localIsoDate(d: Date = new Date()): IsoDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The calendar date `n` days after `date` (negative for before). */
export function addDays(date: IsoDate, n: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number);
  return localIsoDate(new Date(y, m - 1, d + n));
}

/** `date` at the wall-clock time of `now`: used for back-dated entries. */
export function atTimeOf(date: IsoDate, now: Date = new Date()): Date {
  const [y, m, d] = date.split('-').map(Number);
  const at = new Date(now);
  at.setFullYear(y, m - 1, d);
  return at;
}

/** "Today", "Yesterday", or a short date such as "Mon, 19 Oct". */
export function dayLabel(date: IsoDate, today: IsoDate = localIsoDate()): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** ISO 8601 timestamp in local time with its UTC offset, as the engine expects. */
export function localIsoTimestamp(d: Date = new Date()): string {
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${localIsoDate(d)}T${time}${sign}${pad(offsetMin / 60)}:${pad(offsetMin % 60)}`;
}
