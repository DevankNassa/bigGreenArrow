import {
  DEFAULT_FLAT_BAND_PCT,
  DEFAULT_TARGET_BAND_PCT,
  DEFAULT_TREND_SETTINGS,
  type Goal,
  type TrendSettings,
  type WeightUnit,
} from '@/engine';

import type { Db } from './db';

/** Apple Health / Health Connect sync (SPEC §8). */
export interface HealthPreferences {
  /** Read weight from Health. Turned on by connecting, off by the user or when permission goes away. */
  read: boolean;
  /** Also save manual weigh-ins to Health. */
  writeBack: boolean;
  /** HealthKit anchor or Health Connect changes token; unset means the next sync reads everything. */
  syncToken?: string;
  /** ISO timestamp of the last successful sync. */
  lastSyncAt?: string;
}

export interface Preferences {
  /** False until onboarding is finished; the home screen redirects there. */
  onboarded: boolean;
  unit: WeightUnit;
  goal: Goal;
  trend: TrendSettings;
  /** iOS: show the arrow on the app icon. Off by default, since iOS pops up an alert on every change. */
  liveAppIcon: boolean;
  /** Leave the day's scale reading off the home screen; the trend still shows. */
  hideScaleWeight: boolean;
  health: HealthPreferences;
}

/** Starting values; onboarding has the user choose their own goal and pace (SPEC §7.6). */
export const DEFAULT_PREFERENCES: Preferences = {
  onboarded: false,
  unit: 'kg',
  goal: {
    type: 'lose',
    optimalMinPct: 0.5,
    optimalMaxPct: 1.0,
    flatBandPct: DEFAULT_FLAT_BAND_PCT,
    targetBandPct: DEFAULT_TARGET_BAND_PCT,
  },
  trend: DEFAULT_TREND_SETTINGS,
  liveAppIcon: false,
  hideScaleWeight: false,
  health: { read: false, writeBack: true },
};

type Key = keyof Preferences;

/** Stored preferences over the defaults. Each key is a JSON value in its own row. */
export async function getPreferences(db: Db): Promise<Preferences> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM preferences',
    [],
  );
  const prefs = { ...DEFAULT_PREFERENCES };
  for (const { key, value } of rows) {
    if (key in prefs) (prefs as Record<string, unknown>)[key] = JSON.parse(value);
  }
  return prefs;
}

export async function setPreference<K extends Key>(db: Db, key: K, value: Preferences[K]): Promise<void> {
  await db.runAsync(
    'INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [key, JSON.stringify(value)],
  );
}
