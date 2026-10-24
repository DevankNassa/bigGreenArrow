import { fromKg, type WeightUnit } from '@/engine';

/** Plausible human weights; anything outside is almost certainly a typo. */
export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 400;

/** Parses what the user typed. Accepts a decimal comma as well as a point. */
export function parseWeightInput(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export type WeightProblem = 'too_low' | 'too_high';

export function checkWeightKg(kg: number): WeightProblem | null {
  if (kg < MIN_WEIGHT_KG) return 'too_low';
  if (kg > MAX_WEIGHT_KG) return 'too_high';
  return null;
}

/** A weight in the user's unit, to one decimal, without the unit label. */
export function formatWeightValue(kg: number, unit: WeightUnit): string {
  return fromKg(kg, unit).toFixed(1);
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${formatWeightValue(kg, unit)} ${unit}`;
}

/** Steps a typed value by `delta`, keeping one decimal. Null if the text isn't a number. */
export function stepWeightInput(text: string, delta: number): string | null {
  const value = parseWeightInput(text);
  if (value === null) return null;
  return Math.max(0, Math.round((value + delta) * 10) / 10).toFixed(1);
}
