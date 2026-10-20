import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { currentTz, dayKey } from '@/domain/checkin';
import { milestones, newlyEarned, practiceStats, weekLine, weekStrip, type Milestone } from '@/domain/engagement';
import {
  describeFinish,
  finishSteps,
  MILESTONE_PHOTO,
  nextUp,
  placeForDay,
  placeForPractice,
  postcards,
  programSummary,
  programSummaryLines,
  reminderLine,
  spelled,
  weekSummary,
  type Finish,
  type FinishStep,
  type PlaceFocus,
  type PlacePhoto,
} from '@/domain/finish';
import { FEELING_ORDER } from '@/domain/firstWeek';
import { EMPTY_PROGRAM, PROGRAM, PROGRAM_DAYS, programDay, WEEKS, type ProgramState } from '@/domain/program';
import type { Session } from '@/domain/types';
import { Chip, Hairline, OutlineButton, PrimaryButton, QuietButton, Txt } from '@/design/components';
import { space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { PlaceImage } from './PlaceImage';
import { Postcard, PostcardRows } from './Postcards';
import { startedAs } from './started';

/**
 * The end of a guided practice: an earned, calm moment, then the way out (founder, 20 Oct 2026).
 *
 *   completion moment → what's next                       a normal day: two screens
 *   completion moment → milestone → what's next           a milestone newly earned
 *   completion moment → (milestone) → week's chapter      day 7, 14, 21 (the chapter says what's next)
 *   completion moment → (milestone) → the 28 days         day 28
 *
 * Never more than three, every one skippable in a tap ("skip", top right, leaves for Today), and
 * the order is decided in domain/finish.ts where it is tested. Always dark (the recap route is
 * forceDark): eyes open onto it in a dim room. It says what was done and never how the sensation
 * was; the one optional tap is about the practice. No praise, no "!", no pain anywhere.
 */

/** Said under the chips for "hard today": a hard session is a whole one (copy review round 3). */
const HARD_LINES = [
  'A hard session is a whole session. Showing up was the practice.',
  'If practice keeps making it louder, a shorter one, a sound, or a day off are part of it too.',
];

function withoutDay(p: ProgramState, day?: number): ProgramState {
  if (!day || !p.done[day]) return p;
  const done = { ...p.done };
  delete done[day];
  return { ...p, done };
}

export function FinishFlow({ session }: { session: Session }) {
  const styles = useStyles(makeStyles);
  const { sessions, prefs } = useData();
  const vs = useVoiceSession();
  const [now] = useState(() => Date.now());
  const tz = currentTz();
  const program = prefs.program ?? EMPTY_PROGRAM;

  // Decided once, as the flow opens: a chip tapped on the first screen must not reshuffle the rest.
  const [plan] = useState(() => {
    const finish = describeFinish({ session, sessions, program, tz, scan: startedAs(session)?.scan });
    const moments = prefs.moments?.length ?? 0;
    const before = milestones({ sessions: sessions.filter((s) => s.id !== session.id), program: finish.kind === 'day' ? withoutDay(program, finish.day) : program, moments, tz });
    const after = milestones({ sessions, program, moments, tz });
    const earned = newlyEarned(before, after);
    return { finish, steps: finishSteps(finish, earned) };
  });
  const [index, setIndex] = useState(0);
  const step = plan.steps[index];
  const last = index === plan.steps.length - 1;

  const leave = (to: '/' | '/progress' = '/') => {
    vs.reset();
    if (router.canDismiss()) router.dismissAll();
    // Journey left the tabs (18 Oct 2026); a finish ends back on Today, or on the record if asked.
    router.navigate(to);
  };
  const advance = () => (last ? leave() : setIndex((i) => i + 1));
  const shownMilestone = plan.steps.some((s) => s.kind === 'milestone');

  return (
    <View style={styles.root}>
      <Animated.View key={index} style={StyleSheet.absoluteFill} entering={index === 0 ? undefined : FadeIn.duration(700)} exiting={FadeOut.duration(350)}>
        {step.kind === 'moment' ? (
          <MomentScreen session={session} finish={plan.finish} program={program} sessions={sessions} now={now} tz={tz} welcome={plan.finish.returned && !shownMilestone} onContinue={advance} last={last} />
        ) : step.kind === 'milestone' ? (
          <MilestoneScreen milestone={step.milestone} onContinue={advance} last={last} />
        ) : step.kind === 'chapter' ? (
          <ChapterScreen week={step.week} sessions={sessions} program={program} tz={tz} now={now} reminder={reminderLine(prefs.reminder)} onDone={() => leave()} />
        ) : step.kind === 'program' ? (
          <ProgramScreen sessions={sessions} program={program} wins={prefs.moments?.length ?? 0} tz={tz} onRecord={() => leave('/progress')} onDone={() => leave()} />
        ) : (
          <NextScreen finish={plan.finish} program={program} now={now} tz={tz} reminder={reminderLine(prefs.reminder)} photo={photoOf(plan.finish, session, now)} onDone={() => leave()} />
        )}
      </Animated.View>
      {last ? null : <SkipButton onPress={() => leave()} />}
    </View>
  );
}

function photoOf(finish: Finish, session: Session, now: number): { photo: PlacePhoto; focus: PlaceFocus } {
  if (finish.day) {
    const p = placeForDay(finish.day);
    return { photo: p.photo, focus: p.focus };
  }
  return { photo: placeForPractice(session.sessionType, { scan: finish.title.startsWith('body scan'), hour: new Date(now).getHours() }), focus: 'center' };
}

// ——— pieces ———

/**
 * Darkness at an edge of a photograph, so type over it reads without greying the whole picture.
 * Thin stacked bands (no gradient library), eased so the steps don't show: design/Photo's eight
 * bands are fine under a line of type but striped a full-screen photograph.
 */
function Scrim({ from, portion, strength }: { from: 'top' | 'bottom'; portion: number; strength: number }) {
  const bands = 48;
  // Band j reaches j/bands of the way in. Light let through at depth d is the product of every band
  // reaching past it, so each band's alpha is set from the eased target darkness at its inner end.
  const through = (j: number) => 1 - strength * Math.pow(1 - (j - 1) / bands, 1.3);
  const alphas = Array.from({ length: bands }, (_, i) => {
    const j = bands - i; // widest first
    return 1 - through(j) / (j === bands ? 1 : through(j + 1));
  });
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {alphas.map((alpha, i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: 0, right: 0, [from]: 0, height: `${(portion * 100 * (bands - i)) / bands}%`, backgroundColor: `rgba(4,6,7,${Math.max(0, alpha).toFixed(4)})` }}
        />
      ))}
    </View>
  );
}

function SkipButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', top: insets.top + space.s, right: space.l }}>
      <QuietButton label="skip" onPress={onPress} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: space.s }} accessibilityLabel="Skip to Today" />
    </View>
  );
}

/** A full-bleed photograph that fades up from black, with its scrims. */
function Backdrop({ photo, focus, fadeMs = 1600, foot = 0.78 }: { photo: PlacePhoto; focus?: PlaceFocus; fadeMs?: number; foot?: number }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const o = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) o.value = withTiming(1, { duration: fadeMs, easing: Easing.out(Easing.quad) });
  }, [o, reduceMotion, fadeMs]);
  const fade = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, fade]}>
      <PlaceImage photo={photo} focus={focus} width={width} height={height} drift />
      <Scrim from="top" portion={0.22} strength={0.55} />
      <Scrim from="bottom" portion={foot} strength={0.97} />
    </Animated.View>
  );
}

/** Content laid at the foot of a full-bleed photograph, scrolling if Dynamic Type makes it tall. */
function Foot({ children, onPressPhoto }: { children: ReactNode; onPressPhoto?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={StyleSheet.absoluteFill}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingTop: insets.top + 64, paddingBottom: insets.bottom + space.l, paddingHorizontal: space.xl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Tap-through: the photograph above the words is one big "continue". */}
      {onPressPhoto ? <Pressable style={{ flex: 1, minHeight: 80 }} onPress={onPressPhoto} accessibilityElementsHidden importantForAccessibility="no" /> : null}
      {children}
    </ScrollView>
  );
}

function useAppear() {
  const reduceMotion = useReducedMotion();
  return (delay: number, duration = 800) => (reduceMotion ? undefined : FadeInDown.delay(delay).duration(duration));
}

