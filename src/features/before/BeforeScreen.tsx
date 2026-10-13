import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_VOICES, hasRemote } from '@/config';
import { useData } from '@/data/store';
import { latestPlace, WHERE_REGIONS } from '@/domain/checkin';
import { presetById } from '@/domain/presets';
import { programDay, type PracticeTheme } from '@/domain/program';
import { REGIONS } from '@/domain/regions';
import type { Place, SessionType } from '@/domain/types';
import { Chip, haptic, IconButton, PrimaryButton, Txt } from '@/design/components';
import { color, HIT, radius, space } from '@/design/theme';
import { SESSION_LENGTHS, type SessionLength } from '@/engine/phases';
import { previewVoice, stopPreview } from '@/voice/voicePreview';
import { BreathingField } from '@/viz/BreathingField';

/**
 * Before a session: everything decided with the eyes open, so nothing needs deciding once
 * they close. Where attention will rest (from the latest check-in or onboarding, changeable),
 * how long, which voice. Then one button.
 */

const BLURB: Record<PracticeTheme, string> = {
  settle: 'Arriving in the body, with nothing to fix.',
  locate: 'Finding where a sensation is clearest, without judging it.',
  breath: 'Letting the breath move around the sensation.',
  edges: 'Noticing where a sensation begins, and where it fades.',
  moves: 'Watching whether a sensation stays, drifts or pulses.',
  texture: 'Describing its texture instead of judging it.',
  curious: 'Meeting it with curiosity, the way you’d watch a cloud.',
  brace: 'Noticing bracing, and letting it go where it can.',
  fear: 'Letting fear and the sensation sit side by side.',
  urge: 'Letting the urge to fix rise and pass.',
  kind: 'Trying a kinder tone with yourself.',
  pleasant: 'Resting on what feels easy, too.',
  activity: 'Preparing for a small step toward your goal.',
  flare: 'Something short and steady for when it’s loud.',
  open: 'Resting with the body as a whole.',
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function BeforeScreen() {
  const params = useLocalSearchParams<{ day?: string; preset?: string }>();
  const insets = useSafeAreaInsets();
  const { prefs, checkIns, setPrefs } = useData();
  useEffect(() => stopPreview, []);

  const plan = useMemo(() => {
    const preset = presetById(params.preset);
    if (preset) {
      const theme: PracticeTheme = preset.type === 'flare' ? 'flare' : preset.type === 'fear' ? 'fear' : preset.type === 'sleep' ? 'open' : 'curious';
      return { title: preset.title, kicker: 'ANY TIME', theme, type: preset.type as SessionType, minutes: preset.minutes as SessionLength, voice: preset.voiceId, day: undefined };
    }
    const d = programDay(Number(params.day) || 1);
    return {
      title: d.practice.title,
      kicker: `DAY ${d.day} · WEEK ${d.week}`,
      theme: d.practice.theme,
      type: d.practice.sessionType,
      minutes: d.practice.minutes as SessionLength,
      voice: prefs.voiceId ?? GUIDE_VOICES[0].id,
      day: d.day,
    };
  }, [params.day, params.preset, prefs.voiceId]);

  const known = latestPlace(checkIns) ?? prefs.place;
  const [place, setPlace] = useState<Place | null>(plan.theme === 'open' ? null : (known ?? null));
  const [choosing, setChoosing] = useState(false);
  const [minutes, setMinutes] = useState<SessionLength>(plan.minutes);
  const [voice, setVoice] = useState(plan.voice);
  const voiceName = GUIDE_VOICES.find((v) => v.id === voice)?.name ?? GUIDE_VOICES[0].name;

  const begin = () => {
    stopPreview();
    if (plan.day && voice !== prefs.voiceId) setPrefs({ voiceId: voice });
    router.replace({
      pathname: '/session',
      params: {
        type: plan.type,
        minutes: String(minutes),
        voice,
        theme: plan.theme,
        ...(plan.day ? { day: String(plan.day) } : {}),
        place: place ? JSON.stringify(place) : 'none',
      },
    });
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + space.l }]}>
      <View style={styles.top}>
        <IconButton icon="xmark" label="Close" onPress={() => router.back()} tint={color.textSecondary} />
        <Txt variant="footnote" tone="tertiary">
          {plan.kicker}
        </Txt>
        <View style={{ width: HIT }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={{ alignItems: 'center' }}>
          <BreathingField width={170} height={170} mode="idle" dim={0.85} />
        </View>
        <Txt variant="title" align="center" style={{ marginTop: space.s }}>
          {plan.title}
        </Txt>
        <Txt variant="callout" tone="secondary" align="center" style={{ marginTop: space.s }}>
          {BLURB[plan.theme]} Nothing to answer. Just listen.
        </Txt>

        <View style={styles.group}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Rests on ${place ? REGIONS[place.region].label : 'the whole body'}. Change`}
            onPress={() => setChoosing(!choosing)}
            style={styles.row}
          >
            <Txt variant="body">Rests on</Txt>
            <Txt variant="body" tone="secondary">
              {place ? cap(REGIONS[place.region].label) : 'Whole body'} ›
            </Txt>
          </Pressable>
          {choosing ? (
            <View style={styles.chips}>
              {WHERE_REGIONS.map((r) => {
                const on = r === 'whole_body' ? !place : place?.region === r;
                return (
                  <Chip
                    key={r}
                    label={cap(REGIONS[r].label)}
                    selected={on}
                    onPress={() => {
                      setPlace(r === 'whole_body' ? null : { region: r });
                      setChoosing(false);
                    }}
                  />
                );
              })}
            </View>
          ) : null}
          <View style={styles.hair} />
          <View style={styles.row}>
            <Txt variant="body">Length</Txt>
            <View style={styles.lengths} accessibilityRole="radiogroup" accessibilityLabel="Length in minutes">
              {SESSION_LENGTHS.map((m) => (
                <Pressable
                  key={m}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: m === minutes }}
                  accessibilityLabel={`${m} minutes`}
                  onPress={() => {
                    haptic('select');
                    setMinutes(m);
                  }}
                  style={[styles.len, m === minutes && styles.lenOn]}
                >
                  <Txt variant="callout" tone={m === minutes ? 'inverse' : 'secondary'} style={{ fontWeight: '600' }}>
                    {String(m)}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.hair} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Voice: ${voiceName}. Tap for the next voice`}
            onPress={() => {
              const i = GUIDE_VOICES.findIndex((v) => v.id === voice);
              const next = GUIDE_VOICES[(i + 1) % GUIDE_VOICES.length];
              setVoice(next.id);
              if (hasRemote) previewVoice(next.id);
            }}
            style={styles.row}
          >
            <Txt variant="body">Voice</Txt>
            <Txt variant="body" tone="secondary">
              {voiceName} ›
            </Txt>
          </Pressable>
        </View>

        <Txt variant="footnote" tone="tertiary" align="center" style={{ marginTop: space.l }}>
          Headphones on · Sit or lie down · Eyes closed
        </Txt>
      </ScrollView>

      <View style={{ paddingHorizontal: space.xl }}>
        <PrimaryButton label="Begin" detail={`${minutes} minutes`} onPress={begin} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.s, paddingTop: space.m },
  body: { padding: space.xl, paddingTop: space.s },
  group: {
    marginTop: space.xl,
    borderRadius: radius.m,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.l },
  hair: { height: StyleSheet.hairlineWidth, backgroundColor: color.hairline, marginHorizontal: space.l },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, padding: space.l, paddingTop: 0 },
  lengths: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: radius.pill, backgroundColor: color.surfaceStrong },
  len: { minWidth: 46, minHeight: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  lenOn: { backgroundColor: color.text },
});
