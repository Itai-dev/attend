import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { analyzeJourney } from '@/domain/journey';
import { PRESETS, recommendedPreset } from '@/domain/presets';
import { Card, haptic, PrimaryButton, SectionLabel, Txt } from '@/design/components';
import { color, HIT, radius, space } from '@/design/theme';
import { DEFAULT_LENGTH, SESSION_LENGTHS, type SessionLength } from '@/engine/phases';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { BreathingField } from '@/viz/BreathingField';
import { greeting } from '../shared/format';
import { PresetCard, startPreset } from '../shared/PresetCard';

/**
 * Today. One clear thing to do: begin the session set up in the welcome. Its length can
 * change here; everything else was decided with the eyes open, so nothing needs deciding
 * once they close. Below it, a few other ready sessions and — if Journey has found
 * something — one sentence about lately. No numbers, no streaks.
 */

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { sessions, prefs, setPrefs } = useData();
  const minutes: SessionLength = prefs.sessionMinutes ?? DEFAULT_LENGTH;
  const yours = useMemo(() => recommendedPreset({ focus: prefs.focus, minutes, voiceId: prefs.voiceId }), [prefs.focus, prefs.voiceId, minutes]);
  const more = useMemo(
    () => [...PRESETS.filter((p) => p.type === yours.type && p.id !== yours.id), ...PRESETS.filter((p) => p.type !== yours.type)].slice(0, 3),
    [yours],
  );
  const { warm } = useVoiceSession();
  // Ready the session while the person is still looking at Today, so Begin goes straight into the guide's first words.
  useEffect(() => warm(yours.type, yours.voiceId), [yours.type, yours.voiceId, warm]);
  const lately = useMemo(() => analyzeJourney(sessions).insights[0]?.homeLine, [sessions]);
  const orb = Math.min(width - space.xl * 4, 220);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.l, paddingBottom: insets.bottom + 120, paddingHorizontal: space.xl }}
    >
      <Txt variant="caption" tone="tertiary" style={styles.wordmark} accessibilityRole="header">
        ATTEND
      </Txt>
      <Txt variant="display" style={{ marginTop: space.s }}>
        {greeting()}
      </Txt>

      {/* The orb sits on the page, not in the card: the field paints its own background. */}
      <Animated.View entering={FadeIn.duration(1200)} style={{ alignItems: 'center', marginTop: space.l }}>
        <BreathingField width={orb} height={orb} mode="idle" dim={0.85} />
      </Animated.View>

      <Card style={styles.hero}>
        <Txt variant="caption" tone="tertiary" align="center" style={styles.kicker}>
          YOUR SESSION
        </Txt>
        <Txt variant="title2" align="center">
          {yours.title}
        </Txt>
        <Txt variant="callout" tone="secondary" align="center" style={{ marginTop: space.xs }}>
          {yours.voiceName}’s voice · Eyes closed. Just talk.
        </Txt>

        <View style={styles.lengths} accessibilityRole="radiogroup" accessibilityLabel="Session length">
          {SESSION_LENGTHS.map((m) => {
            const selected = m === minutes;
            return (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${m} minutes`}
                onPress={() => {
                  if (selected) return;
                  haptic('select');
                  setPrefs({ sessionMinutes: m });
                }}
                style={({ pressed }) => [styles.length, selected && styles.lengthOn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Txt variant="callout" tone={selected ? 'inverse' : 'secondary'}>
                  {m} min
                </Txt>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton label="Begin" detail={`${minutes} minutes`} onPress={() => startPreset(yours)} />
      </Card>

      {lately ? (
        <Card label="Lately. Opens Journey" onPress={() => router.push('/journey')} style={styles.lately}>
          <SectionLabel>Lately</SectionLabel>
          <Txt variant="title2" style={{ fontWeight: '300' }}>
            {lately}
          </Txt>
        </Card>
      ) : null}

      <SectionLabel style={{ marginTop: space.xxl }}>Also here</SectionLabel>
      <View style={{ gap: space.m }}>
        {more.map((p) => (
          <PresetCard key={p.id} preset={p} />
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/explore')} style={({ pressed }) => [styles.all, { opacity: pressed ? 0.6 : 1 }]}>
        <Txt variant="callout" tone="secondary">
          All sessions in Explore
        </Txt>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wordmark: { letterSpacing: 3.2, fontSize: 12 },
  hero: { marginTop: space.l, padding: space.xl },
  kicker: { letterSpacing: 1.6, marginBottom: space.xs },
  lengths: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: space.xs,
    padding: space.xs,
    marginTop: space.xl,
    marginBottom: space.l,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  length: {
    minWidth: 76,
    minHeight: HIT - 4,
    paddingHorizontal: space.l,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  lengthOn: { backgroundColor: color.text },
  lately: { marginTop: space.l, padding: space.xl },
  all: { minHeight: HIT, alignItems: 'center', justifyContent: 'center', marginTop: space.m },
});
