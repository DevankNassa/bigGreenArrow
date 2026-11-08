import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

import type { ChipIcon } from '@/lib/arrow-labels';

/**
 * The "on fire" look for celebrating heroes, drawn cel-style like the design:
 * three hand-drawn flame frames swapped at about 8 fps, sparks that jump in
 * steps, and streaks rushing past the block.
 */

/** Milliseconds since mount, ticking on the UI thread while `active`. */
export function useFxClock(active: boolean): SharedValue<number> {
  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    clock.set(frame.timeSinceFirstFrame);
  }, active);
  return clock;
}

/** Deterministic noise in [0, 1) so every render lays particles out the same way. */
function rnd(i: number, seed: number): number {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function lerp([a, b]: readonly [number, number], t: number): number {
  return a + (b - a) * t;
}

/** One 160×200 frame per entry: outer red, orange, yellow core. The flame points up, its base at the bottom. */
const FLAME_FRAMES = [
  [
    'M22.0 167.9 C24.0 138.4 31.2 135.2 37.2 105.8 C41.2 131.0 49.0 137.0 51.0 149.0 C53.0 99.0 61.5 97.2 67.5 47.2 C71.5 90.1 78.0 116.4 80.0 128.4 C82.0 85.5 93.9 110.4 99.9 67.6 C103.9 104.3 107.0 120.9 109.0 132.9 C111.0 103.4 125.4 135.3 131.4 105.8 C135.4 131.1 136.0 155.9 138.0 167.9 Q80.0 219.4 22.0 167.9 Z',
    'M40.0 174.6 C42.0 152.9 52.7 149.6 58.7 127.8 C62.7 146.5 64.7 146.5 66.7 158.5 C68.7 117.3 68.4 113.4 74.4 72.2 C78.4 107.5 91.3 115.0 93.3 127.0 C95.3 103.1 101.0 145.6 107.0 121.6 C111.0 142.2 118.0 162.6 120.0 174.6 Q80.0 210.5 40.0 174.6 Z',
    'M58.0 181.1 C60.0 162.2 65.7 154.8 71.7 135.9 C75.7 152.1 78.0 154.7 80.0 166.7 C82.0 147.7 86.5 154.7 92.5 135.7 C96.5 152.0 100.0 169.1 102.0 181.1 Q80.0 201.8 58.0 181.1 Z',
  ],
  [
    'M22.0 167.9 C24.0 137.9 23.0 134.3 29.0 104.4 C33.0 130.0 49.0 128.7 51.0 140.7 C53.0 92.3 63.0 100.1 69.0 51.7 C73.0 93.2 78.0 98.1 80.0 110.1 C82.0 58.8 95.2 94.7 101.2 43.4 C105.2 87.4 107.0 106.0 109.0 118.0 C111.0 84.2 116.6 127.1 122.6 93.2 C126.6 122.3 136.0 155.9 138.0 167.9 Q80.0 219.4 22.0 167.9 Z',
    'M40.0 174.6 C42.0 150.3 53.4 144.9 59.4 120.6 C63.4 141.4 64.7 147.6 66.7 159.6 C68.7 123.3 69.5 122.6 75.5 86.3 C79.5 117.4 91.3 116.4 93.3 128.4 C95.3 106.9 102.7 149.9 108.7 128.3 C112.7 146.8 118.0 162.6 120.0 174.6 Q80.0 210.5 40.0 174.6 Z',
    'M58.0 181.1 C60.0 164.1 63.1 158.5 69.1 141.5 C73.1 156.0 78.0 154.2 80.0 166.2 C82.0 149.0 86.4 158.0 92.4 140.8 C96.4 155.6 100.0 169.1 102.0 181.1 Q80.0 201.8 58.0 181.1 Z',
  ],
  [
    'M22.0 167.9 C24.0 135.7 37.0 130.2 43.0 98.1 C47.0 125.6 49.0 128.1 51.0 140.1 C53.0 86.2 65.2 89.9 71.2 36.0 C75.2 82.2 78.0 85.9 80.0 97.9 C82.0 47.1 83.1 95.7 89.1 44.9 C93.1 88.4 107.0 94.6 109.0 106.6 C111.0 71.4 124.0 124.7 130.0 89.6 C134.0 119.7 136.0 155.9 138.0 167.9 Q80.0 219.4 22.0 167.9 Z',
    'M40.0 174.6 C42.0 152.3 50.8 148.6 56.8 126.3 C60.8 145.4 64.7 148.8 66.7 160.8 C68.7 117.7 75.2 109.9 81.2 66.7 C85.2 103.7 91.3 119.9 93.3 131.9 C95.3 112.3 106.3 153.7 112.3 134.1 C116.3 150.9 118.0 162.6 120.0 174.6 Q80.0 210.5 40.0 174.6 Z',
    'M58.0 181.1 C60.0 161.1 56.4 152.8 62.4 132.8 C66.4 149.9 78.0 145.7 80.0 157.7 C82.0 140.3 79.4 157.6 85.4 140.1 C89.4 155.1 100.0 169.1 102.0 181.1 Q80.0 201.8 58.0 181.1 Z',
  ],
] as const;
const FLAME_FILLS = ['#E23D0E', '#FF8A1F', '#FFD23F'] as const;
const FRAME_MS = 120;

/** Sizes in the design are for a 190 px arrow box; everything scales from there. */
const DESIGN_ARROW = 190;
/** How far behind the arrow box's center the flame's center sits, in arrow sizes. */
const FIRE_BEHIND = 0.92;

/**
 * Fire streaming back from the tail of an arrow that points right in an S×S
 * box. Rotate the box with the arrow. `ignite` (0–1) grows it out of the tail.
 * Without a `clock` it holds still on one frame.
 */
export function FireTrail({
  size: S,
  clock,
  ignite,
}: {
  size: number;
  clock?: SharedValue<number>;
  ignite: SharedValue<number>;
}) {
  const k = S / DESIGN_ARROW;
  const w = 160 * k;
  const h = 200 * k;
  const cx = S / 2 - FIRE_BEHIND * S;
  const igniteStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, ignite.get() * 2),
    transform: [{ scale: ignite.get() }],
  }));

  return (
    // Turned on its side, the flame spans h across and w down; its base faces the tail.
    <Animated.View
      pointerEvents="none"
      style={[
        styles.abs,
        { left: cx - h / 2, top: S / 2 - w / 2, width: h, height: w, transformOrigin: 'right center' },
        igniteStyle,
      ]}>
      {(clock ? FLAME_FRAMES : FLAME_FRAMES.slice(0, 1)).map((paths, i) => (
        <FlameFrame key={i} index={i} paths={paths} w={w} h={h} clock={clock} />
      ))}
    </Animated.View>
  );
}

