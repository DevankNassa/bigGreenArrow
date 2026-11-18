import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Polygon, Polyline } from 'react-native-svg';

/**
 * "One plate" (design canvas, One plate page): every celebration is the arrow
 * hitting the same cast-iron weight plate standing on the scale.
 * - `break` Optimal loss: the arrow drops on the plate twice and breaks it in two.
 * - `lift` Optimal gain: the arrow stands on the scale and presses the plate overhead.
 * - `hit` On target: the arrow flies in flat and sticks in the plate's centre.
 *
 * Everything runs off one clock in ms (0 → PLATE_END) and is laid out on a
 * 390 pt wide stage, the design's coordinates. The big hit is always at 1.4 s.
 */
export type PlateKind = 'break' | 'lift' | 'hit';

export const PLATE_END = 4000;
/** The stage is the design's phone width; it's centered in wider heroes. */
export const STAGE_W = 390;
/** From the stage's top to the bottom of the hero block, as drawn. */
export const STAGE_BLOCK_H = 480;

/** The clock's beats, shared with the headline, stats and haptics. */
export const PLATE_BEATS = {
  firstHit: 600,
  hit: 1400,
  line1: 1800,
  line2: 1960,
  rate: 2280,
  roll: 2800,
} as const;

const PAPER = '#F4F1EA';
const IRON = '#9A968C';
const STEEL = '#6B6B6B';

type Ease = (x: number) => number;
type Key = readonly [ms: number, value: number, ease?: Ease];

const linear: Ease = Easing.linear;
const ease = Easing.bezierFn(0.25, 0.1, 0.25, 1);
const easeOut = Easing.bezierFn(0, 0, 0.58, 1);
const easeInOut = Easing.bezierFn(0.42, 0, 0.58, 1);

/**
 * A CSS-style keyframe track: holds the first value before the first key and
 * the last after the last. A key's `ease` shapes the segment that starts at it.
 */
export function track(t: number, keys: readonly Key[], fallback?: Ease): number {
  'worklet';
  // Not a default parameter (`fallback = ease`): on the UI thread, outside
  // values only exist inside the body, so a default that reads one throws.
  const easing = fallback ?? ease;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [b, vb] = keys[i];
    if (t <= b) {
      const [a, va, e] = keys[i - 1];
      const p = b === a ? 1 : (t - a) / (b - a);
      return va + (vb - va) * (e ?? easing)(p);
    }
  }
  return keys[keys.length - 1][1];
}

/** The block jolts the way the arrow points when it hits. */
export function plateJolt(kind: PlateKind, t: number): { translateX: number } | { translateY: number } {
  'worklet';
  if (kind === 'break') return { translateY: track(t, [[1400, 0], [1448, 8], [1680, 0]], easeOut) };
  if (kind === 'lift') return { translateY: track(t, [[1384, 0], [1424, -8], [1640, 0]], easeOut) };
  return { translateX: track(t, [[1408, 0], [1448, 8], [1660, 0]], easeOut) };
}

const stampEase = Easing.bezierFn(0.2, 0.9, 0.3, 1.2);

/** A headline line stamping in from 1.9× at `at` ms. */
export function stampStyle(t: number, at: number) {
  'worklet';
  return {
    opacity: track(t, [[at, 0], [at + 60, 1]], stampEase),
    transform: [{ scale: track(t, [[at, 1.9], [at + 60, 0.94], [at + 120, 1]], stampEase) }],
  };
}

type Colors = { block: string; arrow: string; lip: string };

/** The scene for one celebration, positioned by the caller at the stage's top-left. */
export function PlateScene({
  kind,
  clock,
  colors,
  dimmed = false,
}: {
  kind: PlateKind;
  clock: SharedValue<number>;
  colors: Colors;
  dimmed?: boolean;
}) {
  const fadeIn = useAnimatedStyle(() => ({ opacity: track(clock.get(), [[0, 0], [160, 1]]) }));
  return (
    <Animated.View pointerEvents="none" style={[styles.stage, fadeIn]}>
      {/* The scale: a stem and a foot under the platform. */}
      <View style={[styles.abs, { left: 189, top: 236, width: 12, height: 22, backgroundColor: STEEL }]} />
      <View style={[styles.abs, { left: 155, top: 256, width: 80, height: 8, borderRadius: 4, backgroundColor: STEEL }]} />
      {kind === 'break' && <BreakScene clock={clock} colors={colors} dimmed={dimmed} />}
      {kind === 'lift' && <LiftScene clock={clock} colors={colors} dimmed={dimmed} />}
      {kind === 'hit' && <HitScene clock={clock} colors={colors} dimmed={dimmed} />}
    </Animated.View>
  );
}

