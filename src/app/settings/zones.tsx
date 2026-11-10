import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Segmented } from '@/components/segmented';
import { useSettingsDraft } from '@/components/settings-draft';
import { SettingsPage } from '@/components/settings-page';
import { ThemedText } from '@/components/themed-text';
import { ZoneSlider } from '@/components/zone-slider';
import { DEFAULT_FLAT_BAND_PCT, type GoalType } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { startingPace } from '@/lib/pace';

const GOAL_OPTIONS = [
  { value: 'lose', label: 'Lose' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Gain' },
] as const;

/** Everything on the screen except the scale, in points, so the scale can take the rest. */
const CHROME = 420;

export default function ZoneSettingsScreen() {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { draft, setGoal, footer } = useSettingsDraft();
  const [dragging, setDragging] = useState(false);
  const { goal } = draft;
  const scaleH = Math.round(Math.min(480, Math.max(280, height - insets.top - insets.bottom - CHROME)));

  function setType(type: GoalType) {
    if (type === goal.type) return;
    setGoal({ ...goal, type, ...(type === 'maintain' ? {} : startingPace(type)) });
  }

  return (
    <SettingsPage title="Arrow zones" footer={footer} scrollEnabled={!dragging}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
        Drag a tab to set where each stage starts, in % of body weight per week.
        {goal.type === 'maintain' &&
          ` On target also needs your trend within ±${goal.targetBandPct}% of your target weight.`}
      </ThemedText>
      <Segmented options={GOAL_OPTIONS} value={goal.type} onChange={setType} accessibilityLabel="Goal" />
      <ZoneSlider goal={goal} onChange={setGoal} onDragging={setDragging} height={scaleH} />
      <View style={styles.reset}>
        <View style={[styles.outline, { borderColor: theme.text }]}>
          <Button
            label="Reset to defaults"
            variant="plain"
            onPress={() =>
              setGoal({
                ...goal,
                ...(goal.type === 'maintain' ? {} : startingPace(goal.type)),
                flatBandPct: DEFAULT_FLAT_BAND_PCT,
                redThresholdPct: undefined,
              })
            }
          />
        </View>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  lead: {
    marginTop: -12,
  },
  reset: {
    alignItems: 'center',
  },
  outline: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 8,
  },
});
