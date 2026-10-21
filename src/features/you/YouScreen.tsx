import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ArtKey } from '@/design/art';
import { useData } from '@/data/store';
import { Icon, Txt } from '@/design/components';
import { CoverArt, ListRow, RowIcon } from '@/design/media';
import { color, space } from '@/design/theme';

/**
 * You: a library of what is yours. The body map and journey (from conversational sessions),
 * the welcome again (to change the place, goal or practice time), and settings.
 */

function Art({ art, icon, seed }: { art: ArtKey; icon: string; seed: number }) {
  return (
    <CoverArt art={art} size={56} seed={seed} rounded={4}>
      <View style={styles.artIcon}>
        <Icon name={icon} size={22} tint={color.text} />
      </View>
    </CoverArt>
  );
}

export function YouScreen() {
  const { prefs, setPrefs } = useData();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ paddingTop: insets.top + space.l, paddingBottom: insets.bottom + 120 }}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Icon name="person.fill" size={16} tint={color.onAccent} />
        </View>
        <Txt variant="display" accessibilityRole="header" style={{ flex: 1 }}>
          You
        </Txt>
      </View>
      {prefs.goal ? (
        <Txt variant="footnote" tone="secondary" style={styles.goal}>
          Practising toward {prefs.goal.toLowerCase()}
        </Txt>
      ) : null}

      <View style={{ marginTop: space.l }}>
        <ListRow
          leading={<Art art="teal" icon="figure.stand" seed={3} />}
          title="Body"
          subtitle="A map of what you’ve described"
          onPress={() => router.push('/body')}
        />
        <ListRow
          leading={<Art art="violet" icon="point.topleft.down.curvedto.point.bottomright.up" seed={5} />}
          title="Journey"
          subtitle="How it has moved and changed, in your words"
          onPress={() => router.push('/journey')}
        />
        <ListRow
          leading={<Art art="amber" icon="waveform" seed={9} />}
          title="Your plan"
          subtitle="Where it hurts, your goal, your practice time"
          onPress={() => setPrefs({ onboarded: false })}
        />
        <ListRow
          leading={<RowIcon name="gearshape" size={56} tint={color.textSecondary} />}
          title="Settings"
          subtitle="Reminder, background sound, privacy"
          onPress={() => router.push('/settings')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.l },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  goal: { paddingHorizontal: space.l, marginTop: space.s },
  artIcon: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
