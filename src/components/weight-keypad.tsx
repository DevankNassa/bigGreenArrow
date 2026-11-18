import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/lib/haptics';
import type { WeightKey } from '@/lib/weight-input';

const ROWS: readonly (readonly WeightKey[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
];

type WeightKeypadProps = {
  onKey: (key: WeightKey) => void;
  /** Long-pressing backspace clears the whole value. */
  onClear: () => void;
};

/** The app's own number pad for typing a weight, in place of the system keyboard. */
export function WeightKeypad({ onKey, onClear }: WeightKeypadProps) {
  const theme = useTheme();

  return (
    <View style={styles.pad}>
      {ROWS.map((row) => (
        <View key={row.join('')} style={styles.row}>
          {row.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="keyboardkey"
              accessibilityLabel={key === 'back' ? 'Delete' : key === '.' ? 'Decimal point' : key}
              accessibilityHint={key === 'back' ? 'Hold to clear' : undefined}
              onPress={() => {
                haptic('tick');
                onKey(key);
              }}
              onLongPress={
                key === 'back'
                  ? () => {
                      haptic('rigid');
                      onClear();
                    }
                  : undefined
              }
              style={({ pressed }) => [
                styles.key,
                { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
              ]}>
              <ThemedText style={styles.label}>{key === 'back' ? '⌫' : key}</ThemedText>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  key: {
    flex: 1,
    height: 56,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Type.semiBold,
    fontSize: 26,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
});
