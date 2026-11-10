import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowSummary } from '@/components/arrow-summary';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-context';
import { SCENARIOS } from '@/demo/scenarios';
import { DEFAULT_TREND_SETTINGS, analyze } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { localIsoDate } from '@/lib/dates';

/** Development-only screen for trying every arrow state on sample data. */
export default function DemoScreen() {
  const theme = useTheme();
  const { weighIns, addWeighIn, deleteWeighIn, setPreferences } = useData();
  const [loading, setLoading] = useState(false);
  const [scenarioKey, setScenarioKey] = useState(SCENARIOS[0].key);
  // Remounting the summary replays the entrance and any celebration.
  const [replays, setReplays] = useState(0);
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

        <ScrollView style={styles.summary} contentContainerStyle={styles.summaryContent}>
          <ArrowSummary key={`${scenarioKey}-${replays}`} analysis={analysis} goal={scenario.goal} unit="kg" />
        </ScrollView>

        <Button label="Replay animation" variant="secondary" onPress={() => setReplays((n) => n + 1)} />
        <Button
          label={loading ? 'Loading…' : 'Use this data in the app'}
          disabled={loading}
          onPress={async () => {
            // Replaces every weigh-in, so History and Settings can be tried on the sample.
            setLoading(true);
            for (const w of weighIns) await deleteWeighIn(w.id);
            for (const w of scenario.weighIns) await addWeighIn(w);
            await setPreferences({ goal: scenario.goal, onboarded: true });
            setLoading(false);
            router.replace('/');
          }}
        />
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
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  summary: {
    alignSelf: 'stretch',
  },
  summaryContent: {
    paddingBottom: Spacing.three,
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
