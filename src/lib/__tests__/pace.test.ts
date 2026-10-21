import { DEFAULT_FLAT_BAND_PCT, validateGoal, type Goal, type GoalError } from '@/engine';

import {
  GOAL_ERROR_MESSAGES,
  PACE_PRESETS,
  capPace,
  matchingPreset,
  paceKgPerWeek,
  startingPace,
  weeksToTarget,
} from '../pace';

const goal = (extra: Partial<Goal>): Goal => ({
  type: 'lose',
  optimalMinPct: 0.5,
  optimalMaxPct: 1.0,
  flatBandPct: DEFAULT_FLAT_BAND_PCT,
  targetBandPct: 1.5,
  ...extra,
});

describe('PACE_PRESETS', () => {
  it('are all valid paces with the default flat zone', () => {
    for (const type of ['lose', 'gain'] as const) {
      for (const p of PACE_PRESETS[type]) {
        expect(validateGoal(goal({ type, optimalMinPct: p.minPct, optimalMaxPct: p.maxPct }))).toEqual([]);
      }
    }
  });
});

describe('startingPace / matchingPreset', () => {
  it('starts each goal type at its Moderate preset', () => {
    expect(matchingPreset(goal({ type: 'lose', ...startingPace('lose') }))?.label).toBe('Moderate');
    expect(matchingPreset(goal({ type: 'gain', ...startingPace('gain') }))?.label).toBe('Moderate');
  });

  it('matches nothing for a custom pace or maintain', () => {
    expect(matchingPreset(goal({ optimalMinPct: 0.6 }))).toBeUndefined();
    expect(matchingPreset(goal({ type: 'maintain' }))).toBeUndefined();
  });
});

describe('paceKgPerWeek', () => {
  it('translates the percent range at a body weight', () => {
    const [min, max] = paceKgPerWeek(goal({}), 82);
    expect(min).toBeCloseTo(0.41, 10);
    expect(max).toBeCloseTo(0.82, 10);
  });
});

describe('weeksToTarget', () => {
  it('gives the fastest and slowest estimate', () => {
    expect(weeksToTarget(goal({ targetKg: 78 }), 82)).toEqual([5, 10]); // 4 kg at 0.82–0.41 kg/week
    expect(weeksToTarget(goal({ type: 'gain', optimalMinPct: 0.25, optimalMaxPct: 0.5, targetKg: 74 }), 70)).toEqual([
      12, 23,
    ]);
  });

  it('is null without a usable target', () => {
    expect(weeksToTarget(goal({}), 82)).toBeNull();
    expect(weeksToTarget(goal({ targetKg: 85 }), 82)).toBeNull();
    expect(weeksToTarget(goal({ type: 'maintain', targetKg: 80 }), 82)).toBeNull();
  });
});

describe('capPace', () => {
  it('caps the fastest pace at 1% and keeps the range valid', () => {
    expect(capPace(goal({ optimalMinPct: 0.75, optimalMaxPct: 1.25 }))).toMatchObject({
      optimalMinPct: 0.75,
      optimalMaxPct: 1.0,
    });
    expect(capPace(goal({ optimalMinPct: 1.1, optimalMaxPct: 1.5 }))).toMatchObject({
      optimalMinPct: 0.95,
      optimalMaxPct: 1.0,
    });
    expect(capPace(goal({}))).toEqual(goal({}));
  });
});

describe('GOAL_ERROR_MESSAGES', () => {
  it('has a message for every validation error', () => {
    const errors: GoalError[] = [
      'optimal_min_inside_flat_band',
      'optimal_range_inverted',
      'flat_band_negative',
      'red_threshold_inside_flat_band',
      'target_band_not_positive',
      'target_required',
      'target_not_positive',
    ];
    errors.forEach((e) => expect(GOAL_ERROR_MESSAGES[e]).toBeTruthy());
  });
});
