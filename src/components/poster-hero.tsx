import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
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

import { BarsIcon, ChipGlyph, SlidersIcon } from '@/components/hero-fx';
import {
  PLATE_BEATS,
  PLATE_END,
  PlateScene,
  STAGE_BLOCK_H,
  STAGE_W,
  plateJolt,
  stampStyle,
  type PlateKind,
} from '@/components/plate-scene';
import { ArrowShape } from '@/components/trend-arrow';
import { HeroAccent, HeroColors, ToneColors, Type } from '@/constants/theme';
import type { ArrowTone } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import type { ChipIcon } from '@/lib/arrow-labels';
import { hapticTimeline, type HapticBeat } from '@/lib/haptics';

/**
 * How the hero arrives (SPEC §6.5):
 * - `break` Optimal loss: the arrow drops on a weight plate and breaks it (see PlateScene).
 * - `lift` Optimal gain: the arrow presses the plate overhead.
 * - `hit` On target (maintain): the arrow flies in flat and sticks in the plate.
 * - `brake` Too fast: the arrow rattles in, then the block snaps to the warning color.
 * - `enter` everything else: the block fills and the arrow drops into place.
 */
export type HeroMotion = 'enter' | PlateKind | 'brake';

function isPlate(motion: HeroMotion): motion is PlateKind {
  return motion === 'break' || motion === 'lift' || motion === 'hit';
}

const FLOOD_MS = 400;
const SNAP = 1500;

/** When the headline starts fading in: once the arrow lands or the color snaps. */
const TEXT_AT: Record<'enter' | 'brake', number> = { enter: 300, brake: 1700 };

/**
 * When the stats below the hero rise in. On a plate celebration they're there
 * from the start, like the design, and only the day count moves later.
 */
export function heroSettleMs(motion: HeroMotion): number {
  return isPlate(motion) ? 0 : TEXT_AT[motion] + 400;
}

/** When the day count under the hero rolls up by one. */
export function heroRollMs(motion: HeroMotion): number {
  return isPlate(motion) ? PLATE_BEATS.roll : heroSettleMs(motion) + 700;
}

/** The plate's clock: one heavy hit at 1.4 s, the headline stamps, then the day count. */
const PLATE_HAPTICS: readonly (readonly [number, HapticBeat])[] = [
  [PLATE_BEATS.hit, 'land'],
  [PLATE_BEATS.line1, 'rigid'],
  [PLATE_BEATS.line2, 'rigid'],
  [PLATE_BEATS.roll, 'success'],
];

const HAPTICS: Record<HeroMotion, readonly (readonly [number, HapticBeat])[]> = {
  enter: [[FLOOD_MS - 50, 'tap']],
  // Loss hits the plate twice: the first strike only cracks it.
  break: [[PLATE_BEATS.firstHit, 'launch'], ...PLATE_HAPTICS],
  lift: PLATE_HAPTICS,
  hit: PLATE_HAPTICS,
  brake: [
    [550, 'launch'],
    [750, 'tick'],
    [950, 'tick'],
    [1150, 'tick'],
    [1350, 'tick'],
    [SNAP, 'warning'],
    [1700, 'rigid'],
  ],
};

type PosterHeroProps = {
  tone: ArrowTone;
  /** 0 points right, +90 up, −90 down. */
  angleDeg: number;
  /** Draw a dash instead of an arrow. */
  dash?: boolean;
  /** Faded arrow while calibrating or on low confidence. */
  dimmed?: boolean;
  /**
   * Optimal / On target: the headline gets the green period and a rate line
   * under it instead of a chip and subline.
   */
  celebrating?: boolean;
  /** The pill above the headline. */
  chip?: { icon: ChipIcon; label: string } | null;
  headline: string;
  subline?: string | null;
  /** Celebrating only: the rate, e.g. "−0.70%", and what to compare it with on the right. */
  rateLine?: { rate: string; detail: string } | null;
  motion: HeroMotion;
  /** Safe-area inset the block extends under. */
  topInset: number;
  /** The round buttons in the block's top corners. History is left out when there's nothing to show. */
  nav?: { onHistory?: () => void; onSettings: () => void };
  accessibilityLabel: string;
};

