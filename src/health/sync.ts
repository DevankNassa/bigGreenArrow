import type { Db } from '@/data/db';
import { getPreferences, setPreference } from '@/data/preferences';
import { applyHealthPlan, linkExternalId, listWeighIns } from '@/data/weigh-ins';
import type { WeighIn } from '@/engine';

import { planHealthSync } from './merge';
import { HealthPermissionError, type HealthAdapter } from './types';

let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs Health work one job at a time. A sync that ran between saving a manual
 * weigh-in to Health and recording the sample's id would import it twice.
 */
export function serialize<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Reads new, changed and deleted weight samples from Health into the database
 * and saves the sync token. `full` re-reads the whole history. Does nothing
 * while reading is switched off. If permission was taken away, reading is
 * switched off (imported data stays) and the HealthPermissionError is rethrown.
 *
 * Resolves to the number of weigh-ins added.
 */
export async function pullFromHealth(db: Db, adapter: HealthAdapter, full = false): Promise<number> {
  const { health } = await getPreferences(db);
  // Switched off (or all data deleted) while this sync waited its turn.
  if (!health.read) return 0;
  let batch;
  try {
    batch = await adapter.read(full ? undefined : health.syncToken);
  } catch (e) {
    if (e instanceof HealthPermissionError) await setPreference(db, 'health', { ...health, read: false });
    throw e;
  }
  const plan = planHealthSync(await listWeighIns(db), adapter.source, batch);
  await applyHealthPlan(db, plan);
  await setPreference(db, 'health', { ...health, syncToken: batch.token, lastSyncAt: new Date().toISOString() });
  return plan.inserts.length;
}

/** Saves a manual weigh-in to Health if allowed, and links it to the new sample. Resolves to that sample's id. */
export async function pushToHealth(db: Db, adapter: HealthAdapter, w: WeighIn): Promise<string | undefined> {
  if (w.source !== 'manual' || !(await adapter.canWrite())) return undefined;
  const externalId = await adapter.write(w.timestamp, w.weightKg);
  if (externalId !== undefined) await linkExternalId(db, w.id, externalId);
  return externalId;
}

/** Deletes the Health sample a manual weigh-in was saved to, if any, and unlinks it. */
export async function removeFromHealth(db: Db, adapter: HealthAdapter, w: WeighIn): Promise<void> {
  if (w.source !== 'manual' || w.externalId === undefined) return;
  await adapter.remove([w.externalId]);
  await linkExternalId(db, w.id, null);
}
