import {
  deleteRecordsByUuids,
  getChanges,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  insertRecords,
  openHealthConnectSettings,
  readRecords,
  RecordingMethod,
  requestPermission,
  SdkAvailabilityStatus,
  type RecordResult,
} from 'react-native-health-connect';

import { isoTimestampAtOffset } from '@/lib/dates';

import { HealthPermissionError, type HealthAdapter, type HealthSample } from './types';

/** Friendly names for apps that commonly write weight into Health Connect. */
const ORIGIN_APPS: Record<string, string> = {
  'com.google.android.apps.fitness': 'Google Fit',
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.withings.wiscale2': 'Withings',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'com.myfitnesspal.android': 'MyFitnessPal',
};

const READ_WEIGHT = { accessType: 'read', recordType: 'Weight' } as const;
const WRITE_WEIGHT = { accessType: 'write', recordType: 'Weight' } as const;
/** Without this, Health Connect only returns the 30 days before permission was first granted. */
const READ_HISTORY = { accessType: 'read', recordType: 'ReadHealthDataHistory' } as const;

let initialized = false;
async function ready(): Promise<void> {
  if (!initialized) initialized = await initialize();
  if (!initialized) throw new Error('Health Connect could not start');
}

async function granted(): Promise<{ read: boolean; write: boolean }> {
  const perms = await getGrantedPermissions();
  const has = (accessType: string) => perms.some((p) => p.recordType === 'Weight' && p.accessType === accessType);
  return { read: has('read'), write: has('write') };
}

function toSample(r: RecordResult<'Weight'>): HealthSample | null {
  const id = r.metadata?.id;
  if (!id) return null;
  const at = new Date(r.time);
  const offsetMin = r.zoneOffset ? r.zoneOffset.totalSeconds / 60 : -at.getTimezoneOffset();
  const origin = r.metadata?.dataOrigin;
  const originApp = origin ? ORIGIN_APPS[origin] : undefined;
  return {
    externalId: id,
    timestamp: isoTimestampAtOffset(at, offsetMin),
    weightKg: r.weight.inKilograms,
    ...(originApp && { originApp }),
  };
}

/** Every weight record, plus a changes token taken first so nothing written meanwhile is missed. */
async function readAll() {
  const { nextChangesToken } = await getChanges({ recordTypes: ['Weight'] });
  const samples: HealthSample[] = [];
  let pageToken: string | undefined;
  do {
    const page = await readRecords('Weight', {
      timeRangeFilter: { operator: 'after', startTime: '1970-01-01T00:00:00.000Z' },
      pageSize: 1000,
      ...(pageToken && { pageToken }),
    });
    for (const r of page.records) {
      const s = toSample(r);
      if (s) samples.push(s);
    }
    pageToken = page.pageToken || undefined;
  } while (pageToken);
  return { full: true, samples, deletedIds: [], token: nextChangesToken };
}

/** Health Connect (Android). Reads only what changed since the last sync, using its changes token. */
export const healthAdapter: HealthAdapter = {
  source: 'health_connect',
  name: 'Health Connect',

  async isAvailable() {
    return (await getSdkStatus()) === SdkAvailabilityStatus.SDK_AVAILABLE;
  },

  async requestAccess() {
    await ready();
    const perms = await requestPermission([READ_WEIGHT, WRITE_WEIGHT, READ_HISTORY]);
    return perms.some((p) => p.recordType === 'Weight' && p.accessType === 'read');
  },

  async canWrite() {
    await ready();
    return (await granted()).write;
  },

  async read(token) {
    await ready();
    if (!(await granted()).read) throw new HealthPermissionError();
    if (token === undefined) return readAll();

    const samples: HealthSample[] = [];
    const deletedIds: string[] = [];
    let next = token;
    for (;;) {
      const res = await getChanges({ changesToken: next });
      // Tokens expire after about 30 days without a sync; start over from a full read.
      if (res.changesTokenExpired) return readAll();
      for (const { record } of res.upsertionChanges) {
        if (record.recordType !== 'Weight') continue;
        const s = toSample(record);
        if (s) samples.push(s);
      }
      for (const { recordId } of res.deletionChanges) deletedIds.push(recordId);
      next = res.nextChangesToken;
      if (!res.hasMore) break;
    }
    return { full: false, samples, deletedIds, token: next };
  },

  async write(timestamp, weightKg) {
    await ready();
    const at = new Date(timestamp);
    const [id] = await insertRecords([
      {
        recordType: 'Weight',
        time: at.toISOString(),
        weight: { value: weightKg, unit: 'kilograms' },
        metadata: { recordingMethod: RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY },
      },
    ]);
    return id;
  },

  async remove(externalIds) {
    if (externalIds.length === 0) return;
    await ready();
    await deleteRecordsByUuids('Weight', externalIds, []);
  },

  openSettings() {
    openHealthConnectSettings();
  },
};
