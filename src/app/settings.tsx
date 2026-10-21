import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { GoalFields } from '@/components/goal-fields';
import { PaceEditor } from '@/components/pace-editor';
import { Segmented } from '@/components/segmented';
import { Stepper } from '@/components/stepper';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, ToneColors } from '@/constants/theme';
import { useData } from '@/data/data-context';
import type { Preferences } from '@/data/preferences';
import { analyze, needsPaceWarning, redThresholdPct, validateGoal, type Goal, type TrendSettings } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { localIsoDate } from '@/lib/dates';
import { GOAL_ERROR_MESSAGES, capPace, paceWarning } from '@/lib/pace';

type Draft = Pick<Preferences, 'unit' | 'goal' | 'trend'>;

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
] as const;
const SMOOTHING_OPTIONS = [
  { value: 'ema', label: 'Exponential' },
  { value: 'sma', label: 'Simple average' },
] as const;
const SMA_WINDOWS = [7, 14, 21].map((d) => ({ value: d, label: `${d} days` }));
const LOOKBACKS = [7, 14, 21, 28].map((d) => ({ value: d, label: `${d}d` }));
const SAME_DAY_OPTIONS = [
  { value: 'first', label: 'First' },
  { value: 'last', label: 'Last' },
  { value: 'average', label: 'Average' },
] as const;

const pct = (n: number) => `${n.toFixed(2)}%`;

/** Whether the pace changed in a way that should re-show the over-1% warning. */
function paceChanged(saved: Goal, next: Goal): boolean {
  return saved.type !== next.type || saved.optimalMaxPct !== next.optimalMaxPct;
}

