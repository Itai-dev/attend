import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { soundFor, timerLabel } from '@/domain/sounds';
import { Card, Icon, Txt } from '@/design/components';
import { color, radius, space } from '@/design/theme';
import { useListen } from '@/voice/listen';

/** The way into Just listen, on Today and under Program's any-time sessions. Says what is playing, if anything. */
export function ListenCard() {
  const live = useListen();
  const playing = live.id ? soundFor(live.id) : undefined;
  const detail = playing ? `${playing.name} · ${live.playing ? timerLabel(live.timer, live.timerElapsedMs) : 'paused'}` : 'A stream, waves, rain or wind. No voice.';
  return (
    <Card label={`Just listen. ${detail}`} onPress={() => router.push('/listen')} style={styles.card}>
      <View style={styles.icon}>
        <Icon name="water.waves" size={17} tint={color.practice} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="headline">Just listen</Txt>
        <Txt variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
          {detail}
        </Txt>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, borderRadius: radius.l },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: color.practiceSoft },
});
