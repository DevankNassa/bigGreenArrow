import { gainGoal, loseGoal, maintainGoal } from '../__fixtures__/weigh-ins';
import { daysToTarget, needsPaceWarning, validateGoal } from '../goal';
import type { Goal } from '../types';

describe('validateGoal', () => {
  it('accepts sensible goals', () => {
    expect(validateGoal(loseGoal)).toEqual([]);
    expect(validateGoal(gainGoal)).toEqual([]);
    expect(validateGoal(maintainGoal)).toEqual([]);
  });

  it.each<[string, Goal, string]>([
    ['min inside the flat band', { ...loseGoal, optimalMinPct: 0.1 }, 'optimal_min_inside_flat_band'],
    ['max not above min', { ...loseGoal, optimalMaxPct: 0.5 }, 'optimal_range_inverted'],
    ['red threshold inside the flat band', { ...loseGoal, redThresholdPct: 0.1 }, 'red_threshold_inside_flat_band'],
    ['maintain without target', { ...maintainGoal, targetKg: undefined }, 'target_required'],
    ['maintain with zero band', { ...maintainGoal, targetBandPct: 0 }, 'target_band_not_positive'],
  ])('rejects %s', (_, goal, error) => {
    expect(validateGoal(goal)).toContain(error);
  });
});

describe('needsPaceWarning', () => {
  it('warns only above 1% per week, in either direction', () => {
    expect(needsPaceWarning(loseGoal)).toBe(false); // exactly 1.0
    expect(needsPaceWarning({ ...loseGoal, optimalMaxPct: 1.25 })).toBe(true);
    expect(needsPaceWarning({ ...gainGoal, optimalMaxPct: 1.1 })).toBe(true);
    expect(needsPaceWarning(maintainGoal)).toBe(false);
  });
});

describe('daysToTarget', () => {
  const withTarget = { ...loseGoal, targetKg: 78 };
  /** Rate at ~82 kg; pct only matters for the flat check. */
  const rate = (kgPerWeek: number) => ({ kgPerWeek, pctPerWeek: (kgPerWeek / 82) * 100, points: 14 });

  it('projects the current rate forward', () => {
    expect(daysToTarget(withTarget, 82, rate(-0.5))).toBe(56); // 4 kg at 0.5 kg/week
  });

  it('is 0 once the target is reached', () => {
    expect(daysToTarget(withTarget, 77.9, rate(-0.5))).toBe(0);
    expect(daysToTarget({ ...gainGoal, targetKg: 70 }, 70.2, rate(0.1))).toBe(0);
  });

  it('is null while flat, rather than projecting years ahead', () => {
    expect(daysToTarget(withTarget, 82, rate(-0.05))).toBeNull(); // ~0.06%/week
  });

  it('is null when moving away from the target or without one', () => {
    expect(daysToTarget(withTarget, 82, rate(0.2))).toBeNull();
    expect(daysToTarget(loseGoal, 82, rate(-0.5))).toBeNull();
    expect(daysToTarget(maintainGoal, 82, rate(-0.5))).toBeNull();
  });
});
