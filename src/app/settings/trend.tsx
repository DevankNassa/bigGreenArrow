import { StyleSheet, View } from 'react-native';

import { Segmented } from '@/components/segmented';
import { useSettingsDraft } from '@/components/settings-draft';
import { SettingsPage } from '@/components/settings-page';
import { Stepper } from '@/components/stepper';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

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

export default function TrendSettingsScreen() {
  const { draft, setTrend, footer } = useSettingsDraft();
  const { trend } = draft;

  return (
    <SettingsPage title="Smoothing" footer={footer}>
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
    </SettingsPage>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.labeled}>
      <ThemedText>{label}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  labeled: {
    gap: Spacing.two,
  },
});
