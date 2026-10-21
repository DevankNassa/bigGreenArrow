import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrendArrow } from '@/components/trend-arrow';
import { MaxContentWidth, Spacing, ToneColors } from '@/constants/theme';
import { SCENARIOS } from '@/demo/scenarios';
import { DEFAULT_TREND_SETTINGS, analyze } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { confidenceNote, stateLabel } from '@/lib/arrow-labels';
import { localIsoDate } from '@/lib/dates';

function signed(n: number, digits: number): string {
  const text = Math.abs(n).toFixed(digits);
  if (Number(text) === 0) return text;
  return `${n > 0 ? '+' : '−'}${text}`;
}

export default function HomeScreen() {
  const theme = useTheme();
  const [scenarioKey, setScenarioKey] = useState(SCENARIOS[0].key);
  const scenario = SCENARIOS.find((s) => s.key === scenarioKey)!;

  const analysis = useMemo(
    () => analyze(scenario.weighIns, scenario.goal, DEFAULT_TREND_SETTINGS, localIsoDate()),
    [scenario],
  );
  const { arrow, latest, confidence } = analysis;
  const rate = latest?.rate;
  const label = arrow ? stateLabel(arrow.state, scenario.goal.type) : 'Calibrating';
  const note = confidenceNote(confidence);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
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

        <View style={styles.hero}>
          <TrendArrow
            tone={arrow?.tone ?? 'gray'}
            angleDeg={arrow?.angleDeg ?? 0}
            dash={arrow?.state === 'flat'}
            celebrating={arrow?.celebrating}
            dimmed={confidence.level !== 'ok'}
            accessibilityLabel={
              rate ? `${label}, ${signed(rate.pctPerWeek, 1)} percent per week` : label
            }
          />
          <ThemedText type="subtitle" style={{ color: ToneColors[arrow?.tone ?? 'gray'] }}>
            {label}
          </ThemedText>
          {note && (
            <ThemedText type="small" themeColor="textSecondary">
              {note}
            </ThemedText>
          )}
        </View>

        {latest && (
          <View style={styles.stats}>
            <ThemedText type="title">{latest.trendKg.toFixed(1)} kg</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              trend weight
            </ThemedText>
            {rate && (
              <ThemedText>
                {signed(rate.pctPerWeek, 2)}% / week ({signed(rate.kgPerWeek, 2)} kg)
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              Today&apos;s scale: {latest.weightKg.toFixed(1)} kg
            </ThemedText>
            {arrow?.celebrating && (
              <ThemedText type="smallBold">
                🔥 {arrow.streakDays} days {scenario.goal.type === 'maintain' ? 'holding steady' : 'on pace'}
              </ThemedText>
            )}
            {analysis.daysToTarget !== null && analysis.daysToTarget > 0 && (
              <ThemedText type="small">
                ~{Math.ceil(analysis.daysToTarget / 7)} weeks to {scenario.goal.targetKg} kg
              </ThemedText>
            )}
          </View>
        )}
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
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  stats: {
    alignItems: 'center',
    gap: Spacing.one,
  },
});