function success() {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

// ——— 1. the completion moment ———

function MomentScreen({
  session,
  finish,
  program,
  sessions,
  now,
  tz,
  welcome,
  last,
  onContinue,
}: {
  session: Session;
  finish: Finish;
  program: ProgramState;
  sessions: Session[];
  now: number;
  tz: number;
  welcome: boolean;
  last: boolean;
  onContinue: () => void;
}) {
  const styles = useStyles(makeStyles);
  const { setFeeling } = useData();
  const appear = useAppear();
  const reduceMotion = useReducedMotion();
  const { photo, focus } = photoOf(finish, session, now);
  const place = finish.kind === 'day' && finish.day ? placeForDay(finish.day) : undefined;
  const feeling = sessions.find((s) => s.id === session.id)?.feeling;

  // The soft "done" in the hand, as the day's mark fills in. Not for a day still open: nothing filled.
  useEffect(() => {
    if (finish.kind === 'open') return;
    const t = setTimeout(success, reduceMotion ? 300 : 1900);
    return () => clearTimeout(t);
  }, [finish.kind, reduceMotion]);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop photo={photo} focus={focus} foot={0.86} />
      <Foot>
        <Animated.View entering={appear(500, 1000)}>
          <Txt variant="caption" style={styles.kicker}>
            {finish.day ? `day ${finish.day} of 28` : 'today'}
          </Txt>
          <Txt variant="display" accessibilityRole="header" style={styles.onImage}>
            {finish.title}
          </Txt>
          <Txt variant="body" style={[styles.onImageSoft, { marginTop: space.s }]}>
            {[finish.facts, finish.note, welcome ? 'Welcome back.' : undefined].filter(Boolean).join(' ')}
          </Txt>
        </Animated.View>

        <Animated.View entering={appear(1000)} style={{ marginTop: space.xl }}>
          {finish.day ? <ProgramLine program={program} day={finish.day} fill={finish.kind === 'day'} /> : <WeekDots sessions={sessions} now={now} tz={tz} />}
        </Animated.View>

        {place ? <NewPlace place={place} /> : null}

        <Animated.View entering={appear(1900)} style={{ marginTop: space.xl }}>
          <Hairline style={{ backgroundColor: 'rgba(255,255,255,0.16)', marginBottom: space.l }} />
          <Txt variant="headline" style={styles.onImage}>
            How did that feel?
          </Txt>
          <View style={styles.feelings}>
            {FEELING_ORDER.map((f) => (
              <Chip key={f.value} label={f.label} selected={feeling === f.value} style={styles.feeling} onPress={() => setFeeling(session.id, feeling === f.value ? null : f.value)} />
            ))}
          </View>
          {feeling === 'hard' ? (
            <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(500)}>
              {HARD_LINES.map((l, i) => (
                <Txt key={l} variant="callout" style={[i === 0 ? styles.onImage : styles.onImageSoft, { marginTop: i === 0 ? space.m : space.s }]}>
                  {l}
                </Txt>
              ))}
            </Animated.View>
          ) : null}
          <Txt variant="caption" style={[styles.onImageFaint, { marginTop: space.s }]}>
            Optional. About the practice, not the pain.
          </Txt>
          <PrimaryButton label={last ? 'done' : 'continue'} onPress={onContinue} style={{ marginTop: space.xl }} />
        </Animated.View>
      </Foot>
    </View>
  );
}

/**
 * The 28 days as one line of marks, a week a group. Done days are filled; today's fills in, left
 * to right, as the moment settles. A day not reached is a faint mark, the same before and after
 * it is "due": nothing here is missed.
 */
