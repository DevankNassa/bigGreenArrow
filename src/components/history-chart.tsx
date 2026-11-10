import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { ToneColors, Type } from '@/constants/theme';
import { fromKg, type TrendPoint, type WeightUnit } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { gridValues } from '@/lib/history-chart';

const H = 196;
const LEFT = 34;
const TOP = 12;
const BOTTOM = 12;

/**
 * Trend line over the day's scale readings, with the goal as a dashed line
 * when it is near enough to fit (Poster History, SPEC §8).
 */
export function HistoryChart({
  points,
  goalKg,
  unit,
}: {
  points: readonly TrendPoint[];
  goalKg?: number;
  unit: WeightUnit;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const dots = theme.text === '#111111' ? '#9A9384' : '#7A7468';
  const grid = theme.backgroundSelected;

  const values = points.flatMap((p) => [fromKg(p.trendKg, unit), fromKg(p.weightKg, unit)]);
  const goal = goalKg === undefined ? undefined : fromKg(goalKg, unit);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  // Show the goal only if it keeps the trend readable: within twice the data's spread.
  const showGoal = goal !== undefined && Math.abs(goal - (lo + hi) / 2) <= Math.max(2, (hi - lo) * 2);
  if (showGoal) {
    lo = Math.min(lo, goal);
    hi = Math.max(hi, goal);
  }
  const pad = Math.max(0.2, (hi - lo) * 0.06);
  lo -= pad;
  hi += pad;

  const first = points[0]?.day ?? 0;
  const last = points[points.length - 1]?.day ?? 1;
  const x = (day: number) => LEFT + 4 + ((day - first) / Math.max(1, last - first)) * (width - LEFT - 12);
  const y = (v: number) => TOP + ((hi - v) / (hi - lo)) * (H - TOP - BOTTOM);
  const end = points[points.length - 1];
  const lines = gridValues(lo, hi).filter((v) => !showGoal || Math.abs(y(v) - y(goal)) > 14);
  const label = { fontFamily: Type.bold, fontSize: 11, fontWeight: '700' } as const;

  return (
    <View
      style={{ height: H }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        end
          ? `Trend from ${fromKg(points[0].trendKg, unit).toFixed(1)} to ${fromKg(end.trendKg, unit).toFixed(1)} ${unit}, with daily scale readings around it.${showGoal ? ` Goal line at ${goal.toFixed(1)} ${unit}.` : ''}`
          : 'No weigh-ins in this range'
      }>
      {width > 0 && end && (
        <Svg width={width} height={H}>
          <G>
            {lines.map((v) => (
              <G key={v}>
                <Line x1={LEFT} x2={width} y1={y(v)} y2={y(v)} stroke={grid} strokeWidth={1} />
                <SvgText x={0} y={y(v) + 4} fill={theme.textSecondary} {...label}>
                  {Number.isInteger(v) ? v : v.toFixed(1)}
                </SvgText>
              </G>
            ))}
          </G>
          {showGoal && (
            <G>
              <Line x1={LEFT} x2={width} y1={y(goal)} y2={y(goal)} stroke={ToneColors.big_green} strokeWidth={2} strokeDasharray="6 5" />
              <SvgText x={0} y={y(goal) + 4} fill={ToneColors.big_green} {...label}>
                {Number.isInteger(goal) ? goal : goal.toFixed(1)}
              </SvgText>
              <SvgText x={width} y={y(goal) - 8} textAnchor="end" fill={ToneColors.big_green} letterSpacing={1} {...label}>
                GOAL
              </SvgText>
            </G>
          )}
          <G>
            {points.map((p) => (
              <Circle key={p.day} cx={x(p.day)} cy={y(fromKg(p.weightKg, unit))} r={3} fill={dots} />
            ))}
          </G>
          <Polyline
            points={points.map((p) => `${x(p.day)},${y(fromKg(p.trendKg, unit))}`).join(' ')}
            fill="none"
            stroke={theme.text}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={x(end.day)} cy={y(fromKg(end.trendKg, unit))} r={6} fill={ToneColors.big_green} stroke={theme.background} strokeWidth={2.5} />
        </Svg>
      )}
    </View>
  );
}
