import type { ArrowReading, ArrowState } from '@/engine';

/**
 * The alternate app icons registered in app.json (built by
 * scripts/app-icons.mjs). The default icon, the hourglass, is `null`.
 */
export type LiveIcon =
  | 'Steady'
  | 'OnTarget'
  | `${'Optimal' | 'TooFast' | 'Slow' | 'Drifting' | 'WrongWay'}${'Up' | 'Down'}`;

const DIRECTIONAL: Partial<Record<ArrowState, 'Optimal' | 'TooFast' | 'Slow' | 'Drifting' | 'WrongWay'>> = {
  optimal: 'Optimal',
  too_fast: 'TooFast',
  slow_right: 'Slow',
  returning: 'Slow',
  slow_wrong: 'Drifting',
  drifting: 'Drifting',
  wrong_way: 'WrongWay',
  off_target: 'WrongWay',
};

/** Which icon shows the current arrow: the hourglass (`null`) until it is live. */
export function liveIconName(arrow: ArrowReading | null): LiveIcon | null {
  if (!arrow) return null;
  if (arrow.state === 'flat') return 'Steady';
  if (arrow.state === 'on_target') return 'OnTarget';
  const kind = DIRECTIONAL[arrow.state];
  if (!kind) return null;
  return `${kind}${arrow.angleDeg >= 0 ? 'Up' : 'Down'}`;
}