function FlameFrame({
  index,
  paths,
  w,
  h,
  clock,
}: {
  index: number;
  paths: readonly string[];
  w: number;
  h: number;
  clock?: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: !clock ? 1 : Math.floor(clock.get() / FRAME_MS) % 3 === index ? 1 : 0,
  }));
  return (
    <Animated.View
      style={[styles.abs, { left: (h - w) / 2, top: (w - h) / 2, width: w, height: h, transform: [{ rotate: '-90deg' }] }, style]}>
      <Svg width={w} height={h} viewBox="0 0 160 200">
        {paths.map((d, j) => (
          <Path key={j} d={d} fill={FLAME_FILLS[j]} />
        ))}
      </Svg>
    </Animated.View>
  );
}

const SPARK_COLORS = ['#FFD23F', '#FF8A1F', '#FFF1C7'];
const SPARKS = Array.from({ length: 16 }, (_, i) => ({
  // In arrow sizes from the box center, arrow pointing right: they leave the tail and fly back.
  x: lerp([-0.5, -0.35], rnd(i, 23)),
  y: lerp([-0.23, 0.23], rnd(i, 24)),
  dx: lerp([-1.16, -0.63], rnd(i, 26)),
  dy: lerp([-0.26, 0.26], rnd(i, 25)),
  length: 6 + Math.round(6 * rnd(i, 21)),
  color: SPARK_COLORS[i % 3],
  ms: 700 + 700 * rnd(i, 22),
  phase: rnd(i, 27),
}));

/** Sparks thrown back off the fire; same frame as FireTrail. */
export function Sparks({ size: S, clock }: { size: number; clock: SharedValue<number> }) {
  return (
    <>
      {SPARKS.map((s, i) => (
        <Spark key={i} spark={s} size={S} clock={clock} />
      ))}
    </>
  );
}

function Spark({ spark, size: S, clock }: { spark: (typeof SPARKS)[number]; size: number; clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    // Jumps in 8 steps per flight, like the design's steps(8).
    const t = Math.floor((((clock.get() / spark.ms + spark.phase) % 1) * 8)) / 8;
    return {
      opacity: 1 - t,
      transform: [{ translateX: spark.dx * S * t }, { translateY: spark.dy * S * t }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.abs,
        styles.spark,
        { left: S / 2 + spark.x * S, top: S / 2 + spark.y * S, width: spark.length, backgroundColor: spark.color },
        style,
      ]}
    />
  );
}

export type StreakDirection = 'up' | 'down' | 'left';

const STREAKS = Array.from({ length: 9 }, (_, i) => ({
  length: Math.round(30 + 70 * rnd(i, 11)),
  thickness: 2 + Math.round(3 * rnd(i, 15)),
  band: rnd(i, 12),
  ms: 400 + 450 * rnd(i, 13),
  phase: rnd(i, 14),
}));

