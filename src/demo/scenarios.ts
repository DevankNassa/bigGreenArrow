import { DEFAULT_FLAT_BAND_PCT, DEFAULT_TARGET_BAND_PCT, type Goal, type WeighIn } from '@/engine';
import { localIsoTimestamp } from '@/lib/dates';

/** Sample histories for trying the arrow before real logging exists. */
export interface Scenario {
  key: string;
  label: string;
  goal: Goal;
  weighIns: WeighIn[];
}

const DAYS = 56;

function history(kgOnDay: (i: number) => number): WeighIn[] {
  const today = new Date();
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (DAYS - 1 - i));
    d.setHours(7, 0, 0, 0);
    return {
      id: `demo-${i}`,
      timestamp: localIsoTimestamp(d),
      weightKg: Math.round(kgOnDay(i) * 10) / 10,
      source: 'manual',
      excluded: false,
    };
  });
}

/** Deterministic scale noise of roughly ±0.6 kg. */
const noise = (i: number) => Math.sin(i * 2.3) * 0.42 + Math.sin(i * 0.9 + 1) * 0.18;

const base = { targetBandPct: DEFAULT_TARGET_BAND_PCT, flatBandPct: DEFAULT_FLAT_BAND_PCT };
const lose: Goal = { ...base, type: 'lose', targetKg: 80, optimalMinPct: 0.5, optimalMaxPct: 1.0 };
const gain: Goal = { ...base, type: 'gain', targetKg: 75, optimalMinPct: 0.25, optimalMaxPct: 0.5 };
const maintain: Goal = { ...base, type: 'maintain', targetKg: 80, optimalMinPct: 0.5, optimalMaxPct: 1.0 };

export const SCENARIOS: Scenario[] = [
  { key: 'optimal-loss', label: 'Optimal loss', goal: lose, weighIns: history((i) => 90 - 0.09 * i + noise(i)) },
  { key: 'slow-loss', label: 'Slow loss', goal: lose, weighIns: history((i) => 88 - 0.03 * i + noise(i)) },
  { key: 'too-fast', label: 'Too fast', goal: lose, weighIns: history((i) => 95 - 0.22 * i + noise(i)) },
  { key: 'wrong-way', label: 'Wrong way', goal: lose, weighIns: history((i) => 84 + 0.07 * i + noise(i)) },
  { key: 'stalled', label: 'Stalled', goal: lose, weighIns: history((i) => 86 + noise(i)) },
  { key: 'lean-bulk', label: 'Lean bulk', goal: gain, weighIns: history((i) => 68 + 0.04 * i + noise(i)) },
  { key: 'maintaining', label: 'Maintaining', goal: maintain, weighIns: history((i) => 80.3 + noise(i)) },
];
