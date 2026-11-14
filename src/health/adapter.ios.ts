import {
  authorizationStatusFor,
  deleteObjects,
  isHealthDataAvailableAsync,
  queryQuantitySamplesWithAnchor,
  requestAuthorization,
  saveQuantitySample,
} from '@kingstinct/react-native-healthkit';
import { Linking } from 'react-native';

import { localIsoTimestamp } from '@/lib/dates';

import type { HealthAdapter } from './types';

const BODY_MASS = 'HKQuantityTypeIdentifierBodyMass';
/** HKAuthorizationStatus.sharingAuthorized */
const SHARING_AUTHORIZED = 2;

/**
 * Apple HealthKit. iOS never says whether read access was granted (a denied
 * read just returns no samples), so `requestAccess` only reports that the
 * prompt was handled.
 */
export const healthAdapter: HealthAdapter = {
  source: 'apple_health',
  name: 'Apple Health',

  isAvailable: () => isHealthDataAvailableAsync(),

  requestAccess: () => requestAuthorization({ toRead: [BODY_MASS], toShare: [BODY_MASS] }),

  async canWrite() {
    return authorizationStatusFor(BODY_MASS) === SHARING_AUTHORIZED;
  },

  async read(token) {
    const res = await queryQuantitySamplesWithAnchor(BODY_MASS, { limit: 0, unit: 'kg', anchor: token });
    return {
      full: token === undefined,
      samples: res.samples.map((s) => ({
        externalId: s.uuid,
        timestamp: localIsoTimestamp(s.startDate),
        weightKg: s.quantity,
        ...(s.sourceRevision?.source?.name && { originApp: s.sourceRevision.source.name }),
      })),
      deletedIds: res.deletedSamples.map((d) => d.uuid),
      token: res.newAnchor,
    };
  },

  async write(timestamp, weightKg) {
    const at = new Date(timestamp);
    const sample = await saveQuantitySample(BODY_MASS, 'kg', weightKg, at, at);
    return sample?.uuid;
  },

  async remove(externalIds) {
    if (externalIds.length === 0) return;
    await deleteObjects(BODY_MASS, { uuids: externalIds });
  },

  openSettings() {
    // Read and write permissions live in the Health app (Sharing → Apps), not in Settings.
    Linking.openURL('x-apple-health://').catch(() => Linking.openSettings());
  },
};
