import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ToneColors } from '@/constants/theme';
import type { ArrowTone } from '@/engine';

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
 * Placeholder arrow built from Views so it runs in Expo Go. The Skia version
 * with particles replaces it later (SPEC §13).
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
  const color = ToneColors[tone];
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Screen rotation is clockwise-positive, the engine's angle is up-positive.
    rotation.set(withSpring(dash ? 0 : -angleDeg, { damping: 14 }));
  }, [angleDeg, dash, rotation]);

  useEffect(() => {
    scale.set(
      celebrating
        ? withSequence(
            withSpring(1.15),
            withRepeat(withTiming(1.05, { duration: 700 }), 4, true),
            withSpring(1),
          )
        : withSpring(1),
    );
  }, [celebrating, scale]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }, { scale: scale.get() }],
  }));

  const shaftHeight = size * 0.16;
  const head = size * 0.36;

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.box, { width: size, height: size, opacity: dimmed ? 0.4 : 1 }, animated]}>
      <View
        style={{
          width: dash ? size * 0.7 : size * 0.5,
          height: shaftHeight,
          borderRadius: shaftHeight / 2,
          backgroundColor: color,
        }}
      />
      {!dash && (
        <View
          style={[
            styles.head,
            {
              borderLeftWidth: head,
              borderTopWidth: head * 0.8,
              borderBottomWidth: head * 0.8,
              borderLeftColor: color,
              marginLeft: -shaftHeight / 2,
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});
