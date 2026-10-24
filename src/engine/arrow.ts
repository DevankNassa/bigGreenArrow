import {
  ANGLE_FULL_SCALE_FACTOR,
  HYSTERESIS_CONSECUTIVE,
  HYSTERESIS_MARGIN_PCT,
  MAINTAIN_ANGLE_FULL_SCALE_PCT,
} from './constants';
import type { ArrowState, ArrowTone, Goal, Measurement } from './types';

export const STATE_TONE: Record<ArrowState, ArrowTone> = {
  optimal: 'big_green',
  on_target: 'big_green',
  slow_right: 'light_green',
  returning: 'light_green',
  flat: 'gray',
  slow_wrong: 'light_red',
  drifting: 'light_red',
  wrong_way: 'red',
  off_target: 'red',
  too_fast: 'amber',
};

export function isCelebrating(state: ArrowState): boolean {
  return state === 'optimal' || state === 'on_target';
}

export function redThresholdPct(goal: Goal): number {
  return goal.redThresholdPct ?? goal.optimalMinPct;
}

/** Raw zone for one measurement, without hysteresis. */
export function classify(goal: Goal, m: Measurement): ArrowState {
  return goal.type === 'maintain' ? classifyMaintain(goal, m) : classifyDirectional(goal, m.ratePct);
}

function classifyDirectional(goal: Goal, ratePct: number): ArrowState {
  // Progress in the goal's direction: positive is good for both lose and gain.
  const p = goal.type === 'lose' ? -ratePct : ratePct;
  if (p > goal.optimalMaxPct) return 'too_fast';
  if (p >= goal.optimalMinPct) return 'optimal';
  if (p > goal.flatBandPct) return 'slow_right';
  if (p >= -goal.flatBandPct) return 'flat';
  if (p >= -redThresholdPct(goal)) return 'slow_wrong';
  return 'wrong_way';
}

function classifyMaintain(goal: Goal, { ratePct, trendKg }: Measurement): ArrowState {
  const isFlat = Math.abs(ratePct) <= goal.flatBandPct;
  if (goal.targetKg === undefined) return isFlat ? 'on_target' : 'drifting';

  const deviationPct = ((trendKg - goal.targetKg) / goal.targetKg) * 100;
  if (Math.abs(deviationPct) <= goal.targetBandPct) return isFlat ? 'on_target' : 'drifting';

  const headingBack = !isFlat && Math.sign(ratePct) === -Math.sign(deviationPct);
  return headingBack ? 'returning' : 'off_target';
}

/**
 * Applies the anti-flicker rule across consecutive weigh-ins: the displayed
 * state changes only when the new zone is clear of the old one by
 * HYSTERESIS_MARGIN_PCT, or has held for HYSTERESIS_CONSECUTIVE weigh-ins.
 */
export function resolveStates(goal: Goal, measurements: readonly Measurement[]): ArrowState[] {
  const out: ArrowState[] = [];
  let displayed: ArrowState | undefined;
  let pending = 0;

  for (const m of measurements) {
    const raw = classify(goal, m);
    if (displayed === undefined || raw === displayed) {
      displayed = raw;
      pending = 0;
    } else {
      pending++;
      const prev = displayed;
      const clearlyCrossed = nudged(goal, m).every((n) => classify(goal, n) !== prev);
      if (clearlyCrossed || pending >= HYSTERESIS_CONSECUTIVE) {
        displayed = raw;
        pending = 0;
      }
    }
    out.push(displayed);
  }
  return out;
}

/** The measurement shifted by the hysteresis margin in every direction that matters for the goal. */
function nudged(goal: Goal, m: Measurement): Measurement[] {
  const rateShifts = [-HYSTERESIS_MARGIN_PCT, HYSTERESIS_MARGIN_PCT];
  const trendShifts =
    goal.type === 'maintain' && goal.targetKg !== undefined
      ? [-1, 1].map((s) => (s * goal.targetKg! * HYSTERESIS_MARGIN_PCT) / 100)
      : [0];
  return rateShifts.flatMap((dr) =>
    trendShifts.map((dt) => ({ ratePct: m.ratePct + dr, trendKg: m.trendKg + dt })),
  );
}

/**
 * Arrow tilt in degrees: 0 points right (flat), +90 straight up (gaining),
 * −90 straight down (losing).
 */
export function arrowAngle(goal: Goal, ratePct: number): number {
  const fullScale =
    goal.type === 'maintain'
      ? MAINTAIN_ANGLE_FULL_SCALE_PCT
      : goal.optimalMaxPct * ANGLE_FULL_SCALE_FACTOR;
  return Math.max(-1, Math.min(1, ratePct / fullScale)) * 90;
}
