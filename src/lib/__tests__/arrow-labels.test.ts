import { confidenceNote, stateLabel } from '../arrow-labels';

describe('stateLabel', () => {
  it('words the same state by goal', () => {
    expect(stateLabel('wrong_way', 'lose')).toBe('Gaining');
    expect(stateLabel('wrong_way', 'gain')).toBe('Losing');
    expect(stateLabel('too_fast', 'lose')).toBe('Losing too fast');
    expect(stateLabel('on_target', 'maintain')).toBe('On target');
  });
});

describe('confidenceNote', () => {
  const calibrating = { level: 'calibrating', weighInsNeeded: 5, daysNeeded: 7 } as const;

  it('names whichever calibration requirement is missing', () => {
    expect(confidenceNote({ ...calibrating, weighIns: 2, days: 2 })).toBe('2 of 5 days logged');
    expect(confidenceNote({ ...calibrating, weighIns: 5, days: 3 })).toBe('Day 3 of 7');
  });

  it('explains low confidence and is silent when all is well', () => {
    expect(confidenceNote({ level: 'low', reason: 'stale' })).toMatch(/over a week/);
    expect(confidenceNote({ level: 'ok' })).toBeNull();
  });
});
