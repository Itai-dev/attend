import { Redirect, Tabs } from 'expo-router';
import { useData } from '@/data/store';
import { color } from '@/design/theme';

/** Web preview only: JS tabs styled like the native bar. */
export default function TabsLayout() {
  const { prefs } = useData();
  if (!prefs.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'rgba(14,14,17,0.96)', borderTopColor: color.hairline },
        tabBarActiveTintColor: color.text,
        tabBarInactiveTintColor: color.textTertiary,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
        sceneStyle: { backgroundColor: color.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
    </Tabs>
  );
}
