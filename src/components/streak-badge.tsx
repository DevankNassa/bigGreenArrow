import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
} from 'react-native-reanimated';

import { CELEBRATION_TIMING } from '@/components/trend-arrow';
import { Spacing, StreakColor } from '@/constants/theme';
import { hapticTimeline } from '@/lib/haptics';

const LINE = 30;
/** After the arrow lands: the badge pops in, then the count rolls over. */
const POP_AT = CELEBRATION_TIMING.land + 150;
const ROLL_AT = POP_AT + 450;

/**
 * Streak pill shown with a celebrating arrow. Mount it in the same render the
 * arrow starts celebrating: it pops in as the arrow lands, then the number
 * rolls up from yesterday's count and the flame flares, Duolingo style.
 */
export function StreakBadge({ days, label }: { days: number; label: string }) {
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(reduceMotion ? 1 : 0);
  const roll = useSharedValue(reduceMotion || days <= 1 ? 1 : 0);
  const flare = useSharedValue(1);
  const flicker = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pop.set(withDelay(POP_AT, withSpring(1, { damping: 9, stiffness: 200 })));
    if (days > 1) roll.set(withDelay(ROLL_AT, withSpring(1, { damping: 14, stiffness: 160 })));
    flare.set(
      withDelay(ROLL_AT, withSequence(withTiming(1.55, { duration: 140 }), withSpring(1, { damping: 6 }))),
    );
    flicker.set(
      withDelay(
        ROLL_AT + 500,
        withRepeat(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }), -1, true),
      ),
    );
    return hapticTimeline([
      [POP_AT, 'tap'],
      [ROLL_AT, 'launch'],
    ]);
  }, [days, flare, flicker, pop, reduceMotion, roll]);

  const pill = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.get() * 2),
    transform: [{ scale: pop.get() }],
  }));
  const flame = useAnimatedStyle(() => ({
    transform: [
      { translateY: (1 - flare.get()) * 6 },
      { scale: flare.get() * (1 + flicker.get() * 0.07) },
      { rotate: `${(flicker.get() - 0.5) * 10}deg` },
    ],
  }));
  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - roll.get(),
    transform: [{ translateY: -roll.get() * LINE }],
  }));
  const incoming = useAnimatedStyle(() => ({
    opacity: roll.get(),
    transform: [{ translateY: (1 - roll.get()) * LINE }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityLabel={`${days} days ${label}`}
      style={[styles.pill, pill]}>
      <Animated.Text style={[styles.flame, flame]}>🔥</Animated.Text>
      <View style={styles.roller}>
        <Animated.Text style={[styles.count, incoming]}>{days}</Animated.Text>
        {days > 1 && (
          <Animated.Text style={[styles.count, styles.outgoing, outgoing]}>{days - 1}</Animated.Text>
        )}
      </View>
      <Text style={styles.label}>days {label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    backgroundColor: 'rgba(255,150,0,0.14)',
  },
  flame: {
    fontSize: 24,
    lineHeight: LINE,
  },
  roller: {
    height: LINE,
    overflow: 'hidden',
  },
  count: {
    fontSize: 24,
    lineHeight: LINE,
    fontWeight: 800,
    color: StreakColor,
    fontVariant: ['tabular-nums'],
  },
  outgoing: {
    position: 'absolute',
    right: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: 700,
    color: StreakColor,
  },
});
