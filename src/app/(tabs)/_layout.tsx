import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useData } from '@/data/store';
import { color } from '@/design/theme';
import { tr } from '@/i18n';

/**
 * Three places (22 Oct 2026, simpler, after Headspace): Today (the day's lesson and practice),
 * Explore (sessions and nature sounds), and the person's own tab, named for them. Settings
 * are the gear at the top right of each.
 */
export default function TabsLayout() {
  const { prefs } = useData();
  if (!prefs.onboarded) return <Redirect href="/onboarding" />;
  return (
    <NativeTabs tintColor={color.text} iconColor={{ default: color.textTertiary, selected: color.text }} labelStyle={{ color: color.textTertiary }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{tr('Today', 'היום')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.horizon', selected: 'sun.horizon.fill' }} md="wb_twilight" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>{tr('Explore', 'גילוי')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="grid_view" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Label>{prefs.name?.trim() || tr('You', 'אני')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
