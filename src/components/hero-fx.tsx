import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

import type { ChipIcon } from '@/lib/arrow-labels';

/** The icons drawn on the hero block. */

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
