import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Named haptic beats for the arrow animations. On Android the system haptics
 * engine feels much closer to the iOS Taptic Engine than the vibrator that
 * the cross-platform calls fall back to, so it is used where a match exists.
 * Failures are ignored: haptics are never essential.
 */
export type HapticBeat = 'tap' | 'launch' | 'land' | 'success' | 'tick';

const ANDROID: Partial<Record<HapticBeat, Haptics.AndroidHaptics>> = {
  tap: Haptics.AndroidHaptics.Context_Click,
  tick: Haptics.AndroidHaptics.Segment_Tick,
  success: Haptics.AndroidHaptics.Confirm,
};

export function haptic(beat: HapticBeat): void {
  if (Platform.OS === 'web') return;
  const android = Platform.OS === 'android' ? ANDROID[beat] : undefined;
  const run = android
    ? () => Haptics.performAndroidHapticsAsync(android)
    : {
        tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        launch: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
        land: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
        success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        tick: () => Haptics.selectionAsync(),
      }[beat];
  run().catch(() => {});
}

/** Plays haptic beats at millisecond offsets; returns a cancel function. */
export function hapticTimeline(beats: readonly (readonly [ms: number, beat: HapticBeat])[]): () => void {
  const timers = beats.map(([ms, beat]) => setTimeout(() => haptic(beat), ms));
  return () => timers.forEach(clearTimeout);
}
