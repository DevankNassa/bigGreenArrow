import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { DataProvider } from '@/data/data-context';
import { DATABASE_NAME, migrate } from '@/data/db';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
        <DataProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="log" options={{ presentation: 'modal' }} />
            <Stack.Screen name="history" options={{ headerShown: true, title: 'History' }} />
            <Stack.Screen name="demo" options={{ headerShown: true, title: 'Demo scenarios' }} />
          </Stack>
        </DataProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
