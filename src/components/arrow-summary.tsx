import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { MiniFlame } from '@/components/hero-fx';
import { PosterHero, heroSettleMs, type HeroMotion } from '@/components/poster-hero';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Type } from '@/constants/theme';
import { fromKg, type Analysis, type ArrowReading, type Goal, type WeightUnit } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { confidenceNote, heroAdvice, heroChip, heroHeadline, heroSublineTail } from '@/lib/arrow-labels';
import { formatWeight, formatWeightValue } from '@/lib/weight-input';

function signed(n: number, digits: number): string {
  const text = Math.abs(n).toFixed(digits);
  if (Number(text) === 0) return text;
  return `${n > 0 ? '+' : '−'}${text}`;
}

/** A pace as the user typed it: 0.5 → "0.5", 1 → "1.0", 0.25 → "0.25". */
function pace(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : String(Number(n.toFixed(2)));
}

/** Which hero motion a reading gets (SPEC §6.5). */
export function heroMotion(arrow: ArrowReading | null, goal: Goal): HeroMotion {
  if (!arrow) return 'enter';
  if (arrow.state === 'too_fast') return 'brake';
  if (arrow.state === 'on_target') return 'stamp';
  if (arrow.state === 'optimal') return goal.type === 'gain' ? 'smash_up' : 'smash_down';
  return 'enter';
}

/** The Poster home screen for one analysis: the hero block, then the numbers on paper. */
export function ArrowSummary({
  analysis,
  goal,
  unit,
  topInset = 0,
  nav,
}: {
  analysis: Analysis;
  goal: Goal;
  unit: WeightUnit;
  /** Safe-area inset the hero extends under. */
  topInset?: number;
  nav?: { onHistory?: () => void; onSettings: () => void };
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { arrow, latest, confidence } = analysis;
  const rate = arrow ? latest?.rate : null;
  const state = arrow?.state;
  const celebrating = arrow?.celebrating ?? false;
  const label = arrow ? heroHeadline(arrow.state, goal.type) : 'Calibrating';
  const note = confidenceNote(confidence);
  const motion = heroMotion(arrow, goal);
  const rise = reduceMotion ? 0 : heroSettleMs(motion);
  const pct = rate?.pctPerWeek ?? 0;
  const toward = goal.type === 'lose' ? '−' : '+';
  const target = goal.targetKg !== undefined ? formatWeight(goal.targetKg, unit) : null;

  const subline =
    !rate || !state || celebrating
      ? null
      : `${signed(pct, Math.abs(pct) < 0.1 ? 2 : 1)}% a week. ${heroSublineTail(state, goal, pct)}`.trim();
  const rateLine =
    rate && celebrating
      ? {
          rate: `${signed(pct, 2)}%`,
          detail:
            goal.type === 'maintain'
              ? target
                ? `band ${target} ± ${pace(goal.targetBandPct)}%`
                : `steady within ±${pace(goal.flatBandPct)}%`
              : `your zone ${toward}${pace(goal.optimalMinPct)} to ${toward}${pace(goal.optimalMaxPct)}`,
        }
      : null;

  const streakValue = arrow && (
    <View style={styles.streak}>
      <MiniFlame animate={!reduceMotion} />
      <Roll from={Math.max(0, arrow.streakDays - 1)} to={arrow.streakDays} delay={rise + 700} animate={!reduceMotion} />
    </View>
  );
  const toReach =
    analysis.daysToTarget !== null && analysis.daysToTarget > 0 && target
      ? { label: `To reach ${target}`, value: `~${Math.ceil(analysis.daysToTarget / 7)} weeks` }
      : null;
  const optimalStarts = { label: 'Optimal starts at', value: `${toward}${pace(goal.optimalMinPct)}% / week` };
  const targetRow = target ? { label: 'Target', value: `${target} ± ${pace(goal.targetBandPct)}%` } : null;

  const rows: ({ label: string; value: ReactNode } | null | undefined | false)[] = [
    latest && { label: 'Scale today', value: formatWeight(latest.weightKg, unit) },
  ];
  switch (state) {
    case 'optimal':
      rows.push({ label: 'Days on pace', value: streakValue }, toReach);
      break;
    case 'on_target':
      rows.push({ label: 'Days holding steady', value: streakValue }, targetRow);
      break;
    case 'too_fast':
      rows.push({ label: 'Your limit', value: `${toward}${pace(goal.optimalMaxPct)}% / week` });
      break;
    case 'slow_right':
      rows.push(optimalStarts, toReach);
      break;
    case 'flat':
      rows.push({ label: 'Days flat', value: String(arrow!.daysInState) }, optimalStarts);
      break;
    case 'slow_wrong':
    case 'wrong_way': {
      const from = analysis.series.find((p) => p.day >= latest!.day - 14) ?? latest!;
      rows.push(
        { label: 'Last 14 days', value: `${signed(fromKg(latest!.trendKg - from.trendKg, unit), 1)} ${unit}` },
        { label: 'Your goal', value: `${goal.type === 'lose' ? 'Lose' : 'Gain'}${target ? ` to ${target}` : ''}` },
      );
      break;
    }
    case 'drifting':
    case 'off_target':
    case 'returning':
      rows.push(targetRow);
      break;
  }
  const shown = rows.filter((r): r is { label: string; value: ReactNode } => !!r);
  const advice = state ? heroAdvice(state, goal) : null;

  return (
    <>
      <PosterHero
        key={arrow?.state ?? 'calibrating'}
        tone={arrow?.tone ?? 'gray'}
        angleDeg={arrow?.angleDeg ?? 0}
        dimmed={confidence.level === 'low' || confidence.level === 'calibrating'}
        celebrating={celebrating}
        chip={arrow && !celebrating ? heroChip(arrow.state, goal.type, pct) : null}
        headline={label}
        subline={subline}
        rateLine={rateLine}
        motion={motion}
        topInset={topInset}
        nav={nav}
        accessibilityLabel={rate ? `${label}, ${signed(rate.pctPerWeek, 1)} percent per week` : label}
      />

      <View style={styles.paper}>
        {latest && (
          <Rise delay={rise} animate={!reduceMotion} style={styles.trend}>
            <Text style={[styles.trendNumber, { color: theme.text }]}>{formatWeightValue(latest.trendKg, unit)}</Text>
            <Text style={[styles.trendUnit, { color: theme.text }]}>{`${unit}\ntrend`}</Text>
          </Rise>
        )}

        {note && (
          <Rise delay={rise} animate={!reduceMotion}>
            <ThemedText themeColor="textSecondary">{note}</ThemedText>
          </Rise>
        )}

        {shown.length > 0 && (
          <View style={[styles.rows, { borderBottomColor: theme.text }]}>
            {shown.map((r, i) => (
              <Rise key={r.label} delay={rise + 150 * (i + 1)} animate={!reduceMotion}>
                <View style={[styles.row, { borderTopColor: theme.text }]}>
                  <ThemedText type="smallBold" style={styles.rowLabel}>
                    {r.label}
                  </ThemedText>
                  {typeof r.value === 'string' ? (
                    <Text style={[styles.rowValue, { color: theme.text }]}>{r.value}</Text>
                  ) : (
                    r.value
                  )}
                </View>
              </Rise>
            ))}
          </View>
        )}

        {advice && (
          <Rise delay={rise + 150 * (shown.length + 1)} animate={!reduceMotion}>
            <ThemedText style={styles.advice}>{advice}</ThemedText>
          </Rise>
        )}
      </View>
    </>
  );
}

/** Fades and slides a block up into place after `delay` ms. */
function Rise({
  delay,
  animate,
  style,
  children,
}: {
  delay: number;
  animate: boolean;
  style?: object;
  children: ReactNode;
}) {
  const p = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) p.set(withDelay(delay, withSpring(1, { damping: 14, stiffness: 180 })));
  }, [animate, delay, p]);
  const anim = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.get() * 1.5),
    transform: [{ translateY: (1 - p.get()) * 24 }],
  }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

