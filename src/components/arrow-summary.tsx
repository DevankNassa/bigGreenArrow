import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TrendArrow } from '@/components/trend-arrow';
import { Spacing, ToneColors } from '@/constants/theme';
import { fromKg, type Analysis, type Goal, type WeightUnit } from '@/engine';
import { confidenceNote, stateLabel } from '@/lib/arrow-labels';
import { formatWeight } from '@/lib/weight-input';

function signed(n: number, digits: number): string {
  const text = Math.abs(n).toFixed(digits);
  if (Number(text) === 0) return text;
  return `${n > 0 ? '+' : '−'}${text}`;
}

/** The arrow and the numbers under it, for one analysis. */
export function ArrowSummary({
  analysis,
  goal,
  unit,
}: {
  analysis: Analysis;
  goal: Goal;
  unit: WeightUnit;
}) {
  const { arrow, latest, confidence } = analysis;
  // A rate from a handful of points is noise; show it only once the arrow is live.
  const rate = arrow ? latest?.rate : null;
  const label = arrow ? stateLabel(arrow.state, goal.type) : 'Calibrating';
  const note = confidenceNote(confidence);

  return (
    <>
      <View style={styles.hero}>
        <TrendArrow
          tone={arrow?.tone ?? 'gray'}
          angleDeg={arrow?.angleDeg ?? 0}
          dash={arrow?.state === 'flat'}
          celebrating={arrow?.celebrating}
          dimmed={confidence.level !== 'ok'}
          accessibilityLabel={rate ? `${label}, ${signed(rate.pctPerWeek, 1)} percent per week` : label}
        />
        <ThemedText type="subtitle" style={{ color: ToneColors[arrow?.tone ?? 'gray'] }}>
          {label}
        </ThemedText>
        {note && (
          <ThemedText type="small" themeColor="textSecondary">
            {note}
          </ThemedText>
        )}
      </View>

      {latest && (
        <View style={styles.stats}>
          <ThemedText type="title">{formatWeight(latest.trendKg, unit)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            trend weight
          </ThemedText>
          {rate && (
            <ThemedText>
              {signed(rate.pctPerWeek, 2)}% / week ({signed(fromKg(rate.kgPerWeek, unit), 2)} {unit})
            </ThemedText>
          )}
          <ThemedText type="small" themeColor="textSecondary">
            Latest scale: {formatWeight(latest.weightKg, unit)}
          </ThemedText>
          {arrow?.celebrating && (
            <ThemedText type="smallBold">
              🔥 {arrow.streakDays} days {goal.type === 'maintain' ? 'holding steady' : 'on pace'}
            </ThemedText>
          )}
          {analysis.daysToTarget !== null && analysis.daysToTarget > 0 && goal.targetKg && (
            <ThemedText type="small">
              ~{Math.ceil(analysis.daysToTarget / 7)} weeks to {formatWeight(goal.targetKg, unit)}
            </ThemedText>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  stats: {
    alignItems: 'center',
    gap: Spacing.one,
  },
});