export default function SettingsScreen() {
  const { weighIns, preferences, setPreferences, deleteAllData } = useData();
  const saved: Draft = { unit: preferences.unit, goal: preferences.goal, trend: preferences.trend };

  const [draft, setDraft] = useState<Draft>(saved);
  const [targetValid, setTargetValid] = useState(true);
  const [confirmingPace, setConfirmingPace] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const { goal, trend, unit } = draft;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const trendKg = analyze(weighIns, goal, trend, localIsoDate()).latest?.trendKg;

  const setGoal = (g: Goal) => change({ ...draft, goal: g });
  const setTrend = (t: Partial<TrendSettings>) => change({ ...draft, trend: { ...trend, ...t } });
  function change(next: Draft) {
    setDraft(next);
    setError(null);
    setJustSaved(false);
  }

  async function commit() {
    setConfirmingPace(false);
    try {
      await setPreferences(draft);
      setJustSaved(true);
    } catch (e) {
      setError(`Couldn't save: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function save() {
    const problems = validateGoal(goal);
    if (problems.length > 0) return setError(GOAL_ERROR_MESSAGES[problems[0]]);
    if (needsPaceWarning(goal) && paceChanged(saved.goal, goal)) return setConfirmingPace(true);
    commit();
  }

  async function wipe() {
    setConfirmingDelete(false);
    await deleteAllData();
    router.replace('/onboarding');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Section title="Goal">
            <GoalFields
              goal={goal}
              onChange={setGoal}
              unit={unit}
              currentKg={trendKg}
              onTargetValidity={setTargetValid}
            />
          </Section>

          {goal.type !== 'maintain' && (
            <Section title="Pace">
              <PaceEditor goal={goal} onChange={setGoal} unit={unit} atKg={trendKg} />
            </Section>
          )}

          <Section title="Arrow zones">
            <Stepper
              label="Flat zone"
              hint="Rates within this show a dash (or count as steady when maintaining)"
              value={goal.flatBandPct}
              step={0.05}
              min={0.05}
              max={0.5}
              format={(n) => `±${pct(n)}`}
              onChange={(flatBandPct) => setGoal({ ...goal, flatBandPct })}
            />
            {goal.type !== 'maintain' && (
              <>
                <Stepper
                  label="Red threshold"
                  hint={
                    goal.redThresholdPct === undefined
                      ? 'Wrong-way rate where light red turns red. Matches your slowest optimal pace.'
                      : 'Wrong-way rate where light red turns red.'
                  }
                  value={redThresholdPct(goal)}
                  step={0.05}
                  min={goal.flatBandPct}
                  max={2}
                  format={pct}
                  onChange={(redThresholdPct) => setGoal({ ...goal, redThresholdPct })}
                />
                {goal.redThresholdPct !== undefined && (
                  <Button
                    label="Match slowest optimal pace"
                    variant="plain"
                    onPress={() => setGoal({ ...goal, redThresholdPct: undefined })}
                  />
                )}
              </>
            )}
          </Section>

          <Section title="Trend">
            <ThemedText type="small" themeColor="textSecondary">
              How the trend line smooths out daily swings.
            </ThemedText>
            <Segmented
              options={SMOOTHING_OPTIONS}
              value={trend.smoothing.method}
              onChange={(method) =>
                setTrend({ smoothing: method === 'ema' ? { method, alpha: 0.1 } : { method, windowDays: 7 } })
              }
              accessibilityLabel="Smoothing method"
            />
            {trend.smoothing.method === 'ema' ? (
              <Stepper
                label="Responsiveness"
                hint="Higher follows the scale more closely; lower is smoother"
                value={trend.smoothing.alpha}
                step={0.01}
                min={0.05}
                max={0.3}
                format={(n) => n.toFixed(2)}
                onChange={(alpha) => setTrend({ smoothing: { method: 'ema', alpha } })}
              />
            ) : (
              <Labeled label="Average over">
                <Segmented
                  options={SMA_WINDOWS}
                  value={trend.smoothing.windowDays}
                  onChange={(windowDays) => setTrend({ smoothing: { method: 'sma', windowDays } })}
                  accessibilityLabel="Average over"
                />
              </Labeled>
            )}
            <Labeled label="Rate measured over">
              <Segmented
                options={LOOKBACKS}
                value={trend.slopeLookbackDays}
                onChange={(slopeLookbackDays) => setTrend({ slopeLookbackDays })}
                accessibilityLabel="Rate measured over"
              />
            </Labeled>
            <Labeled label="Several weigh-ins in a day: use">
              <Segmented
                options={SAME_DAY_OPTIONS}
                value={trend.sameDayRule}
                onChange={(sameDayRule) => setTrend({ sameDayRule })}
                accessibilityLabel="Several weigh-ins in a day"
              />
            </Labeled>
          </Section>

          <Section title="Units">
            <Segmented
              options={UNIT_OPTIONS}
              value={unit}
              onChange={(u) => change({ ...draft, unit: u })}
              accessibilityLabel="Weight unit"
            />
          </Section>

          <Section title="Data">
            <ThemedText type="small" themeColor="textSecondary">
              Everything is stored only on this device.
            </ThemedText>
            <Button label="Delete all data" variant="destructive" onPress={() => setConfirmingDelete(true)} />
          </Section>

          <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
            Big Green Arrow is free and open source (MIT). Not medical advice.
          </ThemedText>
        </ScrollView>

        {(dirty || error || justSaved) && (
          <View style={styles.saveBar}>
            {error && <ThemedText style={styles.error}>{error}</ThemedText>}
            <Button
              label={justSaved && !dirty ? 'Saved ✓' : 'Save changes'}
              disabled={!dirty || !targetValid}
              onPress={save}
            />
          </View>
        )}

        {goal.type !== 'maintain' && (
          <ConfirmDialog
            visible={confirmingPace}
            title="That's a fast pace"
            message={paceWarning(goal.type)}
            confirmLabel="Keep it"
            cancelLabel="Go back to 1%"
            onConfirm={commit}
            onCancel={() => {
              setGoal(capPace(goal));
              setConfirmingPace(false);
            }}
            onDismiss={() => setConfirmingPace(false)}
          />
        )}
        <ConfirmDialog
          visible={confirmingDelete}
          title="Delete all data?"
          message="This permanently deletes every weigh-in and setting on this device. It can't be undone."
          confirmLabel="Delete everything"
          destructive
          onConfirm={wipe}
          onCancel={() => setConfirmingDelete(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <View style={[styles.card, { borderColor: theme.backgroundElement }]}>{children}</View>
    </View>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.labeled}>
      <ThemedText>{label}</ThemedText>
      {children}
    </View>
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
    padding: Spacing.three,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.two,
  },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  labeled: {
    gap: Spacing.two,
  },
  footer: {
    textAlign: 'center',
  },
  saveBar: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  error: {
    color: ToneColors.red,
    textAlign: 'center',
  },
});
