import { useSQLiteContext } from 'expo-sqlite';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { WeighIn } from '@/engine';
import { healthAdapter } from '@/health/adapter';
import { pullFromHealth, pushToHealth, removeFromHealth, serialize } from '@/health/sync';
import type { HealthAdapter } from '@/health/types';

import { deleteAllData, type Db } from './db';
import { DEFAULT_PREFERENCES, getPreferences, setPreference, type Preferences } from './preferences';
import { deleteWeighIn, insertWeighIn, listWeighIns, updateWeighIn } from './weigh-ins';

/** Live state of Apple Health / Health Connect sync, for Settings and onboarding. */
export interface HealthSyncStatus {
  /** "Apple Health" or "Health Connect"; null where there is none (web). */
  name: string | null;
  /** Whether the health store exists on this device; null while checking. */
  available: boolean | null;
  syncing: boolean;
  error: string | null;
}

interface Data {
  weighIns: WeighIn[];
  preferences: Preferences;
  healthSync: HealthSyncStatus;
  addWeighIn: (w: WeighIn) => Promise<void>;
  updateWeighIn: (w: WeighIn) => Promise<void>;
  deleteWeighIn: (id: string) => Promise<void>;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => Promise<void>;
  /** Several preferences in one go, e.g. when finishing onboarding or saving Settings. */
  setPreferences: (values: Partial<Preferences>) => Promise<void>;
  deleteAllData: () => Promise<void>;
  /** Asks for permission and imports the full history. Resolves to the number imported, or null if not connected. */
  connectHealth: () => Promise<number | null>;
  /** Stops syncing. Weigh-ins already imported stay. */
  disconnectHealth: () => Promise<void>;
  /** Pulls changes now; `full` re-reads the whole history. */
  syncHealth: (full?: boolean) => Promise<void>;
  openHealthSettings: () => void;
}

type Loaded = Pick<Data, 'weighIns' | 'preferences'>;

const DataContext = createContext<Data | null>(null);

