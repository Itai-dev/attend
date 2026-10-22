import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DataProvider, useData } from '@/data/store';
import { color, useColors, useScheme } from '@/design/theme';
import { VoiceSessionProvider } from '@/voice/VoiceSessionProvider';
import { SkiaGate } from '@/viz/SkiaGate';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Navigation's own colours (headers, cards behind transitions) follow Washi by day and Sumi at night. */
function useNavTheme() {
  const scheme = useScheme();
  const c = useColors();
  const base = scheme === 'light' ? DefaultTheme : DarkTheme;
  return { ...base, colors: { ...base.colors, background: c.bg, card: c.bg, text: c.text, border: c.hairline, primary: c.text } };
}

function RootStack() {
  const { ready } = useData();
  // The fonts are the system's own (SF and SF Pro Rounded): nothing to load before the splash goes.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="session" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="recap/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="sound" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
      <Stack.Screen name="lesson/[day]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="before" options={{ presentation: 'modal' }} />
      <Stack.Screen name="moment" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const navTheme = useNavTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="auto" />
        <SkiaGate>
          <DataProvider>
            <VoiceSessionProvider>
              <RootStack />
            </VoiceSessionProvider>
          </DataProvider>
        </SkiaGate>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
