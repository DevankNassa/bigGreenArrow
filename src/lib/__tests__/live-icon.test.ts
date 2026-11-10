import type { ArrowReading } from '@/engine';

import { liveIconName } from '../live-icon';

function reading(state: ArrowReading['state'], angleDeg: number): ArrowReading {
  return {
    state,
    angleDeg,
    tone: 'gray',
    celebrating: false,
    since: '2026-11-01',
    streakDays: 0,
    daysInState: 1,
  };
}

describe('liveIconName', () => {
  it('keeps the hourglass while calibrating', () => {
    expect(liveIconName(null)).toBeNull();
  });

  it('points the arrow the way the trend is going', () => {
    expect(liveIconName(reading('optimal', -90))).toBe('OptimalDown');
    expect(liveIconName(reading('optimal', 90))).toBe('OptimalUp');
    expect(liveIconName(reading('too_fast', -90))).toBe('TooFastDown');
    expect(liveIconName(reading('slow_right', 40))).toBe('SlowUp');
    expect(liveIconName(reading('slow_wrong', 30))).toBe('DriftingUp');
    expect(liveIconName(reading('wrong_way', -90))).toBe('WrongWayDown');
  });

  it('maps the maintain states onto the same icons', () => {
    expect(liveIconName(reading('on_target', 0))).toBe('OnTarget');
    expect(liveIconName(reading('flat', 0))).toBe('Steady');
    expect(liveIconName(reading('returning', -20))).toBe('SlowDown');
    expect(liveIconName(reading('drifting', 20))).toBe('DriftingUp');
    expect(liveIconName(reading('off_target', 60))).toBe('WrongWayUp');
  });
});
