import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { CelebrationBurst } from '@/components/celebration-burst';
import { ToneColors, ToneShadeColors } from '@/constants/theme';
import type { ArrowTone } from '@/engine';
import { hapticTimeline } from '@/lib/haptics';

export type TrendArrowProps = {
  tone: ArrowTone;
  /** 0 points right, +90 up, −90 down. */
  angleDeg: number;
  /** Draw a dash instead of an arrow (flat on a lose/gain goal). */
  dash?: boolean;
  celebrating?: boolean;
  /** Faded while calibrating or on low confidence. */
  dimmed?: boolean;
  size?: number;
  accessibilityLabel: string;
};

/**
 * Milliseconds from the render where `celebrating` turns on (or the arrow
 * mounts celebrating). The wait before the hop lets the entrance or the swing
 * to a new angle finish first. Other components sync to these.
 */
export const CELEBRATION_TIMING = {
  start: 320,
  launch: 320 + 160,
  land: 320 + 580,
} as const;

const HOP_HEIGHT = 0.16;
const LIP = 0.045;
const HIGHLIGHT = 'rgba(255,255,255,0.38)';

/**
 * The hero arrow. It pops in when it mounts, swings to each new angle, and on
 * Optimal / On target does a squash-and-stretch hop that lands in a confetti
 * burst, with haptics on each beat. Built from Views so it runs everywhere.
 */