function ProgramLine({ program, day, fill }: { program: ProgramState; day: number; fill: boolean }) {
  const styles = useStyles(makeStyles);
  const color = useColors();
  const reduceMotion = useReducedMotion();
  const grow = useSharedValue(fill && !reduceMotion ? 0 : 1);
  useEffect(() => {
    if (fill && !reduceMotion) grow.value = withDelay(1300, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [fill, reduceMotion, grow]);
  const growing = useAnimatedStyle(() => ({ transform: [{ scaleX: grow.value }], opacity: 0.35 + 0.65 * grow.value }));
  const done = Object.keys(program.done).length;
  return (
    <View accessible accessibilityLabel={`Day ${day} of ${PROGRAM_DAYS}. ${done} ${done === 1 ? 'day' : 'days'} of the program done.`}>
      <View style={styles.line}>
        {([1, 2, 3, 4] as const).map((w) => (
          <View key={w} style={styles.lineWeek}>
            {PROGRAM.filter((d) => d.week === w).map((d) => {
              const isToday = d.day === day;
              const on = !!program.done[d.day];
              return (
                <View key={d.day} style={[styles.mark, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                  {on ? (
                    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: isToday ? color.practice : 'rgba(163,202,204,0.7)', transformOrigin: 'left' }, isToday ? growing : undefined]} />
                  ) : isToday ? (
                    <View style={[StyleSheet.absoluteFill, { borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 2 }]} />
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.lineCaption}>
        <Txt variant="caption" style={styles.onImageFaint}>
          day {day}
        </Txt>
        <Txt variant="caption" style={styles.onImageFaint}>
          {done} of {PROGRAM_DAYS}
        </Txt>
      </View>
    </View>
  );
}

/** This week's practice days, Monday to Sunday; today's dot fills in. Outside the program. */
function WeekDots({ sessions, now, tz }: { sessions: Session[]; now: number; tz: number }) {
  const styles = useStyles(makeStyles);
  const color = useColors();
  const reduceMotion = useReducedMotion();
  const days = useMemo(() => weekStrip(sessions, now, tz), [sessions, now, tz]);
  const stats = useMemo(() => practiceStats(sessions, now, tz), [sessions, now, tz]);
  const grow = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) grow.value = withDelay(1300, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [reduceMotion, grow]);
  const growing = useAnimatedStyle(() => ({ transform: [{ scale: 0.3 + 0.7 * grow.value }], opacity: grow.value }));
  const count = days.filter((d) => d.practised).length;
  return (
    <View accessible accessibilityLabel={`This week: practiced on ${count} ${count === 1 ? 'day' : 'days'}.`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((d) => (
          <View key={d.day} style={{ alignItems: 'center', gap: space.s, flex: 1 }}>
            <Txt variant="caption" style={d.today ? styles.onImage : styles.onImageFaint}>
              {d.label}
            </Txt>
            <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
              {d.practised ? <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 13, backgroundColor: d.today ? color.practice : 'rgba(163,202,204,0.7)' }, d.today ? growing : undefined]} /> : null}
            </View>
          </View>
        ))}
      </View>
      <Txt variant="footnote" style={[styles.onImageFaint, { marginTop: space.m }]}>
        {weekLine(stats, now)}
      </Txt>
    </View>
  );
}

/** Today's postcard, sliding into place beside its name. */
function NewPlace({ place }: { place: ReturnType<typeof placeForDay> }) {
  const styles = useStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) t.value = withDelay(2000, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [reduceMotion, t]);
  const slide = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateX: (1 - t.value) * 48 }, { translateY: (1 - t.value) * 10 }, { rotate: `${-2.5 + (1 - t.value) * 9}deg` }],
  }));
  const words = useAnimatedStyle(() => ({ opacity: t.value }));
  return (
    <View style={styles.newPlace} accessible accessibilityLabel={`A new place for your collection: ${place.name}.`}>
      <Animated.View style={slide}>
        <Postcard place={place} width={58} />
      </Animated.View>
      <Animated.View style={[{ flex: 1 }, words]}>
        <Txt variant="caption" style={styles.onImageFaint}>
          a new place
        </Txt>
        <Txt variant="headline" style={styles.onImage}>
          {place.name}
        </Txt>
      </Animated.View>
    </View>
  );
}

// ——— 2. a milestone ———

