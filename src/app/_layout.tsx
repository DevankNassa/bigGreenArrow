import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold } from '@expo-google-fonts/archivo';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { LiveAppIcon } from '@/components/live-app-icon';
import { Colors, Type } from '@/constants/theme';
import { DataProvider } from '@/data/data-context';
import { DATABASE_NAME, migrate } from '@/data/db';

/** Catches a screen that throws while rendering, so the app shows a message instead of closing. */
export { ScreenError as ErrorBoundary } from '@/components/screen-error';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    ArchivoBlack_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
  });
  // A failed load falls back to the system font rather than blocking the app.
  if (!fontsLoaded && !fontError) return null;

  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.background, text: colors.text },
  };

  return (
    <ThemeProvider value={navTheme}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
        <DataProvider>
          <LiveAppIcon />
          <Stack
            screenOptions={{
              headerShown: false,
              headerShadowVisible: false,
              headerTitleStyle: { fontFamily: Type.display },
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="log" options={{ presentation: 'modal' }} />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
            <Stack.Screen name="demo" options={{ headerShown: true, title: 'Demo scenarios' }} />
          </Stack>
        </DataProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
