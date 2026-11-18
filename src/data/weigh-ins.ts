import { randomUUID } from 'expo-crypto';

import type { WeighIn, WeighInSource } from '@/engine';
import type { HealthPlan } from '@/health/merge';

import type { Db } from './db';

interface WeighInRow {
  id: string;
  timestamp: string;
  weight_kg: number;
  source: string;
  external_id: string | null;
  origin_app: string | null;
  note: string | null;
  excluded: number;
}

function fromRow(r: WeighInRow): WeighIn {
  return {
    id: r.id,
    timestamp: r.timestamp,
    weightKg: r.weight_kg,
    source: r.source as WeighInSource,
    excluded: r.excluded !== 0,
    ...(r.external_id !== null && { externalId: r.external_id }),
    ...(r.origin_app !== null && { originApp: r.origin_app }),
    ...(r.note !== null && { note: r.note }),
  };
}

export async function listWeighIns(db: Db): Promise<WeighIn[]> {
  const rows = await db.getAllAsync<WeighInRow>('SELECT * FROM weigh_ins ORDER BY timestamp', []);
  return rows.map(fromRow);
}

export async function insertWeighIn(db: Db, w: WeighIn): Promise<void> {
  await db.runAsync(
    `INSERT INTO weigh_ins (id, timestamp, weight_kg, source, external_id, origin_app, note, excluded)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      w.id,
      w.timestamp,
      w.weightKg,
      w.source,
      w.externalId ?? null,
      w.originApp ?? null,
      w.note ?? null,
      w.excluded ? 1 : 0,
    ],
  );
}

export async function updateWeighIn(db: Db, w: WeighIn): Promise<void> {
  await db.runAsync(
    'UPDATE weigh_ins SET timestamp = ?, weight_kg = ?, note = ?, excluded = ? WHERE id = ?',
    [w.timestamp, w.weightKg, w.note ?? null, w.excluded ? 1 : 0, w.id],
  );
}

export async function deleteWeighIn(db: Db, id: string): Promise<void> {
  await db.runAsync('DELETE FROM weigh_ins WHERE id = ?', [id]);
}

/** Records (or with `null`, forgets) the Health sample a manual weigh-in was written to. */
export async function linkExternalId(db: Db, id: string, externalId: string | null): Promise<void> {
  await db.runAsync('UPDATE weigh_ins SET external_id = ? WHERE id = ?', [externalId, id]);
}

/** Applies a Health sync plan in one transaction, so a failed sync changes nothing. */
export async function applyHealthPlan(db: Db, plan: HealthPlan): Promise<void> {
  await db.execAsync('BEGIN');
  try {
    for (const w of plan.inserts) await insertWeighIn(db, w);
    for (const w of plan.updates) {
      await db.runAsync('UPDATE weigh_ins SET timestamp = ?, weight_kg = ?, origin_app = ? WHERE id = ?', [
        w.timestamp,
        w.weightKg,
        w.originApp ?? null,
        w.id,
      ]);
    }
    for (const id of plan.deletes) await deleteWeighIn(db, id);
    for (const id of plan.unlinks) await linkExternalId(db, id, null);
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export function newManualWeighIn(fields: { timestamp: string; weightKg: number; note?: string }): WeighIn {
  const note = fields.note?.trim();
  return {
    id: randomUUID(),
    timestamp: fields.timestamp,
    weightKg: fields.weightKg,
    source: 'manual',
    excluded: false,
    ...(note && { note }),
  };
}
