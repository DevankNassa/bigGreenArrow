import {
  checkWeightKg,
  formatWeight,
  parseWeightInput,
  pressWeightKey,
  stepWeightInput,
} from '../weight-input';

describe('parseWeightInput', () => {
  it.each([
    ['82.4', 82.4],
    ['82,4', 82.4],
    [' 82 ', 82],
    ['82.', 82],
    ['.5', 0.5],
  ])('parses %j', (text, value) => {
    expect(parseWeightInput(text)).toBe(value);
  });

  it.each(['', 'abc', '82.4.1', '-80', '8 2', '1e3'])('rejects %j', (text) => {
    expect(parseWeightInput(text)).toBeNull();
  });
});

describe('checkWeightKg', () => {
  it('flags implausible weights', () => {
    expect(checkWeightKg(8.24)).toBe('too_low');
    expect(checkWeightKg(824)).toBe('too_high');
    expect(checkWeightKg(82.4)).toBeNull();
  });
});

describe('formatWeight', () => {
  it('shows one decimal in the chosen unit', () => {
    expect(formatWeight(82.44, 'kg')).toBe('82.4 kg');
    expect(formatWeight(81.6466266, 'lb')).toBe('180.0 lb');
  });
});

describe('stepWeightInput', () => {
  it('steps by a tenth without float noise', () => {
    expect(stepWeightInput('82.4', 0.1)).toBe('82.5');
    expect(stepWeightInput('82.4', -0.1)).toBe('82.3');
    expect(stepWeightInput('0.2', 0.1)).toBe('0.3');
  });

  it('does nothing for text that is not a number', () => {
    expect(stepWeightInput('', 0.1)).toBeNull();
  });
});

describe('pressWeightKey', () => {
  const type = (keys: string, start = '') =>
    [...keys].reduce((text, k) => pressWeightKey(text, (k === '<' ? 'back' : k) as never), start);

  it('builds a weight digit by digit', () => {
    expect(type('82.4')).toBe('82.4');
    expect(type('182.4')).toBe('182.4');
  });

  it('replaces a selected value on the first press', () => {
    expect(pressWeightKey('82.4', '8', true)).toBe('8');
    expect(pressWeightKey('82.4', '.', true)).toBe('0.');
    expect(pressWeightKey('82.4', 'back', true)).toBe('');
  });

  it('deletes one character at a time', () => {
    expect(type('<', '82.4')).toBe('82.');
    expect(type('<<<<<', '82.4')).toBe('');
  });

  it('allows one point and one decimal', () => {
    expect(type('82..4')).toBe('82.4');
    expect(type('82.45')).toBe('82.4');
  });

  it('caps whole digits at three and drops a leading zero', () => {
    expect(type('1824')).toBe('182');
    expect(type('08')).toBe('8');
    expect(type('.5')).toBe('0.5');
  });
});
