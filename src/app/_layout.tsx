import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DataProvider, useData } from '@/data/store';
import { dark, light, type Palette } from '@/design/theme';
import { ThemeProvider, useColors } from '@/design/ThemeProvider';
import { VoiceSessionProvider } from '@/voice/VoiceSessionProvider';
import { SkiaGate } from '@/viz/SkiaGate';

SplashScreen.preventAutoHideAsync().catch(() => {});

function navTheme(color: Palette) {
  const base = color.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return { ...base, colors: { ...base.colors, background: color.bg, card: color.bg, text: color.text, border: color.hairline, primary: color.text } };
}

/** Light by day, dark at night (or as chosen in Settings), once the stored choice is known. */
function Themed({ children }: { children: ReactNode }) {
  const { prefs } = useData();
  return <ThemeProvider appearance={prefs.appearance}>{children}</ThemeProvider>;
}

function RootStack() {
  const color = useColors();
  const { ready } = useData();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  return (
    <NavThemeProvider value={navTheme(color)}>
      <StatusBar style={color.scheme === 'dark' ? 'light' : 'dark'} />
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
        <Stack.Screen name="listen" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  // Before the stored appearance is read, follow the phone.
  const system = useColorScheme() === 'dark' ? dark : light;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: system.bg }}>
      <SkiaGate>
        <DataProvider>
          <Themed>
            <VoiceSessionProvider>
              <RootStack />
            </VoiceSessionProvider>
          </Themed>
        </DataProvider>
      </SkiaGate>
    </GestureHandlerRootView>
  );
}
