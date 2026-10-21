import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { ConfettiColors } from '@/constants/theme';

/** Deterministic 0..1 noise, so every burst looks the same and renders stay pure. */
function noise(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Shape = 'confetti' | 'dot' | 'diamond';
const SHAPES: Shape[] = ['confetti', 'confetti', 'dot', 'diamond'];
const COUNT = 28;

const PARTICLES = Array.from({ length: COUNT }, (_, i) => ({
  // Spread evenly around the circle, jittered so it doesn't look like a clock face.
  angle: ((i + noise(i, 1) * 0.8) / COUNT) * Math.PI * 2,
  distance: 0.42 + noise(i, 2) * 0.45,
  size: 0.035 + noise(i, 3) * 0.035,
  spin: (noise(i, 4) - 0.5) * 900,
  color: ConfettiColors[Math.floor(noise(i, 5) * ConfettiColors.length)],
  shape: SHAPES[Math.floor(noise(i, 6) * SHAPES.length)],
}));

/** Start radius, as a fraction of the arrow size, so pieces come from behind the arrow. */
const START = 0.12;
const GRAVITY = 0.32;

function Particle({
  index,
  progress,
  size,
}: {
  index: number;
  progress: SharedValue<number>;
  size: number;
}) {
  const p = PARTICLES[index];
  const piece = p.size * size;
  const width = p.shape === 'confetti' ? piece * 0.5 : piece;

  const style = useAnimatedStyle(() => {
    const t = progress.get();
    if (t <= 0 || t >= 1) return { opacity: 0 };
    const out = 1 - Math.pow(1 - t, 3);
    const r = (START + p.distance * out) * size;
    const pop = t < 0.12 ? t / 0.12 : 1 - Math.max(0, (t - 0.55) / 0.45) * 0.6;
    return {
      opacity: t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3,
      transform: [
        { translateX: Math.cos(p.angle) * r },
        { translateY: Math.sin(p.angle) * r + GRAVITY * size * t * t },
        { rotate: `${(p.shape === 'diamond' ? 45 : 0) + p.spin * t}deg` },
        { scale: pop },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width,
          height: piece,
          marginLeft: -width / 2,
          marginTop: -piece / 2,
          borderRadius: p.shape === 'dot' ? piece / 2 : piece * 0.18,
          backgroundColor: p.color,
        },
        style,
      ]}
    />
  );
}

/** Confetti thrown out from the arrow as it lands. Drive `progress` from 0 to 1. */
export function CelebrationBurst({ progress, size }: { progress: SharedValue<number>; size: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PARTICLES.map((_, i) => (
        <Particle key={i} index={i} progress={progress} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
});
