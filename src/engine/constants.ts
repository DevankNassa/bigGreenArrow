import type { TrendSettings } from './types';

export const DEFAULT_TREND_SETTINGS: TrendSettings = {
  smoothing: { method: 'ema', alpha: 0.1 },
  slopeLookbackDays: 14,
  sameDayRule: 'first',
};

export const DEFAULT_FLAT_BAND_PCT = 0.15;
export const DEFAULT_TARGET_BAND_PCT = 1.5;

/** Optimal max above this (either direction) triggers the pace warning. */
export const PACE_WARNING_PCT = 1.0;

/** The arrow goes live once there are weigh-ins on this many days (so on day 2). */
export const CALIBRATION_MIN_WEIGH_INS = 2;

/** Until there are this many weigh-ins over this many days, the reading is marked early. */
export const EARLY_UNTIL_WEIGH_INS = 5;
export const EARLY_UNTIL_DAYS = 7;

/**
 * Pulls early rates toward flat, in day². A slope fitted to points whose days
 * spread Sxx (sum of squared distances from their mean day) is scaled by
 * Sxx / (Sxx + this). Two days in a row keep ~7% of the raw slope, a week of
 * daily weigh-ins ~80%, two weeks ~97%, so one noisy morning can't swing the
 * arrow but a real change shows from day 2.
 */
export const EARLY_RATE_SHRINK = 7;

/** Fewer weigh-ins than this inside the lookback window is low confidence. */
export const LOW_CONFIDENCE_MIN_POINTS = 4;

/** A break longer than this many days counts as a gap. */
export const GAP_DAYS = 7;
export const GAP_RECOVERY_WEIGH_INS = 3;

/** A boundary must be crossed by this much (percentage points) to switch state immediately... */
export const HYSTERESIS_MARGIN_PCT = 0.05;
/** ...otherwise the new state must hold for this many consecutive weigh-ins. */
export const HYSTERESIS_CONSECUTIVE = 2;

/** Entries further than this from the trend ask for confirmation. */
export const OUTLIER_PCT = 3;

/** For maintain, the arrow is vertical at this rate. */
export const MAINTAIN_ANGLE_FULL_SCALE_PCT = 1.0;
