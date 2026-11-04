import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-context';
import { analyze, fromKg, type WeightUnit } from '@/engine';
import { useTheme } from '@/hooks/use-theme';
import { dayLabel, localIsoDate } from '@/lib/dates';
import { historyRows, type HistoryRow } from '@/lib/history';
import { formatWeight } from '@/lib/weight-input';

const SOURCE_BADGES: Record<string, string> = {
  apple_health: 'Apple Health',
  health_connect: 'Health Connect',
  import: 'Imported',
};

function signedDiff(kg: number, unit: WeightUnit): string {
  const text = Math.abs(fromKg(kg, unit)).toFixed(1);
  if (Number(text) === 0) return `±${text}`;
  return `${kg > 0 ? '+' : '−'}${text}`;
}

export default function HistoryScreen() {
  const { weighIns, preferences } = useData();
  const { goal, trend, unit } = preferences;
  const today = localIsoDate();
  const rows = historyRows(weighIns, analyze(weighIns, goal, trend, today).series);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.weighIn.id}
        style={styles.list}
        contentContainerStyle={rows.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">No weigh-ins yet.</ThemedText>
        }
        renderItem={({ item }) => <Row row={item} unit={unit} today={today} />}
      />
    </ThemedView>
  );
}

function Row({ row, unit, today }: { row: HistoryRow; unit: WeightUnit; today: string }) {
  const theme = useTheme();
  const { weighIn, date, trendKg, diffKg } = row;
  const time = new Date(weighIn.timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const badges = [SOURCE_BADGES[weighIn.source], weighIn.excluded && 'Excluded'].filter(
    (b): b is string => Boolean(b),
  );

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/log', params: { id: weighIn.id } })}
      accessibilityRole="button"
      accessibilityHint="Edit this weigh-in"
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.backgroundElement },
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
            trend {formatWeight(trendKg, unit)} · {signedDiff(diffKg, unit)}
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
  list: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
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
