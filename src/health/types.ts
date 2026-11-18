import type { WeighInSource } from '@/engine';

export type HealthSource = Extract<WeighInSource, 'apple_health' | 'health_connect'>;

/** One body-weight sample as Apple Health / Health Connect reports it. */
export interface HealthSample {
  /** HealthKit UUID or Health Connect record id. */
  externalId: string;
  /** ISO 8601 with UTC offset, like every weigh-in timestamp. */
  timestamp: string;
  weightKg: number;
  /** The app that wrote it, e.g. "Withings", when known. */
  originApp?: string;
}

/** What a read from Health returned. */
export interface HealthBatch {
  /**
   * True when `samples` is every weight sample in Health (a first or full
   * sync), so anything missing from it has been deleted there.
   */
  full: boolean;
  samples: HealthSample[];
  /** Samples deleted in Health since the last sync (incremental reads only). */
  deletedIds: string[];
  /** HealthKit anchor or Health Connect changes token for the next read. */
  token: string;
}

/** Thrown when the user has taken away permission to read weight. */
export class HealthPermissionError extends Error {
  constructor(message = 'Permission to read weight was turned off') {
    super(message);
    this.name = 'HealthPermissionError';
  }
}

/** The platform's health store, behind one interface (SPEC §8). */
export interface HealthAdapter {
  source: HealthSource;
  /** "Apple Health" or "Health Connect". */
  name: string;
  /** False when the store isn't on this device (iPad, or Health Connect missing or outdated). */
  isAvailable(): Promise<boolean>;
  /** Shows the system permission prompt. Resolves true if weight may now be read. */
  requestAccess(): Promise<boolean>;
  /** Whether the user allowed this app to write weight. */
  canWrite(): Promise<boolean>;
  /** Changes since `token`; with no token, every weight sample (`full: true`). */
  read(token: string | undefined): Promise<HealthBatch>;
  /** Saves a manual weigh-in and returns the new sample's id. */
  write(timestamp: string, weightKg: number): Promise<string | undefined>;
  /** Deletes samples this app wrote earlier. */
  remove(externalIds: string[]): Promise<void>;
  /** Opens the screen where the user manages this app's health permissions. */
  openSettings(): void;
}
