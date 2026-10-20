import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_VOICES, hasRemote } from '@/config';
import { useData } from '@/data/store';
import { currentTz, dayKey, WHERE_REGIONS } from '@/domain/checkin';
import { programDay } from '@/domain/program';
import { REGIONS } from '@/domain/regions';
import { backgroundFor, backgroundLabel, soundForPractice } from '@/domain/soundscapes';
import type { Place } from '@/domain/types';
import { ChoiceRow, DisclosureRow, haptic, Hairline, IconButton, PrimaryButton, RowGroup, SectionLabel, Txt } from '@/design/components';
import { radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { SESSION_LENGTHS, type SessionLength } from '@/engine/phases';
import { previewVoice, stopPreview } from '@/voice/voicePreview';
import { Photo } from '@/design/Photo';
import { SoundChoices } from '../shared/SoundChoices';
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
 * dayPlan()): tomorrow is the program's own day again — unless "keep this length every day" is
 * on, which makes the length a standing one (prefs.practiceLength, Settings → length). Someone
 * who only ever has five minutes was changing it every day (round 5 retest).
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
  const practice = { type: day.practice.sessionType, theme: day.practice.theme };
  const soundName = backgroundLabel(background, practice);
  const voice = GUIDE_VOICES.find((v) => v.id === plan.voice) ?? GUIDE_VOICES[0];
  const toggle = (k: Open) => setOpen(open === k ? null : k);
  const lessonRead = !!prefs.program?.read?.includes(day.day);

  const keep = prefs.practiceLength !== undefined;
  /** What was chosen for today, if it was chosen today. */
  const todays = () => {
    const date = dayKey(Date.now(), currentTz());
    return { date, kept: prefs.practiceToday?.date === date ? prefs.practiceToday : undefined };
  };
  /**
   * While "keep" is on a length is the standing one, and today's own length is cleared so it
   * can't shadow it. Otherwise it is today's only.
   */
  const setLength = (m: SessionLength) => {
    if (!keep) return setToday({ minutes: m });
    const { kept } = todays();
    setPrefs({ practiceLength: m, practiceToday: kept ? { ...kept, minutes: undefined } : undefined });
  };
  /** On: the length shown now, every day. Off: back to the program, with today's length kept for today. */
  const setKeep = (on: boolean) => {
    haptic('select');
    const { date, kept } = todays();
    if (on) setPrefs({ practiceLength: plan.minutes, practiceToday: kept ? { ...kept, minutes: undefined } : undefined });
    else setPrefs({ practiceLength: undefined, practiceToday: { ...kept, minutes: plan.minutes, date } });
  };

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
        <Photo scene={plan.background === 'none' ? 'fog' : plan.background} height={150} radius={radius.s} />
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
            <View style={styles.lengths} accessibilityRole="radiogroup" accessibilityLabel={keep ? 'Length in minutes, every day' : 'Length in minutes, for today'}>
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
                      setLength(m);
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
          {/* Quiet, under the lengths: makes today's length the standing one (Settings → length). */}
          <View style={styles.row}>
            <Txt variant="callout" tone="secondary" style={[styles.label, { flex: 1 }]}>
              keep this length every day
            </Txt>
            <Switch value={keep} onValueChange={setKeep} trackColor={{ true: color.practice }} accessibilityLabel="Keep this length every day" />
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
          {keep ? 'This length stays every day. Focus is for today.' : 'Length and focus are for today. Tomorrow starts from the program again.'}
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
          {/* "sound", not "sound under practice": with "matched · 432 Hz" beside it the long label
            wrapped and the value was cut off. VoiceOver still hears the whole of it. */}
          <DisclosureRow
            label="sound"
            value={soundName}
            accessibilityLabel={`Sound under practice: ${soundName.replace(' · ', ' to the practice, today ')}`}
            open={open === 'sound'}
            onPress={() => toggle('sound')}
          />
          {open === 'sound' ? (
            <SoundChoices selected={background} today={soundForPractice(practice)} onChoose={(b) => setPrefs({ background: b })} />
          ) : null}
        </RowGroup>
        <Txt variant="footnote" tone="tertiary" style={styles.note}>
          Voice and sound stay until you change them, here or in Settings.
        </Txt>
      </ScrollView>

      <View style={{ paddingHorizontal: space.xl }}>
        {/* Back to Today, never into the practice: the day's button there leads through the lesson. */}
        {/* Length and focus only: a voice's name at the end ("· river") read as one more sound. */}
        <PrimaryButton label="done" detail={`${plan.minutes} min · ${placeName(plan.place)}`} onPress={() => router.back()} />
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
