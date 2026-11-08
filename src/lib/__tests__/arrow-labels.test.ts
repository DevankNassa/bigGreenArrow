import { confidenceNote, heroChip, heroHeadline, stateLabel } from '../arrow-labels';

describe('stateLabel', () => {
  it('words the same state by goal', () => {
    expect(stateLabel('wrong_way', 'lose')).toBe('Gaining');
    expect(stateLabel('wrong_way', 'gain')).toBe('Losing');
    expect(stateLabel('too_fast', 'lose')).toBe('Losing too fast');
    expect(stateLabel('on_target', 'maintain')).toBe('On target');
  });
});

describe('confidenceNote', () => {
  it('says when the arrow goes live and how far along the early read is', () => {
    expect(confidenceNote({ level: 'calibrating', weighIns: 1, weighInsNeeded: 2 })).toMatch(/tomorrow/);
    expect(
      confidenceNote({ level: 'early', weighIns: 2, weighInsNeeded: 5, days: 2, daysNeeded: 7 }),
    ).toMatch(/^Early read, day 2 of 7/);
  });

  it('explains low confidence and is silent when all is well', () => {
    expect(confidenceNote({ level: 'low', reason: 'stale' })).toMatch(/over a week/);
    expect(confidenceNote({ level: 'ok' })).toBeNull();
  });
});

describe('hero copy', () => {
  it('uses the short headlines from the design', () => {
    expect(heroHeadline('slow_right', 'lose')).toBe('A bit slow');
    expect(heroHeadline('optimal', 'gain')).toBe('Optimal gain');
    expect(heroHeadline('flat', 'lose')).toBe('Holding steady');
  });

  it('points the wrong-way chip the way the trend is going', () => {
    expect(heroChip('wrong_way', 'lose', 0.6)).toEqual({ icon: 'up', label: 'Wrong way' });
    expect(heroChip('wrong_way', 'gain', -0.6)).toEqual({ icon: 'down', label: 'Wrong way' });
    expect(heroChip('optimal', 'lose', -0.7)).toBeNull();
  });
});
