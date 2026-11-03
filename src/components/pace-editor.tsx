import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, ToneColors } from '@/constants/theme';
import { PACE_WARNING_PCT, fromKg, type Goal, type WeightUnit } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { PACE_PRESETS, matchingPreset, paceKgPerWeek, weeksToTarget } from '@/lib/pace';
import { formatWeight } from '@/lib/weight-input';

type PaceEditorProps = {
  /** A lose or gain goal. */
  goal: Goal;
  onChange: (goal: Goal) => void;
  unit: WeightUnit;
  /** Body weight for translating percentages into kg/lb per week. */
  atKg: number | undefined;
};

/** Chooses the optimal pace from preset chips; the arrow-zones slider fine-tunes it (SPEC §7.5.1). */
export function PaceEditor({ goal, onChange, unit, atKg }: PaceEditorProps) {
  const theme = useTheme();
  if (goal.type === 'maintain') return null;

  const preset = matchingPreset(goal);
  const verb = goal.type === 'lose' ? 'Losing' : 'Gaining';
  const kgRange = atKg === undefined ? null : paceKgPerWeek(goal, atKg);
  const weeks = atKg === undefined ? null : weeksToTarget(goal, atKg);
  const aboveLimit = goal.optimalMaxPct > PACE_WARNING_PCT;

  return (
    <View style={styles.editor}>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Pace presets">
        {PACE_PRESETS[goal.type].map((p) => {
          const selected = preset?.label === p.label;
          return (
            <Pressable
              key={p.label}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityHint={`${p.minPct} to ${p.maxPct} percent per week`}
              onPress={() => onChange({ ...goal, optimalMinPct: p.minPct, optimalMaxPct: p.maxPct })}
              style={[
                styles.chip,
                { backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement },
              ]}>
              <ThemedText type={selected ? 'smallBold' : 'small'}>{p.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {p.minPct}–{p.maxPct}%
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Percent of body weight per week.
        {kgRange &&
          atKg !== undefined &&
          ` At ${formatWeight(atKg, unit)} that's ${fromKg(kgRange[0], unit).toFixed(2)}–${fromKg(kgRange[1], unit).toFixed(2)} ${unit} per week.`}
        {weeks && goal.targetKg !== undefined && ` About ${weeks[0]}–${weeks[1]} weeks to ${formatWeight(goal.targetKg, unit)}.`}
      </ThemedText>

      {aboveLimit && (
        <View style={[styles.caution, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">
            ⚠️ Above {PACE_WARNING_PCT}%/week. {verb} this fast{' '}
            {goal.type === 'lose' ? 'risks losing muscle.' : 'tends to add mostly fat.'}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: {
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  caution: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderLeftWidth: 4,
    borderLeftColor: ToneColors.amber,
  },
});
