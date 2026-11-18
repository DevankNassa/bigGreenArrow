import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

/**
 * Shown in place of a screen that threw while rendering, so one bad screen
 * doesn't close the app on every launch. Uses only system fonts and plain
 * views: it must render even when the rest of the app can't.
 */
export function ScreenError({ error, retry }: ErrorBoundaryProps) {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Your weigh-ins are safe. Try again, and if this keeps happening, send the details below
        with your TestFlight feedback.
      </Text>
      <Text selectable style={[styles.detail, { color: colors.textSecondary }]}>
        {error.message}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={({ pressed }) => [styles.button, { backgroundColor: colors.text, opacity: pressed ? 0.7 : 1 }]}>
        <Text style={[styles.buttonText, { color: colors.background }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  detail: { fontSize: 13, lineHeight: 18 },
  button: { alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
