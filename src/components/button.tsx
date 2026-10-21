import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, ToneColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'plain';
};

export function Button({ label, variant = 'primary', disabled, ...rest }: ButtonProps) {
  const theme = useTheme();
  const background = {
    primary: ToneColors.big_green,
    secondary: theme.backgroundElement,
    destructive: ToneColors.red,
    plain: 'transparent',
  }[variant];
  const filled = variant === 'primary' || variant === 'destructive';

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
      <ThemedText type="smallBold" style={filled && styles.filledLabel}>
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
  filledLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
});
