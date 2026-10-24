import { Link, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowSummary } from '@/components/arrow-summary';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrendArrow } from '@/components/trend-arrow';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-context';
import { analyze } from '@/engine';
import { localIsoDate } from '@/lib/dates';

export default function HomeScreen() {
  const { weighIns, preferences } = useData();
  const { goal, trend, unit } = preferences;
  const analysis = analyze(weighIns, goal, trend, localIsoDate());

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {weighIns.length === 0 ? (
          <View style={styles.empty}>
            <TrendArrow tone="gray" angleDeg={0} dimmed accessibilityLabel="No weigh-ins yet" />
            <ThemedText type="subtitle">Welcome</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              The scale jumps around from day to day. Log your weight each morning and the arrow
              will show where your trend is really heading.
            </ThemedText>
          </View>
        ) : (
          <ArrowSummary analysis={analysis} goal={goal} unit={unit} />
        )}

        <View style={styles.actions}>
          <Button label="+ Log weight" onPress={() => router.push('/log')} />
          {__DEV__ && (
            <Link href="/demo">
              <ThemedText type="small" themeColor="textSecondary">
                Demo scenarios
              </ThemedText>
            </Link>
          )}
        </View>
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
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
});
