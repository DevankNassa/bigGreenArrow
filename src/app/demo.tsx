import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowSummary } from '@/components/arrow-summary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { SCENARIOS } from '@/demo/scenarios';
import { DEFAULT_TREND_SETTINGS, analyze } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { localIsoDate } from '@/lib/dates';

/** Development-only screen for trying every arrow state on sample data. */
export default function DemoScreen() {
  const theme = useTheme();
  const [scenarioKey, setScenarioKey] = useState(SCENARIOS[0].key);
  const scenario = SCENARIOS.find((s) => s.key === scenarioKey)!;
  const analysis = analyze(scenario.weighIns, scenario.goal, DEFAULT_TREND_SETTINGS, localIsoDate());

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipRow}>
          {SCENARIOS.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => setScenarioKey(s.key)}
              style={[
                styles.chip,
                { backgroundColor: s.key === scenarioKey ? theme.backgroundSelected : theme.backgroundElement },
              ]}>
              <ThemedText type="small">{s.label}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
        <ThemedText type="small" themeColor="textSecondary">
          Demo data · goal: {scenario.goal.type}
        </ThemedText>

        <ArrowSummary analysis={analysis} goal={scenario.goal} unit="kg" />
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
    paddingBottom: Spacing.five,
  },
  chipRow: {
    flexGrow: 0,
    alignSelf: 'stretch',
  },
  chips: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
});
