import { weighIn } from '../__fixtures__/weigh-ins';
import { dayNumber, localDate, toDailyWeights } from '../daily';

describe('localDate', () => {
  it('uses the date the weigh-in was recorded in, not the UTC date', () => {
    // 23:30 at UTC−7 is already the 22nd in UTC.
    expect(localDate('2026-10-21T23:30:00-07:00')).toBe('2026-10-21');
  });

  it('rejects malformed timestamps', () => {
    expect(() => localDate('21/10/2026')).toThrow();
  });
});

describe('dayNumber', () => {
  it('counts calendar days', () => {
    expect(dayNumber('2026-03-01') - dayNumber('2026-02-28')).toBe(1);
    expect(dayNumber('2024-03-01') - dayNumber('2024-02-28')).toBe(2); // leap year
    expect(dayNumber('1970-01-01')).toBe(0);
  });
});

describe('toDailyWeights', () => {
  const sameDay = [
    weighIn('2026-10-21', 80.0, { id: 'a', timestamp: '2026-10-21T07:00:00+00:00' }),
    weighIn('2026-10-21', 81.0, { id: 'b', timestamp: '2026-10-21T21:00:00+00:00' }),
    weighIn('2026-10-21', 80.4, { id: 'c', timestamp: '2026-10-21T06:00:00+00:00' }),
  ];

  it.each([
    ['first', 80.4],
    ['last', 81.0],
    ['average', (80.0 + 81.0 + 80.4) / 3],
  ] as const)('picks the %s weigh-in of a day', (rule, expected) => {
    const [day] = toDailyWeights(sameDay, rule);
    expect(day.weightKg).toBeCloseTo(expected, 10);
  });

  it('orders same-day weigh-ins by instant, not by wall-clock text', () => {
    const daily = toDailyWeights(
      [
        weighIn('2026-10-21', 80, { id: 'utc', timestamp: '2026-10-21T06:00:00+00:00' }),
        weighIn('2026-10-21', 79, { id: 'cest', timestamp: '2026-10-21T07:00:00+02:00' }), // 05:00Z
      ],
      'first',
    );
    expect(daily[0].weightKg).toBe(79);
  });

  it('drops excluded weigh-ins and sorts days oldest first', () => {
    const daily = toDailyWeights(
      [
        weighIn('2026-10-23', 79),
        weighIn('2026-10-21', 81),
        weighIn('2026-10-22', 60, { excluded: true }),
      ],
      'first',
    );
    expect(daily.map((d) => d.date)).toEqual(['2026-10-21', '2026-10-23']);
    expect(daily[1].day - daily[0].day).toBe(2);
  });
});
