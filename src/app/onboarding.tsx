import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { GoalFields } from '@/components/goal-fields';
import { PaceEditor } from '@/components/pace-editor';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrendArrow } from '@/components/trend-arrow';
import { WeightField } from '@/components/weight-field';
import { MaxContentWidth, Spacing, ToneColors } from '@/constants/theme';
import { useData } from '@/data/data-context';
import { newManualWeighIn } from '@/data/weigh-ins';
import { analyze, needsPaceWarning, validateGoal, type Goal, type WeightUnit } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { localIsoDate, localIsoTimestamp } from '@/lib/dates';
import { GOAL_ERROR_MESSAGES, capPace, paceWarning } from '@/lib/pace';

const STEPS = ['intro', 'units', 'goal', 'pace'] as const;
type Step = (typeof STEPS)[number];

const UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'lb', label: 'Pounds (lb)' },
] as const;

/** First-run setup (SPEC §7.6). Health and reminders join once those features exist. */
export default function OnboardingScreen() {
  const theme = useTheme();
  const { weighIns, preferences, setPreferences, addWeighIn } = useData();

  const [step, setStep] = useState<Step>('intro');
  const [unit, setUnit] = useState<WeightUnit>(preferences.unit);
  const [goal, setGoal] = useState<Goal>(preferences.goal);
  const [currentKg, setCurrentKg] = useState<number | undefined>(undefined);
  const [currentValid, setCurrentValid] = useState(true);
  const [targetValid, setTargetValid] = useState(true);
  const [confirmingPace, setConfirmingPace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing users already have a trend to translate the pace with.
  const trendKg = analyze(weighIns, goal, preferences.trend, localIsoDate()).latest?.trendKg;
  const referenceKg = currentKg ?? trendKg;
  const index = STEPS.indexOf(step);

  async function finish() {
    setConfirmingPace(false);
    try {
      if (currentKg !== undefined) {
        await addWeighIn(newManualWeighIn({ timestamp: localIsoTimestamp(), weightKg: currentKg }));
      }
      await setPreferences({ unit, goal, onboarded: true });
      router.replace('/');
    } catch (e) {
      setError(`Couldn't save: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function next() {
    setError(null);
    if (step !== 'pace') return setStep(STEPS[index + 1]);

    const problems = validateGoal(goal);
    if (problems.length > 0) return setError(GOAL_ERROR_MESSAGES[problems[0]]);
    if (needsPaceWarning(goal)) return setConfirmingPace(true);
    finish();
  }

  const canContinue =
    (step !== 'units' || currentValid) &&
    (step !== 'goal' || (targetValid && (goal.type !== 'maintain' || goal.targetKg !== undefined)));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.progress} accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.dot,
                { backgroundColor: i <= index ? ToneColors.big_green : theme.backgroundSelected },
              ]}
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 'intro' && (
            <View style={styles.intro}>
              <TrendArrow tone="big_green" angleDeg={-40} accessibilityLabel="A green arrow pointing down" />
              <ThemedText type="subtitle" style={styles.center}>
                The scale lies day to day. The trend doesn&apos;t.
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                Water, salt and timing can swing the scale by a kilo or two. Big Green Arrow smooths
                that out, shows where your weight is really heading, and tells you whether your pace
                is healthy.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                Not medical advice. Talk to a healthcare professional before starting a diet.
              </ThemedText>
            </View>
          )}

          {step === 'units' && (
            <View style={styles.section}>
              <ThemedText type="subtitle">Units</ThemedText>
              <Segmented
                options={UNIT_OPTIONS}
                value={unit}
                onChange={setUnit}
                accessibilityLabel="Weight unit"
              />
              {weighIns.length === 0 && (
                <>
                  <WeightField
                    key={unit}
                    label="Your weight this morning (optional)"
                    initialKg={currentKg}
                    unit={unit}
                    onChange={({ kg, valid }) => {
                      setCurrentValid(valid);
                      if (valid) setCurrentKg(kg);
                    }}
                  />
                  <ThemedText type="small" themeColor="textSecondary">
                    This becomes your first weigh-in. You can skip it and log later.
                  </ThemedText>
                </>
              )}
            </View>
          )}

          {step === 'goal' && (
            <View style={styles.section}>
              <ThemedText type="subtitle">Your goal</ThemedText>
              <GoalFields
                goal={goal}
                onChange={setGoal}
                unit={unit}
                currentKg={referenceKg}
                onTargetValidity={setTargetValid}
              />
            </View>
          )}

          {step === 'pace' && (
            <View style={styles.section}>
              <ThemedText type="subtitle">{goal.type === 'maintain' ? 'Steady means…' : 'Your pace'}</ThemedText>
              {goal.type === 'maintain' ? (
                <ThemedText themeColor="textSecondary">
                  The arrow turns big and green, pointing sideways, while your trend stays within the
                  band you chose and holds steady. You can fine-tune this later in Settings.
                </ThemedText>
              ) : (
                <>
                  <ThemedText themeColor="textSecondary">
                    Choose the range you&apos;re aiming for. Inside it, the arrow turns big and green.
                    Pick a preset or adjust it yourself.
                  </ThemedText>
                  <PaceEditor goal={goal} onChange={setGoal} unit={unit} atKg={referenceKg} />
                </>
              )}
            </View>
          )}

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}
        </ScrollView>

        <View style={styles.actions}>
          {index > 0 ? (
            <Button label="Back" variant="plain" onPress={() => setStep(STEPS[index - 1])} />
          ) : (
            <View />
          )}
          <Button
            label={step === 'intro' ? 'Get started' : step === 'pace' ? 'Finish' : 'Continue'}
            disabled={!canContinue}
            onPress={next}
          />
        </View>

        {goal.type !== 'maintain' && (
          <ConfirmDialog
            visible={confirmingPace}
            title="That's a fast pace"
            message={paceWarning(goal.type)}
            confirmLabel="Keep it"
            cancelLabel="Go back to 1%"
            onConfirm={finish}
            onCancel={() => {
              setGoal(capPace(goal));
              setConfirmingPace(false);
            }}
            onDismiss={() => setConfirmingPace(false)}
          />
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
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  dot: {
    width: 32,
    height: 6,
    borderRadius: 3,
  },
  body: {
    flexGrow: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  intro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
  error: {
    color: ToneColors.red,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
});