type SceneProps = { clock: SharedValue<number>; colors: Colors; dimmed: boolean };

function Platform() {
  return <View style={[styles.abs, { left: 109, top: 226, width: 172, height: 12, borderRadius: 6, backgroundColor: PAPER }]} />;
}

/** The app's arrow as drawn on the canvas, pointing right before `rotate`. */
function ArrowSvg({ color, rotate = 0, head = false }: { color: string; rotate?: number; head?: boolean }) {
  return (
    <Svg width={150} height={150} viewBox="0 0 120 120">
      <G transform={`rotate(${rotate} 60 60)`} fill={color} stroke={color} strokeLinecap="round" strokeLinejoin="round">
        {!head && <Line x1={18} y1={60} x2={74} y2={60} strokeWidth={26} />}
        <Path d="M66 28 L104 60 L66 92 Z" strokeWidth={16} />
      </G>
    </Svg>
  );
}

/** The arrow over its darker lip, 6 pt lower. */
function LippedArrow({ colors, rotate }: { colors: Colors; rotate?: number }) {
  return (
    <>
      <View style={[styles.abs, { left: 0, top: 6 }]}>
        <ArrowSvg color={colors.lip} rotate={rotate} />
      </View>
      <View style={[styles.abs, { left: 0, top: 0 }]}>
        <ArrowSvg color={colors.arrow} rotate={rotate} />
      </View>
    </>
  );
}

function Star({ fill = PAPER }: { fill?: string }) {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Path d="M22 0 L26 17 L44 22 L26 27 L22 44 L18 27 L0 22 L18 17 Z" fill={fill} />
    </Svg>
  );
}

type Piece = { x: number; y: number; w: number; h: number; color: string; dx: number; dy: number; r: number };

const burstEase = Easing.bezierFn(0.2, 0.7, 0.4, 1);

/** Chips thrown off the hit at `at` ms: out, then dropping 64 pt as they fade. */
function Burst({ pieces, at, clock }: { pieces: readonly Piece[]; at: number; clock: SharedValue<number> }) {
  return (
    <>
      {pieces.map((p, i) => (
        <Chip key={i} piece={p} at={at} clock={clock} />
      ))}
    </>
  );
}