/** Speed streaks rushing across the whole block, opposite to where the arrow is going. */
export function Streaks({
  width,
  height,
  direction,
  clock,
}: {
  width: number;
  height: number;
  direction: StreakDirection;
  clock: SharedValue<number>;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {STREAKS.map((s, i) => (
        <Streak key={i} streak={s} width={width} height={height} direction={direction} clock={clock} />
      ))}
    </View>
  );
}

function Streak({
  streak,
  width,
  height,
  direction,
  clock,
}: {
  streak: (typeof STREAKS)[number];
  width: number;
  height: number;
  direction: StreakDirection;
  clock: SharedValue<number>;
}) {
  const vertical = direction !== 'left';
  const [from, to] =
    direction === 'up' ? [height + 40, -140] : direction === 'down' ? [-140, height + 40] : [width + 40, -140];
  const style = useAnimatedStyle(() => {
    const t = (clock.get() / streak.ms + streak.phase) % 1;
    const at = from + (to - from) * t;
    return { transform: vertical ? [{ translateY: at }] : [{ translateX: at }] };
  });
  const box = vertical
    ? { left: lerp([20, width - 20], streak.band), top: 0, width: streak.thickness, height: streak.length }
    : { top: lerp([16, height * 0.56], streak.band), left: 0, height: streak.thickness, width: streak.length };
  return <Animated.View style={[styles.abs, styles.streak, box, style]} />;
}

/** The little flame beside a streak count; it flickers unless motion is reduced. */
export function MiniFlame({ size = 18, animate }: { size?: number; animate: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (animate) p.set(withRepeat(withTiming(1, { duration: 500, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [animate, p]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: 0.9 + 0.2 * p.get() }, { scaleY: 0.88 + 0.3 * p.get() }, { skewX: `${4 * p.get()}deg` }],
  }));
  return (
    <Animated.View style={[{ width: size, height: size, transformOrigin: 'center bottom' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 2 C13 7 18 9 18 15 A6 6 0 0 1 6 15 C6 11 9 10 9 6 C10.5 7.5 11 9 11 10 C12.5 8 12.5 5 12 2 Z"
          fill="#FF5A1F"
        />
        <Path d="M12 13 C13 15 15 15.5 15 17.5 A3 3 0 0 1 9 17.5 C9 16 10.5 15 12 13 Z" fill="#FFB020" />
      </Svg>
    </Animated.View>
  );
}

/** A 0→1 value that starts at `delay` ms, for igniting the fire after the entrance. */
export function useIgnite(delay: number, animate: boolean): SharedValue<number> {
  const v = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) v.set(withDelay(delay, withTiming(1, { duration: 260, easing: Easing.out(Easing.back(2)) })));
  }, [animate, delay, v]);
  return v;
}

/** History: three bars. */
export function BarsIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
      <Line x1={5} y1={20} x2={5} y2={12} />
      <Line x1={12} y1={20} x2={12} y2={5} />
      <Line x1={19} y1={20} x2={19} y2={9} />
    </Svg>
  );
}

/** Settings: two sliders. Their knobs are filled with `knob`, usually the block's color. */
export function SlidersIcon({ color, knob, size = 20 }: { color: string; knob: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
      <Line x1={4} y1={7} x2={20} y2={7} />
      <Line x1={4} y1={17} x2={20} y2={17} />
      <Circle cx={9} cy={7} r={2.4} fill={knob} />
      <Circle cx={15} cy={17} r={2.4} fill={knob} />
    </Svg>
  );
}

/** The glyph inside a hero chip. */
export function ChipGlyph({ icon, color, size = 16 }: { icon: ChipIcon; color: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  switch (icon) {
    case 'warning':
      return (
        <Svg {...common} strokeWidth={2.4}>
          <Path d="M12 3 L22 20 L2 20 Z" />
          <Line x1={12} y1={10} x2={12} y2={14} />
          <Line x1={12} y1={17} x2={12} y2={17.2} />
        </Svg>
      );
    case 'clock':
      return (
        <Svg {...common}>
          <Circle cx={12} cy={12} r={8} />
          <Polyline points="12,8 12,12 15,14" />
        </Svg>
      );
    case 'level':
      return (
        <Svg {...common}>
          <Line x1={5} y1={10} x2={19} y2={10} />
          <Line x1={5} y1={15} x2={19} y2={15} />
        </Svg>
      );
    case 'up':
    case 'down':
      return (
        <Svg {...common} style={icon === 'down' ? { transform: [{ rotate: '180deg' }] } : undefined}>
          <Line x1={12} y1={19} x2={12} y2={5} />
          <Polyline points="6,11 12,5 18,11" />
        </Svg>
      );
  }
}

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
  spark: {
    height: 3,
    borderRadius: 1,
  },
  streak: {
    borderRadius: 999,
    backgroundColor: 'rgba(244,241,234,0.5)',
  },
});
