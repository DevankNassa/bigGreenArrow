import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ToneColors, Type } from '@/constants/theme';
import { STATE_TONE, redThresholdPct, type ArrowState, type Goal } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { stateLabel } from '@/lib/arrow-labels';
import { haptic } from '@/lib/haptics';

/** The scale runs from +RANGE at the top to −RANGE at the bottom, in % per week. */
const RANGE = 1.5;
const STEP = 0.05;
const TRACK_H = 420;
const TICKS = [1.5, 1, 0.5, 0, -0.5, -1, -1.5];
const TAB_H = 40;
const TAB_W = 104;
const TRACK_W = 14;
const TICK_W = 40;

const snap = (n: number) => Number((Math.round(n / STEP) * STEP).toFixed(2));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** One draggable cutoff: its signed position on the scale and how moving it changes the goal. */
interface Cutoff {
  name: string;
  value: number;
  set: (goal: Goal, value: number) => Goal;
}

function cutoffs(goal: Goal): Cutoff[] {
  const red = redThresholdPct(goal);
  // The engine's flat zone is symmetric, so its two tabs move together.
  const flatMax = goal.type === 'maintain' ? RANGE : Math.min(goal.optimalMinPct, red) - STEP;
  const setFlat = (g: Goal, v: number) => ({ ...g, flatBandPct: clamp(snap(Math.abs(v)), STEP, flatMax) });
  const flat: Cutoff[] = [
    { name: 'Steady zone top', value: goal.flatBandPct, set: setFlat },
    { name: 'Steady zone bottom', value: -goal.flatBandPct, set: setFlat },
  ];
  if (goal.type === 'maintain') return flat;

  // Signs flip with the goal: the good direction is down when losing, up when gaining.
  const good = goal.type === 'lose' ? -1 : 1;
  const tooFast: Cutoff = {
    name: 'Too fast starts',
    value: good * goal.optimalMaxPct,
    set: (g, v) => ({ ...g, optimalMaxPct: clamp(snap(good * v), g.optimalMinPct + STEP, RANGE) }),
  };
  const optimal: Cutoff = {
    name: 'Optimal starts',
    value: good * goal.optimalMinPct,
    set: (g, v) => ({
      ...g,
      optimalMinPct: clamp(snap(good * v), g.flatBandPct + STEP, g.optimalMaxPct - STEP),
    }),
  };
  const wrongWay: Cutoff = {
    name: 'Wrong way starts',
    value: -good * red,
    set: (g, v) => ({ ...g, redThresholdPct: clamp(snap(-good * v), g.flatBandPct + STEP, RANGE) }),
  };
  return goal.type === 'lose'
    ? [wrongWay, ...flat, optimal, tooFast]
    : [tooFast, optimal, ...flat, wrongWay];
}

/** The states between the cutoffs, top to bottom. */
const ZONES: Record<Goal['type'], ArrowState[]> = {
  lose: ['wrong_way', 'slow_wrong', 'flat', 'slow_right', 'optimal', 'too_fast'],
  gain: ['too_fast', 'optimal', 'slow_right', 'flat', 'slow_wrong', 'wrong_way'],
  maintain: ['drifting', 'on_target', 'drifting'],
};

const fmt = (v: number, digits: number) => {
  const a = Math.abs(v).toFixed(digits);
  return Number(a) === 0 ? a : `${v > 0 ? '+' : '−'}${a}`;
};

const y = (v: number) => ((RANGE - clamp(v, -RANGE, RANGE)) / (2 * RANGE)) * TRACK_H;

/**
 * A vertical scale of the arrow's stages with a draggable tab at each cutoff
 * (SPEC §7.5). Stage names sit on the left, the tabs on the right.
 */
