import {
  DEFAULT_FLAT_BAND_PCT,
  DEFAULT_TARGET_BAND_PCT,
  DEFAULT_TREND_SETTINGS,
  type Goal,
  type TrendSettings,
  type WeightUnit,
} from '@/engine';

import type { Db } from './db';

export interface Preferences {
  /** False until onboarding is finished; the home screen redirects there. */
  onboarded: boolean;
  unit: WeightUnit;
  goal: Goal;
  trend: TrendSettings;
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
