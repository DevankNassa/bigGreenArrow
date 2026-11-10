import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { Spacing, ToneColors } from '@/constants/theme';
import { useData } from '@/data/data-context';
import type { Preferences } from '@/data/preferences';
import { needsPaceWarning, validateGoal, type Goal, type TrendSettings } from '@/engine';
import { GOAL_ERROR_MESSAGES, capPace, paceWarning } from '@/lib/pace';

export type Draft = Pick<Preferences, 'unit' | 'goal' | 'trend'>;

/** Whether the pace changed in a way that should re-show the over-1% warning. */
function paceChanged(saved: Goal, next: Goal): boolean {
  return saved.type !== next.type || saved.optimalMaxPct !== next.optimalMaxPct;
}

/**
 * Unsaved edits to the goal, trend and units on one settings screen, with the
 * Save bar and the fast-pace check to render at the bottom of the screen.
 */
export function useSettingsDraft() {
  const { preferences, setPreferences } = useData();
  const saved: Draft = { unit: preferences.unit, goal: preferences.goal, trend: preferences.trend };

  const [draft, setDraft] = useState<Draft>(saved);
  const [targetValid, setTargetValid] = useState(true);
  const [confirmingPace, setConfirmingPace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function change(next: Draft) {
    setDraft(next);
    setError(null);
    setJustSaved(false);
  }
  const setGoal = (goal: Goal) => change({ ...draft, goal });
  const setTrend = (t: Partial<TrendSettings>) => change({ ...draft, trend: { ...draft.trend, ...t } });

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
    const problems = validateGoal(draft.goal);
    if (problems.length > 0) return setError(GOAL_ERROR_MESSAGES[problems[0]]);
    if (needsPaceWarning(draft.goal) && paceChanged(saved.goal, draft.goal)) return setConfirmingPace(true);
    commit();
  }

  const footer = (
    <>
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
      {draft.goal.type !== 'maintain' && (
        <ConfirmDialog
          visible={confirmingPace}
          title="That's a fast pace"
          message={paceWarning(draft.goal.type)}
          confirmLabel="Keep it"
          cancelLabel="Go back to 1%"
          onConfirm={commit}
          onCancel={() => {
            setGoal(capPace(draft.goal));
            setConfirmingPace(false);
          }}
          onDismiss={() => setConfirmingPace(false)}
        />
      )}
    </>
  );

  return { draft, change, setGoal, setTrend, setTargetValid, footer };
}

const styles = StyleSheet.create({
  saveBar: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  error: {
    color: ToneColors.red,
    textAlign: 'center',
  },
});
