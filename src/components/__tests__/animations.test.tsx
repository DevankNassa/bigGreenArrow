import type { ReactElement } from 'react';
import { act, create } from 'react-test-renderer';
import type { SharedValue } from 'react-native-reanimated';

import { ArrowSummary } from '@/components/arrow-summary';
import { CelebrationBurst } from '@/components/celebration-burst';
import { HistoryChart } from '@/components/history-chart';
import { PosterHero, type HeroMotion } from '@/components/poster-hero';
import { TrendArrow } from '@/components/trend-arrow';
import { analyze, type Goal, type TrendSettings, type WeighIn } from '@/engine';
import { historyRows } from '@/lib/history';
import { HISTORY_RANGES, pointsInRange, weeklyReadings } from '@/lib/history-chart';
import { onUiThread } from '@/test/ui-thread';

const mockWorklets: (() => unknown)[] = [];

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    useReducedMotion: () => false,
    useAnimatedStyle: (worklet: () => unknown) => {
      mockWorklets.push(worklet);
      return {};
    },
  };
});
jest.mock('expo-haptics');
jest.mock('@/global.css', () => ({}));

function render(element: ReactElement) {
  let rendered: ReturnType<typeof create> | undefined;
  act(() => {
    rendered = create(element);
  });
  act(() => rendered?.unmount());
}

/** Renders `element` and returns the animated styles it set up, as the UI thread would run them. */
function animatedStyles(element: ReactElement, clock: () => number) {
  mockWorklets.length = 0;
  render(element);
  expect(mockWorklets.length).toBeGreaterThan(0);
  return mockWorklets.map((w) => onUiThread(w, clock));
}

/** Every style at moments across the animation: before it starts, through each beat, and after the end. */
function runThrough(element: ReactElement) {
  let t = 0;
  const styles = animatedStyles(element, () => t);
  for (t = -100; t <= 4400; t += 20) styles.forEach((style) => style());
  for (t = 0; t <= 1; t += 0.05) styles.forEach((style) => style());
}

const MOTIONS: HeroMotion[] = ['enter', 'brake', 'break', 'lift', 'hit'];

describe('animations on the UI thread', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test.each(MOTIONS)('the hero runs its "%s" motion', (motion) => {
    const plate = motion === 'break' || motion === 'lift' || motion === 'hit';
    runThrough(
      <PosterHero
        tone={motion === 'brake' ? 'amber' : 'big_green'}
        angleDeg={-45}
        celebrating={plate}
        headline="On pace"
        subline={plate ? null : 'Keep going.'}
        rateLine={plate ? { rate: '−0.70%', detail: 'your zone −0.5 to −1.0' } : null}
        chip={plate ? null : { icon: 'down', label: 'Nice' }}
        motion={motion}
        topInset={47}
        nav={{ onHistory: () => undefined, onSettings: () => undefined }}
        accessibilityLabel="On pace"
      />,
    );
  });

  test('the onboarding arrow and its confetti run', () => {
    runThrough(<TrendArrow tone="big_green" angleDeg={-90} celebrating accessibilityLabel="arrow" />);
    runThrough(<TrendArrow tone="gray" angleDeg={0} dash dimmed accessibilityLabel="dash" />);
    const progress = { get: () => 0, set: () => undefined } as unknown as SharedValue<number>;
    runThrough(<CelebrationBurst progress={progress} size={220} />);
  });
});

const LOSE: Goal = {
  type: 'lose',
  targetKg: 70,
  targetBandPct: 1,
  optimalMinPct: 0.5,
  optimalMaxPct: 1,
  flatBandPct: 0.1,
};
const SETTINGS: TrendSettings = { smoothing: { method: 'ema', alpha: 0.1 }, slopeLookbackDays: 14, sameDayRule: 'first' };

function history(days: number[], kgAt: (day: number) => number): WeighIn[] {
  return days.map((d) => {
    const date = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
    return { id: `w${d}`, timestamp: `${date}T07:00:00+00:00`, weightKg: kgAt(d), source: 'manual' as const, excluded: false };
  });
}
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const asOf = (day: number) => new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);

describe('home and History render and animate for any history', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const cases: [string, number[], (d: number) => number][] = [
    ['one weigh-in', [0], () => 80],
    ['two weigh-ins', [0, 1], (d) => 80 - d * 0.1],
    ['on pace', range(0, 40), (d) => 80 - d * 0.08],
    ['too fast', range(0, 40), (d) => 80 - d * 0.25],
    ['flat', range(0, 40), () => 80],
    ['wrong way', range(0, 40), (d) => 80 + d * 0.08],
    ['slow', range(0, 40), (d) => 80 - d * 0.03],
    ['a long break, then one weigh-in', [...range(0, 20), 90], (d) => 80 - d * 0.08],
    ['a long break, then a week', [...range(0, 20), ...range(90, 97)], (d) => 80 - d * 0.08],
    ['old imported history with many breaks', [0, 40, 41, 100, 180, 181, 182, 300, 301], (d) => 85 - d * 0.02],
  ];

  test.each(cases)('%s', (_name, days, kgAt) => {
    for (const goal of [LOSE, { ...LOSE, type: 'gain' as const, targetKg: 90 }, { ...LOSE, type: 'maintain' as const, targetKg: 80 }]) {
      for (const today of [days[days.length - 1], days[days.length - 1] + 30]) {
        const analysis = analyze(history(days, kgAt), goal, SETTINGS, asOf(today));
        runThrough(<ArrowSummary analysis={analysis} goal={goal} unit="kg" topInset={47} nav={{ onSettings: () => undefined }} />);

        // What the History screen builds from the same analysis.
        const weighIns = history(days, kgAt);
        expect(historyRows(weighIns, analysis.series)).toHaveLength(days.length);
        for (const { days: span } of HISTORY_RANGES) {
          const points = pointsInRange(analysis.series, span, asOf(today));
          weeklyReadings(points, goal);
          render(<HistoryChart points={points} goalKg={goal.targetKg} unit="lb" />);
        }
      }
    }
  });
});
