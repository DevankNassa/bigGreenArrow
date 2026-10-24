import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing, ToneColors } from '@/constants/theme';

type StepperProps = {
  label: string;
  hint?: string;
  value: number;
  step: number;
  min: number;
  max: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  /** Tint the value amber, e.g. for a pace above the 1% warning line. */
  warn?: boolean;
};

/** Steps `value` by `delta`, clamped, without float noise. */
export function stepValue(value: number, delta: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round((value + delta) * 100) / 100));
}

/** A labelled −/+ control. Screen readers treat it as one adjustable value. */
export function Stepper({ label, hint, value, step, min, max, format, onChange, warn }: StepperProps) {
  const change = (delta: number) => onChange(stepValue(value, delta, min, max));

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => change(e.nativeEvent.actionName === 'increment' ? step : -step)}>
      <View style={styles.text}>
        <ThemedText>{label}</ThemedText>
        {hint && (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        )}
      </View>
      <View style={styles.controls}>
        <Button label="−" variant="secondary" compact disabled={value <= min} onPress={() => change(-step)} />
        <ThemedText type="smallBold" style={[styles.value, warn && styles.warn]}>
          {format(value)}
        </ThemedText>
        <Button label="+" variant="secondary" compact disabled={value >= max} onPress={() => change(step)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  value: {
    minWidth: 60,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  warn: {
    color: ToneColors.amber,
  },
});
