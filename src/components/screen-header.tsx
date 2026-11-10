import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The Poster page top: a round back button, where it goes back to, and a big uppercase title. */
export function ScreenHeader({ back, title }: { back: string; title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Back to ${back}`}
        hitSlop={8}
        onPress={() => router.back()}
        style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}>
        <View style={[styles.round, { borderColor: theme.text }]}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="15,5 8,12 15,19" />
          </Svg>
        </View>
        <Text style={[styles.backLabel, { color: theme.text }]}>{back}</Text>
      </Pressable>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 14,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'flex-start',
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLabel: {
    fontFamily: Type.bold,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Type.display,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -0.8,
    textTransform: 'uppercase',
  },
});
