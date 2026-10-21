import { StyleSheet, View } from 'react-native';

import { Segmented } from '@/components/segmented';
import { Stepper } from '@/components/stepper';
import { ThemedText } from '@/components/themed-text';
import { WeightField } from '@/components/weight-field';
import { Spacing } from '@/constants/theme';
import type { Goal, GoalType, WeightUnit } from '@/engine';
import { startingPace } from '@/lib/pace';
import { formatWeight } from '@/lib/weight-input';

const GOAL_OPTIONS = [
  { value: 'lose', label: 'Lose' },
  { value: 'gain', label: 'Gain' },
  { value: 'maintain', label: 'Maintain' },
] as const;

type GoalFieldsProps = {
  goal: Goal;
  onChange: (goal: Goal) => void;
  unit: WeightUnit;
  /** Current body weight, for spotting a target on the wrong side. */
  currentKg: number | undefined;
  onTargetValidity: (valid: boolean) => void;
};

/** Goal type, target weight, and (for maintain) the target band. */
export function GoalFields({ goal, onChange, unit, currentKg, onTargetValidity }: GoalFieldsProps) {
  function setType(type: GoalType) {
    if (type === goal.type) return;
    // Switching between lose and gain starts from that type's moderate pace.
    onChange({ ...goal, type, ...(type === 'maintain' ? {} : startingPace(type)) });
  }

  const wrongSide =
    goal.targetKg !== undefined &&
    currentKg !== undefined &&
    ((goal.type === 'lose' && goal.targetKg > currentKg) || (goal.type === 'gain' && goal.targetKg < currentKg));

  return (
    <View style={styles.fields}>
      <Segmented options={GOAL_OPTIONS} value={goal.type} onChange={setType} accessibilityLabel="Goal" />

      <WeightField
        key={unit}
        label={goal.type === 'maintain' ? 'Weight to maintain' : 'Target weight (optional)'}
        initialKg={goal.targetKg}
        unit={unit}
        placeholder={currentKg === undefined ? undefined : formatWeight(currentKg, unit).split(' ')[0]}
        onChange={({ kg, valid }) => {
          onTargetValidity(valid);
          if (valid) onChange({ ...goal, targetKg: kg });
        }}
      />
      {wrongSide && (
        <ThemedText type="small" themeColor="textSecondary">
          That target is {goal.type === 'lose' ? 'above' : 'below'} your current weight. Did you mean{' '}
          {goal.type === 'lose' ? 'Gain' : 'Lose'}?
        </ThemedText>
      )}

      {goal.type === 'maintain' && (
        <Stepper
          label="On-target band"
          hint="How far the trend can be from your target and still count as on target"
          value={goal.targetBandPct}
          step={0.5}
          min={0.5}
          max={5}
          format={(n) => `±${n.toFixed(1)}%`}
          onChange={(targetBandPct) => onChange({ ...goal, targetBandPct })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: Spacing.three,
  },
});
