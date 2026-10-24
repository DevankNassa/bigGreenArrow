import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, ToneColors } from '@/constants/theme';
import { useData } from '@/data/data-context';
import { newManualWeighIn } from '@/data/weigh-ins';
import { analyze, isLikelyOutlier, toKg, type IsoDate, type WeighIn } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { addDays, atTimeOf, localIsoDate, localIsoTimestamp } from '@/lib/dates';
import {
  MAX_WEIGHT_KG,
  MIN_WEIGHT_KG,
  checkWeightKg,
  formatWeight,
  formatWeightValue,
  parseWeightInput,
  stepWeightInput,
} from '@/lib/weight-input';

function mostRecent(weighIns: WeighIn[]): WeighIn | undefined {
  return weighIns.reduce<WeighIn | undefined>(
    (latest, w) => (!latest || Date.parse(w.timestamp) > Date.parse(latest.timestamp) ? w : latest),
    undefined,
  );
}

function dayLabel(date: IsoDate, today: IsoDate): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** Back to where the user came from, or home when opened directly (deep link, notification). */
function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function LogScreen() {
  const theme = useTheme();
  const { weighIns, preferences, addWeighIn } = useData();
  const { unit, goal, trend } = preferences;
  const today = localIsoDate();

  // Pre-fill with the last weight so a typical entry only changes a digit or two.
  const [text, setText] = useState(() => {
    const last = mostRecent(weighIns);
    return last ? formatWeightValue(last.weightKg, unit) : '';
  });
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const value = parseWeightInput(text);
  const kg = value === null ? null : toKg(value, unit);
  const problem = kg === null ? null : checkWeightKg(kg);
  const trendKg = analyze(weighIns, goal, trend, today).latest?.trendKg;
  const bigJump = kg !== null && !problem && trendKg !== undefined && isLikelyOutlier(kg, trendKg);
  const canSave = kg !== null && !problem && !saving;

  async function save() {
    if (kg === null || !canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await addWeighIn(
        newManualWeighIn({ timestamp: localIsoTimestamp(atTimeOf(date)), weightKg: kg, note }),
      );
      close();
    } catch (e) {
      setSaveError(`Couldn't save: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  }

  const step = (delta: number) => {
    const next = stepWeightInput(text, delta);
    if (next !== null) setText(next);
  };

  const inputStyle = { color: theme.text, borderColor: theme.backgroundSelected };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Button label="Cancel" variant="plain" onPress={close} />
          <ThemedText type="smallBold">Log weight</ThemedText>
          <Button
            label={bigJump ? 'Save anyway' : 'Save'}
            variant="plain"
            disabled={!canSave}
            onPress={save}
          />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.weightRow}>
            <Button label="−" variant="secondary" accessibilityLabel="Decrease by 0.1" onPress={() => step(-0.1)} />
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={save}
              autoFocus
              keyboardType="decimal-pad"
              returnKeyType="done"
              placeholder="0.0"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel={`Weight in ${unit}`}
              style={[styles.weightInput, { color: theme.text }]}
            />
            <Button label="+" variant="secondary" accessibilityLabel="Increase by 0.1" onPress={() => step(0.1)} />
          </View>
          <ThemedText themeColor="textSecondary">{unit}</ThemedText>

          {text !== '' && value === null && <ThemedText style={styles.error}>Enter a number, like 82.4</ThemedText>}
          {problem && (
            <ThemedText style={styles.error}>
              Weight must be between {formatWeight(MIN_WEIGHT_KG, unit)} and {formatWeight(MAX_WEIGHT_KG, unit)}
            </ThemedText>
          )}
          {bigJump && trendKg !== undefined && (
            <View style={[styles.warning, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">
                That&apos;s a big jump from your trend ({formatWeight(trendKg, unit)}). Is it a typo?
                Tap &ldquo;Save anyway&rdquo; if it&apos;s right.
              </ThemedText>
            </View>
          )}

          <View style={styles.dateRow}>
            <Button
              label="‹"
              variant="secondary"
              accessibilityLabel="Previous day"
              onPress={() => setDate(addDays(date, -1))}
            />
            <ThemedText style={styles.dateLabel}>{dayLabel(date, today)}</ThemedText>
            <Button
              label="›"
              variant="secondary"
              accessibilityLabel="Next day"
              disabled={date >= today}
              onPress={() => setDate(addDays(date, 1))}
            />
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Note (optional)"
            placeholderTextColor={theme.textSecondary}
            maxLength={200}
            style={[styles.note, inputStyle]}
          />

          {saveError && <ThemedText style={styles.error}>{saveError}</ThemedText>}
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  body: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.five,
  },
  weightInput: {
    fontSize: 64,
    fontWeight: 600,
    textAlign: 'center',
    // Explicit width: on web an input's default width grows with font size.
    width: 190,
    fontVariant: ['tabular-nums'],
  },
  error: {
    color: ToneColors.red,
    textAlign: 'center',
  },
  warning: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderLeftWidth: 4,
    borderLeftColor: ToneColors.amber,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dateLabel: {
    minWidth: 120,
    textAlign: 'center',
  },
  note: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
});
