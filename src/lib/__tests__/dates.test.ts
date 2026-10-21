import { localDate } from '@/engine';

import { addDays, atTimeOf, localIsoDate, localIsoTimestamp } from '../dates';

describe('localIsoTimestamp', () => {
  const d = new Date(2026, 9, 21, 7, 5, 9); // local time

  it('carries the local date and a UTC offset', () => {
    expect(localIsoTimestamp(d)).toMatch(/^2026-10-21T07:05:09[+-]\d{2}:\d{2}$/);
  });

  it('round-trips to the same instant', () => {
    expect(Date.parse(localIsoTimestamp(d))).toBe(d.getTime());
  });

  it('agrees with the engine on the local day', () => {
    const lateEvening = new Date(2026, 9, 21, 23, 59, 0);
    expect(localDate(localIsoTimestamp(lateEvening))).toBe('2026-10-21');
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('atTimeOf', () => {
  it('keeps the time of day and moves the date', () => {
    const now = new Date(2026, 9, 21, 7, 30);
    const at = atTimeOf('2026-10-19', now);
    expect(localIsoDate(at)).toBe('2026-10-19');
    expect([at.getHours(), at.getMinutes()]).toEqual([7, 30]);
  });
});
