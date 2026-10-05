import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { analyzeJourney } from '@/domain/journey';
import { haptic, IconButton, Txt } from '@/design/components';
import { color, HIT, space } from '@/design/theme';
import { DEFAULT_LENGTH, SESSION_LENGTHS, type SessionLength } from '@/engine/phases';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { BreathingField } from '@/viz/BreathingField';

/**
 * The app is the session. Opening it shows only what's needed to begin: the breathing field,
 * one word, and how long. No session types to choose — the guide adapts to a flare or a worry
 * from what the person says. Everything gathered so far waits quietly behind "Lately".
 */

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { sessions, prefs, setPrefs } = useData();
  const { warm } = useVoiceSession();
  const minutes: SessionLength = prefs.sessionMinutes ?? DEFAULT_LENGTH;
  const lately = useMemo(() => analyzeJourney(sessions).insights[0]?.homeLine, [sessions]);

  // Ready the session while the person is still here, so Begin goes straight into the first words.
  useEffect(() => warm('notice'), [prefs.voiceId, warm]);

  const begin = () => {
    haptic('soft');
    router.push({ pathname: '/session', params: { type: 'notice', minutes: String(minutes) } });
  };

  return (
    <View style={styles.root}>
      <BreathingField width={width} height={height} mode="idle" dim={0.9} style={StyleSheet.absoluteFill} />

      <View style={[styles.top, { paddingTop: insets.top + space.s }]}>
        <IconButton icon="gearshape" label="Settings" onPress={() => router.push('/settings')} tint={color.textTertiary} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Begin a ${minutes} minute session`}
        accessibilityHint="Eyes closed. The guide speaks and listens."
        onPress={begin}
        // Pressed dimming lives here, not on the fading-in view: a layout animation and a style
        // that both drive opacity crash Reanimated on web.
        style={({ pressed }) => [styles.center, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Animated.View entering={FadeIn.duration(1400)} style={{ alignItems: 'center' }}>
          <Txt variant="display" style={{ fontSize: 44, lineHeight: 50 }}>
            Begin
          </Txt>
          <Txt variant="callout" tone="tertiary" style={{ marginTop: space.s }}>
            Eyes closed. Just talk.
          </Txt>
        </Animated.View>
      </Pressable>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.l }]}>
        <View style={styles.lengths} accessibilityRole="radiogroup" accessibilityLabel="Session length">
          {SESSION_LENGTHS.map((m) => {
            const selected = m === minutes;
            return (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${m} minutes`}
                hitSlop={8}
                onPress={() => {
                  if (selected) return;
                  haptic('select');
                  setPrefs({ sessionMinutes: m });
                }}
                style={styles.length}
              >
                <Txt variant="callout" tone={selected ? 'primary' : 'tertiary'} style={{ fontWeight: selected ? '500' : '400' }}>
                  {m} min
                </Txt>
              </Pressable>
            );
          })}
        </View>

        {sessions.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={lately ? `Lately: ${lately}` : 'Lately'}
            onPress={() => router.push('/lately')}
            style={({ pressed }) => [styles.lately, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Txt variant="footnote" tone="tertiary" align="center" numberOfLines={2}>
              {lately ?? 'Lately'}
            </Txt>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.l },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { alignItems: 'center', paddingHorizontal: space.xl, gap: space.l },
  lengths: { flexDirection: 'row', gap: space.xl },
  length: { minHeight: HIT, minWidth: HIT, alignItems: 'center', justifyContent: 'center' },
  lately: { minHeight: HIT, justifyContent: 'center', maxWidth: 320 },
});
