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

import { CelebrationBurst } from '@/components/celebration-burst';
import {
  BarsIcon,
  ChipGlyph,
  FireTrail,
  SlidersIcon,
  Sparks,
  Streaks,
  useFxClock,
  useIgnite,
  type StreakDirection,
} from '@/components/hero-fx';
import { ArrowShape } from '@/components/trend-arrow';
import { HeroAccent, HeroColors, ToneColors, Type } from '@/constants/theme';
import type { ArrowTone } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import type { ChipIcon } from '@/lib/arrow-labels';
import { hapticTimeline, type HapticBeat } from '@/lib/haptics';

/**
 * How the hero arrives (SPEC §6.5):
 * - `smash_down` Optimal loss: the arrow slams a "Scale noise" slab twice and breaks it.
 * - `smash_up` Optimal gain: the arrow punches up through a "Plateau" slab.
 * - `stamp` On target (maintain): the arrow slides in flat and sticks.
 * - `brake` Too fast: the arrow rattles in, then the block snaps to the warning color.
 * - `enter` everything else: the block fills and the arrow drops into place.
 */
export type HeroMotion = 'enter' | 'smash_down' | 'smash_up' | 'stamp' | 'brake';

const FLOOD_MS = 400;
const HIT1 = 620;
const HIT2 = 1150;
const SNAP = 1500;

/** When the headline starts fading in: after the slab breaks, the arrow sticks or the color snaps. */
const TEXT_AT: Record<HeroMotion, number> = { enter: 300, smash_down: 1300, smash_up: 1300, stamp: 700, brake: 1700 };

/** When a celebrating hero's fire catches: once the arrow has come to rest. */
const IGNITE_AT: Record<HeroMotion, number> = { enter: 600, smash_down: 1350, smash_up: 1350, stamp: 800, brake: 0 };

/** When the hero's headline has landed; the stats below rise in from here. */
export function heroSettleMs(motion: HeroMotion): number {
  return TEXT_AT[motion] + 400;
}

