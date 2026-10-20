import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useData } from '@/data/store';
import { type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';

/**
 * Three places, each with one job: Today (what to do now), Sounds (play one, nothing else),
 * Progress (the program path, practice and the pain record). Settings sits behind the gear on
 * Today. Four tabs and a You page made people ask where to start.
 */
export default function TabsLayout() {
  const color = useColors();
  const { prefs } = useData();
  if (!prefs.onboarded) return <Redirect href="/onboarding" />;
  return (
    <NativeTabs tintColor={color.text} iconColor={{ default: color.textTertiary, selected: color.text }} labelStyle={{ color: color.textTertiary }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'circle.circle', selected: 'circle.circle.fill' }} md="radio_button_checked" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sounds">
        <NativeTabs.Trigger.Label>Sounds</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'leaf', selected: 'leaf.fill' }} md="eco" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="bar_chart" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