export function TrendArrow({
  tone,
  angleDeg,
  dash = false,
  celebrating = false,
  dimmed = false,
  size = 220,
  accessibilityLabel,
}: TrendArrowProps) {
  const reduceMotion = useReducedMotion();

  const rotation = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const stretch = useSharedValue(1);
  const enterY = useSharedValue(reduceMotion ? 0 : size * 0.25);
  const enterScale = useSharedValue(reduceMotion ? 1 : 0.3);
  const enterOpacity = useSharedValue(0);
  const hopY = useSharedValue(0);
  const squashX = useSharedValue(1);
  const squashY = useSharedValue(1);
  const float = useSharedValue(0);
  const twinkle = useSharedValue(0);
  const burst = useSharedValue(0);
  const ring = useSharedValue(0);
  const halo = useSharedValue(0);

  // Entrance: rise and pop into place, like a character walking on stage.
  useEffect(() => {
    enterOpacity.set(withTiming(1, { duration: reduceMotion ? 200 : 140 }));
    if (reduceMotion) return;
    enterY.set(withSpring(0, { damping: 13, stiffness: 190 }));
    enterScale.set(withSpring(1, { damping: 10, stiffness: 170 }));
    return hapticTimeline([[140, 'tap']]);
  }, [enterOpacity, enterScale, enterY, reduceMotion]);

  useEffect(() => {
    // Screen rotation is clockwise-positive, the engine's angle is up-positive.
    const target = dash ? 0 : -angleDeg;
    rotation.set(
      reduceMotion ? withTiming(target, { duration: 250 }) : withSpring(target, { damping: 12, stiffness: 120 }),
    );
  }, [angleDeg, dash, reduceMotion, rotation]);

  // A small bump whenever the arrow changes color without celebrating.
  const lastTone = useRef(tone);
  useEffect(() => {
    if (lastTone.current === tone) return;
    lastTone.current = tone;
    if (celebrating || reduceMotion) return;
    squashX.set(withSequence(withTiming(1.08, { duration: 90 }), withSpring(1, { damping: 7 })));
    squashY.set(withSequence(withTiming(0.92, { duration: 90 }), withSpring(1, { damping: 7 })));
    return hapticTimeline([[0, 'tick']]);
  }, [celebrating, reduceMotion, squashX, squashY, tone]);

  useEffect(() => {
    if (!celebrating) {
      cancelAnimation(float);
      cancelAnimation(twinkle);
      float.set(withTiming(0));
      halo.set(withTiming(0));
      twinkle.set(0);
      return;
    }
    const { start } = CELEBRATION_TIMING;
    if (reduceMotion) {
      halo.set(withTiming(1, { duration: 300 }));
      return hapticTimeline([[start, 'success']]);
    }

    const ease = (duration: number, easing = Easing.out(Easing.quad)) => ({ duration, easing });
    const settle = { damping: 6, stiffness: 260 };
    // Beats: crouch 0–160, launch 160–380, fall 380–580, land at 580.
    squashX.set(
      withDelay(
        start,
        withSequence(
          withTiming(1.14, ease(160)),
          withTiming(0.88, ease(220)),
          withTiming(1, ease(200, Easing.in(Easing.quad))),
          withTiming(1.18, ease(70)),
          withSpring(1, settle),
        ),
      ),
    );
    squashY.set(
      withDelay(
        start,
        withSequence(
          withTiming(0.8, ease(160)),
          withTiming(1.16, ease(220)),
          withTiming(1, ease(200, Easing.in(Easing.quad))),
          withTiming(0.82, ease(70)),
          withSpring(1, settle),
        ),
      ),
    );
    hopY.set(
      withDelay(
        start,
        withSequence(
          withTiming(size * 0.04, ease(160)),
          withTiming(-size * HOP_HEIGHT, ease(220, Easing.out(Easing.cubic))),
          withTiming(0, ease(200, Easing.in(Easing.quad))),
        ),
      ),
    );
    stretch.set(
      withDelay(
        start,
        withSequence(
          withTiming(0.9, ease(160)),
          withTiming(1.14, ease(220)),
          withTiming(1, ease(200)),
          withSpring(1, settle),
        ),
      ),
    );
    wiggle.set(
      withDelay(
        start + 580,
        withSequence(
          withTiming(9, ease(90)),
          withTiming(-7, ease(120)),
          withTiming(4, ease(120)),
          withSpring(0, { damping: 8 }),
        ),
      ),
    );
    burst.set(0);
    burst.set(withDelay(start + 560, withTiming(1, { duration: 1200, easing: Easing.linear })));
    ring.set(0);
    ring.set(withDelay(start + 560, withTiming(1, ease(650, Easing.out(Easing.cubic)))));
    halo.set(0);
    halo.set(withDelay(start + 560, withSpring(1, { damping: 10 })));
    float.set(
      withDelay(
        start + 1100,
        withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true),
      ),
    );
    twinkle.set(
      withDelay(start + 900, withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1)),
    );

    return hapticTimeline([
      [start, 'tap'],
      [CELEBRATION_TIMING.launch, 'launch'],
      [CELEBRATION_TIMING.land, 'land'],
      [CELEBRATION_TIMING.land + 90, 'success'],
    ]);
  }, [burst, celebrating, float, halo, hopY, reduceMotion, ring, size, squashX, squashY, stretch, twinkle, wiggle]);

  const body = useAnimatedStyle(() => ({
    opacity: enterOpacity.get(),
    transform: [
      { translateY: enterY.get() + hopY.get() - float.get() * size * 0.025 },
      { scale: enterScale.get() },
      { scaleX: squashX.get() },
      { scaleY: squashY.get() },
    ],
  }));

  // Arrow-space transforms: stretch runs along the arrow's own axis.
  const pointing = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get() + wiggle.get()}deg` }, { scaleX: stretch.get() }],
  }));

  const glow = useAnimatedStyle(() => ({
    opacity: Math.min(1, halo.get()) * (0.12 + float.get() * 0.1),
    transform: [{ scale: halo.get() * (1 + float.get() * 0.05) }],
  }));

  const shockwave = useAnimatedStyle(() => {
    const t = ring.get();
    return {
      opacity: t > 0 && t < 1 ? 0.55 * (1 - t) : 0,
      transform: [{ scale: 0.45 + t * 0.9 }],
    };
  });

  const color = ToneColors[tone];
  const disc = size * 0.92;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size, opacity: dimmed ? 0.4 : 1 }}>
      <Animated.View
        pointerEvents="none"
        style={[styles.disc, discBox(size, disc), { backgroundColor: color }, glow]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.disc, discBox(size, disc), { borderColor: color, borderWidth: size * 0.03 }, shockwave]}
      />

      <Animated.View style={[StyleSheet.absoluteFill, body]}>
        <View style={[StyleSheet.absoluteFill, { transform: [{ translateY: size * LIP }] }]}>
          <Animated.View style={[StyleSheet.absoluteFill, pointing]}>
            <ArrowShape size={size} color={ToneShadeColors[tone]} dash={dash} />
          </Animated.View>
        </View>
        <Animated.View style={[StyleSheet.absoluteFill, pointing]}>
          <ArrowShape size={size} color={color} dash={dash} highlight />
        </Animated.View>
      </Animated.View>

      {celebrating && !reduceMotion && (
        <>
          <CelebrationBurst progress={burst} size={size} />
          {SPARKLES.map((s, i) => (
            <Sparkle key={i} {...s} clock={twinkle} size={size} />
          ))}
        </>
      )}
    </View>
  );
}

function discBox(size: number, disc: number) {
  return { width: disc, height: disc, borderRadius: disc / 2, left: (size - disc) / 2, top: (size - disc) / 2 };
}

/**
 * A chunky, round-capped arrow pointing right, centered in a `size` box:
 * a shaft plus two head strokes that meet at the tip.
 */
function ArrowShape({
  size,
  color,
  dash,
  highlight = false,
}: {
  size: number;
  color: string;
  dash: boolean;
  highlight?: boolean;
}) {
  const t = size * 0.17;
  const cy = size / 2;
  // Centers of the round caps at the tail and the tip.
  const tail = dash ? size * 0.2 : size * 0.17;
  const tip = size * 0.8;
  const head = size * 0.3;
  const shine = { position: 'absolute', height: t * 0.24, top: t * 0.17, borderRadius: t, backgroundColor: HIGHLIGHT } as const;

  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: tail - t / 2,
          top: cy - t / 2,
          width: tip - tail + t,
          height: t,
          borderRadius: t / 2,
          backgroundColor: color,
        }}
      />
      {!dash &&
        [42, -42].map((deg) => (
          // A box centered on the tip, rotated about its center; the stroke fills its left half.
          <View
            key={deg}
            style={{
              position: 'absolute',
              left: tip - head - t / 2,
              top: cy - t / 2,
              width: 2 * (head + t / 2),
              height: t,
              transform: [{ rotate: `${deg}deg` }],
            }}>
            <View style={{ width: head + t, height: t, borderRadius: t / 2, backgroundColor: color }}>
              {highlight && deg > 0 && <View style={[shine, { left: t * 0.45, width: head * 0.55 }]} />}
            </View>
          </View>
        ))}
      {highlight && (
        <View style={[shine, { top: cy - t / 2 + t * 0.17, left: tail, width: (tip - tail) * (dash ? 0.8 : 0.5) }]} />
      )}
    </>
  );
}

/** Twinkling stars around a celebrating arrow, as fractions of its size. */
const SPARKLES = [
  { x: 0.12, y: 0.16, scale: 1, phase: 0 },
  { x: 0.86, y: 0.2, scale: 0.7, phase: 0.3 },
  { x: 0.9, y: 0.78, scale: 0.85, phase: 0.55 },
  { x: 0.1, y: 0.8, scale: 0.6, phase: 0.8 },
];

function Sparkle({
  x,
  y,
  scale,
  phase,
  clock,
  size,
}: (typeof SPARKLES)[number] & { clock: SharedValue<number>; size: number }) {
  const fontSize = size * 0.11;
  const style = useAnimatedStyle(() => {
    const local = (clock.get() + phase) % 1;
    const s = local < 0.3 ? Math.sin((local / 0.3) * Math.PI) : 0;
    return { opacity: s, transform: [{ scale: s * scale }, { rotate: `${local * 90}deg` }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sparkle,
        { left: x * size - fontSize / 2, top: y * size - fontSize / 2, width: fontSize, height: fontSize },
        style,
      ]}>
      <Text style={{ fontSize, lineHeight: fontSize, color: '#FACC15' }}>✦</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  disc: {
    position: 'absolute',
  },
  sparkle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
