import { GoalFields } from '@/components/goal-fields';
import { PaceEditor } from '@/components/pace-editor';
import { useSettingsDraft } from '@/components/settings-draft';
import { SettingsPage } from '@/components/settings-page';
import { ThemedText } from '@/components/themed-text';
import { useData } from '@/data/data-context';
import { analyze } from '@/engine';
import { localIsoDate } from '@/lib/dates';

export default function GoalSettingsScreen() {
  const { weighIns } = useData();
  const { draft, setGoal, setTargetValid, footer } = useSettingsDraft();
  const { goal, trend, unit } = draft;
  const trendKg = analyze(weighIns, goal, trend, localIsoDate()).latest?.trendKg;

  return (
    <SettingsPage title="Goal" footer={footer}>
      <GoalFields goal={goal} onChange={setGoal} unit={unit} currentKg={trendKg} onTargetValidity={setTargetValid} />
      {goal.type !== 'maintain' && (
        <>
          <ThemedText type="smallBold">Pace</ThemedText>
          <PaceEditor goal={goal} onChange={setGoal} unit={unit} atKg={trendKg} />
        </>
      )}
    </SettingsPage>
  );
}
