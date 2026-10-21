import { Newsreader_300Light, Newsreader_400Regular, Newsreader_500Medium, useFonts } from '@expo-google-fonts/newsreader';
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
  // The serif is part of the design, not decoration: the splash stays until it has loaded,
  // so titles never flash in a fallback face.
  const [fontsLoaded, fontError] = useFonts({ Newsreader_300Light, Newsreader_400Regular, Newsreader_500Medium });
  const fonts = fontsLoaded || !!fontError;
  useEffect(() => {
    if (ready && fonts) SplashScreen.hideAsync().catch(() => {});
  }, [ready, fonts]);
  if (!ready || !fonts) return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="session" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="recap/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="body" options={{ presentation: 'card', animation: 'default' }} />
      <Stack.Screen name="journey/index" options={{ presentation: 'card', animation: 'default' }} />
      <Stack.Screen name="journey/[id]" options={{ presentation: 'card', animation: 'default' }} />
      <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
      <Stack.Screen name="lesson/[day]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="before" options={{ presentation: 'modal' }} />
      <Stack.Screen name="moment" options={{ presentation: 'modal' }} />
      <Stack.Screen name="listen" options={{ presentation: 'modal' }} />
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
