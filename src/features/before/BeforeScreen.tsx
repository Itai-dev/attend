import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_VOICES, hasRemote } from '@/config';
import { useData } from '@/data/store';
import { currentTz, dayKey, WHERE_REGIONS } from '@/domain/checkin';
import { programDay } from '@/domain/program';
import { REGIONS } from '@/domain/regions';
import { backgroundFor, soundscape, SOUNDSCAPES } from '@/domain/soundscapes';
import type { Place } from '@/domain/types';
import { ChoiceRow, DisclosureRow, haptic, Hairline, IconButton, PrimaryButton, RowGroup, SectionLabel, Txt } from '@/design/components';
import { radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { SESSION_LENGTHS, type SessionLength } from '@/engine/phases';
import { previewVoice, stopPreview } from '@/voice/voicePreview';
import { Photo } from '@/design/Photo';
import { dayPlan } from '../shared/start';

/**
 * Practice settings, for a program day (Today's "practice settings ›"). A settings sheet, not a
 * launcher (studio round 5): "adjust" used to start the practice from here, which skipped the
 * lesson without saying so, and closing it lost what was changed. Now every choice saves the
 * moment it's made and "done" goes back to Today, where the day's one button still leads through
 * the lesson into the practice.
 *
 * Voice and sound are standing choices (prefs.voiceId, prefs.background, the same ones Settings
 * shows). Length and focus are for today's practice only (prefs.practiceToday, read by
 * dayPlan()): tomorrow is the program's own day again.
 *
 * The title is the day's lesson title, the one name the day has everywhere: the practice's own
 * name ("finding the place") read as a different thing from Today's "an alarm that learns".
 */

type Open = 'focus' | 'voice' | 'sound' | null;

function placeName(place: Place | null) {
  return place ? REGIONS[place.region].label.toLowerCase() : 'whole body';
}

export function BeforeScreen() {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const params = useLocalSearchParams<{ day?: string }>();
  const insets = useSafeAreaInsets();
  const { prefs, checkIns, setPrefs } = useData();
  const [open, setOpen] = useState<Open>(null);
  useEffect(() => stopPreview, []);

  const day = programDay(Number(params.day) || 1);
  // What today's practice would be now, with anything already chosen today folded in.
  const plan = dayPlan(day.day, { prefs, checkIns });
  const wholeBodyDay = plan.theme === 'open';
  const background = backgroundFor(prefs);
  const soundName = background === 'none' ? 'voice only' : (soundscape(background)?.name ?? '').toLowerCase();
  const voice = GUIDE_VOICES.find((v) => v.id === plan.voice) ?? GUIDE_VOICES[0];
  const toggle = (k: Open) => setOpen(open === k ? null : k);
  const lessonRead = !!prefs.program?.read?.includes(day.day);

  /** Today's choices, merged with what was already chosen today (a new day starts clean). */
  const setToday = (patch: { minutes?: SessionLength; place?: Place | null }) => {
    const date = dayKey(Date.now(), currentTz());
    const kept = prefs.practiceToday?.date === date ? prefs.practiceToday : undefined;
    setPrefs({ practiceToday: { ...kept, ...patch, date } });
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + space.l }]}>
      {/* Kicker left, close right: the same top bar as the lesson and the check-in. */}
      <View style={styles.top}>
        <Txt variant="footnote" tone="tertiary">
          {`day ${day.day} · practice settings`}
        </Txt>
        <IconButton icon="xmark" label="Close" onPress={() => router.back()} tint={color.textSecondary} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* The place the practice's sound comes from: changes as the sound does. */}
        <Photo scene={background === 'none' ? 'tone' : background} height={150} radius={radius.s} />
        <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.xl }}>
          {day.lesson.title}
        </Txt>
        <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
          {lessonRead ? 'Saved as you choose.' : 'Saved as you choose. The lesson still comes first.'}
        </Txt>

        <SectionLabel style={styles.section}>Today’s practice</SectionLabel>
        <RowGroup>
          <View style={styles.row}>
            <Txt variant="body" style={styles.label}>
              length
            </Txt>
            <View style={styles.lengths} accessibilityRole="radiogroup" accessibilityLabel="Length in minutes, for today">
              {SESSION_LENGTHS.map((m) => {
                const on = m === plan.minutes;
                return (
                  <Pressable
                    key={m}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${m} minutes`}
                    onPress={() => {
                      haptic('select');
                      setToday({ minutes: m });
                    }}
                    style={[styles.len, on && styles.lenOn]}
                  >
                    <Txt variant="callout" tone={on ? 'inverse' : 'secondary'} style={{ fontWeight: '600' }}>
                      {String(m)}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Hairline />
          {wholeBodyDay ? (
            // Today's practice is about the body as a whole; there is no one place to choose.
            <DisclosureRow label="focus on" value="whole body" />
          ) : (
            <DisclosureRow label="focus on" value={placeName(plan.place)} open={open === 'focus'} onPress={() => toggle('focus')} />
          )}
          {open === 'focus' && !wholeBodyDay ? (
            <View style={styles.chipsWrap}>
              <Txt variant="footnote" tone="tertiary" style={{ marginBottom: space.s }}>
                Pick the main one.
              </Txt>
              <View style={styles.chips} accessibilityRole="radiogroup">
                {WHERE_REGIONS.map((r) => {
                  const on = r === 'whole_body' ? !plan.place : plan.place?.region === r;
                  return (
                    <Pressable
                      key={r}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      onPress={() => {
                        haptic('select');
                        setToday({ place: r === 'whole_body' ? null : { region: r } });
                        setOpen(null);
                      }}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Txt variant="callout" tone={on ? 'inverse' : 'primary'}>
                        {REGIONS[r].label.toLowerCase()}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </RowGroup>
        <Txt variant="footnote" tone="tertiary" style={styles.note}>
          Length and focus are for today. Tomorrow starts from the program again.
        </Txt>

        <SectionLabel style={styles.section}>Every practice</SectionLabel>
        <RowGroup>
          <DisclosureRow label="guide voice" value={voice.name.toLowerCase()} open={open === 'voice'} onPress={() => toggle('voice')} />
          {open === 'voice'
            ? GUIDE_VOICES.map((v) => (
                <View key={v.id}>
                  <Hairline />
                  <ChoiceRow
                    label={v.name}
                    detail={v.detail}
                    selected={v.id === voice.id}
                    onPress={() => {
                      setPrefs({ voiceId: v.id });
                      if (hasRemote) previewVoice(v.id);
                    }}
                  />
                </View>
              ))
            : null}
          <Hairline />
          <DisclosureRow label="sound under practice" value={soundName} open={open === 'sound'} onPress={() => toggle('sound')} />
          {open === 'sound' ? (
            <>
              {SOUNDSCAPES.map((sc) => (
                <View key={sc.id}>
                  <Hairline />
                  <ChoiceRow label={sc.name} detail={sc.line} selected={background === sc.id} onPress={() => setPrefs({ background: sc.id })} />
                </View>
              ))}
              <Hairline />
              <ChoiceRow label="Voice only" detail="Only the guide’s voice" selected={background === 'none'} onPress={() => setPrefs({ background: 'none' })} />
            </>
          ) : null}
        </RowGroup>
        <Txt variant="footnote" tone="tertiary" style={styles.note}>
          Voice and sound stay until you change them, here or in Settings.
        </Txt>
      </ScrollView>

      <View style={{ paddingHorizontal: space.xl }}>
        {/* Back to Today, never into the practice: the day's button there leads through the lesson. */}
        <PrimaryButton label="done" detail={`${plan.minutes} min · ${placeName(plan.place)} · ${voice.name.toLowerCase()}`} onPress={() => router.back()} />
      </View>
    </View>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: color.bg },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.xl, paddingRight: space.s, paddingTop: space.m },
    body: { padding: space.xl, paddingTop: space.s },
    section: { marginTop: space.xl },
    row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.l },
    label: { textTransform: 'lowercase' },
    note: { marginTop: space.s, paddingHorizontal: space.xs },
    chipsWrap: { padding: space.l, paddingTop: 0 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
    // One answer, so a radio-like pill without the multi-select dot (round 5: chips read as multi-select).
    chip: { minHeight: 40, paddingHorizontal: space.m, justifyContent: 'center', borderRadius: radius.s, borderWidth: 1, borderColor: color.hairline, backgroundColor: color.surface },
    chipOn: { backgroundColor: color.accent, borderColor: color.accent },
    // Nearly square, like every other control (Daisy), and 44pt with the frame around it.
    lengths: { flexDirection: 'row', gap: 2, padding: 2, borderRadius: radius.s, backgroundColor: color.surfaceStrong },
    len: { minWidth: 44, minHeight: 40, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
    lenOn: { backgroundColor: color.text },
  });
