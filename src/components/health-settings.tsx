import { useState } from 'react';
import { Linking, Platform, StyleSheet, Text } from 'react-native';

import { SettingsGroup, SettingsRow, SettingsSwitch } from '@/components/settings-row';
import { ThemedText } from '@/components/themed-text';
import { ToneColors } from '@/constants/theme';
import { useData } from '@/data/data-context';
import { localDate } from '@/engine';
import { dayLabel, localIsoDate } from '@/lib/dates';
import { importedSummary } from '@/lib/health-labels';

function lastSyncLabel(iso: string | undefined): string {
  if (!iso) return 'Never';
  const at = new Date(iso);
  const day = localDate(iso);
  if (day !== localIsoDate()) return dayLabel(day);
  return at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** The Health section of Settings (SPEC §7.5, §8.3). Hidden where there's no health store (web). */
export function HealthSettings() {
  const { preferences, healthSync, setPreference, connectHealth, disconnectHealth, syncHealth, openHealthSettings } =
    useData();
  const { health } = preferences;
  const { name, available, syncing, error } = healthSync;
  const [result, setResult] = useState<string | null>(null);

  if (!name) return null;

  async function connect() {
    setResult(null);
    const imported = await connectHealth();
    if (imported !== null) setResult(importedSummary(imported, name ?? ''));
  }

  // No HealthKit on iPad; on Android, Health Connect may need installing or updating.
  if (available === false) {
    if (Platform.OS !== 'android') return null;
    return (
      <>
        <SettingsGroup title="Health">
          <SettingsRow
            label="Get Health Connect"
            value="Not installed"
            hint="Opens Health Connect in the Play Store"
            onPress={() => Linking.openURL('market://details?id=com.google.android.apps.healthdata')}
          />
        </SettingsGroup>
        <ThemedText type="small" themeColor="textSecondary">
          Health Connect is missing or needs an update. Install it to read weight from your scale or other apps.
        </ThemedText>
      </>
    );
  }

  return (
    <>
      <SettingsGroup title="Health">
        {health.read ? (
          <>
            <SettingsSwitch label={`Read weight from ${name}`} value onChange={(on) => !on && disconnectHealth()} />
            <SettingsSwitch
              label={`Save my entries to ${name}`}
              value={health.writeBack}
              onChange={(on) => setPreference('health', { ...health, writeBack: on })}
            />
            <SettingsRow
              label="Sync now"
              value={syncing ? 'Syncing…' : lastSyncLabel(health.lastSyncAt)}
              hint={`Checks ${name} for new weigh-ins`}
              onPress={() => !syncing && syncHealth()}
            />
            <SettingsRow
              label="Re-import full history"
              hint={`Reads every weigh-in in ${name} again`}
              onPress={() => !syncing && syncHealth(true)}
            />
            <SettingsRow label="Permissions" hint={`Opens ${name}`} onPress={openHealthSettings} />
          </>
        ) : (
          <SettingsRow
            label={`Connect ${name}`}
            value={syncing ? 'Connecting…' : 'Not connected'}
            hint={`Asks to read your weight from ${name}`}
            onPress={() => !syncing && connect()}
          />
        )}
      </SettingsGroup>
      {error && <Text style={styles.error}>{`${name}: ${error}`}</Text>}
      {result && (
        <ThemedText type="small" themeColor="textSecondary">
          {result}
        </ThemedText>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        {health.read
          ? `Weigh-ins from your scale and other apps come in through ${name} each time you open the app. ` +
            (Platform.OS === 'ios'
              ? 'If none show up, allow Big Green Arrow to read Weight in the Health app under Sharing → Apps.'
              : 'Turning reading off keeps what was already imported.')
          : `Read weigh-ins from your smart scale or other apps, so you never have to type a number. Only body weight is read.`}
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  error: {
    color: ToneColors.red,
  },
});