export function ZoneSlider({
  goal,
  onChange,
  onDragging,
}: {
  goal: Goal;
  onChange: (goal: Goal) => void;
  /** Lets a parent ScrollView stop scrolling while a tab is dragged. */
  onDragging?: (dragging: boolean) => void;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const list = cutoffs(goal);
  const edges = [RANGE, ...list.map((c) => c.value), -RANGE];
  const trackX = width - TAB_W - TRACK_W - 10;
  const tickX = trackX - TICK_W - 4;

  function move(i: number, v: number) {
    const next = list[i].set(goal, v);
    if (JSON.stringify(next) === JSON.stringify(goal)) return;
    haptic('tick');
    onChange(next);
  }

  return (
    <View style={{ height: TRACK_H }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <>
          {ZONES[goal.type].map((state, i) => {
            const top = y(edges[i]);
            const bottom = y(edges[i + 1]);
            const color = ToneColors[STATE_TONE[state]];
            return (
              <View key={i}>
                <View style={[styles.segment, { left: trackX, top, height: bottom - top, backgroundColor: color }]} />
                {bottom - top >= 18 && (
                  <View style={[styles.zoneLabel, { top: (top + bottom) / 2 - 10, width: tickX - 4 }]}>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.zoneText}>
                      {stateLabel(state, goal.type)}
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })}

          {TICKS.map((v) => (
            <Text
              key={v}
              style={[styles.tick, { left: tickX, top: y(v) - 8, width: TICK_W, color: theme.textSecondary }]}>
              {fmt(v, 1)}
            </Text>
          ))}

          {list.map((c) => (
            <View
              key={c.name}
              pointerEvents="none"
              style={[styles.rule, { top: y(c.value) - 1, width: trackX + TRACK_W, backgroundColor: theme.text }]}
            />
          ))}

          {list.map((c, i) => (
            <ZoneTab
              key={c.name}
              name={c.name}
              value={c.value}
              left={trackX + TRACK_W + 10}
              onMove={(v) => move(i, v)}
              onDragging={onDragging}
            />
          ))}
        </>
      )}
    </View>
  );
}

function ZoneTab({
  name,
  value,
  left,
  onMove,
  onDragging,
}: {
  name: string;
  value: number;
  left: number;
  onMove: (value: number) => void;
  onDragging?: (dragging: boolean) => void;
}) {
  const theme = useTheme();
  // Where the drag started: the finger's page y and the tab's value then.
  const [drag, setDrag] = useState<{ y0: number; v0: number } | null>(null);
  const active = drag !== null;
  const end = () => {
    setDrag(null);
    onDragging?.(false);
  };
  const fill = active ? ToneColors.big_green : theme.ink;
  const label = `${fmt(value, 2)}%`;

  return (
    <View
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        setDrag({ y0: e.nativeEvent.pageY, v0: value });
        onDragging?.(true);
      }}
      onResponderMove={(e) => {
        if (drag) onMove(drag.v0 - ((e.nativeEvent.pageY - drag.y0) / TRACK_H) * 2 * RANGE);
      }}
      onResponderRelease={end}
      onResponderTerminate={end}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={name}
      accessibilityValue={{ text: `${label} per week` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onMove(value + (e.nativeEvent.actionName === 'increment' ? STEP : -STEP))}
      style={[
        styles.tab,
        { left, top: y(value) - TAB_H / 2, backgroundColor: fill, transform: [{ scale: active ? 1.06 : 1 }] },
      ]}>
      <View style={[styles.notch, { borderRightColor: fill }]} />
      <Text style={[styles.tabText, { color: active ? '#FFFFFF' : theme.onInk }]}>{label}</Text>
      <View style={styles.grip}>
        {[0, 1, 2].map((r) => (
          <View key={r} style={styles.gripRow}>
            <View style={[styles.gripDot, { backgroundColor: active ? '#FFFFFF' : theme.onInk }]} />
            <View style={[styles.gripDot, { backgroundColor: active ? '#FFFFFF' : theme.onInk }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    position: 'absolute',
    width: TRACK_W,
  },
  zoneLabel: {
    position: 'absolute',
    left: 0,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  zoneText: {
    flexShrink: 1,
  },
  tick: {
    position: 'absolute',
    fontFamily: Type.bold,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'right',
    paddingRight: 6,
  },
  rule: {
    position: 'absolute',
    left: 0,
    height: 2,
    opacity: 0.3,
  },
  tab: {
    position: 'absolute',
    height: TAB_H,
    minWidth: TAB_W - 10,
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 999,
  },
  notch: {
    position: 'absolute',
    left: -7,
    top: TAB_H / 2 - 8,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontFamily: Type.display,
    fontSize: 15,
  },
  grip: {
    gap: 3,
    opacity: 0.7,
  },
  gripRow: {
    flexDirection: 'row',
    gap: 3,
  },
  gripDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
