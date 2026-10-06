import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useData } from '@/data/store';
import { Card, Icon, TitledScroll, Txt } from '@/design/components';
import { color, space } from '@/design/theme';

/**
 * You: the places that are about the person rather than a session — the body map and the
 * journey built from their own words — plus the welcome (to change focus, length or voice)
 * and settings. Nothing here counts anything.
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
        <Place title="Your session" detail="Change what it’s for, its length and voice" icon="waveform" onPress={() => setPrefs({ onboarded: false })} />
        <Place title="Settings" detail="Background sound, privacy, about" icon="gearshape" onPress={() => router.push('/settings')} />
      </View>
    </TitledScroll>
  );
}

const styles = StyleSheet.create({
  place: { flexDirection: 'row', alignItems: 'center', gap: space.l, padding: space.l, minHeight: 72 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.surfaceStrong, alignItems: 'center', justifyContent: 'center' },
});