function MilestoneScreen({ milestone, onContinue, last }: { milestone: Milestone; onContinue: () => void; last: boolean }) {
  const styles = useStyles(makeStyles);
  const appear = useAppear();
  useEffect(() => {
    const t = setTimeout(success, 700);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <Backdrop photo={MILESTONE_PHOTO[milestone.id]} foot={0.55} fadeMs={1200} />
      <Foot onPressPhoto={onContinue}>
        <Animated.View entering={appear(400, 1000)} accessible accessibilityLabel={`Milestone: ${milestone.label}. ${milestone.detail}`}>
          <View style={styles.markRule} />
          <Txt variant="caption" style={styles.kicker}>
            a milestone
          </Txt>
          <Txt variant="display" style={[styles.onImage, { fontSize: 46, lineHeight: 48 }]}>
            {milestone.label}
          </Txt>
          <Txt variant="body" style={[styles.onImageSoft, { marginTop: space.s }]}>
            {milestone.detail}
          </Txt>
        </Animated.View>
        <Animated.View entering={appear(1100)}>
          <OutlineButton label={last ? 'done' : 'continue'} tone="onImage" onPress={onContinue} style={{ marginTop: space.xxl }} />
        </Animated.View>
      </Foot>
    </View>
  );
}

// ——— 3. closing cards ———

function NextLines({ program, now, tz, reminder }: { program: ProgramState; now: number; tz: number; reminder?: string }) {
  const styles = useStyles(makeStyles);
  const next = nextUp(program, dayKey(now, tz));
  if (!next) return null;
  const when = next.when === 'tomorrow' ? 'tomorrow' : next.when === 'today' ? 'today, when you like' : 'the 28 days begin with';
  return (
    <View>
      <Txt variant="caption" style={styles.kicker}>
        {when}
      </Txt>
      <Txt variant="title" style={styles.onImage}>
        {next.lesson}
      </Txt>
      <Txt variant="callout" style={[styles.onImageSoft, { marginTop: space.s, textTransform: 'lowercase' }]}>
        day {next.day} · a short lesson, then {next.minutes} minutes of practice
      </Txt>
      {reminder ? (
        <Txt variant="callout" style={[styles.onImageFaint, { marginTop: space.xs }]}>
          {reminder}
        </Txt>
      ) : null}
    </View>
  );
}

function NextScreen({
  finish,
  program,
  now,
  tz,
  reminder,
  photo,
  onDone,
}: {
  finish: Finish;
  program: ProgramState;
  now: number;
  tz: number;
  reminder?: string;
  photo: { photo: PlacePhoto; focus: PlaceFocus };
  onDone: () => void;
}) {
  const appear = useAppear();
  const styles = useStyles(makeStyles);
  const preset = !finish.day;
  const hasNext = !!nextUp(program, dayKey(now, tz));
  return (
    <View style={{ flex: 1 }}>
      {/* The same place, held a little darker: the moment is over, the room comes back. */}
      <Backdrop photo={photo.photo} focus={photo.focus} foot={0.9} fadeMs={0} />
      <Foot>
        <Animated.View entering={appear(200)}>
          {hasNext ? (
            <NextLines program={program} now={now} tz={tz} reminder={reminder} />
          ) : (
            <Txt variant="title" style={styles.onImage}>
              the 28 days are yours to return to
            </Txt>
          )}
          {/* Closing moves attention out of the body and into the room (AGENTS.md: the guide's voice). */}
          <Txt variant="callout" style={[styles.onImageSoft, { marginTop: space.xl }]}>
            Take a moment with the room before you go on.
          </Txt>
          <PrimaryButton label={preset ? 'back to today' : 'done'} onPress={onDone} style={{ marginTop: space.xl }} />
        </Animated.View>
      </Foot>
    </View>
  );
}

function ChapterScreen({
  week,
  sessions,
  program,
  tz,
  now,
  reminder,
  onDone,
}: {
  week: 1 | 2 | 3;
  sessions: Session[];
  program: ProgramState;
  tz: number;
  now: number;
  reminder?: string;
  onDone: () => void;
}) {
  const styles = useStyles(makeStyles);
  const appear = useAppear();
  const { width } = useWindowDimensions();
  const summary = weekSummary(week, sessions, tz);
  const cards = postcards(program).slice((week - 1) * 7, week * 7);
  const place = placeForDay(week * 7);
  const coming = WEEKS[(week + 1) as 2 | 3 | 4];
  return (
    <View style={{ flex: 1 }}>
      <Backdrop photo={place.photo} focus={place.focus} foot={0.85} />
      <Foot>
        <Animated.View entering={appear(400, 1000)}>
          <Txt variant="caption" style={styles.kicker}>
            a chapter
          </Txt>
          <Txt variant="display" accessibilityRole="header" style={styles.onImage}>
            week {week}, done
          </Txt>
          <Txt variant="body" style={[styles.onImageSoft, { marginTop: space.s }]}>
            {summary.about}.
          </Txt>
        </Animated.View>
        <Animated.View entering={appear(900)} style={{ marginTop: space.xl }}>
          <PostcardRows cards={cards} width={Math.min(width, 520) - space.xl * 2} />
          <Txt variant="footnote" style={[styles.onImageFaint, { marginTop: space.m }]}>
            {spelled(summary.days)} {summary.days === 1 ? 'day' : 'days'} of practice, {summary.minutes} minutes with eyes closed. Seven new places.
          </Txt>
        </Animated.View>
        <Animated.View entering={appear(1500)} style={{ marginTop: space.xl }}>
          <Hairline style={{ backgroundColor: 'rgba(255,255,255,0.16)', marginBottom: space.l }} />
          <Txt variant="footnote" style={[styles.onImageFaint, { marginBottom: space.l }]}>
            next, week {week + 1} · {coming.name.toLowerCase()}: {coming.about.toLowerCase()}
          </Txt>
          <NextLines program={program} now={now} tz={tz} reminder={reminder} />
          <PrimaryButton label="done" onPress={onDone} style={{ marginTop: space.xl }} />
        </Animated.View>
      </Foot>
    </View>
  );
}

function ProgramScreen({ sessions, program, wins, tz, onRecord, onDone }: { sessions: Session[]; program: ProgramState; wins: number; tz: number; onRecord: () => void; onDone: () => void }) {
  const styles = useStyles(makeStyles);
  const appear = useAppear();
  const { width } = useWindowDimensions();
  const lines = programSummaryLines(programSummary(sessions, program, wins, tz));
  const place = placeForDay(PROGRAM_DAYS);
  useEffect(() => {
    const t = setTimeout(success, 900);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <Backdrop photo={place.photo} focus={place.focus} foot={0.88} fadeMs={2000} />
      <Foot>
        <Animated.View entering={appear(500, 1100)}>
          <Txt variant="caption" style={styles.kicker}>
            the program
          </Txt>
          <Txt variant="display" accessibilityRole="header" style={[styles.onImage, { fontSize: 52, lineHeight: 54 }]}>
            28 days
          </Txt>
          <Txt variant="body" style={[styles.onImageSoft, { marginTop: space.s }]}>
            The whole program, done. Twenty-eight places.
          </Txt>
        </Animated.View>
        <Animated.View entering={appear(1100)} style={{ marginTop: space.xl }}>
          <PostcardRows cards={postcards(program)} width={Math.min(width, 520) - space.xl * 2} gap={5} />
        </Animated.View>
        <Animated.View entering={appear(1700)} style={{ marginTop: space.xl, gap: space.xs }}>
          {lines.map((l) => (
            <Txt key={l} variant="callout" style={styles.onImageSoft}>
              {l}
            </Txt>
          ))}
          {/* The record is the person's to read, on its own screen: never a number here. */}
          <OutlineButton label="see your pain record" tone="onImage" onPress={onRecord} style={{ marginTop: space.xl }} />
          <PrimaryButton label="done" onPress={onDone} style={{ marginTop: space.l }} />
        </Animated.View>
      </Foot>
    </View>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    onImage: { color: color.onImage },
    onImageSoft: { color: 'rgba(255,255,255,0.8)' },
    onImageFaint: { color: 'rgba(255,255,255,0.62)' },
    kicker: { color: 'rgba(255,255,255,0.7)', textTransform: 'lowercase', letterSpacing: 0.6, marginBottom: space.s },
    feelings: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.m },
    feeling: { flexBasis: '45%', flexGrow: 1, alignSelf: 'auto', justifyContent: 'space-between' },
    line: { flexDirection: 'row', gap: space.s },
    lineWeek: { flex: 1, flexDirection: 'row', gap: 3 },
    mark: { flex: 1, height: 10, borderRadius: 2, overflow: 'hidden' },
    lineCaption: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.s },
    dot: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden' },
    newPlace: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.xl },
    markRule: { width: 28, height: 2, backgroundColor: color.milestone, marginBottom: space.l },
  });
