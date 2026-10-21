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

export const CALIBRATION_MIN_WEIGH_INS = 5;
export const CALIBRATION_MIN_DAYS = 7;

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

/** For lose/gain, the arrow is vertical at `optimalMaxPct × this`. */
export const ANGLE_FULL_SCALE_FACTOR = 1.5;
/** For maintain, the arrow is vertical at this rate. */
export const MAINTAIN_ANGLE_FULL_SCALE_PCT = 1.0;
