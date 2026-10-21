import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_VOICES, hasRemote } from '@/config';
import { useData } from '@/data/store';
import { latestPlace, WHERE_REGIONS } from '@/domain/checkin';
import { presetById, PRESETS, voiceFor } from '@/domain/presets';
import { programDay, WEEKS, type PracticeTheme } from '@/domain/program';
import { REGIONS } from '@/domain/regions';
import type { Place, SessionType } from '@/domain/types';
import { CATEGORY_ART, WEEK_ART, type ArtKey } from '@/design/art';
import { haptic, IconButton, Txt } from '@/design/components';
import { CoverArt, HeaderGradient, ListRow, Pill, PlayButton } from '@/design/media';
import { color, HIT, radius, space } from '@/design/theme';
import { SESSION_LENGTHS, type SessionLength } from '@/engine/phases';
import { previewVoice, stopPreview } from '@/voice/voicePreview';
import { DayCover } from '../home/HomeScreen';

/**
 * Before a session: everything decided with the eyes open, so nothing needs deciding once
 * they close. Laid out like an episode page in a listening app: the cover, the title, what
 * it is, one play button, then the options (where attention rests, how long, which voice).
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

const ART_SIZE = 240;

export function BeforeScreen() {
  const params = useLocalSearchParams<{ day?: string; preset?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { prefs, checkIns, setPrefs } = useData();
  useEffect(() => stopPreview, []);

  const plan = useMemo(() => {
    const preset = presetById(params.preset);
    if (preset) {
      const theme: PracticeTheme = preset.type === 'flare' ? 'flare' : preset.type === 'fear' ? 'fear' : preset.type === 'sleep' ? 'open' : 'curious';
      return {
        title: preset.title,
        kicker: 'ANY TIME',
        meta: 'Any time',
        art: CATEGORY_ART[preset.category] as ArtKey,
        seed: PRESETS.indexOf(preset) + 11,
        theme,
        type: preset.type as SessionType,
        minutes: preset.minutes as SessionLength,
        voice: voiceFor(preset.type, prefs.voices),
        day: undefined,
      };
    }
    const d = programDay(Number(params.day) || 1);
    return {
      title: d.practice.title,
      kicker: `DAY ${d.day} · WEEK ${d.week}`,
      meta: `Day ${d.day} · Week ${d.week} · ${WEEKS[d.week].name}`,
      art: WEEK_ART[d.week],
      seed: d.day,
      theme: d.practice.theme,
      type: d.practice.sessionType,
      minutes: d.practice.minutes as SessionLength,
      voice: voiceFor(d.practice.sessionType, prefs.voices),
      day: d.day,
    };
  }, [params.day, params.preset, prefs.voices]);

  const known = latestPlace(checkIns) ?? prefs.place;
  const [place, setPlace] = useState<Place | null>(plan.theme === 'open' ? null : (known ?? null));
  const [choosing, setChoosing] = useState(false);
  const [minutes, setMinutes] = useState<SessionLength>(plan.minutes);
  const [voice, setVoice] = useState(plan.voice);
  const voiceName = GUIDE_VOICES.find((v) => v.id === voice)?.name ?? GUIDE_VOICES[0].name;

  const begin = () => {
    stopPreview();
    // Kept only when the person picked another voice here, and only for this kind of session.
    if (voice !== plan.voice) setPrefs({ voices: { ...prefs.voices, [plan.type]: voice } });
    router.replace({
      pathname: '/session',
      params: {
        type: plan.type,
        minutes: String(minutes),
        voice,
        theme: plan.theme,
        title: plan.title,
        ...(plan.day ? { day: String(plan.day) } : {}),
        place: place ? JSON.stringify(place) : 'none',
      },
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
        <HeaderGradient art={plan.art} width={width} height={insets.top + ART_SIZE + 160} />
        <View style={[styles.top, { paddingTop: insets.top + space.s }]}>
          <IconButton icon="xmark" label="Close" onPress={() => router.back()} tint={color.text} />
          <Txt variant="caption" tone="secondary" style={{ letterSpacing: 1.4 }}>
            {plan.kicker}
          </Txt>
          <View style={{ width: HIT }} />
        </View>

        <View style={styles.cover}>
          {/* A program day wears the same numbered cover it has on Today; an any-time session its own. */}
          <View style={styles.coverShadow}>
            {plan.day ? <DayCover day={plan.day} week={programDay(plan.day).week} size={ART_SIZE} /> : <CoverArt art={plan.art} seed={plan.seed} size={ART_SIZE} />}
          </View>
        </View>

        <View style={styles.body}>
          <Txt variant="title" accessibilityRole="header">
            {plan.title}
          </Txt>
          <Txt variant="footnote" tone="secondary" style={{ marginTop: space.xs, fontWeight: '600' }}>
            {plan.meta}
          </Txt>
          <Txt variant="callout" tone="secondary" style={{ marginTop: space.m }}>
            {BLURB[plan.theme]} Nothing to answer. Just listen.
          </Txt>

          <View style={styles.action}>
            <View style={{ flex: 1 }}>
              <Txt variant="footnote" tone="secondary">
                {minutes} min · {voiceName}
              </Txt>
              <Txt variant="footnote" tone="tertiary" style={{ marginTop: 2 }}>
                Headphones on · Sit or lie down · Eyes closed
              </Txt>
            </View>
            <PlayButton label={`Begin. ${minutes} minutes`} onPress={begin} size={56} />
          </View>
        </View>

        <View style={styles.options}>
          <ListRow
            title="Rests on"
            label={`Rests on ${place ? REGIONS[place.region].label : 'the whole body'}. Change`}
            onPress={() => setChoosing(!choosing)}
            right={
              <Txt variant="callout" tone="secondary">
                {place ? cap(REGIONS[place.region].label) : 'Whole body'} ›
              </Txt>
            }
          />
          {choosing ? (
            <View style={styles.chips}>
              {WHERE_REGIONS.map((r) => {
                const on = r === 'whole_body' ? !place : place?.region === r;
                return (
                  <Pill
                    key={r}
                    label={cap(REGIONS[r].label)}
                    on={on}
                    onPress={() => {
                      setPlace(r === 'whole_body' ? null : { region: r });
                      setChoosing(false);
                    }}
                  />
                );
              })}
            </View>
          ) : null}
          <View style={styles.lengthRow}>
            <Txt variant="body" style={{ fontWeight: '500', flex: 1 }}>
              Length
            </Txt>
            <View style={styles.lengths} accessibilityRole="radiogroup" accessibilityLabel="Length in minutes">
              {SESSION_LENGTHS.map((m) => (
                <Pressable
                  key={m}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: m === minutes }}
                  accessibilityLabel={`${m} minutes`}
                  hitSlop={4}
                  onPress={() => {
                    haptic('select');
                    setMinutes(m);
                  }}
                  style={[styles.len, m === minutes && styles.lenOn]}
                >
                  <Txt variant="footnote" style={{ fontWeight: '700', color: m === minutes ? color.onAccent : color.text }}>
                    {String(m)}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
          <ListRow
            title="Voice"
            label={`Voice: ${voiceName}. Tap for the next voice`}
            onPress={() => {
              const i = GUIDE_VOICES.findIndex((v) => v.id === voice);
              const next = GUIDE_VOICES[(i + 1) % GUIDE_VOICES.length];
              setVoice(next.id);
              if (hasRemote) previewVoice(next.id);
            }}
            right={
              <Txt variant="callout" tone="secondary">
                {voiceName} ›
              </Txt>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.s },
  cover: { alignItems: 'center', marginTop: space.l },
  coverShadow: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  body: { paddingHorizontal: space.l, marginTop: space.xl },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.l },
  options: { marginTop: space.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.hairline, paddingTop: space.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, paddingHorizontal: space.l, paddingBottom: space.m },
  lengthRow: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: space.l },
  lengths: { flexDirection: 'row', gap: space.s },
  len: { minWidth: 44, minHeight: 32, paddingHorizontal: space.s, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceStrong },
  lenOn: { backgroundColor: color.accent },
});
