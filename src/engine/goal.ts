import { PACE_WARNING_PCT } from './constants';
import { redThresholdPct } from './arrow';
import type { Goal, Rate } from './types';

export type GoalError =
  | 'optimal_min_inside_flat_band'
  | 'optimal_range_inverted'
  | 'flat_band_negative'
  | 'red_threshold_inside_flat_band'
  | 'target_band_not_positive'
  | 'target_required'
  | 'target_not_positive';

export function validateGoal(goal: Goal): GoalError[] {
  const errors: GoalError[] = [];
  if (goal.flatBandPct < 0) errors.push('flat_band_negative');
  if (goal.targetKg !== undefined && goal.targetKg <= 0) errors.push('target_not_positive');

  if (goal.type === 'maintain') {
    if (goal.targetKg === undefined) errors.push('target_required');
    if (goal.targetBandPct <= 0) errors.push('target_band_not_positive');
    return errors;
  }

  if (goal.optimalMinPct < goal.flatBandPct) errors.push('optimal_min_inside_flat_band');
  if (goal.optimalMaxPct <= goal.optimalMinPct) errors.push('optimal_range_inverted');
  if (redThresholdPct(goal) < goal.flatBandPct) errors.push('red_threshold_inside_flat_band');
  return errors;
}

/** Whether saving this pace needs the over-1%/week confirmation. */
export function needsPaceWarning(goal: Goal): boolean {
  return goal.type !== 'maintain' && goal.optimalMaxPct > PACE_WARNING_PCT;
}

/**
 * Whole days until the trend reaches the target at the current rate. 0 when
 * already there; null without a target, or when flat or heading away from it.
 */
export function daysToTarget(goal: Goal, trendKg: number, rate: Rate): number | null {
  if (goal.type === 'maintain' || goal.targetKg === undefined) return null;

  const remainingKg = goal.targetKg - trendKg;
  const reached = goal.type === 'lose' ? remainingKg >= 0 : remainingKg <= 0;
  if (reached) return 0;
  if (Math.abs(rate.pctPerWeek) <= goal.flatBandPct) return null;
  if (Math.sign(rate.kgPerWeek) !== Math.sign(remainingKg)) return null;
  return Math.ceil((remainingKg / rate.kgPerWeek) * 7);
}
