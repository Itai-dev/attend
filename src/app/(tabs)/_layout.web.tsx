import { Redirect, Tabs } from 'expo-router';
import { useData } from '@/data/store';
import { color } from '@/design/theme';
import { tr } from '@/i18n';

/** Web preview only: JS tabs styled like the native bar. */
export default function TabsLayout() {
  const { prefs } = useData();
  if (!prefs.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: color.bg, borderTopWidth: 0 },
        tabBarActiveTintColor: color.text,
        tabBarInactiveTintColor: color.textTertiary,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
        sceneStyle: { backgroundColor: color.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: tr('Today', 'היום') }} />
      <Tabs.Screen name="explore" options={{ title: tr('Explore', 'גילוי') }} />
      <Tabs.Screen name="you" options={{ title: prefs.name?.trim() || tr('You', 'אני') }} />
    </Tabs>
  );
}
