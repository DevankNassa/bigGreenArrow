import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { ToneColors, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A labelled group of rows, ruled top and bottom in ink. */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View>
      <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.group, { borderBottomColor: theme.text }]}>{children}</View>
    </View>
  );
}

function Chevron({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="9,5 16,12 9,19" />
    </Svg>
  );
}

/** A row that opens another screen or does something, with its current value on the right. */
export function SettingsRow({
  label,
  value,
  accessory,
  hint,
  destructive,
  onPress,
}: {
  label: string;
  value?: string;
  /** Drawn before the chevron instead of a text value, e.g. the zone bar. */
  accessory?: ReactNode;
  hint?: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const color = destructive ? ToneColors.red : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderTopColor: theme.text, opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
      {accessory}
      {value !== undefined && <Text style={[styles.value, { color }]}>{value}</Text>}
      {!destructive && <Chevron color={theme.text} />}
    </Pressable>
  );
}

/** A row with an on/off switch. */
export function SettingsSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (on: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderTopColor: theme.text }]}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: ToneColors.big_green, false: theme.backgroundSelected }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.backgroundSelected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: {
    paddingTop: 8,
    paddingBottom: 6,
    fontFamily: Type.bold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  group: {
    borderBottomWidth: 2,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 2,
  },
  label: {
    flex: 1,
    fontFamily: Type.semiBold,
    fontSize: 15,
  },
  value: {
    fontFamily: Type.display,
    fontSize: 15,
  },
});