const ROLL_LINE = 22;

/** A number that rolls over from `from` to `to`, like an odometer. */
function Roll({ from, to, delay, animate }: { from: number; to: number; delay: number; animate: boolean }) {
  const theme = useTheme();
  const p = useSharedValue(animate && from !== to ? 0 : 1);
  useEffect(() => {
    if (animate && from !== to) p.set(withDelay(delay, withSpring(1, { damping: 12, stiffness: 160 })));
  }, [animate, delay, from, p, to]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: -ROLL_LINE * p.get() }] }));
  return (
    <View style={styles.roll} accessible accessibilityLabel={String(to)}>
      <Animated.View style={anim}>
        {[from, to].map((n, i) => (
          <Text key={i} style={[styles.rowValue, styles.rollLine, { color: theme.text }]}>
            {n}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  trendNumber: {
    fontFamily: Type.display,
    fontSize: 80,
    lineHeight: 80,
    letterSpacing: -2,
  },
  trendUnit: {
    fontFamily: Type.bold,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingBottom: 8,
  },
  rows: {
    borderBottomWidth: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 2,
  },
  rowLabel: {
    fontSize: 15,
  },
  rowValue: {
    fontFamily: Type.display,
    fontSize: 17,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  advice: {
    fontFamily: Type.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  roll: {
    height: ROLL_LINE,
    overflow: 'hidden',
  },
  rollLine: {
    height: ROLL_LINE,
    lineHeight: ROLL_LINE,
    textAlign: 'right',
  },
});
