import { Link, Redirect, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowSummary } from '@/components/arrow-summary';
import { Button } from '@/components/button';
import { PosterHero } from '@/components/poster-hero';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, Type } from '@/constants/theme';
import { useData } from '@/data/data-context';
import { analyze } from '@/engine';
import { localIsoDate } from '@/lib/dates';

export default function HomeScreen() {
  const { weighIns, preferences } = useData();
  const insets = useSafeAreaInsets();
  const { goal, trend, unit } = preferences;
  const analysis = analyze(weighIns, goal, trend, localIsoDate());

  if (!preferences.onboarded) return <Redirect href="/onboarding" />;

  const actions = (
    <>
      {weighIns.length > 0 && <HeroPill label="History" onPress={() => router.push('/history')} />}
      <HeroPill label="Settings" onPress={() => router.push('/settings')} />
    </>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        {weighIns.length === 0 ? (
          <>
            <PosterHero
              tone="gray"
              angleDeg={0}
              dimmed
              headline="Welcome"
              subline="Log your first weigh-in."
              motion="enter"
              topInset={insets.top}
              actions={actions}
              accessibilityLabel="No weigh-ins yet"
            />
            <View style={styles.empty}>
              <ThemedText themeColor="textSecondary">
                The scale jumps around from day to day. Log your weight each morning and the arrow
                will show where your trend is really heading.
              </ThemedText>
            </View>
          </>
        ) : (
          <ArrowSummary analysis={analysis} goal={goal} unit={unit} topInset={insets.top} actions={actions} />
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.actions}>
        <Button label="+ Log weight" onPress={() => router.push('/log')} />
        {__DEV__ && (
          <Link href="/demo" style={styles.demoLink}>
            <ThemedText type="small" themeColor="textSecondary">
              Demo scenarios
            </ThemedText>
          </Link>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/** A small translucent pill that sits on the hero block. */
function HeroPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pill, { opacity: pressed ? 0.7 : 1 }]}>
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: Spacing.four,
  },
  empty: {
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  actions: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  demoLink: {
    alignSelf: 'center',
  },
  pill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  pillText: {
    fontFamily: Type.bold,
    fontSize: 13,
    letterSpacing: 1,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
});
