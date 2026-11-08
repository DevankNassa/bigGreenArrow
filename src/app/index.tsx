import { Link, Redirect, router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowSummary } from '@/components/arrow-summary';
import { Button } from '@/components/button';
import { PosterHero } from '@/components/poster-hero';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-context';
import { analyze } from '@/engine';
import { localIsoDate } from '@/lib/dates';

export default function HomeScreen() {
  const { weighIns, preferences } = useData();
  const insets = useSafeAreaInsets();
  const { goal, trend, unit } = preferences;
  const analysis = analyze(weighIns, goal, trend, localIsoDate());

  if (!preferences.onboarded) return <Redirect href="/onboarding" />;

  const nav = {
    onHistory: weighIns.length > 0 ? () => router.push('/history') : undefined,
    onSettings: () => router.push('/settings'),
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        {weighIns.length === 0 ? (
          <>
            <PosterHero
              tone="gray"
              angleDeg={0}
              dimmed
              headline="Welcome"
              subline="Log your first weigh-in."
              motion="enter"
              topInset={insets.top}
              nav={nav}
              accessibilityLabel="No weigh-ins yet"
            />
            <View style={styles.empty}>
              <ThemedText themeColor="textSecondary">
                The scale jumps around from day to day. Log your weight each morning and the arrow
                will show where your trend is really heading.
              </ThemedText>
            </View>
          </>
        ) : (
          <ArrowSummary analysis={analysis} goal={goal} unit={unit} topInset={insets.top} nav={nav} />
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.actions}>
        <Button label="+ Log weight" onPress={() => router.push('/log')} />
        {__DEV__ && (
          <Link href="/demo" style={styles.demoLink}>
            <ThemedText type="small" themeColor="textSecondary">
              Demo scenarios
            </ThemedText>
          </Link>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: Spacing.four,
  },
  empty: {
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  actions: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  demoLink: {
    alignSelf: 'center',
  },
});
