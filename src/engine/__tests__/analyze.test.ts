import {
  addDays,
  gainGoal,
  loseGoal,
  maintainGoal,
  noise,
  series,
  weighIn,
} from '../__fixtures__/weigh-ins';
import { analyze } from '../analyze';
import { DEFAULT_TREND_SETTINGS } from '../constants';

const START = '2026-08-01';
const settings = DEFAULT_TREND_SETTINGS;

/** 8 weeks of noisy loss at ~0.09 kg/day from 90 kg (~0.7%/week). */
const steadyLoss = series(START, 56, (i) => 90 - 0.09 * i + noise(i));
const lastDay = addDays(START, 55);

describe('analyze', () => {
  it('handles no data', () => {
    const a = analyze([], loseGoal, settings, START);
    expect(a.latest).toBeNull();
    expect(a.arrow).toBeNull();
    expect(a.confidence).toMatchObject({ level: 'calibrating', weighIns: 0 });
  });

  it('calibrates until there are 5 weigh-ins over 7 days', () => {
    const fewEntries = analyze(steadyLoss.slice(0, 4), loseGoal, settings, addDays(START, 3));
    expect(fewEntries.confidence).toEqual({
      level: 'calibrating',
      weighIns: 4,
      weighInsNeeded: 5,
      days: 4,
      daysNeeded: 7,
    });
    expect(fewEntries.arrow).toBeNull();
    const withTarget = analyze(steadyLoss.slice(0, 4), { ...loseGoal, targetKg: 80 }, settings, addDays(START, 3));
    expect(withTarget.daysToTarget).toBeNull();

    const fewDays = analyze(steadyLoss.slice(0, 6), loseGoal, settings, addDays(START, 5));
    expect(fewDays.confidence.level).toBe('calibrating');

    const ready = analyze(steadyLoss.slice(0, 7), loseGoal, settings, addDays(START, 6));
    expect(ready.confidence.level).not.toBe('calibrating');
    expect(ready.arrow).not.toBeNull();
  });

  it('shows the big green arrow for steady loss in the optimal range', () => {
    const a = analyze(steadyLoss, { ...loseGoal, targetKg: 80 }, settings, lastDay);
    expect(a.confidence).toEqual({ level: 'ok' });
    expect(a.latest!.rate!.pctPerWeek).toBeGreaterThan(-1.0);
    expect(a.latest!.rate!.pctPerWeek).toBeLessThan(-0.5);
    expect(a.arrow).toMatchObject({ state: 'optimal', tone: 'big_green', celebrating: true });
    expect(a.arrow!.angleDeg).toBeLessThan(0);
    expect(a.arrow!.streakDays).toBeGreaterThan(0);
    expect(a.daysToTarget).toBeGreaterThan(0);
  });

  it('smooths noise: the trend moves far less than the scale', () => {
    const a = analyze(steadyLoss, loseGoal, settings, lastDay);
    const jumps = (xs: number[]) =>
      Math.max(...xs.slice(1).map((x, i) => Math.abs(x - xs[i])));
    expect(jumps(a.series.map((p) => p.trendKg))).toBeLessThan(
      jumps(a.series.map((p) => p.weightKg)) / 4,
    );
  });

  it('shows red when the trend goes the wrong way', () => {
    const gaining = series(START, 42, (i) => 80 + 0.08 * i + noise(i));
    const a = analyze(gaining, loseGoal, settings, addDays(START, 41));
    expect(a.arrow).toMatchObject({ state: 'wrong_way', tone: 'red', celebrating: false });
    expect(a.arrow!.angleDeg).toBeGreaterThan(0);
    expect(a.daysToTarget).toBeNull();
  });

  it('shows amber, not green, for loss that is too fast', () => {
    const crash = series(START, 42, (i) => 90 - 0.25 * i + noise(i));
    const a = analyze(crash, loseGoal, settings, addDays(START, 41));
    expect(a.arrow).toMatchObject({ state: 'too_fast', tone: 'amber', celebrating: false });
  });

  it('celebrates holding steady on a maintain goal, with a sideways arrow', () => {
    const steady = series(START, 42, (i) => 80 + noise(i, 0.4));
    const a = analyze(steady, maintainGoal, settings, addDays(START, 41));
    expect(a.arrow).toMatchObject({ state: 'on_target', tone: 'big_green', celebrating: true });
    expect(Math.abs(a.arrow!.angleDeg)).toBeLessThan(15);
  });

  it('shows the dash when a gain goal is flat', () => {
    const flat = series(START, 42, (i) => 70 + noise(i, 0.3));
    const a = analyze(flat, gainGoal, settings, addDays(START, 41));
    expect(a.arrow).toMatchObject({ state: 'flat', tone: 'gray' });
  });

  it('ignores excluded weigh-ins', () => {
    const withTypo = [...steadyLoss, weighIn(lastDay, 8.5, { id: 'typo', excluded: true })];
    const a = analyze(withTypo, loseGoal, settings, lastDay);
    const b = analyze(steadyLoss, loseGoal, settings, lastDay);
    expect(a.latest!.trendKg).toBe(b.latest!.trendKg);
  });

  describe('low confidence', () => {
    it('is stale after more than a week without weigh-ins', () => {
      const a = analyze(steadyLoss, loseGoal, settings, addDays(lastDay, 8));
      expect(a.confidence).toEqual({ level: 'low', reason: 'stale' });
      expect(a.arrow).not.toBeNull();
    });

    it('stays low after a gap until 3 new weigh-ins', () => {
      const back = (n: number) =>
        series(addDays(lastDay, 11), n, (i) => 85 - 0.09 * i + noise(i));
      const twoBack = [...steadyLoss, ...back(2)];
      expect(analyze(twoBack, loseGoal, settings, addDays(lastDay, 12)).confidence).toEqual({
        level: 'low',
        reason: 'gap',
      });
      const threeBack = [...steadyLoss, ...back(3)];
      expect(analyze(threeBack, loseGoal, settings, addDays(lastDay, 13)).confidence).not.toEqual({
        level: 'low',
        reason: 'gap',
      });
    });

    it('is sparse with fewer than 4 weigh-ins in the lookback window', () => {
      const everyFiveDays = series(START, 60, (i) => 90 - 0.09 * i, 5);
      const a = analyze(everyFiveDays, loseGoal, settings, addDays(START, 55));
      expect(a.confidence).toEqual({ level: 'low', reason: 'sparse' });
    });
  });

  it('analyzes 5 years of daily data quickly', () => {
    const fiveYears = series('2021-10-21', 1826, (i) => 90 - 0.005 * i + noise(i));
    analyze(fiveYears, loseGoal, settings, '2026-10-21'); // warm up the JIT
    const start = performance.now();
    analyze(fiveYears, loseGoal, settings, '2026-10-21');
    // Spec target is 50 ms on device; leave headroom for slow CI machines.
    expect(performance.now() - start).toBeLessThan(100);
  });
});
