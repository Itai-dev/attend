import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useData } from '@/data/store';
import { Card, Icon, TitledScroll, Txt } from '@/design/components';
import { color, space } from '@/design/theme';

/**
 * You: the body map and journey (from conversational sessions), the welcome again (to change
 * the place, goal or practice time), and settings.
 */

function Place({ title, detail, icon, onPress }: { title: string; detail: string; icon: string; onPress: () => void }) {
  return (
    <Card label={`${title}. ${detail}`} onPress={onPress} style={styles.place}>
      <View style={styles.icon}>
        <Icon name={icon} size={18} tint={color.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="headline">{title}</Txt>
        <Txt variant="footnote" tone="tertiary">
          {detail}
        </Txt>
      </View>
      <Icon name="chevron.right" size={14} tint={color.textTertiary} />
    </Card>
  );
}

export function YouScreen() {
  const { setPrefs } = useData();
  return (
    <TitledScroll title="You">
      <View style={{ gap: space.m }}>
        <Place title="Body" detail="A map of what you’ve described" icon="figure.stand" onPress={() => router.push('/body')} />
        <Place title="Journey" detail="How it has moved and changed, in your words" icon="point.topleft.down.curvedto.point.bottomright.up" onPress={() => router.push('/journey')} />
      </View>
      <View style={{ gap: space.m, marginTop: space.xxl }}>
        <Place title="Your plan" detail="Where it hurts, your goal, your practice time" icon="waveform" onPress={() => setPrefs({ onboarded: false })} />
        <Place title="Settings" detail="Reminder, background sound, privacy" icon="gearshape" onPress={() => router.push('/settings')} />
      </View>
    </TitledScroll>
  );
}

const styles = StyleSheet.create({
  place: { flexDirection: 'row', alignItems: 'center', gap: space.l, padding: space.l, minHeight: 72 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.surfaceStrong, alignItems: 'center', justifyContent: 'center' },
});
