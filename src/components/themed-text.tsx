import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Type.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Type.bold,
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: Type.medium,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: Type.display,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: Type.display,
    fontSize: 28,
    lineHeight: 32,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: Type.semiBold,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Type.semiBold,
    lineHeight: 30,
    fontSize: 14,
    color: '#0F7A3A',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
