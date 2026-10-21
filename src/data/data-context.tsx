import { useSQLiteContext } from 'expo-sqlite';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import type { WeighIn } from '@/engine';

import { getPreferences, setPreference, type Preferences } from './preferences';
import { deleteWeighIn, insertWeighIn, listWeighIns, updateWeighIn } from './weigh-ins';

interface Data {
  weighIns: WeighIn[];
  preferences: Preferences;
  addWeighIn: (w: WeighIn) => Promise<void>;
  updateWeighIn: (w: WeighIn) => Promise<void>;
  deleteWeighIn: (id: string) => Promise<void>;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => Promise<void>;
}

type Loaded = Pick<Data, 'weighIns' | 'preferences'>;

const DataContext = createContext<Data | null>(null);

/**
 * Loads weigh-ins and preferences once, then keeps them in memory. All writes
 * go through here, so the in-memory copy stays in step with the database.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listWeighIns(db), getPreferences(db)]).then(([weighIns, preferences]) => {
      if (!cancelled) setLoaded({ weighIns, preferences });
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  if (!loaded) return null;

  const update = (fn: (d: Loaded) => Loaded) => setLoaded((d) => (d ? fn(d) : d));

  const data: Data = {
    ...loaded,
    async addWeighIn(w) {
      await insertWeighIn(db, w);
      update((d) => ({ ...d, weighIns: [...d.weighIns, w] }));
    },
    async updateWeighIn(w) {
      await updateWeighIn(db, w);
      update((d) => ({ ...d, weighIns: d.weighIns.map((x) => (x.id === w.id ? w : x)) }));
    },
    async deleteWeighIn(id) {
      await deleteWeighIn(db, id);
      update((d) => ({ ...d, weighIns: d.weighIns.filter((x) => x.id !== id) }));
    },
    async setPreference(key, value) {
      await setPreference(db, key, value);
      update((d) => ({ ...d, preferences: { ...d.preferences, [key]: value } }));
    },
  };

  return <DataContext value={data}>{children}</DataContext>;
}

export function useData(): Data {
  const data = use(DataContext);
  if (!data) throw new Error('useData must be used inside <DataProvider>');
  return data;
}
