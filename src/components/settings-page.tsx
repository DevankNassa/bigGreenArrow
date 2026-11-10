import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/** A settings sub-screen: Poster header, scrolling body, and a footer (the Save bar) pinned below. */
export function SettingsPage({
  title,
  footer,
  scrollEnabled = true,
  children,
}: {
  title: string;
  footer?: ReactNode;
  scrollEnabled?: boolean;
  children: ReactNode;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}>
          <ScreenHeader back="Settings" title={title} />
          <View style={styles.content}>{children}</View>
        </ScrollView>
        {footer}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: 14,
  },
  content: {
    gap: Spacing.four,
  },
});
