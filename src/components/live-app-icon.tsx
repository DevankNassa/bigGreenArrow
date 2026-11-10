import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from 'expo-alternate-app-icons';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useData } from '@/data/data-context';
import { analyze } from '@/engine';
import { localIsoDate } from '@/lib/dates';
import { liveIconName } from '@/lib/live-icon';

/** Whether this device can show the arrow on its app icon. iOS only for now. */
export const canUseLiveIcon = Platform.OS === 'ios' && supportsAlternateIcons;

/**
 * Keeps the app icon in step with the arrow while "Live app icon" is on, and
 * puts the hourglass back when it's turned off. iOS shows a popup on every
 * change, so it only switches when the icon actually differs.
 */
export function LiveAppIcon() {
  const { weighIns, preferences } = useData();
  // Re-read the date when the app comes back, so a day without weigh-ins counts.
  const [today, setToday] = useState(localIsoDate);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setToday(localIsoDate()));
    return () => sub.remove();
  }, []);

  const { goal, trend, liveAppIcon, onboarded } = preferences;
  const wanted =
    liveAppIcon && onboarded && weighIns.length > 0 ? liveIconName(analyze(weighIns, goal, trend, today).arrow) : null;

  useEffect(() => {
    if (!canUseLiveIcon || getAppIconName() === wanted) return;
    setAlternateAppIcon(wanted).catch((e) => console.warn("Couldn't change the app icon", e));
  }, [wanted]);

  return null;
}
