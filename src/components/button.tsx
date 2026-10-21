import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, ToneColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'plain';
};

export function Button({ label, variant = 'primary', disabled, ...rest }: ButtonProps) {
  const theme = useTheme();
  const background =
    variant === 'primary' ? ToneColors.big_green : variant === 'secondary' ? theme.backgroundElement : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'plain' && styles.plain,
        { backgroundColor: background, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
      {...rest}>
      <ThemedText type="smallBold" style={variant === 'primary' && styles.primaryLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  plain: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
});
