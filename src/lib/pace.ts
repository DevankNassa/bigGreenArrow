import { PACE_WARNING_PCT, type Goal, type GoalError, type GoalType } from '@/engine';

export interface PacePreset {
  label: string;
  minPct: number;
  maxPct: number;
}

/** Quick picks that only fill in the pace; the user can adjust them (SPEC §7.5.1). */
export const PACE_PRESETS: Record<'lose' | 'gain', PacePreset[]> = {
  lose: [
    { label: 'Gentle', minPct: 0.25, maxPct: 0.5 },
    { label: 'Moderate', minPct: 0.5, maxPct: 1.0 },
    { label: 'Fast', minPct: 0.75, maxPct: 1.25 },
  ],
  gain: [
    { label: 'Gentle', minPct: 0.15, maxPct: 0.25 },
    { label: 'Moderate', minPct: 0.25, maxPct: 0.5 },
    { label: 'Fast', minPct: 0.5, maxPct: 0.75 },
  ],
};

/** The pace a goal type starts with until the user changes it. */
export function startingPace(type: GoalType): Pick<Goal, 'optimalMinPct' | 'optimalMaxPct'> {
  const moderate = PACE_PRESETS[type === 'gain' ? 'gain' : 'lose'][1];
  return { optimalMinPct: moderate.minPct, optimalMaxPct: moderate.maxPct };
}

export function matchingPreset(goal: Goal): PacePreset | undefined {
  if (goal.type === 'maintain') return undefined;
  return PACE_PRESETS[goal.type].find(
    (p) => p.minPct === goal.optimalMinPct && p.maxPct === goal.optimalMaxPct,
  );
}

/** The optimal range in kg per week at a given body weight. */
export function paceKgPerWeek(goal: Goal, atKg: number): [number, number] {
  return [(goal.optimalMinPct / 100) * atKg, (goal.optimalMaxPct / 100) * atKg];
}

/**
 * Roughly how many weeks to the target at the fastest and slowest optimal
 * pace, using the starting weight's rate throughout. Null without a target or
 * when the target is on the wrong side.
 */
export function weeksToTarget(goal: Goal, fromKg: number): [number, number] | null {
  if (goal.type === 'maintain' || goal.targetKg === undefined) return null;
  const remaining = goal.type === 'lose' ? fromKg - goal.targetKg : goal.targetKg - fromKg;
  if (remaining <= 0) return null;
  const [slow, fast] = paceKgPerWeek(goal, fromKg);
  return [Math.ceil(remaining / fast), Math.ceil(remaining / slow)];
}

/** "Go back to 1%": caps the fastest pace at the warning line, keeping min below it. */
export function capPace(goal: Goal): Goal {
  const optimalMaxPct = Math.min(goal.optimalMaxPct, PACE_WARNING_PCT);
  return {
    ...goal,
    optimalMaxPct,
    optimalMinPct: Math.min(goal.optimalMinPct, Math.round((optimalMaxPct - 0.05) * 100) / 100),
  };
}

export function paceWarning(type: 'lose' | 'gain'): string {
  return type === 'lose'
    ? `Losing more than ${PACE_WARNING_PCT}% of your body weight per week increases muscle loss and makes it harder to keep the weight off. Keep this pace?`
    : `Gaining more than ${PACE_WARNING_PCT}% of your body weight per week usually adds mostly fat rather than muscle. Keep this pace?`;
}

export const GOAL_ERROR_MESSAGES: Record<GoalError, string> = {
  optimal_min_inside_flat_band: 'The slowest optimal pace must be above the flat zone.',
  optimal_range_inverted: 'The fastest pace must be higher than the slowest.',
  flat_band_negative: "The flat zone can't be negative.",
  red_threshold_inside_flat_band: 'The red threshold must be at least the flat zone.',
  target_band_not_positive: 'The target band must be above 0%.',
  target_required: 'Maintaining needs a target weight.',
  target_not_positive: 'Enter a valid target weight.',
};
