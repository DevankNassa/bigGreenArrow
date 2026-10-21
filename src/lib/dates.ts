import type { IsoDate } from '@/engine';

const pad = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, '0');

/** Local calendar date of `d`, e.g. `2026-10-21`. */
export function localIsoDate(d: Date = new Date()): IsoDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO 8601 timestamp in local time with its UTC offset, as the engine expects. */
export function localIsoTimestamp(d: Date = new Date()): string {
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${localIsoDate(d)}T${time}${sign}${pad(offsetMin / 60)}:${pad(offsetMin % 60)}`;
}
