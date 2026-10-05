import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DataProvider, useData } from '@/data/store';
import { color } from '@/design/theme';
import { VoiceSessionProvider } from '@/voice/VoiceSessionProvider';
import { SkiaGate } from '@/viz/SkiaGate';

SplashScreen.preventAutoHideAsync().catch(() => {});

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: color.bg, card: color.bg, text: color.text, border: color.hairline, primary: color.text },
};

function RootStack() {
  const { ready } = useData();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="lately" options={{ presentation: 'card', animation: 'default' }} />
      <Stack.Screen name="session" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="recap/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="journey/[id]" options={{ presentation: 'card', animation: 'default' }} />
      <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
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
