import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryChart } from '@/components/history-chart';
import { ScreenHeader } from '@/components/screen-header';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ArrowShape } from '@/components/trend-arrow';
import { MaxContentWidth, Spacing, ToneColors, Type } from '@/constants/theme';
import { useData } from '@/data/data-context';
import { STATE_TONE, analyze, fromKg, type Goal, type WeightUnit } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { stateLabel } from '@/lib/arrow-labels';
import { dayLabel, localIsoDate } from '@/lib/dates';
import { historyRows, type HistoryRow } from '@/lib/history';
import { HISTORY_RANGES, pointsInRange, weekStart, weeklyReadings, type HistoryRange, type WeekReading } from '@/lib/history-chart';
import { formatWeight } from '@/lib/weight-input';

const SOURCE_BADGES: Record<string, string> = {
  apple_health: 'Apple Health',
  health_connect: 'Health Connect',
  import: 'Imported',
};

function signed(n: number, digits: number): string {
  const text = Math.abs(n).toFixed(digits);
  if (Number(text) === 0) return `±${text}`;
  return `${n > 0 ? '+' : '−'}${text}`;
}

export default function HistoryScreen() {
  const theme = useTheme();
  const { weighIns, preferences } = useData();
  const { goal, trend, unit } = preferences;
  const [range, setRange] = useState<HistoryRange>('3M');
  const today = localIsoDate();
  const analysis = analyze(weighIns, goal, trend, today);
  const rows = historyRows(weighIns, analysis.series);

  const r = HISTORY_RANGES.find((x) => x.value === range)!;
  const points = pointsInRange(analysis.series, r.days, today);
  const change = points.length > 1 ? fromKg(points[points.length - 1].trendKg - points[0].trendKg, unit) : null;
  const weeks = weeklyReadings(points, goal);

  const header = (
    <View style={styles.top}>
      <ScreenHeader back="Home" title="History" />
      <Segmented
        options={HISTORY_RANGES}
        value={range}
        onChange={setRange}
        accessibilityLabel="Time range"
      />
      <View style={styles.change} accessible accessibilityLabel={change === null ? 'Not enough weigh-ins in this range' : `${signed(change, 1)} ${unit} in ${r.words}`}>
        <Text style={[styles.changeNumber, { color: theme.text }]}>{change === null ? '—' : signed(change, 1)}</Text>
        <Text style={[styles.changeUnit, { color: theme.text }]}>{`${unit} in\n${r.words}`}</Text>
      </View>
      {points.length > 1 ? (
        <HistoryChart points={points} goalKg={goal.targetKg} unit={unit} />
      ) : (
        <ThemedText themeColor="textSecondary">Log a few more weigh-ins to see the trend here.</ThemedText>
      )}
      {weeks.length > 0 && (
        <View style={[styles.weeks, { borderBottomColor: theme.text }]}>
          {weeks.map((w) => (
            <WeekRow key={w.week} reading={w} goal={goal} thisWeek={w.week === weekStart(today)} />
          ))}
        </View>
      )}
      {rows.length > 0 && <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>Weigh-ins</Text>}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <FlatList
          data={rows}
          keyExtractor={(row) => row.weighIn.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<ThemedText themeColor="textSecondary">No weigh-ins yet.</ThemedText>}
          renderItem={({ item }) => <Row row={item} unit={unit} today={today} />}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function WeekRow({ reading, goal, thisWeek }: { reading: WeekReading; goal: Goal; thisWeek: boolean }) {
  const theme = useTheme();
  const [y, m, d] = reading.week.split('-').map(Number);
  const when = thisWeek ? 'This week' : new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const label = stateLabel(reading.state, goal.type);
  const pct = `${signed(reading.pctPerWeek, 2)}%`;
  return (
    <View style={[styles.weekRow, { borderTopColor: theme.text }]} accessible accessibilityLabel={`${when}: ${label}, ${pct} a week`}>
      <View style={[styles.weekArrow, { transform: [{ rotate: `${-reading.angleDeg}deg` }] }]}>
        <ArrowShape size={28} color={ToneColors[STATE_TONE[reading.state]]} dash={reading.state === 'flat'} />
      </View>
      <View style={styles.weekText}>
        <Text style={[styles.weekWhen, { color: theme.text }]}>{when}</Text>
        <Text style={[styles.weekState, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.weekPct, { color: theme.text }]}>{pct}</Text>
    </View>
  );
}

function Row({ row, unit, today }: { row: HistoryRow; unit: WeightUnit; today: string }) {
  const theme = useTheme();
  const { weighIn, date, trendKg, diffKg } = row;
  const time = new Date(weighIn.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const badges = [SOURCE_BADGES[weighIn.source], weighIn.excluded && 'Excluded'].filter((b): b is string => Boolean(b));

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/log', params: { id: weighIn.id } })}
      accessibilityRole="button"
      accessibilityHint="Edit this weigh-in"
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.backgroundSelected },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <View style={styles.left}>
        <ThemedText>
          {dayLabel(date, today)}
          <ThemedText type="small" themeColor="textSecondary">
            {'  '}
            {time}
          </ThemedText>
        </ThemedText>
        {weighIn.note && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {weighIn.note}
          </ThemedText>
        )}
        {badges.length > 0 && (
          <View style={styles.badges}>
            {badges.map((b) => (
              <ThemedText key={b} type="small" style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                {b}
              </ThemedText>
            ))}
          </View>
        )}
      </View>
      <View style={styles.right}>
        <ThemedText
          type="smallBold"
          style={[styles.weight, weighIn.excluded && styles.struck]}
          themeColor={weighIn.excluded ? 'textSecondary' : 'text'}>
          {formatWeight(weighIn.weightKg, unit)}
        </ThemedText>
        {trendKg !== null && diffKg !== null && (
          <ThemedText type="small" themeColor="textSecondary">
            trend {formatWeight(trendKg, unit)} · {signed(fromKg(diffKg, unit), 1)}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  top: {
    gap: 14,
    paddingBottom: Spacing.two,
  },
  change: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingTop: 4,
  },
  changeNumber: {
    fontFamily: Type.display,
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -1.6,
  },
  changeUnit: {
    paddingBottom: 6,
    fontFamily: Type.bold,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  weeks: {
    borderBottomWidth: 2,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 2,
  },
  weekArrow: {
    width: 28,
    height: 28,
  },
  weekText: {
    flex: 1,
  },
  weekWhen: {
    fontFamily: Type.bold,
    fontSize: 15,
  },
  weekState: {
    fontFamily: Type.semiBold,
    fontSize: 13,
  },
  weekPct: {
    fontFamily: Type.display,
    fontSize: 17,
  },
  groupTitle: {
    paddingTop: Spacing.three,
    fontFamily: Type.bold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flex: 1,
    gap: Spacing.half,
  },
  right: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  weight: {
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
});
