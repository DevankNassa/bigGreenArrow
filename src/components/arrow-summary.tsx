import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { PosterHero, heroSettleMs, type HeroMotion } from '@/components/poster-hero';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Type } from '@/constants/theme';
import { fromKg, type Analysis, type ArrowReading, type Goal, type WeightUnit } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { confidenceNote, stateLabel } from '@/lib/arrow-labels';
import { formatWeight, formatWeightValue } from '@/lib/weight-input';

function signed(n: number, digits: number): string {
  const text = Math.abs(n).toFixed(digits);
  if (Number(text) === 0) return text;
  return `${n > 0 ? '+' : '−'}${text}`;
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
  actions,
}: {
  analysis: Analysis;
  goal: Goal;
  unit: WeightUnit;
  /** Safe-area inset the hero extends under. */
  topInset?: number;
  actions?: ReactNode;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { arrow, latest, confidence } = analysis;
  // A rate from a handful of points is noise; show it only once the arrow is live.
  const rate = arrow ? latest?.rate : null;
  const label = arrow ? stateLabel(arrow.state, goal.type) : 'Calibrating';
  const note = confidenceNote(confidence);
  const motion = heroMotion(arrow, goal);
  const rise = reduceMotion ? 0 : heroSettleMs(motion);
  const tooFast = arrow?.state === 'too_fast';

  const subline = !rate
    ? null
    : `${signed(rate.pctPerWeek, 2)}% a week.${
        tooFast ? ` Above your ${goal.optimalMaxPct}% limit.` : arrow?.celebrating ? ' Right on pace.' : ''
      }`;

  const rows: { label: string; value: ReactNode }[] = [];
  if (latest) rows.push({ label: 'Scale today', value: formatWeight(latest.weightKg, unit) });
  if (rate) rows.push({ label: 'Per week', value: `${signed(fromKg(rate.kgPerWeek, unit), 2)} ${unit}` });
  if (tooFast) rows.push({ label: 'Your limit', value: `${goal.type === 'lose' ? '−' : '+'}${goal.optimalMaxPct}% / week` });
  if (arrow?.celebrating) {
    rows.push({
      label: goal.type === 'maintain' ? 'Days holding steady' : 'Days on pace',
      value: <Roll from={Math.max(0, arrow.streakDays - 1)} to={arrow.streakDays} delay={rise + 700} animate={!reduceMotion} />,
    });
  }
  if (analysis.daysToTarget !== null && analysis.daysToTarget > 0 && goal.targetKg) {
    rows.push({
      label: `To reach ${formatWeight(goal.targetKg, unit)}`,
      value: `~${Math.ceil(analysis.daysToTarget / 7)} weeks`,
    });
  }

  return (
    <>
      <PosterHero
        key={arrow?.state ?? 'calibrating'}
        tone={arrow?.tone ?? 'gray'}
        angleDeg={arrow?.angleDeg ?? 0}
        dash={arrow?.state === 'flat'}
        dimmed={confidence.level !== 'ok'}
        headline={label}
        subline={subline}
        motion={motion}
        topInset={topInset}
        actions={actions}
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

        {rows.length > 0 && (
          <View style={[styles.rows, { borderBottomColor: theme.text }]}>
            {rows.map((r, i) => (
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

        {tooFast && (
          <Rise delay={rise + 150 * (rows.length + 1)} animate={!reduceMotion}>
            <ThemedText>
              You&apos;re {goal.type === 'lose' ? 'losing' : 'gaining'} faster than your {goal.optimalMaxPct}%/week limit.{' '}
              {goal.type === 'lose'
                ? 'Consider eating a bit more to protect muscle.'
                : 'Consider easing off a little so the gain stays lean.'}
            </ThemedText>
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