function Chip({ piece: p, at, clock }: { piece: Piece; at: number; clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = clock.get();
    const out = track(t, [[at, 0], [at + 24, 0], [at + 336, 1]], burstEase);
    return {
      opacity: t < at ? 0 : track(t, [[at, 0], [at + 24, 1], [at + 336, 1], [at + 656, 0]], burstEase),
      transform: [
        { translateX: p.dx * out },
        { translateY: p.dy * out + track(t, [[at + 336, 0], [at + 656, 64]], burstEase) },
        { rotate: `${p.r * out}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[styles.abs, { left: p.x, top: p.y, width: p.w, height: p.h, borderRadius: 2, backgroundColor: p.color }, style]}
    />
  );
}

// ─── Loss: break it ─────────────────────────────────────────────────────────

const PLATE_LEFT = '0,0 48,0 43,22 53,42 44,62 50,80 48,96 0,96';
const PLATE_RIGHT = '48,0 96,0 96,96 48,96 50,80 44,62 53,42 43,22';
const CRACK_HALF = '48,0 43,22 53,42 50.1,48.5';
const CRACK_FULL = '48,0 43,22 53,42 44,62 50,80 48,96';

const halfEase = Easing.bezierFn(0.3, 0.1, 0.6, 1);

/** One half of the plate, split along the crack; it swings out and drops when the plate breaks. */
function PlateHalf({ dir, clock }: { dir: -1 | 1; clock: SharedValue<number> }) {
  const id = dir < 0 ? 'plate-left' : 'plate-right';
  const style = useAnimatedStyle(() => {
    const t = clock.get();
    return {
      opacity: track(t, [[1560, 1], [1840, 0]], halfEase),
      transform: [
        { translateX: dir * track(t, [[1280, 0], [1560, 30], [1840, 84]], halfEase) },
        { translateY: track(t, [[1280, 0], [1560, 0], [1840, 150]], halfEase) },
        { rotate: `${dir * track(t, [[1280, 0], [1560, 52], [1840, 110]], halfEase)}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.abs, { transformOrigin: [dir < 0 ? 19.2 : 76.8, 96, 0] }, style]}>
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Defs>
          <ClipPath id={id}>
            <Polygon points={dir < 0 ? PLATE_LEFT : PLATE_RIGHT} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${id})`}>
          <Circle cx={48} cy={48} r={48} fill={PAPER} />
          <Circle cx={48} cy={48} r={34} fill="none" stroke="#111111" strokeWidth={9} />
          <Circle cx={48} cy={48} r={13} fill="#111111" />
        </G>
      </Svg>
    </Animated.View>
  );
}

/** Two dust lines puffing out sideways from the platform on the hit. */
function Dust({ dir, clock }: { dir: -1 | 1; clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = clock.get();
    return {
      opacity: track(t, [[1400, 0], [1440, 1], [1840, 0]], easeOut),
      transform: [{ translateX: dir * track(t, [[1440, 0], [1840, 46]], easeOut) }],
    };
  });
  return (
    <Animated.View
      style={[styles.abs, styles.dust, dir < 0 ? { left: 80, top: 210 } : { left: 288, top: 210, width: 22, alignItems: 'flex-end' }, style]}>
      <View style={[styles.dustLine, { width: 22, opacity: 0.7 }]} />
      <View style={[styles.dustLine, { width: 14, opacity: 0.5 }]} />
    </Animated.View>
  );
}

const BREAK_CHIPS: Piece[] = [
  { x: 189, y: 172, w: 12, h: 10, color: PAPER, dx: -96, dy: -50, r: -160 },
  { x: 189, y: 172, w: 9, h: 9, color: IRON, dx: -58, dy: -96, r: 120 },
  { x: 189, y: 172, w: 12, h: 10, color: PAPER, dx: -112, dy: 4, r: 200 },
  { x: 189, y: 172, w: 12, h: 10, color: IRON, dx: 100, dy: -46, r: 140 },
  { x: 189, y: 172, w: 9, h: 9, color: PAPER, dx: 62, dy: -100, r: -180 },
  { x: 189, y: 172, w: 12, h: 10, color: PAPER, dx: 116, dy: 8, r: -90 },
];

function BreakScene({ clock, colors, dimmed }: SceneProps) {
  const sink = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: track(
          clock.get(),
          [[600, 0], [660, 4], [840, 0], [1400, 0], [1500, 10, Easing.bezierFn(0.2, 0.7, 0.3, 1)], [2200, 3]],
          easeOut,
        ),
      },
    ],
  }));
  const shake = useAnimatedStyle(() => {
    const t = clock.get();
    return {
      transform: [
        { translateX: track(t, [[600, 0], [632, -3], [664, 3], [696, 0]], linear) },
        { translateY: track(t, [[600, 0], [632, 1], [664, 0]], linear) },
      ],
    };
  });
  const crackHalf = useAnimatedStyle(() => {
    const t = clock.get();
    return { opacity: t >= 616 && t < 1270 ? 1 : 0 };
  });
  const crackFull = useAnimatedStyle(() => {
    const t = clock.get();
    return { opacity: t >= 1270 && t < 1312 ? 1 : 0 };
  });
  const fall = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: track(clock.get(), [
          [200, -330, Easing.bezierFn(0.55, 0, 1, 0.45)],
          [600, -92, Easing.bezierFn(0.2, 0.7, 0.3, 1)],
          [880, -178, easeInOut],
          [1040, -184, Easing.bezierFn(0.5, 0, 0.85, 0.75)],
          [1280, -92, linear],
          [1400, 0],
        ]),
      },
    ],
  }));
  const squash = useAnimatedStyle(() => {
    const t = clock.get();
    return {
      transform: [
        { scaleX: track(t, [[600, 1], [632, 1.06], [760, 1], [1400, 1], [1448, 1.07], [1680, 1]], easeOut) },
        { scaleY: track(t, [[600, 1], [632, 0.94], [760, 1], [1400, 1], [1448, 0.92], [1680, 1]], easeOut) },
      ],
    };
  });
  const flash = useAnimatedStyle(() => {
    const t = clock.get();
    return {
      opacity: track(t, [[584, 0], [616, 1], [760, 0], [1256, 0], [1288, 1], [1440, 0]], easeOut),
      transform: [{ scale: track(t, [[584, 0], [616, 1], [760, 1.5], [1256, 0], [1288, 1.3], [1440, 1.9]], easeOut) }],
    };
  });

  return (
    <>
      <Animated.View style={[styles.stageFill, sink]}>
        <Platform />
        <Animated.View style={[styles.abs, { left: 147, top: 130, width: 96, height: 96 }, shake]}>
          <PlateHalf dir={-1} clock={clock} />
          <PlateHalf dir={1} clock={clock} />
          {[
            [CRACK_HALF, crackHalf],
            [CRACK_FULL, crackFull],
          ].map(([points, style], i) => (
            <Animated.View key={i} style={[styles.abs, style as ViewStyle]}>
              <Svg width={96} height={96} viewBox="0 0 96 96">
                <Polyline
                  points={points as string}
                  fill="none"
                  stroke="#111111"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Animated.View>
          ))}
        </Animated.View>
        <Animated.View style={[styles.abs, { left: 120, top: 86, width: 150, height: 150, opacity: dimmed ? 0.5 : 1 }, fall]}>
          <Animated.View style={[styles.abs, { width: 150, height: 150, transformOrigin: [75, 139.5, 0] }, squash]}>
            <LippedArrow colors={colors} rotate={90} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <Burst pieces={BREAK_CHIPS} at={1280} clock={clock} />
      <Animated.View style={[styles.abs, { left: 173, top: 108 }, flash]}>
        <Star />
      </Animated.View>
      <Dust dir={-1} clock={clock} />
      <Dust dir={1} clock={clock} />
    </>
  );
}

// ─── Gain: lift it ──────────────────────────────────────────────────────────

/** Dip, drive, a shaky hold, then the lockout at 1.4 s. */
const LIFT_TIMES = [320, 560, 800, 960, 1120, 1240, 1400, 1520, 1640] as const;
const keysAt = (values: readonly number[]): Key[] => LIFT_TIMES.map((ms, i) => [ms, values[i]] as const);
const HEAD_Y = keysAt([0, 14, -20, -18, -22, -26, -48, -42, -44]);
const SHAFT_SY = keysAt([1, 0.833, 1.238, 1.214, 1.262, 1.31, 1.571, 1.5, 1.524]);
const BAR_Y = keysAt([0, 14, -22, -18, -22, -26, -52, -40, -44]);
const BAR_R = keysAt([0, 0, 0, 0, 1.5, -1.5, 0, 0, 0]);

/**
 * The bar is 50 pt narrower than drawn on the canvas, so its plates clear the
 * History and Settings buttons in the block's top corners.
 */
const BAR_INSET = 25;

const LIFT_CHIPS: Piece[] = [
  { x: 70 + BAR_INSET, y: 40, w: 10, h: 10, color: PAPER, dx: -40, dy: -24, r: 200 },
  { x: 70 + BAR_INSET, y: 40, w: 8, h: 14, color: '#22C55E', dx: 34, dy: -28, r: -240 },
  { x: 70 + BAR_INSET, y: 40, w: 10, h: 10, color: IRON, dx: -30, dy: 30, r: 160 },
  { x: 310 - BAR_INSET, y: 40, w: 10, h: 10, color: PAPER, dx: 40, dy: -24, r: -200 },
  { x: 310 - BAR_INSET, y: 40, w: 8, h: 14, color: '#22C55E', dx: -34, dy: -28, r: 240 },
  { x: 310 - BAR_INSET, y: 40, w: 10, h: 10, color: IRON, dx: 30, dy: 30, r: -160 },
];

function LiftScene({ clock, colors, dimmed }: SceneProps) {
  const sink = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: track(clock.get(), [[320, 0], [560, 2], [680, 7], [880, 2], [1240, 2], [1360, 8], [1640, 3]], easeOut),
      },
    ],
  }));
  const head = useAnimatedStyle(() => ({ transform: [{ translateY: track(clock.get(), HEAD_Y, easeInOut) }] }));
  const shaft = useAnimatedStyle(() => ({ transform: [{ scaleY: track(clock.get(), SHAFT_SY, easeInOut) }] }));
  const bar = useAnimatedStyle(() => {
    const t = clock.get();
    return {
      transform: [{ translateY: track(t, BAR_Y, easeInOut) }, { rotate: `${track(t, BAR_R, easeInOut)}deg` }],
    };
  });
  const whip = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: track(
          clock.get(),
          [[560, 0], [800, 6], [960, -3], [1120, 0], [1280, 0], [1400, 9], [1520, -5], [1640, 0]],
          easeOut,
        ),
      },
    ],
  }));
  const clang = useAnimatedStyle(() => {
    const t = clock.get();
    return {
      opacity: track(t, [[1376, 0], [1416, 1], [1640, 0]], easeOut),
      transform: [{ scale: track(t, [[1376, 0], [1416, 1.1], [1640, 1.7]], easeOut) }],
    };
  });
  const arrowOpacity = { opacity: dimmed ? 0.5 : 1 };
  const L = BAR_INSET;
  const R = 300 - BAR_INSET;

  return (
    <>
      <Animated.View style={[styles.stageFill, sink]}>
        <Platform />
        <Animated.View style={[styles.abs, { left: 120, top: 88 }, arrowOpacity, head]}>
          <ArrowSvg color={colors.lip} rotate={-90} head />
        </Animated.View>
        <Animated.View
          style={[
            styles.abs,
            { left: 179, top: 142, width: 32, height: 84, borderRadius: 3, backgroundColor: colors.arrow, transformOrigin: 'bottom' },
            arrowOpacity,
            shaft,
          ]}
        />
        <Animated.View style={[styles.abs, { left: 120, top: 82 }, arrowOpacity, head]}>
          <ArrowSvg color={colors.arrow} rotate={-90} head />
        </Animated.View>
        <Animated.View style={[styles.abs, { left: 45, top: 56, width: 300, height: 64 }, bar]}>
          <View style={[styles.abs, { left: L, top: 28, width: R - L, height: 8, borderRadius: 4, backgroundColor: PAPER }]} />
          <View style={[styles.abs, styles.collar, { left: L + 44 }]} />
          <View style={[styles.abs, styles.collar, { left: R - 52 }]} />
          <Animated.View style={[styles.abs, { left: 0, top: 0, width: 300, height: 64 }, whip]}>
            <View style={[styles.abs, styles.bigPlate, { left: L + 22 }]} />
            <View style={[styles.abs, styles.smallPlate, { left: L + 7 }]} />
            <View style={[styles.abs, styles.bigPlate, { left: R - 40 }]} />
            <View style={[styles.abs, styles.smallPlate, { left: R - 19 }]} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.abs, { left: 12 + L, top: 20 }, clang]}>
        <Star />
      </Animated.View>
      <Animated.View style={[styles.abs, { left: 334 - L, top: 20 }, clang]}>
        <Star />
      </Animated.View>
      <Burst pieces={LIFT_CHIPS} at={1400} clock={clock} />
    </>
  );
}

// ─── Maintain: hit it ───────────────────────────────────────────────────────

const HIT_CHIPS: Piece[] = [
  { x: 231, y: 143, w: 10, h: 10, color: PAPER, dx: -50, dy: -90, r: 200 },
  { x: 231, y: 143, w: 8, h: 14, color: '#22C55E', dx: 14, dy: -104, r: -240 },
  { x: 231, y: 143, w: 10, h: 10, color: IRON, dx: 70, dy: -70, r: 160 },
  { x: 231, y: 143, w: 10, h: 10, color: PAPER, dx: 90, dy: 4, r: -200 },
  { x: 231, y: 143, w: 8, h: 14, color: '#22C55E', dx: -70, dy: -44, r: 240 },
];

const SPEED_LINES = [
  { left: 20, top: 126, width: 90 },
  { left: 6, top: 146, width: 110 },
  { left: 30, top: 166, width: 78 },
];

function HitScene({ clock, colors, dimmed }: SceneProps) {
  const speed = useAnimatedStyle(() => {
    const t = clock.get();
    return {
      opacity: track(t, [[1080, 0], [1240, 0.9], [1440, 0]], easeOut),
      transform: [
        { translateX: track(t, [[1240, 0], [1440, 60]], easeOut) },
        { scaleX: track(t, [[1080, 0], [1240, 1], [1440, 0.2]], easeOut) },
      ],
    };
  });
  const wobble = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${track(clock.get(), [[1400, 0], [1480, 2.5], [1600, -1.5], [1720, 0.8], [1840, 0]], easeOut)}deg` },
    ],
  }));
  const arrow = useAnimatedStyle(() => {
    const t = clock.get();
    return {
      transform: [
        { translateX: track(t, [[1080, -340, Easing.bezierFn(0.4, 0, 1, 0.7)], [1400, 0]]) },
        { rotate: `${track(t, [[1424, 0], [1480, -7], [1560, 5], [1640, -3.5], [1720, 2], [1800, -1], [1880, 0]])}deg` },
        { scaleX: track(t, [[1400, 1], [1424, 0.9], [1480, 1]]) },
        { scaleY: track(t, [[1400, 1], [1424, 1.08], [1480, 1]]) },
      ],
    };
  });

  return (
    <>
      <Platform />
      {SPEED_LINES.map((s, i) => (
        <Animated.View
          key={i}
          style={[styles.abs, styles.speedLine, s, { transformOrigin: 'right' }, speed]}
        />
      ))}
      <Ring delay={0} color={colors.arrow} clock={clock} />
      <Ring delay={160} color={colors.arrow} clock={clock} />
      <Animated.View style={[styles.stageFill, { transformOrigin: [235, 226, 0] }, wobble]}>
        <Svg width={390} height={240} viewBox="0 0 390 240" style={styles.abs}>
          <Ellipse cx={243} cy={148} rx={30} ry={78} fill={IRON} />
          <Ellipse cx={235} cy={148} rx={30} ry={78} fill={PAPER} />
          <Ellipse cx={235} cy={148} rx={24} ry={62.6} fill="#111111" />
          <Ellipse cx={235} cy={148} rx={18.4} ry={48} fill={PAPER} />
          <Ellipse cx={235} cy={148} rx={8} ry={21} fill="#111111" />
        </Svg>
        <Animated.View
          style={[
            styles.abs,
            { left: 99, top: 73, width: 150, height: 150, opacity: dimmed ? 0.5 : 1, transformOrigin: [140, 75, 0] },
            arrow,
          ]}>
          <LippedArrow colors={colors} />
        </Animated.View>
      </Animated.View>
      <Burst pieces={HIT_CHIPS} at={1400} clock={clock} />
    </>
  );
}

