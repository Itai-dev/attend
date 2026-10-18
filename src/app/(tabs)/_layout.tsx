import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useData } from '@/data/store';
import { type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';

/** Four places: Today (the day's lesson and practice), Program (the 28 days and any-time sessions), Progress (practice and the pain record), You. */
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
      <NativeTabs.Trigger name="program">
        <NativeTabs.Trigger.Label>Program</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'point.topleft.down.to.point.bottomright.curvepath', selected: 'point.topleft.down.to.point.bottomright.curvepath.fill' }} md="route" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="bar_chart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
