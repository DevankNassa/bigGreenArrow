import { STATE_TONE, arrowAngle, isCelebrating, resolveStates } from './arrow';
import {
  CALIBRATION_MIN_DAYS,
  CALIBRATION_MIN_WEIGH_INS,
  GAP_DAYS,
  GAP_RECOVERY_WEIGH_INS,
  LOW_CONFIDENCE_MIN_POINTS,
} from './constants';
import { dayNumber, toDailyWeights } from './daily';
import { daysToTarget } from './goal';
import { computeRate, computeTrend } from './trend';
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
  | {
      level: 'calibrating';
      weighIns: number;
      weighInsNeeded: number;
      days: number;
      daysNeeded: number;
    }
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
}

export interface Analysis {
  series: AnalyzedPoint[];
  latest: AnalyzedPoint | null;
  confidence: Confidence;
  /** Null while calibrating. */
  arrow: ArrowReading | null;
  /** Null while calibrating, since a rate from a few points is noise. */
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
  const trend = computeTrend(toDailyWeights(weighIns, settings.sameDayRule), settings.smoothing);
  const rates = trend.map((_, i) => computeRate(trend, i, settings.slopeLookbackDays));

  const firstWithRate = rates.findIndex((r) => r !== null);
  const states: (ArrowState | null)[] = trend.map(() => null);
  if (firstWithRate >= 0) {
    const measured = trend.slice(firstWithRate).map((p, i) => ({
      ratePct: rates[firstWithRate + i]!.pctPerWeek,
      trendKg: p.trendKg,
    }));
    resolveStates(goal, measured).forEach((s, i) => (states[firstWithRate + i] = s));
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
  };
}

function assessConfidence(series: AnalyzedPoint[], asOf: IsoDate): Confidence {
  const first = series[0];
  const latest = series[series.length - 1];
  const days = latest ? latest.day - first.day + 1 : 0;
  if (series.length < CALIBRATION_MIN_WEIGH_INS || days < CALIBRATION_MIN_DAYS) {
    return {
      level: 'calibrating',
      weighIns: series.length,
      weighInsNeeded: CALIBRATION_MIN_WEIGH_INS,
      days,
      daysNeeded: CALIBRATION_MIN_DAYS,
    };
  }

  if (dayNumber(asOf) - latest.day > GAP_DAYS) return { level: 'low', reason: 'stale' };

  // A gap inside the last few weigh-ins means too few readings since coming back.
  const recent = series.slice(-GAP_RECOVERY_WEIGH_INS);
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].day - recent[i - 1].day > GAP_DAYS) return { level: 'low', reason: 'gap' };
  }

  if ((latest.rate?.points ?? 0) < LOW_CONFIDENCE_MIN_POINTS) return { level: 'low', reason: 'sparse' };

  return { level: 'ok' };
}
