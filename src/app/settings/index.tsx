import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { canUseLiveIcon } from '@/components/live-app-icon';
import { ScreenHeader } from '@/components/screen-header';
import { SettingsGroup, SettingsRow, SettingsSwitch } from '@/components/settings-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { zoneBands } from '@/components/zone-slider';
import { MaxContentWidth, Spacing, ToneColors } from '@/constants/theme';
import { useData } from '@/data/data-context';
import { useTheme } from '@/hooks/use-theme';
import { shareWeighInsCsv } from '@/lib/export-data';
import { formatWeight } from '@/lib/weight-input';

const GOAL_NAMES = { lose: 'Lose', gain: 'Gain', maintain: 'Maintain' } as const;

export default function SettingsScreen() {
  const theme = useTheme();
  const { weighIns, preferences, setPreference, deleteAllData } = useData();
  const { goal, trend, unit } = preferences;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const smoothing =
    trend.smoothing.method === 'ema'
      ? `${Math.round(1 / trend.smoothing.alpha)} days`
      : `${trend.smoothing.windowDays} days`;

  async function exportCsv() {
    setExportError(null);
    try {
      await shareWeighInsCsv(weighIns);
    } catch (e) {
      setExportError(`Couldn't export: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function wipe() {
    setConfirmingDelete(false);
    await deleteAllData();
    router.replace('/onboarding');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.body}>
          <ScreenHeader back="Home" title="Settings" />

          <SettingsGroup title="Goal">
            <SettingsRow label="Goal" value={GOAL_NAMES[goal.type]} onPress={() => router.push('/settings/goal')} />
            <SettingsRow
              label={goal.type === 'maintain' ? 'Weight to maintain' : 'Goal weight'}
              value={goal.targetKg !== undefined ? formatWeight(goal.targetKg, unit) : 'Not set'}
              onPress={() => router.push('/settings/goal')}
            />
            <SettingsRow
              label="Arrow zones"
              accessory={
                <View style={styles.zoneBar} aria-hidden>
                  {zoneBands(goal).map((b, i) => (
                    <View key={i} style={{ flex: b.share, backgroundColor: b.color }} />
                  ))}
                </View>
              }
              onPress={() => router.push('/settings/zones')}
            />
          </SettingsGroup>

          <SettingsGroup title="Trend">
            <SettingsRow label="Smoothing" value={smoothing} onPress={() => router.push('/settings/trend')} />
            <SettingsRow
              label="Units"
              value={unit}
              hint={`Switches to ${unit === 'kg' ? 'lb' : 'kg'}`}
              onPress={() => setPreference('unit', unit === 'kg' ? 'lb' : 'kg')}
            />
          </SettingsGroup>

          <SettingsGroup title="App">
            {canUseLiveIcon && (
              <SettingsSwitch
                label="Live app icon"
                value={preferences.liveAppIcon}
                onChange={(on) => setPreference('liveAppIcon', on)}
              />
            )}
            <SettingsSwitch
              label="Hide scale weight on home"
              value={preferences.hideScaleWeight}
              onChange={(on) => setPreference('hideScaleWeight', on)}
            />
            <SettingsRow label="Export data" value="CSV" onPress={exportCsv} />
          </SettingsGroup>
          {exportError && <Text style={styles.error}>{exportError}</Text>}
          {canUseLiveIcon && (
            <ThemedText type="small" themeColor="textSecondary">
              Live app icon shows your arrow on the home screen icon. It changes when you open the app. iOS
              shows a short popup each time the icon changes; that’s an iOS rule and can’t be turned off.
            </ThemedText>
          )}

          <SettingsGroup title="Data">
            <SettingsRow label="Delete all data" destructive onPress={() => setConfirmingDelete(true)} />
          </SettingsGroup>
          <ThemedText type="small" themeColor="textSecondary">
            Everything is stored only on this device.
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={[styles.footer, { borderTopColor: theme.backgroundSelected }]}>
            Big Green Arrow is free and open source (MIT). Not medical advice.
          </ThemedText>
        </ScrollView>

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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: 14,
  },
  zoneBar: {
    width: 72,
    height: 10,
    flexDirection: 'row',
    borderRadius: 5,
    overflow: 'hidden',
  },
  error: {
    color: ToneColors.red,
  },
  footer: {
    textAlign: 'center',
    paddingTop: Spacing.three,
  },
});