/**
 * The Poster home screen's hero: a full-bleed block in the arrow's tone with a
 * flat arrow and a big uppercase headline. Mount it with a `key` that
 * changes with the state to replay its motion.
 */
export function PosterHero({
  tone,
  angleDeg,
  dash = false,
  dimmed = false,
  celebrating = false,
  chip,
  headline,
  subline,
  rateLine,
  motion,
  topInset,
  nav,
  accessibilityLabel,
}: PosterHeroProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion;
  const { width, height } = useWindowDimensions();
  const plate = isPlate(motion) ? motion : null;
  const box = heroLayout(width, height, topInset, plate !== null);
  const { S, cx, arrowTop, heroH } = box;
  const palette = HeroColors[tone];

  const vertical = motion === 'brake' ? 1 : 0;

  const flood = useSharedValue(animate && !plate ? heroH : 0);
  const warn = useSharedValue(motion === 'brake' && animate ? 0 : 1);
  const arrowX = useSharedValue(0);
  const arrowY = useSharedValue(!animate || plate ? 0 : motion === 'brake' ? -heroH : -40);
  const arrowOpacity = useSharedValue(animate && motion === 'enter' ? 0 : 1);
  const along = useSharedValue(1);
  const across = useSharedValue(1);
  const speed = useSharedValue(0);
  const speedClock = useSharedValue(0);
  // The plate scene's clock in ms; reduced motion shows its last frame.
  const clock = useSharedValue(animate ? 0 : PLATE_END);

  useEffect(() => {
    if (!animate) {
      return hapticTimeline(
        motion === 'brake' ? [[300, 'warning']] : motion === 'enter' ? [] : [[300, 'success']],
      );
    }
    if (plate) {
      clock.set(withTiming(PLATE_END, { duration: PLATE_END, easing: Easing.linear }));
      return hapticTimeline(HAPTICS[motion]);
    }
    const easeIn = (duration: number) => ({ duration, easing: Easing.in(Easing.quad) });
    const settle = { damping: 6, stiffness: 300 };

    flood.set(withTiming(0, { duration: FLOOD_MS, easing: Easing.bezier(0.6, 0, 0.2, 1) }));

    // A squash on each hit: shorter along the arrow, wider across it.
    const squashAt = (hits: number[]) => {
      const seq = (to: number, back: number) =>
        withSequence(
          ...hits.flatMap((hit, i) => [
            withDelay(i === 0 ? hit : hit - hits[i - 1] - 190, withTiming(to, { duration: 40 })),
            i === hits.length - 1 ? withSpring(1, settle) : withTiming(back, { duration: 150 }),
          ]),
        );
      along.set(seq(0.86, 1));
      across.set(seq(1.12, 1));
    };

    if (motion === 'brake') {
      arrowY.set(withDelay(FLOOD_MS, withTiming(0, easeIn(150))));
      const rattle = Array.from({ length: 9 }, (_, i) => withTiming(i % 2 ? 3 : -3, { duration: 100 }));
      arrowX.set(withDelay(550, withSequence(...rattle, withTiming(0, { duration: 60 }))));
      speed.set(
        withSequence(
          withDelay(550, withTiming(1, { duration: 80 })),
          withDelay(SNAP - 630, withTiming(0, { duration: 80 })),
        ),
      );
      speedClock.set(withRepeat(withTiming(1, { duration: 320, easing: Easing.linear }), -1));
      warn.set(
        withDelay(
          SNAP,
          withSequence(
            withTiming(1, { duration: 50 }),
            withTiming(0.15, { duration: 110 }),
            withTiming(1, { duration: 90 }),
          ),
        ),
      );
      squashAt([550, SNAP]);
    } else {
      arrowOpacity.set(withDelay(250, withTiming(1, { duration: 200 })));
      arrowY.set(withDelay(250, withSpring(0, { damping: 12, stiffness: 180 })));
    }

    return hapticTimeline(HAPTICS[motion]);
  }, [across, along, animate, arrowOpacity, arrowX, arrowY, clock, flood, motion, plate, speed, speedClock, warn]);

  const floodStyle = useAnimatedStyle(() => ({ transform: [{ translateY: flood.get() }] }));
  const warnStyle = useAnimatedStyle(() => ({ opacity: warn.get() }));
  const speedStyle = useAnimatedStyle(() => ({ opacity: speed.get() }));
  const arrowStyle = useAnimatedStyle(() => ({
    opacity: arrowOpacity.get(),
    transform: [
      { translateX: arrowX.get() },
      { translateY: arrowY.get() },
      { scaleX: vertical ? across.get() : along.get() },
      { scaleY: vertical ? along.get() : across.get() },
    ],
  }));
  // The whole block kicks the way the arrow points when it hits the plate.
  const joltStyle = useAnimatedStyle(() => (plate ? { transform: [plateJolt(plate, clock.get())] } : {}));
  const rateStyle = useAnimatedStyle(() =>
    plate ? { opacity: Math.min(1, Math.max(0, (clock.get() - PLATE_BEATS.rate) / 240)) } : {},
  );

  const lines = headline.toUpperCase().split(' ');
  const headlineSize = Math.min(celebrating ? 60 : 56, (width - 48) / ((Math.max(...lines.map((l) => l.length)) + 1) * 0.8));
  const lineHeight = headlineSize * (celebrating ? 0.86 : 0.92);
  const textColor = { color: palette.text };
  const textAt = !animate ? 0 : plate ? PLATE_BEATS.line1 : TEXT_AT[motion as 'enter' | 'brake'];

  return (
    <Animated.View style={[styles.hero, { height: heroH, backgroundColor: theme.background }, joltStyle]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: motion === 'brake' ? ToneColors.big_green : palette.block },
          floodStyle,
        ]}>
        {motion === 'brake' && <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: palette.block }, warnStyle]} />}
      </Animated.View>

      {motion === 'brake' && animate && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, speedStyle]}>
          {[-0.7, -0.55, 0.55, 0.7].map((dx, i) => (
            <SpeedLine key={dx} x={cx + dx * S} top={arrowTop} clock={speedClock} phase={i * 0.27} span={S} />
          ))}
        </Animated.View>
      )}

      {plate && (
        <View pointerEvents="none" style={[styles.stage, { left: (width - STAGE_W) / 2, top: box.stageTop }]}>
          <PlateScene kind={plate} clock={clock} colors={palette} dimmed={dimmed} />
        </View>
      )}

      <View
        style={styles.headline}
        pointerEvents="none"
        accessible
        accessibilityRole="header"
        accessibilityLabel={accessibilityLabel}>
        {chip && (
          <FadeIn delay={textAt} animate={animate}>
            <View style={[styles.chip, { backgroundColor: palette.wash }]}>
              <ChipGlyph icon={chip.icon} color={palette.text} />
              <Text style={[styles.chipText, textColor]}>{chip.label}</Text>
            </View>
          </FadeIn>
        )}
        <View>
          {lines.map((line, i) => {
            const text = (
              <Text style={[styles.headlineText, textColor, { fontSize: headlineSize, lineHeight }]}>
                {line}
                <Text style={celebrating ? { color: HeroAccent } : undefined}>{i === lines.length - 1 ? '.' : ''}</Text>
              </Text>
            );
            return plate ? (
              <Stamp key={i} clock={clock} at={i === 0 ? PLATE_BEATS.line1 : PLATE_BEATS.line2}>
                {text}
              </Stamp>
            ) : (
              <FadeIn key={i} delay={textAt + i * 200} animate={animate}>
                {text}
              </FadeIn>
            );
          })}
        </View>
        {rateLine ? (
          <Animated.View style={plate ? rateStyle : undefined}>
            <FadeIn delay={textAt + lines.length * 200} animate={animate && !plate}>
              <View style={styles.rateLine}>
                <Text style={[styles.rate, textColor]}>{rateLine.rate}</Text>
                <Text style={styles.rateUnit}>a week</Text>
                <Text style={styles.rateDetail} numberOfLines={1}>
                  {rateLine.detail}
                </Text>
              </View>
            </FadeIn>
          </Animated.View>
        ) : (
          subline && (
            <FadeIn delay={textAt + lines.length * 200} animate={animate}>
              <Text style={[styles.subline, textColor]}>{subline}</Text>
            </FadeIn>
          )
        )}
      </View>

      {!plate && (
        <Animated.View
          pointerEvents="none"
          style={[styles.arrow, { left: cx - S / 2, top: arrowTop, width: S, height: S, opacity: dimmed ? 0.5 : 1 }]}>
          <Animated.View style={[StyleSheet.absoluteFill, arrowStyle]}>
            <View style={[StyleSheet.absoluteFill, { transform: [{ translateY: S * 0.03 }, { rotate: `${-angleDeg}deg` }] }]}>
              <ArrowShape size={S} color={palette.lip} dash={dash} />
            </View>
            <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${-angleDeg}deg` }] }]}>
              <ArrowShape size={S} color={palette.arrow} dash={dash} />
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {nav && (
        <FadeIn delay={animate ? heroSettleMs(motion) : 0} animate={animate} style={[styles.nav, { top: topInset + 12 }]}>
          {nav.onHistory ? (
            <RoundButton label="History" wash={palette.wash} onPress={nav.onHistory}>
              <BarsIcon color={palette.text} />
            </RoundButton>
          ) : (
            <View />
          )}
          <RoundButton label="Settings" wash={palette.wash} onPress={nav.onSettings}>
            <SlidersIcon color={palette.text} knob={palette.block} />
          </RoundButton>
        </FadeIn>
      )}
    </Animated.View>
  );
}

/** A headline line that stamps in on the plate's clock. */
function Stamp({ clock, at, children }: { clock: SharedValue<number>; at: number; children: ReactNode }) {
  const style = useAnimatedStyle(() => stampStyle(clock.get(), at));
  return <Animated.View style={[{ transformOrigin: 'left bottom' }, style]}>{children}</Animated.View>;
}

/** A 44 pt round icon button on the block. */
function RoundButton({
  label,
  wash,
  onPress,
  children,
}: {
  label: string;
  wash: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.roundButton, { backgroundColor: wash, opacity: pressed ? 0.7 : 1 }]}>
      {children}
    </Pressable>
  );
}

/**
 * Where everything sits in a hero of the given window size. A plate
 * celebration lays its stage out as drawn, a little up under the safe area
 * (the stage's top 56 pt is headroom for the lifted bar), and the block ends
 * where the design's does.
 */
function heroLayout(width: number, height: number, topInset: number, plate: boolean) {
  const body = Math.round(Math.min(440, Math.max(380, height * 0.48)));
  const stageTop = Math.max(0, topInset - 16);
  return {
    heroH: plate ? stageTop + STAGE_BLOCK_H : topInset + body,
    S: Math.round(Math.min(width * 0.667, 260)),
    cx: Math.round(width * 0.718),
    arrowTop: topInset + 2,
    stageTop,
  };
}

/** Fades in after `delay` ms. */
function FadeIn({
  delay,
  animate,
  style,
  children,
}: {
  delay: number;
  animate: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const p = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) p.set(withDelay(delay, withTiming(1, { duration: 250 })));
  }, [animate, delay, p]);
  const anim = useAnimatedStyle(() => ({ opacity: p.get() }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** One streak streaming up past a falling arrow. */
function SpeedLine({
  x,
  top,
  span,
  phase,
  clock,
}: {
  x: number;
  top: number;
  span: number;
  phase: number;
  clock: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const t = (clock.get() + phase) % 1;
    return { transform: [{ translateY: span * (1.1 - 1.6 * t) }] };
  });
  return <Animated.View style={[styles.speedLine, { left: x - 2.5, top }, style]} />;
}

const styles = StyleSheet.create({
  hero: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  arrow: {
    position: 'absolute',
  },
  stage: {
    position: 'absolute',
    width: STAGE_W,
  },
  headline: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 26,
    gap: 12,
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    fontFamily: Type.bold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rateLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  rate: {
    fontFamily: Type.display,
    fontSize: 22,
  },
  rateUnit: {
    fontFamily: Type.semiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
  rateDetail: {
    flexShrink: 1,
    marginLeft: 'auto',
    fontFamily: Type.semiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  headlineText: {
    fontFamily: Type.display,
    letterSpacing: -1.5,
  },
  subline: {
    fontFamily: Type.semiBold,
    fontSize: 17,
    lineHeight: 22,
  },
  nav: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedLine: {
    position: 'absolute',
    width: 5,
    height: 90,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
