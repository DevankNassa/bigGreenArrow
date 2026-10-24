import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, ToneColors } from '@/constants/theme';
import { useData } from '@/data/data-context';
import { newManualWeighIn } from '@/data/weigh-ins';
import { analyze, isLikelyOutlier, localDate, toKg, type WeighIn } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { addDays, atTimeOf, dayLabel, localIsoDate, localIsoTimestamp } from '@/lib/dates';
import { isEditable } from '@/lib/history';
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

/** Back to where the user came from, or home when opened directly (deep link, notification). */
function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const SOURCE_NAMES: Record<WeighIn['source'], string> = {
  manual: 'manual entry',
  import: 'import',
  apple_health: 'Apple Health',
  health_connect: 'Health Connect',
};

/** Adds a weigh-in, or edits one when opened as `/log?id=…`. */
export default function LogScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { weighIns } = useData();
  // Captured once, so the form doesn't flip to "not found" while closing after a delete.
  const [existing] = useState(() => (id === undefined ? undefined : weighIns.find((w) => w.id === id)));

  if (id === undefined) return <WeighInForm />;
  return existing ? <WeighInForm existing={existing} /> : <NotFound />;
}

function WeighInForm({ existing }: { existing?: WeighIn }) {
  const theme = useTheme();
  const { weighIns, preferences, addWeighIn, updateWeighIn, deleteWeighIn } = useData();
  const { unit, goal, trend } = preferences;
  const today = localIsoDate();
  const editable = !existing || isEditable(existing);

  // New entries start from the last weight so a typical entry only changes a digit or two.
  const [initialText] = useState(() => {
    const from = existing ?? mostRecent(weighIns);
    return from ? formatWeightValue(from.weightKg, unit) : '';
  });
  const [text, setText] = useState(initialText);
  const [date, setDate] = useState(existing ? localDate(existing.timestamp) : today);
  const [note, setNote] = useState(existing?.note ?? '');
  const [excluded, setExcluded] = useState(existing?.excluded ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const value = parseWeightInput(text);
  // Leave an untouched weight exactly as stored, rather than its rounded display value.
  const kg = existing && text === initialText ? existing.weightKg : value === null ? null : toKg(value, unit);
  const problem = kg === null ? null : checkWeightKg(kg);

  // Compare against the trend without this entry, so editing an outlier still warns.
  const others = existing ? weighIns.filter((w) => w.id !== existing.id) : weighIns;
  const trendKg = analyze(others, goal, trend, today).latest?.trendKg;
  const bigJump =
    editable && !excluded && kg !== null && !problem && trendKg !== undefined && isLikelyOutlier(kg, trendKg);
  const canSave = kg !== null && !problem && !saving;

  async function run(action: () => Promise<void>, failure: string) {
    setSaving(true);
    setError(null);
    try {
      await action();
      close();
    } catch (e) {
      setError(`${failure}: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  }

  function save() {
    if (kg === null || !canSave) return;
    if (!existing) {
      const timestamp = localIsoTimestamp(atTimeOf(date));
      return run(() => addWeighIn(newManualWeighIn({ timestamp, weightKg: kg, note })), "Couldn't save");
    }
    const changedDay = date !== localDate(existing.timestamp);
    const trimmed = note.trim();
    return run(
      () =>
        updateWeighIn({
          ...existing,
          // Keep the original time of day, and the original timestamp if the day didn't change.
          timestamp: changedDay
            ? localIsoTimestamp(atTimeOf(date, new Date(existing.timestamp)))
            : existing.timestamp,
          weightKg: kg,
          note: trimmed || undefined,
          excluded,
        }),
      "Couldn't save",
    );
  }

  function remove() {
    setConfirmingDelete(false);
    if (existing) return run(() => deleteWeighIn(existing.id), "Couldn't delete");
  }

  const step = (delta: number) => {
    const next = stepWeightInput(text, delta);
    if (next !== null) setText(next);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Button label="Cancel" variant="plain" onPress={close} />
          <ThemedText type="smallBold">{existing ? 'Edit weigh-in' : 'Log weight'}</ThemedText>
          <Button label={bigJump ? 'Save anyway' : 'Save'} variant="plain" disabled={!canSave} onPress={save} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.weightRow}>
            {editable && (
              <Button label="−" variant="secondary" accessibilityLabel="Decrease by 0.1" onPress={() => step(-0.1)} />
            )}
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={save}
              editable={editable}
              autoFocus={!existing}
              keyboardType="decimal-pad"
              returnKeyType="done"
              placeholder="0.0"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel={`Weight in ${unit}`}
              style={[styles.weightInput, { color: theme.text }]}
            />
            {editable && (
              <Button label="+" variant="secondary" accessibilityLabel="Increase by 0.1" onPress={() => step(0.1)} />
            )}
          </View>
          <ThemedText themeColor="textSecondary">{unit}</ThemedText>

          {!editable && existing && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              From {SOURCE_NAMES[existing.source]}
              {existing.originApp ? ` (${existing.originApp})` : ''}. Change it there; here you can
              exclude it from your trend.
            </ThemedText>
          )}
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

          {editable && (
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
          )}

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Note (optional)"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Note"
            maxLength={200}
            style={[styles.note, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />

          {existing && (
            <View style={[styles.excludeRow, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.excludeText}>
                <ThemedText>Exclude from trend</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  For readings that aren&apos;t really yours, like a shared scale or a wrong setting.
                </ThemedText>
              </View>
              <Switch value={excluded} onValueChange={setExcluded} accessibilityLabel="Exclude from trend" />
            </View>
          )}

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          {existing && (
            <Button
              label="Delete weigh-in"
              variant="destructive"
              disabled={saving}
              onPress={() => setConfirmingDelete(true)}
            />
          )}
        </ScrollView>

        <ConfirmDialog
          visible={confirmingDelete}
          title="Delete this weigh-in?"
          message={
            existing && !editable
              ? `This only removes it from Big Green Arrow. It may come back on the next sync; excluding it is usually better.`
              : 'This can’t be undone.'
          }
          confirmLabel="Delete"
          destructive
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function NotFound() {
  return (
    <ThemedView style={[styles.container, styles.notFound]}>
      <ThemedText>This weigh-in no longer exists.</ThemedText>
      <Button label="Back" variant="secondary" onPress={close} />
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
  center: {
    textAlign: 'center',
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
  excludeRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  excludeText: {
    flex: 1,
    gap: Spacing.half,
  },
  notFound: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
