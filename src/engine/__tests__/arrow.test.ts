import { gainGoal, loseGoal, maintainGoal } from '../__fixtures__/weigh-ins';
import { STATE_TONE, arrowAngle, classify, isCelebrating, resolveStates } from '../arrow';
import type { ArrowState, Goal } from '../types';

const at = (ratePct: number, trendKg = 80) => ({ ratePct, trendKg });

describe('classify: lose (optimal 0.5–1.0)', () => {
  // The example table in SPEC.md §6.1.
  it.each<[number, ArrowState]>([
    [0.8, 'wrong_way'],
    [0.5, 'slow_wrong'],
    [0.3, 'slow_wrong'],
    [0.15, 'flat'],
    [0, 'flat'],
    [-0.15, 'flat'],
    [-0.3, 'slow_right'],
    [-0.5, 'optimal'],
    [-1.0, 'optimal'],
    [-1.01, 'too_fast'],
  ])('%s%%/week → %s', (rate, state) => {
    expect(classify(loseGoal, at(rate))).toBe(state);
  });
});

describe('classify: gain (optimal 0.25–0.5)', () => {
  it.each<[number, ArrowState]>([
    [-0.3, 'wrong_way'],
    [-0.2, 'slow_wrong'],
    [0, 'flat'],
    [0.2, 'slow_right'],
    [0.3, 'optimal'],
    [0.6, 'too_fast'],
  ])('%s%%/week → %s', (rate, state) => {
    expect(classify(gainGoal, at(rate))).toBe(state);
  });
});

describe('classify: red threshold', () => {
  it('defaults to the optimal min, mirrored', () => {
    expect(classify(loseGoal, at(0.45))).toBe('slow_wrong');
  });

  it('can be set by the user', () => {
    const strict: Goal = { ...loseGoal, redThresholdPct: 0.2 };
    expect(classify(strict, at(0.25))).toBe('wrong_way');
    const relaxed: Goal = { ...loseGoal, redThresholdPct: 1.5 };
    expect(classify(relaxed, at(1.2))).toBe('slow_wrong');
  });
});

describe('classify: maintain (target 80 kg ±1.5%)', () => {
  it.each<[string, number, number, ArrowState]>([
    ['in band, flat', 0.05, 80.5, 'on_target'],
    ['in band, drifting up', 0.3, 80.5, 'drifting'],
    ['above band, still rising', 0.3, 82, 'off_target'],
    ['above band, flat', 0, 82, 'off_target'],
    ['above band, coming down', -0.3, 82, 'returning'],
    ['below band, coming up', 0.3, 78, 'returning'],
  ])('%s → %s', (_, rate, trendKg, state) => {
    expect(classify(maintainGoal, at(rate, trendKg))).toBe(state);
  });

  it('falls back to rate only without a target', () => {
    const noTarget: Goal = { ...maintainGoal, targetKg: undefined };
    expect(classify(noTarget, at(0.1, 95))).toBe('on_target');
    expect(classify(noTarget, at(0.4, 95))).toBe('drifting');
  });
});

describe('tones', () => {
  it('celebrates only optimal and on target', () => {
    const celebrating = (Object.keys(STATE_TONE) as ArrowState[]).filter(isCelebrating);
    expect(celebrating.sort()).toEqual(['on_target', 'optimal']);
    celebrating.forEach((s) => expect(STATE_TONE[s]).toBe('big_green'));
  });

  it('never shows too fast as green', () => {
    expect(STATE_TONE.too_fast).toBe('amber');
  });
});

describe('resolveStates (hysteresis)', () => {
  const states = (rates: number[]) => resolveStates(loseGoal, rates.map((r) => at(r)));

  it('ignores a single reading just past a boundary', () => {
    // −0.48 is slow loss, but only 0.02 past the 0.5 boundary.
    expect(states([-0.7, -0.48, -0.7])).toEqual(['optimal', 'optimal', 'optimal']);
  });

  it('switches after two consecutive readings past a boundary', () => {
    expect(states([-0.7, -0.48, -0.47])).toEqual(['optimal', 'optimal', 'slow_right']);
  });

  it('switches immediately when clearly past the boundary', () => {
    expect(states([-0.7, -0.3])).toEqual(['optimal', 'slow_right']);
    expect(states([-0.7, 0.8])).toEqual(['optimal', 'wrong_way']);
  });

  it('resets the count when the reading returns', () => {
    expect(states([-0.7, -0.48, -0.6, -0.48])).toEqual(['optimal', 'optimal', 'optimal', 'optimal']);
  });

  it('applies to the maintain band too', () => {
    // 81.22 kg is 1.525% over an 80 kg target: outside the 1.5% band, but not by the margin.
    const resolved = resolveStates(maintainGoal, [at(0, 80.5), at(0, 81.22), at(0, 80.5)]);
    expect(resolved).toEqual(['on_target', 'on_target', 'on_target']);
    // 81.4 kg (1.75% over) is clearly outside.
    expect(resolveStates(maintainGoal, [at(0, 80.5), at(0, 81.4)])[1]).toBe('off_target');
  });
});

describe('arrowAngle', () => {
  it('is horizontal when flat', () => {
    expect(arrowAngle(loseGoal, 0)).toBe(0);
    expect(arrowAngle(maintainGoal, 0)).toBe(0);
  });

  it('points straight down at 1.5× the optimal max and clamps beyond', () => {
    expect(arrowAngle(loseGoal, -1.5)).toBe(-90);
    expect(arrowAngle(loseGoal, -3)).toBe(-90);
    expect(arrowAngle(loseGoal, -0.75)).toBeCloseTo(-45, 10);
  });

  it('tilts up for gains', () => {
    expect(arrowAngle(gainGoal, 0.375)).toBeCloseTo(45, 10);
    expect(arrowAngle(maintainGoal, 0.5)).toBeCloseTo(45, 10);
  });
});
