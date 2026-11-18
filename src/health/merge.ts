import type { WeighIn } from '@/engine';

import type { HealthBatch, HealthSample, HealthSource } from './types';

/** The database changes that bring local weigh-ins in line with a Health read. */
export interface HealthPlan {
  inserts: WeighIn[];
  /** Health-owned weigh-ins whose weight, time or origin changed in Health. */
  updates: WeighIn[];
  /** Ids of Health-owned weigh-ins that were deleted in Health. */
  deletes: string[];
  /** Ids of manual weigh-ins whose written-back sample was deleted in Health; they lose the link but stay. */
  unlinks: string[];
}

/** Stable local id for an imported sample, so re-imports land on the same row. */
export const importedId = (source: HealthSource, externalId: string) => `${source}:${externalId}`;

/**
 * Works out what to change locally for a batch read from Health (SPEC §8.1).
 *
 * - New samples become weigh-ins with the Health source, keeping their external id.
 * - Samples the app wrote itself (a manual weigh-in holds their id) are skipped.
 * - Health owns imported weigh-ins, so changes there overwrite weight and time here;
 *   the user's note and "excluded" flag are kept.
 * - Deletions in Health delete imported weigh-ins and unlink manual ones.
 * - A full read is a snapshot: anything linked locally but missing from it was deleted.
 *   An empty full read is not trusted as one, because iOS answers a denied read
 *   permission with no samples rather than an error, and imported data is kept
 *   when permission goes away (SPEC §8.3).
 */
export function planHealthSync(existing: WeighIn[], source: HealthSource, batch: HealthBatch): HealthPlan {
  const linked = new Map<string, WeighIn>();
  for (const w of existing) {
    if (w.externalId !== undefined && (w.source === source || w.source === 'manual')) linked.set(w.externalId, w);
  }

  const deleted = new Set(batch.deletedIds);
  const samples = new Map<string, HealthSample>();
  for (const s of batch.samples) if (!deleted.has(s.externalId)) samples.set(s.externalId, s);
  if (batch.full && samples.size > 0) {
    for (const id of linked.keys()) if (!samples.has(id)) deleted.add(id);
  }

  const plan: HealthPlan = { inserts: [], updates: [], deletes: [], unlinks: [] };

  for (const s of samples.values()) {
    const local = linked.get(s.externalId);
    if (!local) {
      plan.inserts.push({
        id: importedId(source, s.externalId),
        timestamp: s.timestamp,
        weightKg: s.weightKg,
        source,
        externalId: s.externalId,
        excluded: false,
        ...(s.originApp && { originApp: s.originApp }),
      });
    } else if (
      local.source === source &&
      (local.timestamp !== s.timestamp || local.weightKg !== s.weightKg || local.originApp !== s.originApp)
    ) {
      const updated: WeighIn = { ...local, timestamp: s.timestamp, weightKg: s.weightKg };
      if (s.originApp) updated.originApp = s.originApp;
      else delete updated.originApp;
      plan.updates.push(updated);
    }
  }

  for (const id of deleted) {
    const local = linked.get(id);
    if (!local) continue;
    if (local.source === source) plan.deletes.push(local.id);
    else plan.unlinks.push(local.id);
  }

  return plan;
}

export const isEmptyPlan = (p: HealthPlan) =>
  p.inserts.length + p.updates.length + p.deletes.length + p.unlinks.length === 0;
