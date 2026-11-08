import type { ArrowState, Confidence, Goal, GoalType } from '@/engine';

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
      return 'Log again tomorrow and your arrow goes live.';
    case 'early':
      return `Early read, day ${Math.min(confidence.days, confidence.daysNeeded)} of ${confidence.daysNeeded}. The arrow firms up as you log.`;
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

/** The home hero's headline: shorter and blunter than the state's label. */
export function heroHeadline(state: ArrowState, goal: GoalType): string {
  const short: Partial<Record<ArrowState, string>> = {
    too_fast: 'Too fast',
    slow_right: 'A bit slow',
    wrong_way: 'Wrong way',
  };
  return (goal !== 'maintain' && short[state]) || stateLabel(state, goal);
}

export type ChipIcon = 'warning' | 'clock' | 'level' | 'up' | 'down';

/** The pill above the headline on states that aren't celebrated. */
export function heroChip(state: ArrowState, goal: GoalType, ratePct: number): { icon: ChipIcon; label: string } | null {
  const way: ChipIcon = ratePct > 0 ? 'up' : 'down';
  switch (state) {
    case 'too_fast':
      return { icon: 'warning', label: 'Ease off' };
    case 'slow_right':
      return { icon: 'clock', label: 'Too slow' };
    case 'flat':
      return { icon: 'level', label: 'Maintenance' };
    case 'slow_wrong':
      return { icon: way, label: 'Slipping' };
    case 'wrong_way':
      return { icon: way, label: 'Wrong way' };
    case 'drifting':
      return { icon: way, label: 'In your band' };
    case 'off_target':
      return { icon: way, label: 'Outside your band' };
    case 'returning':
      return { icon: way, label: 'Coming back' };
    default:
      return null;
  }
}

/** What follows the rate in the hero's subline, e.g. "Still the right way." */
export function heroSublineTail(state: ArrowState, goal: Goal, ratePct: number): string {
  switch (state) {
    case 'too_fast':
      return `Above your ${goal.optimalMaxPct}% limit.`;
    case 'slow_right':
      return 'Still the right way.';
    case 'flat':
      return 'Maintenance pace.';
    case 'slow_wrong':
    case 'wrong_way':
      return ratePct > 0 ? 'Trending up.' : 'Trending down.';
    case 'drifting':
      return 'Still inside your band.';
    case 'off_target':
      return 'Outside your band.';
    case 'returning':
      return 'Heading back to target.';
    default:
      return '';
  }
}

/** A plain sentence under the numbers saying what the state means. Null when celebrating. */
export function heroAdvice(state: ArrowState, goal: Goal): string | null {
  const losing = goal.type === 'lose';
  const start = `${losing ? '−' : '+'}${goal.optimalMinPct}%`;
  switch (state) {
    case 'too_fast':
      return `You're ${losing ? 'losing' : 'gaining'} faster than your ${goal.optimalMaxPct}%/week limit. ${
        losing ? 'Consider eating a bit more to protect muscle.' : 'Consider easing off a little so the gain stays lean.'
      }`;
    case 'slow_right':
      return "You're heading the right way, just slower than your optimal zone. Small, steady changes are enough.";
    case 'flat':
      return `You're holding your weight. To keep ${losing ? 'losing' : 'gaining'}, the arrow needs to tip ${
        losing ? 'down' : 'up'
      } past ${start} a week.`;
    case 'slow_wrong':
      return "Your trend is creeping the wrong way. It's small so far, so it's an easy one to turn around.";
    case 'wrong_way':
      return `Your trend has turned ${losing ? 'upward' : 'downward'}. A single ${
        losing ? 'heavy' : 'light'
      } day won't do this, so it's worth a look at the last two weeks.`;
    case 'drifting':
      return "You're inside your band, but the trend is moving. Nothing to worry about yet.";
    case 'off_target':
      return 'Your trend is outside your band and still moving away from your target.';
    case 'returning':
      return "You're outside your band, but the trend is heading back toward your target.";
    default:
      return null;
  }
}
