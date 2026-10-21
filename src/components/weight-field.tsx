import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, ToneColors } from '@/constants/theme';
import { toKg, type WeightUnit } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { checkWeightKg, formatWeightValue, parseWeightInput } from '@/lib/weight-input';

export type WeightFieldChange = { kg: number | undefined; valid: boolean };

type WeightFieldProps = {
  label: string;
  /** Starting value in kg. Remount (via `key`) to reset it, e.g. after a unit change. */
  initialKg: number | undefined;
  unit: WeightUnit;
  placeholder?: string;
  onChange: (change: WeightFieldChange) => void;
};

/** A labelled weight input in the user's unit. Empty is valid and reports `kg: undefined`. */
export function WeightField({ label, initialKg, unit, placeholder, onChange }: WeightFieldProps) {
  const theme = useTheme();
  const [text, setText] = useState(initialKg === undefined ? '' : formatWeightValue(initialKg, unit));

  const value = parseWeightInput(text);
  const kg = value === null ? undefined : toKg(value, unit);
  const error =
    text.trim() === ''
      ? null
      : kg === undefined
        ? 'Enter a number, like 82.4'
        : checkWeightKg(kg)
          ? "That doesn't look like a body weight"
          : null;

  function update(next: string) {
    setText(next);
    const v = parseWeightInput(next);
    const k = v === null ? undefined : toKg(v, unit);
    const empty = next.trim() === '';
    onChange({ kg: empty ? undefined : k, valid: empty || (k !== undefined && !checkWeightKg(k)) });
  }

  return (
    <View style={styles.field}>
      <ThemedText>{label}</ThemedText>
      <View style={[styles.inputRow, { borderColor: error ? ToneColors.red : theme.backgroundSelected }]}>
        <TextInput
          value={text}
          onChangeText={update}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={`${label} in ${unit}`}
          style={[styles.input, { color: theme.text }]}
        />
        <ThemedText themeColor="textSecondary">{unit}</ThemedText>
      </View>
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 18,
    paddingVertical: Spacing.two,
    // On web an input's default width can overflow the row.
    minWidth: 0,
  },
  error: {
    color: ToneColors.red,
  },
});