/** A ring spreading out from the plate's face on the hit. */
function Ring({ delay, color, clock }: { delay: number; color: string; clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = clock.get() - delay;
    return {
      opacity: track(t, [[1416, 0], [1456, 1], [2080, 0]], easeOut),
      transform: [
        { scaleX: track(t, [[1416, 0.9], [1456, 1], [2080, 2.2]], easeOut) },
        { scaleY: track(t, [[1416, 0.9], [1456, 1], [2080, 1.4]], easeOut) },
      ],
    };
  });
  return <Animated.View style={[styles.abs, styles.ring, { borderColor: color }, style]} />;
}

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
  stage: {
    position: 'absolute',
    width: STAGE_W,
    height: 280,
  },
  stageFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: STAGE_W,
    height: 280,
  },
  dust: {
    gap: 6,
  },
  dustLine: {
    height: 3,
    borderRadius: 2,
    backgroundColor: PAPER,
  },
  collar: {
    top: 21,
    width: 8,
    height: 22,
    borderRadius: 2,
    backgroundColor: STEEL,
  },
  bigPlate: {
    top: 0,
    width: 18,
    height: 64,
    borderRadius: 5,
    backgroundColor: PAPER,
  },
  smallPlate: {
    top: 10,
    width: 12,
    height: 44,
    borderRadius: 4,
    backgroundColor: IRON,
  },
  speedLine: {
    height: 5,
    borderRadius: 3,
    backgroundColor: PAPER,
  },
  ring: {
    left: 205,
    top: 70,
    width: 60,
    height: 156,
    borderRadius: '50%',
    borderWidth: 4,
  },
});
