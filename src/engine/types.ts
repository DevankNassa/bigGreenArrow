/** Calendar date in the user's local time, `YYYY-MM-DD`. */
export type IsoDate = string;

export type WeighInSource = 'manual' | 'apple_health' | 'health_connect' | 'import';

export interface WeighIn {
  id: string;
  /**
   * ISO 8601 timestamp carrying the UTC offset the weigh-in was recorded in,
   * e.g. `2026-10-21T07:12:00+02:00`. Its date part is the local calendar day.
   */
  timestamp: string;
  weightKg: number;
  source: WeighInSource;
  externalId?: string;
  originApp?: string;
  note?: string;
  /** User-flagged outlier; ignored by the trend. */
  excluded: boolean;
}

export type GoalType = 'lose' | 'gain' | 'maintain';

/** All rates are magnitudes in % of body weight per week. */
export interface Goal {
  type: GoalType;
  targetKg?: number;
  /** `maintain` only: ± % of target weight that counts as on target. */
  targetBandPct: number;
  optimalMinPct: number;
  optimalMaxPct: number;
  /** ± rate treated as flat (the dash zone). */
  flatBandPct: number;
  /** Wrong-way rate at which light red turns red. Unset means `optimalMinPct`. */
  redThresholdPct?: number;
}

export type Smoothing = { method: 'ema'; alpha: number } | { method: 'sma'; windowDays: number };

export type SameDayRule = 'first' | 'last' | 'average';

export interface TrendSettings {
  smoothing: Smoothing;
  slopeLookbackDays: number;
  sameDayRule: SameDayRule;
}

export interface DailyWeight {
  date: IsoDate;
  /** Days since 1970-01-01 for `date`; used for gap arithmetic. */
  day: number;
  weightKg: number;
}

export interface TrendPoint extends DailyWeight {
  trendKg: number;
}

export interface Rate {
  kgPerWeek: number;
  /** Signed: negative means losing. */
  pctPerWeek: number;
  /** Number of trend points the regression used. */
  points: number;
}

export type ArrowState =
  // lose / gain
  | 'optimal'
  | 'slow_right'
  | 'flat'
  | 'slow_wrong'
  | 'wrong_way'
  | 'too_fast'
  // maintain
  | 'on_target'
  | 'drifting'
  | 'off_target'
  | 'returning';

export type ArrowTone = 'big_green' | 'light_green' | 'gray' | 'light_red' | 'red' | 'amber';

/** What the classifier looks at for one point in time. */
export interface Measurement {
  ratePct: number;
  trendKg: number;
}
