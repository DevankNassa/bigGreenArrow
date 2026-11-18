import { STATE_TONE, arrowAngle, isCelebrating, resolveStates } from './arrow';
import {
  CALIBRATION_MIN_WEIGH_INS,
  EARLY_RATE_SHRINK,
  EARLY_UNTIL_DAYS,
  EARLY_UNTIL_WEIGH_INS,
  GAP_DAYS,
  GAP_RECOVERY_WEIGH_INS,
  LOW_CONFIDENCE_MIN_POINTS,
} from './constants';
import { dayNumber, toDailyWeights } from './daily';
import { daysToTarget } from './goal';
import { computeRate, computeTrend, fitEarlyLine, lineRate } from './trend';
import type {
  ArrowState,
  ArrowTone,
  Goal,
  IsoDate,
  Rate,
  TrendPoint,
  TrendSettings,
  WeighIn,
} from './types';

export type Confidence =
  /** Not enough weigh-ins for any arrow yet. */
  | { level: 'calibrating'; weighIns: number; weighInsNeeded: number }
  /** The arrow is live, from a rate that firms up over the first week. */
  | { level: 'early'; weighIns: number; weighInsNeeded: number; days: number; daysNeeded: number }
  | { level: 'low'; reason: 'stale' | 'gap' | 'sparse' }
  | { level: 'ok' };

export interface AnalyzedPoint extends TrendPoint {
  rate: Rate | null;
  /** Displayed state at this weigh-in (after hysteresis); null before a rate exists. */
  state: ArrowState | null;
}

export interface ArrowReading {
  state: ArrowState;
  tone: ArrowTone;
  angleDeg: number;
  celebrating: boolean;
  /** Date of the weigh-in at which the current state began. */
  since: IsoDate;
  /** Days in the current celebrating state, counted to the latest weigh-in; 0 otherwise. */
  streakDays: number;
  /** Days in the current state, celebrating or not, counted to the latest weigh-in. */
  daysInState: number;
}

export interface Analysis {
  series: AnalyzedPoint[];
  latest: AnalyzedPoint | null;
  confidence: Confidence;
  /** Null while calibrating. */
  arrow: ArrowReading | null;
  /** Null while calibrating. */
  daysToTarget: number | null;
}

/**
 * Everything the UI needs from the raw weigh-ins. Pure and deterministic:
 * `asOf` is today's local date, passed in rather than read from the clock.
 */
export function analyze(
  weighIns: readonly WeighIn[],
  goal: Goal,
  settings: TrendSettings,
  asOf: IsoDate,
): Analysis {
  const daily = toDailyWeights(weighIns, settings.sameDayRule);
  const lookback = settings.slopeLookbackDays;
  // Until the lookback window has filled, the rate comes from a line fitted to
  // the raw weights (pulled toward flat while there are few of them), so the
  // arrow can go live on day 2. The trend starts along that same line, which
  // keeps the hand-over to the trend's own slope smooth.
  const inFirstWindow = (i: number) => daily[i].day - daily[0].day < lookback;
  let windowEnd = 0;
  while (windowEnd + 1 < daily.length && inFirstWindow(windowEnd + 1)) windowEnd++;
  const seed = daily.length ? fitEarlyLine(daily, windowEnd, EARLY_RATE_SHRINK) : null;
  const trend = computeTrend(daily, settings.smoothing, seed);
  const rates = trend.map((p, i) => {
    if (!inFirstWindow(i)) return computeRate(trend, i, lookback);
    const line = fitEarlyLine(daily, i, EARLY_RATE_SHRINK);
    return line && lineRate(line, p.trendKg);
  });

  // A gap longer than the lookback leaves the first weigh-in after it without a
  // rate (one point in the window). Each unbroken run of rates gets its own
  // arrow history, so the arrow starts fresh after a long break.
  const states: (ArrowState | null)[] = trend.map(() => null);
  for (let start = 0; start < trend.length; ) {
    if (!rates[start]) {
      start++;
      continue;
    }
    let end = start;
    while (end + 1 < trend.length && rates[end + 1]) end++;
    const measured = trend
      .slice(start, end + 1)
      .map((p, i) => ({ ratePct: rates[start + i]!.pctPerWeek, trendKg: p.trendKg }));
    resolveStates(goal, measured).forEach((s, i) => (states[start + i] = s));
    start = end + 1;
  }

  const series = trend.map((p, i) => ({ ...p, rate: rates[i], state: states[i] }));
  const latest = series[series.length - 1] ?? null;
  const confidence = assessConfidence(series, asOf);

  const arrow =
    latest?.state && latest.rate && confidence.level !== 'calibrating'
      ? readArrow(goal, series, latest.state, latest.rate)
      : null;

  return {
    series,
    latest,
    confidence,
    arrow,
    daysToTarget:
      latest?.rate && confidence.level !== 'calibrating'
        ? daysToTarget(goal, latest.trendKg, latest.rate)
        : null,
  };
}

function readArrow(
  goal: Goal,
  series: AnalyzedPoint[],
  state: ArrowState,
  rate: Rate,
): ArrowReading {
  let start = series.length - 1;
  while (start > 0 && series[start - 1].state === state) start--;
  const since = series[start];
  const latest = series[series.length - 1];
  const celebrating = isCelebrating(state);

  return {
    state,
    tone: STATE_TONE[state],
    angleDeg: arrowAngle(goal, rate.pctPerWeek),
    celebrating,
    since: since.date,
    streakDays: celebrating ? latest.day - since.day + 1 : 0,
    daysInState: latest.day - since.day + 1,
  };
}

function assessConfidence(series: AnalyzedPoint[], asOf: IsoDate): Confidence {
  const first = series[0];
  const latest = series[series.length - 1];
  if (series.length < CALIBRATION_MIN_WEIGH_INS) {
    return { level: 'calibrating', weighIns: series.length, weighInsNeeded: CALIBRATION_MIN_WEIGH_INS };
  }

  if (dayNumber(asOf) - latest.day > GAP_DAYS) return { level: 'low', reason: 'stale' };

  const days = latest.day - first.day + 1;
  if (series.length < EARLY_UNTIL_WEIGH_INS || days < EARLY_UNTIL_DAYS) {
    return {
      level: 'early',
      weighIns: series.length,
      weighInsNeeded: EARLY_UNTIL_WEIGH_INS,
      days,
      daysNeeded: EARLY_UNTIL_DAYS,
    };
  }

  // A gap inside the last few weigh-ins means too few readings since coming back.
  const recent = series.slice(-GAP_RECOVERY_WEIGH_INS);
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].day - recent[i - 1].day > GAP_DAYS) return { level: 'low', reason: 'gap' };
  }

  if ((latest.rate?.points ?? 0) < LOW_CONFIDENCE_MIN_POINTS) return { level: 'low', reason: 'sparse' };

  return { level: 'ok' };
}
