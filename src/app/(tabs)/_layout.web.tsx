import { Redirect, Tabs } from 'expo-router';
import { useData } from '@/data/store';
import { useColors } from '@/design/ThemeProvider';

/** Web preview only: JS tabs styled like the native bar. */
export default function TabsLayout() {
  const color = useColors();
  const { prefs } = useData();
  if (!prefs.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: color.bg, borderTopColor: color.hairline },
        tabBarActiveTintColor: color.text,
        tabBarInactiveTintColor: color.textTertiary,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
        sceneStyle: { backgroundColor: color.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="program" options={{ title: 'Program' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}
