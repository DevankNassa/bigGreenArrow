import type { ArrowState, Confidence, GoalType } from '@/engine';

const DIRECTIONAL: Record<'lose' | 'gain', Partial<Record<ArrowState, string>>> = {
  lose: {
    optimal: 'Optimal loss',
    slow_right: 'Slow loss',
    flat: 'Holding steady',
    slow_wrong: 'Slowly gaining',
    wrong_way: 'Gaining',
    too_fast: 'Losing too fast',
  },
  gain: {
    optimal: 'Optimal gain',
    slow_right: 'Slow gain',
    flat: 'Holding steady',
    slow_wrong: 'Slowly losing',
    wrong_way: 'Losing',
    too_fast: 'Gaining too fast',
  },
};

const MAINTAIN: Partial<Record<ArrowState, string>> = {
  on_target: 'On target',
  drifting: 'Drifting',
  off_target: 'Off target',
  returning: 'Heading back',
};

export function stateLabel(state: ArrowState, goal: GoalType): string {
  return (goal === 'maintain' ? MAINTAIN : DIRECTIONAL[goal])[state] ?? state;
}

export function confidenceNote(confidence: Confidence): string | null {
  switch (confidence.level) {
    case 'calibrating':
      return `Calibrating: ${Math.min(confidence.weighIns, confidence.weighInsNeeded)} of ${confidence.weighInsNeeded} weigh-ins`;
    case 'low':
      return {
        stale: 'No weigh-in for over a week',
        gap: 'Welcome back! A few more weigh-ins to get back on track',
        sparse: 'Low confidence: log more often',
      }[confidence.reason];
    case 'ok':
      return null;
  }
}
