import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { currentTz, dayKey, WHERE_REGIONS } from '@/domain/checkin';
import { currentDay, EMPTY_PROGRAM, programDay, PROGRAM_DAYS } from '@/domain/program';
import { REGIONS } from '@/domain/regions';
import type { BodyRegion, SessionType } from '@/domain/types';
import { Chip, haptic, PrimaryButton, QuietButton, Txt, Wordmark } from '@/design/components';
import { Photo } from '@/design/Photo';
import { HIT, radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { requestReminderPermission, scheduleReminders } from '@/voice/reminders';

/**
 * The welcome, after the best of Calm and Headspace: one idea or one question per screen,
 * about a minute in all, ending in the first practice rather than in an empty home screen.
 *
 *   welcome → how it works (with the safety note) → what brings you → where → what you want
 *   back → when → your first day is ready
 *
 * Every question can be skipped. It asks for a goal, never a pain score: the pain record is
 * separate from practice and starts from Today, when the person chooses. The goal matters
 * most — it is what Week 4 brings the practice back to (docs/RESEARCH.md §4). "What brings
 * you" puts the matching any-time practice first on Today.
 */

const FOCUS: Array<{ id: SessionType; title: string; detail: string }> = [
  { id: 'notice', title: 'Pain that’s always there', detail: 'Long-standing, mostly steady' },
  { id: 'flare', title: 'Flares', detail: 'Pain that comes in waves' },
  { id: 'sleep', title: 'Nights', detail: 'Pain that keeps me awake' },
  { id: 'fear', title: 'Worry', detail: 'Not knowing what the pain means' },
];

/** On the last screen: the any-time practice that fits what brought them, named once. */
const FOCUS_TIP: Record<SessionType, string> = {
  notice: 'Any time, a 10-minute body scan is one tap away on Today.',
  flare: 'When a flare comes, “in a flare” on Today is three minutes, any time.',
  sleep: 'At night, “can’t sleep” on Today ends in rest, with no wake-up.',
  fear: 'When worry is loud, “feeling worried” on Today goes gently.',
};

const GOALS = ['Long walks', 'Playing with my kids', 'Sleeping through the night', 'A full day’s work', 'Sport', 'Time with friends'];

const TIMES = [
  { id: 'morning', label: 'Morning', hour: 8, minute: 0 },
  { id: 'midday', label: 'Midday', hour: 13, minute: 0 },
  { id: 'evening', label: 'Evening', hour: 20, minute: 30 },
] as const;

const STEPS = 7;

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hhmm(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function OnboardingScreen() {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { prefs, sessions, setPrefs } = useData();
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<SessionType | undefined>(prefs.focus);
  const [where, setWhere] = useState<BodyRegion | undefined>(prefs.place?.region);
  const [goal, setGoal] = useState<string | undefined>(prefs.goal);
  const [ownGoal, setOwnGoal] = useState(prefs.goal && !GOALS.includes(prefs.goal) ? prefs.goal : '');
  const [writing, setWriting] = useState(!!ownGoal);
  const [time, setTime] = useState<(typeof TIMES)[number]['id']>('evening');
  const [remind, setRemind] = useState(prefs.reminder?.enabled ?? true);
  const [reminderOn, setReminderOn] = useState(false);

  // Running the welcome again keeps the program where it was.
  const program = prefs.program ?? EMPTY_PROGRAM;
  const { day } = currentDay(program, dayKey(Date.now(), currentTz()));
  const first = programDay(day);
  const finalGoal = writing ? ownGoal.trim() || undefined : goal;
  const photoH = Math.round(height * 0.5);

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  // The permission prompt comes on the step that asks about reminders, where it makes sense.
  const confirmTime = async () => {
    const enabled = remind && (await requestReminderPermission());
    setReminderOn(enabled);
    next();
  };

  const finish = async (begin: boolean) => {
    const t = TIMES.find((x) => x.id === time)!;
    const reminder = { enabled: reminderOn, hour: t.hour, minute: t.minute };
    await setPrefs({
      onboarded: true,
      focus,
      goal: finalGoal,
      place: where && where !== 'whole_body' ? { region: where } : undefined,
      reminder,
      program,
    });
    const last = sessions.filter((s) => !s.isSample).map((s) => s.startedAt);
    await scheduleReminders(reminder, last.length ? Math.max(...last) : undefined, program);
    router.replace('/');
    // The first day starts now, from its lesson; Today is underneath when it ends.
    if (begin) setTimeout(() => router.push({ pathname: '/lesson/[day]', params: { day: String(day) } }), 350);
  };

  const photoStep = step === 0 || step === STEPS - 1;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + space.l }]}>
      {photoStep ? null : (
        <View style={[styles.bars, { paddingTop: insets.top + space.l }]} accessibilityLabel={`Step ${step} of ${STEPS - 2}`}>
          {Array.from({ length: STEPS - 2 }, (_, i) => (
            <View key={i} style={[styles.bar, i < step && { backgroundColor: color.text }]} />
          ))}
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, photoStep && { padding: 0, paddingTop: 0 }]}
        keyboardShouldPersistTaps="handled"
        bounces={!photoStep}
      >
        {step === 0 ? (
          <Animated.View key="0" entering={FadeIn.duration(900)}>
            <Photo scene="dawn" height={photoH} drift>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
              <View style={{ position: 'absolute', top: insets.top + space.l, left: 0, right: 0, alignItems: 'center' }}>
                <Wordmark tone="onImage" size={22} />
              </View>
            </Photo>
            <View style={styles.text}>
              <Txt variant="display" accessibilityRole="header">
                pain is real.{'\n'}how you meet it can change.
              </Txt>
              <Txt variant="body" tone="secondary" style={{ marginTop: space.l }}>
                Each day, a two-minute lesson, then a few minutes with your eyes closed while a calm voice guides you. Nothing to answer, nothing to get right.
              </Txt>
            </View>
          </Animated.View>
        ) : null}

        {step === 1 ? (
          <Animated.View key="1" entering={FadeIn.duration(600)} style={{ gap: space.xl }}>
            <Txt variant="title" accessibilityRole="header">
              how it works
            </Txt>
            {[
              ['When pain lasts, the alarm can stay on', 'The nervous system can learn to stay on guard, sometimes after an injury, sometimes with no clear start.'],
              ['Attention without alarm is a skill', 'This is called somatic tracking: noticing a sensation with curiosity rather than fear. Like any skill, it grows with use.'],
              ['A little, every day', 'A two-minute lesson, then three to ten minutes of listening, eyes closed. Nothing to answer.'],
            ].map(([title, body], i) => (
              <View key={title} style={styles.point}>
                <Txt variant="title2" tone="tertiary" style={{ width: 24 }}>
                  {String(i + 1)}
                </Txt>
                <View style={{ flex: 1, gap: space.xs }}>
                  <Txt variant="headline">{title}</Txt>
                  <Txt variant="callout" tone="secondary">
                    {body}
                  </Txt>
                </View>
              </View>
            ))}
            <View style={styles.note}>
              <Txt variant="footnote" tone="secondary">
                Attend is for pain you already know. It doesn’t diagnose, and it sits beside any treatment you have. Anything new, or different from your usual, deserves a doctor’s look first.
              </Txt>
              {/* Attention to the body doesn't suit everyone (trauma, health anxiety: Goldberg 2021); stopping must read as part of the practice. */}
              <Txt variant="footnote" tone="secondary" style={{ marginTop: space.s }}>
                Close attention to the body doesn’t suit everyone. If it brings up old memories, panic, or a far-away feeling, open your eyes, look around the room, and stop. Stopping is part of the practice.
              </Txt>
            </View>
          </Animated.View>
        ) : null}

        {step === 2 ? (
          <Animated.View key="2" entering={FadeIn.duration(600)}>
            <Txt variant="title" accessibilityRole="header">
              what brings you here?
            </Txt>
            <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
              We’ll keep the right practice close.
            </Txt>
            <View style={{ gap: space.s, marginTop: space.xl }} accessibilityRole="radiogroup">
              {FOCUS.map((f) => {
                const on = focus === f.id;
                return (
                  <Pressable
                    key={f.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${f.title}. ${f.detail}`}
                    onPress={() => {
                      haptic('select');
                      setFocus(on ? undefined : f.id);
                    }}
                    style={({ pressed }) => [styles.option, on && styles.optionOn, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Txt variant="headline" tone={on ? 'inverse' : 'primary'}>
                      {f.title}
                    </Txt>
                    <Txt variant="footnote" tone={on ? 'inverse' : 'secondary'} style={on ? { opacity: 0.75 } : undefined}>
                      {f.detail}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        {step === 3 ? (
          <Animated.View key="3" entering={FadeIn.duration(600)}>
            <Txt variant="title" accessibilityRole="header">
              where do you feel it most?
            </Txt>
            <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
              Your practice will rest there. You can change it any time.
            </Txt>
            <View style={styles.chips}>
              {WHERE_REGIONS.map((r) => (
                <Chip key={r} label={cap(REGIONS[r].label)} selected={where === r} onPress={() => setWhere(where === r ? undefined : r)} />
              ))}
            </View>
          </Animated.View>
        ) : null}

        {step === 4 ? (
          <Animated.View key="4" entering={FadeIn.duration(600)}>
            <Txt variant="title" accessibilityRole="header">
              what would you like to get back to?
            </Txt>
            <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
              Something pain has crowded out. Week 4 works toward it.
            </Txt>
            <View style={styles.chips}>
              {GOALS.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  selected={!writing && goal === g}
                  onPress={() => {
                    setWriting(false);
                    setGoal(goal === g ? undefined : g);
                  }}
                />
              ))}
              <Chip label="In my words…" selected={writing} onPress={() => setWriting(!writing)} />
            </View>
            {writing ? (
              <TextInput
                value={ownGoal}
                onChangeText={setOwnGoal}
                placeholder="Gardening on Saturdays"
                placeholderTextColor={color.textTertiary}
                accessibilityLabel="What you want to get back to"
                maxLength={60}
                autoFocus
                returnKeyType="done"
                style={styles.input}
              />
            ) : null}
          </Animated.View>
        ) : null}

        {step === 5 ? (
          <Animated.View key="5" entering={FadeIn.duration(600)}>
            <Txt variant="title" accessibilityRole="header">
              when is a quiet moment in your day?
            </Txt>
            <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
              The same time each day makes it easier. Many people like the evening.
            </Txt>
            <View style={styles.times} accessibilityRole="radiogroup">
              {TIMES.map((t) => {
                const on = time === t.id;
                return (
                  <Pressable
                    key={t.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => {
                      haptic('select');
                      setTime(t.id);
                    }}
                    style={[styles.time, on && styles.optionOn]}
                  >
                    <Txt variant="callout" tone={on ? 'inverse' : 'primary'} style={{ fontWeight: '600' }}>
                      {t.label}
                    </Txt>
                    <Txt variant="footnote" tone={on ? 'inverse' : 'tertiary'}>
                      {hhmm(t.hour, t.minute)}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.remind}>
              <View style={{ flex: 1 }}>
                <Txt variant="body">A gentle reminder</Txt>
                <Txt variant="footnote" tone="tertiary">
                  One a day, at this time. Quieter if you take a break.
                </Txt>
              </View>
              <Switch value={remind} onValueChange={setRemind} trackColor={{ true: color.practice }} accessibilityLabel="A gentle reminder" />
            </View>
          </Animated.View>
        ) : null}

        {step === 6 ? (
          <Animated.View key="6" entering={FadeIn.duration(900)}>
            <Photo scene="dusk" height={photoH} drift>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
            </Photo>
            <View style={styles.text}>
              <Txt variant="footnote" style={{ color: color.practice, fontWeight: '600' }}>
                day {day} of {PROGRAM_DAYS}
              </Txt>
              <Txt variant="display" accessibilityRole="header" style={{ marginTop: space.xs }}>
                {day === 1 ? 'your first day\nis ready.' : 'welcome back.'}
              </Txt>
              <Txt variant="body" style={{ marginTop: space.l }}>
                {first.lesson.title}
              </Txt>
              <Txt variant="callout" tone="secondary" style={{ marginTop: space.xs }}>
                2 minutes to read, then {first.practice.minutes} with your eyes closed. Somewhere comfortable. Headphones help.
              </Txt>
              {focus ? (
                <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.l }}>
                  {FOCUS_TIP[focus]}
                </Txt>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, photoStep && { paddingTop: space.m }]}>
        {step === 0 ? (
          <PrimaryButton label="begin" detail="About a minute. No account." onPress={next} />
        ) : step === 5 ? (
          <PrimaryButton label="continue" onPress={confirmTime} />
        ) : step === STEPS - 1 ? (
          <>
            <PrimaryButton label={`begin day ${day}`} detail="Starts with the short lesson" onPress={() => finish(true)} />
            <QuietButton label="Not now" style={{ alignSelf: 'center' }} onPress={() => finish(false)} />
          </>
        ) : (
          <PrimaryButton
            // Always "continue": a filled "skip" was the loudest thing on screen. Nothing chosen is a skip.
            label="continue"
            onPress={next}
          />
        )}
        {step > 0 && step < STEPS - 1 ? <QuietButton label="Back" style={{ alignSelf: 'center' }} onPress={back} /> : null}
      </View>
    </View>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: color.bg },
    bars: { flexDirection: 'row', gap: 6, paddingHorizontal: space.xl },
    bar: { flex: 1, height: 2, borderRadius: 1, backgroundColor: color.hairline },
    content: { flexGrow: 1, padding: space.xl, paddingTop: space.xxl },
    text: { paddingHorizontal: space.xl, paddingTop: space.xl },
    point: { flexDirection: 'row', gap: space.m },
    note: { padding: space.l, borderRadius: radius.m, backgroundColor: color.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: color.hairline },
    option: {
      minHeight: HIT + 24,
      justifyContent: 'center',
      paddingHorizontal: space.l,
      paddingVertical: space.m,
      borderRadius: radius.m,
      backgroundColor: color.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.hairline,
    },
    optionOn: { backgroundColor: color.text, borderColor: color.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.xl },
    input: {
      marginTop: space.m,
      minHeight: HIT + 8,
      paddingHorizontal: space.l,
      borderRadius: radius.m,
      backgroundColor: color.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.hairline,
      color: color.text,
      fontSize: 17,
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : {}),
    },
    times: { flexDirection: 'row', gap: space.s, marginTop: space.xl },
    time: {
      flex: 1,
      minHeight: 64,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.m,
      backgroundColor: color.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.hairline,
    },
    remind: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.m,
      marginTop: space.l,
      padding: space.l,
      borderRadius: radius.m,
      backgroundColor: color.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.hairline,
    },
    footer: { paddingHorizontal: space.xl, gap: space.s },
  });