async function loadAll(db: Db): Promise<Loaded> {
  const [weighIns, preferences] = await Promise.all([listWeighIns(db), getPreferences(db)]);
  return { weighIns, preferences };
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Loads weigh-ins and preferences once, then keeps them in memory. All writes
 * go through here, so the in-memory copy stays in step with the database.
 * Also keeps weigh-ins in sync with Apple Health / Health Connect (SPEC §8).
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [healthSync, setHealthSync] = useState<HealthSyncStatus>({
    name: healthAdapter?.name ?? null,
    available: healthAdapter ? null : false,
    syncing: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    loadAll(db).then((data) => {
      if (!cancelled) setLoaded(data);
    });
    healthAdapter?.isAvailable().then(
      (available) => !cancelled && setHealthSync((s) => ({ ...s, available })),
      () => !cancelled && setHealthSync((s) => ({ ...s, available: false })),
    );
    return () => {
      cancelled = true;
    };
  }, [db]);

  // Pull new samples on launch and whenever the app comes back to the foreground.
  const healthOn = loaded?.preferences.health.read === true;
  useEffect(() => {
    const adapter = healthAdapter;
    if (!healthOn || !adapter) return;
    const run = () => {
      setHealthSync((s) => ({ ...s, syncing: true, error: null }));
      serialize(() => pullFromHealth(db, adapter))
        .then(
          () => undefined,
          (e) => setHealthSync((s) => ({ ...s, error: errorText(e) })),
        )
        .then(() => loadAll(db))
        .then((data) => {
          setLoaded(data);
          setHealthSync((s) => ({ ...s, syncing: false }));
        });
    };
    run();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && run());
    return () => sub.remove();
  }, [db, healthOn]);

  if (!loaded) return null;

  const update = (fn: (d: Loaded) => Loaded) => setLoaded((d) => (d ? fn(d) : d));
  const { health } = loaded.preferences;
  const writeBack = healthAdapter && health.read && health.writeBack ? healthAdapter : null;

  /** Health work that shouldn't hold up the screen: runs in order, then refreshes from the database. */
  function inBackground(job: () => Promise<unknown>) {
    serialize(job).then(
      async () => setLoaded(await loadAll(db)),
      (e) => setHealthSync((s) => ({ ...s, error: errorText(e) })),
    );
  }

  /** A foreground sync for connect / Sync now, reporting progress and errors in `healthSync`. */
  async function syncNow<T>(job: (adapter: HealthAdapter) => Promise<T>): Promise<T | null> {
    const adapter = healthAdapter;
    if (!adapter) return null;
    setHealthSync((s) => ({ ...s, syncing: true, error: null }));
    try {
      return await job(adapter);
    } catch (e) {
      setHealthSync((s) => ({ ...s, error: errorText(e) }));
      return null;
    } finally {
      setLoaded(await loadAll(db));
      setHealthSync((s) => ({ ...s, syncing: false }));
    }
  }

  const data: Data = {
    ...loaded,
    healthSync,
    async addWeighIn(w) {
      await insertWeighIn(db, w);
      update((d) => ({ ...d, weighIns: [...d.weighIns, w] }));
      if (writeBack) inBackground(() => pushToHealth(db, writeBack, w));
    },
    async updateWeighIn(w) {
      const before = loaded.weighIns.find((x) => x.id === w.id);
      await updateWeighIn(db, w);
      update((d) => ({ ...d, weighIns: d.weighIns.map((x) => (x.id === w.id ? w : x)) }));
      // Health samples can't be edited, so a changed weight or time replaces the written-back one.
      if (
        writeBack &&
        before?.externalId !== undefined &&
        (before.timestamp !== w.timestamp || before.weightKg !== w.weightKg)
      ) {
        inBackground(async () => {
          await removeFromHealth(db, writeBack, before);
          await pushToHealth(db, writeBack, { ...w, externalId: undefined });
        });
      }
    },
    async deleteWeighIn(id) {
      const before = loaded.weighIns.find((x) => x.id === id);
      await deleteWeighIn(db, id);
      update((d) => ({ ...d, weighIns: d.weighIns.filter((x) => x.id !== id) }));
      if (writeBack && before) inBackground(() => removeFromHealth(db, writeBack, before));
    },
    async setPreference(key, value) {
      await setPreference(db, key, value);
      update((d) => ({ ...d, preferences: { ...d.preferences, [key]: value } }));
    },
    async setPreferences(values) {
      for (const [key, value] of Object.entries(values) as [keyof Preferences, never][]) {
        await setPreference(db, key, value);
      }
      update((d) => ({ ...d, preferences: { ...d.preferences, ...values } }));
    },
    async deleteAllData() {
      await serialize(() => deleteAllData(db));
      setLoaded({ weighIns: [], preferences: DEFAULT_PREFERENCES });
      setHealthSync((s) => ({ ...s, error: null }));
    },
    connectHealth: () =>
      syncNow(async (adapter) => {
        if (!(await adapter.requestAccess())) return null;
        const { health: current } = await getPreferences(db);
        await setPreference(db, 'health', { ...current, read: true, syncToken: undefined });
        return serialize(() => pullFromHealth(db, adapter, true));
      }).then((n) => n ?? null),
    async disconnectHealth() {
      const next = { ...health, read: false, syncToken: undefined };
      await serialize(() => setPreference(db, 'health', next));
      update((d) => ({ ...d, preferences: { ...d.preferences, health: next } }));
      setHealthSync((s) => ({ ...s, error: null }));
    },
    async syncHealth(full = false) {
      await syncNow((adapter) => serialize(() => pullFromHealth(db, adapter, full)));
    },
    openHealthSettings() {
      healthAdapter?.openSettings();
    },
  };

  return <DataContext value={data}>{children}</DataContext>;
}

export function useData(): Data {
  const data = use(DataContext);
  if (!data) throw new Error('useData must be used inside <DataProvider>');
  return data;
}