const HAPTICS: Record<HeroMotion, readonly (readonly [number, HapticBeat])[]> = {
  enter: [[FLOOD_MS - 50, 'tap']],
  smash_down: [
    [HIT1, 'launch'],
    [HIT2, 'land'],
    [1300, 'rigid'],
    [1500, 'rigid'],
    [1800, 'success'],
  ],
  smash_up: [
    [HIT1, 'launch'],
    [HIT2, 'land'],
    [1300, 'rigid'],
    [1500, 'rigid'],
    [1800, 'success'],
  ],
  stamp: [
    [620, 'land'],
    [700, 'tick'],
    [800, 'tick'],
    [1000, 'success'],
  ],
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

/** The slab is paper on the ink block, so it reads against the fire hero. */
const SLAB_COLOR = '#F4F1EA';
const SLAB_INK = '#111111';

type PosterHeroProps = {
  tone: ArrowTone;
  /** 0 points right, +90 up, −90 down. */
  angleDeg: number;
  /** Draw a dash instead of an arrow. */
  dash?: boolean;
  /** Faded arrow while calibrating or on low confidence. */
  dimmed?: boolean;
  /**
   * Optimal / On target: the ink block, with the arrow riding a fire trail and
   * a rate line under the headline instead of a chip and subline.
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
  const box = heroLayout(width, height, topInset, celebrating, angleDeg);
  const { S, cx, arrowTop, heroH } = box;
  const palette = HeroColors[tone];
  const onFire = celebrating && !dimmed;
  const clock = useFxClock(onFire && animate);
  const ignite = useIgnite(IGNITE_AT[motion], onFire && animate);
  const streakDirection: StreakDirection = angleDeg < -45 ? 'up' : angleDeg > 45 ? 'down' : 'left';

  const vertical = motion === 'smash_down' || motion === 'brake' ? 1 : motion === 'smash_up' ? -1 : 0;
  const hitDown = box.slabDownTop - box.tipDown;
  const hitUp = box.slabUpTop + SLAB_UP_H - box.tipUp;

  const flood = useSharedValue(animate ? heroH : 0);
  const warn = useSharedValue(motion === 'brake' && animate ? 0 : 1);
  const arrowX = useSharedValue(animate && motion === 'stamp' ? -width : 0);
  const arrowY = useSharedValue(
    !animate ? 0 : motion === 'smash_up' ? heroH : motion === 'smash_down' || motion === 'brake' ? -heroH : -40,
  );
  const arrowOpacity = useSharedValue(animate && motion === 'enter' ? 0 : 1);
  const along = useSharedValue(1);
  const across = useSharedValue(1);
  const shake = useSharedValue(0);
  const crack = useSharedValue(0);
  const fall = useSharedValue(0);
  const burst = useSharedValue(0);
  const speed = useSharedValue(0);
  const speedClock = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      return hapticTimeline(
        motion === 'brake' ? [[300, 'warning']] : motion === 'enter' ? [] : [[300, 'success']],
      );
    }
    const easeIn = (duration: number) => ({ duration, easing: Easing.in(Easing.quad) });
    const easeOut = (duration: number) => ({ duration, easing: Easing.out(Easing.cubic) });
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

    if (motion === 'smash_down' || motion === 'smash_up') {
      const dir = motion === 'smash_down' ? 1 : -1;
      const hit = motion === 'smash_down' ? hitDown : hitUp;
      // Down: recoil is up (negative). Up: recoil is down (positive).
      arrowY.set(
        withSequence(
          withDelay(FLOOD_MS, withTiming(hit, easeIn(HIT1 - FLOOD_MS))),
          withTiming(hit - dir * 50, easeOut(200)),
          withTiming(hit - dir * 66, { duration: 200 }),
          withTiming(hit, easeIn(HIT2 - HIT1 - 400)),
          withTiming(-dir * 18, easeOut(220)),
          withTiming(dir * 5, { duration: 140 }),
          withTiming(0, { duration: 140 }),
        ),
      );
      squashAt([HIT1, HIT2]);
      const jolt = (at: number, prev: number) =>
        withDelay(
          at - prev,
          withSequence(
            withTiming(-5, { duration: 40 }),
            withTiming(5, { duration: 40 }),
            withTiming(0, { duration: 60 }),
          ),
        );
      shake.set(withSequence(jolt(HIT1, 0), jolt(HIT2, HIT1 + 140)));
      crack.set(withDelay(HIT1, withTiming(1, { duration: 60 })));
      fall.set(withDelay(HIT2, withTiming(1, easeIn(520))));
      burst.set(withDelay(HIT2, withTiming(1, { duration: 1200, easing: Easing.linear })));
    } else if (motion === 'stamp') {
      arrowX.set(withDelay(FLOOD_MS, withSpring(0, { damping: 9, stiffness: 140, overshootClamping: false })));
      squashAt([620]);
      burst.set(withDelay(640, withTiming(1, { duration: 1200, easing: Easing.linear })));
    } else if (motion === 'brake') {
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
  }, [
    across,
    along,
    animate,
    arrowOpacity,
    arrowX,
    arrowY,
    burst,
    crack,
    fall,
    flood,
    hitDown,
    hitUp,
    motion,
    shake,
    speed,
    speedClock,
    warn,
  ]);

  const floodStyle = useAnimatedStyle(() => ({ transform: [{ translateY: flood.get() }] }));
  const streaksStyle = useAnimatedStyle(() => ({ opacity: ignite.get() }));
  // A cel-style jitter once the fire is lit: 3 px every other frame.
  const bobStyle = useAnimatedStyle(() => {
    const on = onFire && animate && ignite.get() >= 1 && Math.floor(clock.get() / 120) % 2 === 1;
    const by = on ? (3 * S) / 190 : 0;
    return { transform: streakDirection === 'left' ? [{ translateX: by }] : [{ translateY: by }] };
  });
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

  const smash = animate && (motion === 'smash_down' || motion === 'smash_up');
  const impactY = motion === 'smash_up' ? box.slabUpTop + SLAB_UP_H : box.slabDownTop;
  const lines = headline.toUpperCase().split(' ');
  const headlineSize = Math.min(celebrating ? 60 : 56, (width - 48) / ((Math.max(...lines.map((l) => l.length)) + 1) * 0.8));
  const lineHeight = headlineSize * (celebrating ? 0.86 : 0.92);
  const textColor = { color: palette.text };
  const textAt = animate ? TEXT_AT[motion] : 0;

  return (
    <View style={[styles.hero, { height: heroH, backgroundColor: theme.background }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: motion === 'brake' ? ToneColors.big_green : palette.block },
          floodStyle,
        ]}>
        {motion === 'brake' && <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: palette.block }, warnStyle]} />}
      </Animated.View>

      {onFire && animate && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, streaksStyle]}>
          <Streaks width={width} height={heroH} direction={streakDirection} clock={clock} />
        </Animated.View>
      )}

      {motion === 'brake' && animate && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, speedStyle]}>
          {[-0.7, -0.55, 0.55, 0.7].map((dx, i) => (
            <SpeedLine key={dx} x={cx + dx * S} top={arrowTop} clock={speedClock} phase={i * 0.27} span={S} />
          ))}
        </Animated.View>
      )}

      {smash && (
        <Slab
          top={motion === 'smash_down' ? box.slabDownTop : box.slabUpTop}
          height={motion === 'smash_down' ? SLAB_DOWN_H : SLAB_UP_H}
          width={width - 48}
          splitX={Math.min(width - 88, Math.max(40, cx - 24))}
          label={motion === 'smash_down' ? 'Scale\nnoise' : 'Plateau'}
          fallBy={motion === 'smash_down' ? heroH : -(box.slabUpTop + SLAB_UP_H + 40)}
          shake={shake}
          crack={crack}
          fall={fall}
        />
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
          {lines.map((line, i) => (
            <FadeIn key={i} delay={textAt + i * 200} animate={animate}>
              <Text style={[styles.headlineText, textColor, { fontSize: headlineSize, lineHeight }]}>
                {line}
                <Text style={celebrating ? { color: HeroAccent } : undefined}>{i === lines.length - 1 ? '.' : ''}</Text>
              </Text>
            </FadeIn>
          ))}
        </View>
        {rateLine ? (
          <FadeIn delay={textAt + lines.length * 200} animate={animate}>
            <View style={styles.rateLine}>
              <Text style={[styles.rate, textColor]}>{rateLine.rate}</Text>
              <Text style={styles.rateUnit}>a week</Text>
              <Text style={styles.rateDetail} numberOfLines={1}>
                {rateLine.detail}
              </Text>
            </View>
          </FadeIn>
        ) : (
          subline && (
            <FadeIn delay={textAt + lines.length * 200} animate={animate}>
              <Text style={[styles.subline, textColor]}>{subline}</Text>
            </FadeIn>
          )
        )}
      </View>

      {(motion === 'smash_down' || motion === 'smash_up' || motion === 'stamp') && animate && (
        <View
          pointerEvents="none"
          style={[
            styles.burst,
            motion === 'stamp'
              ? { left: cx + S * 0.38 - width * 0.4, top: arrowTop + S / 2 - width * 0.4 }
              : { left: cx - width * 0.4, top: impactY - width * 0.4 },
            { width: width * 0.8, height: width * 0.8 },
          ]}>
          <CelebrationBurst progress={burst} size={width * 0.8} />
        </View>
      )}

      <Animated.View
        pointerEvents="none"
        style={[styles.arrow, { left: cx - S / 2, top: arrowTop, width: S, height: S, opacity: dimmed ? 0.5 : 1 }]}>
        {onFire && (
          // Fire and sparks share the arrow's frame: drawn for an arrow pointing right, then turned with it.
          <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${-angleDeg}deg` }] }]}>
            <FireTrail size={S} clock={animate ? clock : undefined} ignite={ignite} />
            {animate && (
              <Animated.View style={[StyleSheet.absoluteFill, streaksStyle]}>
                <Sparks size={S} clock={clock} />
              </Animated.View>
            )}
          </View>
        )}
        <Animated.View style={[StyleSheet.absoluteFill, arrowStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, bobStyle]}>
            <View style={[StyleSheet.absoluteFill, { transform: [{ translateY: S * 0.03 }, { rotate: `${-angleDeg}deg` }] }]}>
              <ArrowShape size={S} color={palette.lip} dash={dash} />
            </View>
            <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${-angleDeg}deg` }] }]}>
              <ArrowShape size={S} color={palette.arrow} dash={dash} />
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>

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
    </View>
  );
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

const SLAB_DOWN_H = 110;
const SLAB_UP_H = 100;

/**
 * Where everything sits in a hero of the given window size. A celebrating
 * arrow is smaller and leaves room behind it for the fire: below it when
 * rising, above it when falling.
 */
function heroLayout(width: number, height: number, topInset: number, celebrating: boolean, angleDeg: number) {
  const body = Math.round(Math.min(440, Math.max(380, height * 0.48)));
  const S = Math.round(celebrating ? Math.min(width * 0.49, 190) : Math.min(width * 0.667, 260));
  const arrowTop = topInset + (!celebrating ? 2 : angleDeg < -45 ? 50 : angleDeg > 45 ? 4 : 30);
  // A vertical arrow spans 0.085–0.885 of S (see ArrowShape).
  const tipDown = arrowTop + 0.885 * S;
  const tipUp = arrowTop + 0.115 * S;
  return {
    heroH: topInset + body,
    S,
    cx: Math.round(width * 0.718),
    arrowTop,
    tipDown,
    tipUp,
    slabDownTop: tipDown + 14,
    slabUpTop: tipUp + 130 - SLAB_UP_H,
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

/** A black slab split where the arrow hits; it cracks, then its halves fall away. */
function Slab({
  top,
  height,
  width,
  splitX,
  label,
  fallBy,
  shake,
  crack,
  fall,
}: {
  top: number;
  height: number;
  width: number;
  splitX: number;
  label: string;
  fallBy: number;
  shake: SharedValue<number>;
  crack: SharedValue<number>;
  fall: SharedValue<number>;
}) {
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const leftStyle = useAnimatedStyle(() => {
    const p = fall.get();
    return { transform: [{ translateX: -44 * p }, { translateY: fallBy * p }, { rotate: `${-16 * p}deg` }] };
  });
  const rightStyle = useAnimatedStyle(() => {
    const p = fall.get();
    return { transform: [{ translateX: 54 * p }, { translateY: fallBy * p }, { rotate: `${24 * p}deg` }] };
  });
  const crackStyle = useAnimatedStyle(() => ({ opacity: fall.get() > 0.01 ? 0 : crack.get() }));

  const face = (
    <View style={[styles.slabFace, { width, height }]}>
      <Text style={styles.slabText}>{label}</Text>
    </View>
  );
  const points: [number, number][] = [
    [splitX, 0],
    [splitX - 14, height * 0.32],
    [splitX + 12, height * 0.62],
    [splitX - 6, height],
  ];

  return (
    <Animated.View pointerEvents="none" style={[styles.slab, { top, width, height }, shakeStyle]}>
      <Animated.View style={[styles.half, { left: 0, width: splitX, height }, leftStyle]}>{face}</Animated.View>
      <Animated.View style={[styles.half, { left: splitX, width: width - splitX, height }, rightStyle]}>
        <View style={{ marginLeft: -splitX }}>{face}</View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, crackStyle]}>
        {points.slice(1).map(([x2, y2], i) => {
          const [x1, y1] = points[i];
          const len = Math.hypot(x2 - x1, y2 - y1);
          return (
            <View
              key={i}
              style={[
                styles.crack,
                {
                  left: (x1 + x2) / 2 - len / 2,
                  top: (y1 + y2) / 2 - 2.5,
                  width: len,
                  transform: [{ rotate: `${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI}deg` }],
                },
              ]}
            />
          );
        })}
      </Animated.View>
    </Animated.View>
  );
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
  burst: {
    position: 'absolute',
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
  slab: {
    position: 'absolute',
    left: 24,
  },
  half: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  slabFace: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: SLAB_COLOR,
  },
  slabText: {
    fontFamily: Type.display,
    fontSize: 42,
    lineHeight: 40,
    color: SLAB_INK,
    textTransform: 'uppercase',
  },
  crack: {
    position: 'absolute',
    height: 5,
    borderRadius: 3,
    backgroundColor: SLAB_INK,
  },
  speedLine: {
    position: 'absolute',
    width: 5,
    height: 90,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
