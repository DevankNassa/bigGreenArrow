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

export type WeightKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back';

/**
 * Applies one keypad press to the typed weight. With `replace`, the shown value is
 * treated as selected, so a digit or point starts over and backspace clears it.
 * Keeps at most three whole digits and one decimal, as body weights need no more.
 */
export function pressWeightKey(text: string, key: WeightKey, replace = false): string {
  const current = replace ? '' : text;
  if (key === 'back') return current.slice(0, -1);
  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : `${current}.`;
  }
  const [whole, decimals] = current.split('.');
  if (decimals !== undefined) return decimals.length >= 1 ? current : current + key;
  if (whole === '0') return key;
  return whole.length >= 3 ? current : current + key;
}
