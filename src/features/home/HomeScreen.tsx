import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import type { SessionType } from '@/domain/types';
import { currentTz, dayKey } from '@/domain/checkin';
import { practiceStats, weekLine, weekStrip } from '@/domain/engagement';
import { showFirstWeek } from '@/domain/firstWeek';
import { currentDay, EMPTY_PROGRAM, PROGRAM_DAYS, programDay, WEEKS } from '@/domain/program';
import { NEED_IT, presetById } from '@/domain/presets';
import { soundscape, timerLabel } from '@/domain/soundscapes';
import { Card, haptic, Icon, IconButton, OutlineButton, PrimaryButton, QuietButton, SectionLabel, Txt, Wordmark } from '@/design/components';
import { Photo, sceneForHour } from '@/design/Photo';
import { HIT, radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { pauseListening, resumeListening, useListen } from '@/voice/listen';
import { scheduleReminders } from '@/voice/reminders';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { dayPlan, presetPlan, shortDayPlan, startPractice } from '../shared/start';
import { WeekStrip } from '../shared/WeekStrip';
import { FirstWeekCard } from './FirstWeekCard';

/**
 * Today answers one question: what do I do now? One practice for the day, begun with one
 * tap — the short lesson first if it hasn't been read, then straight into the guided
 * practice, eyes closed. Below it, the moments people open the app for anyway (a flare,
 * a night without sleep, a body scan, a worried hour), each a single tap. Sounds have
 * their own tab.
 *
 * The pain record isn't here — Today is about doing; Progress is for looking back
 * (docs/RESEARCH.md §5). Only a quiet nudge to log today, until it's done.
 */

/** What brought the person here (the welcome) puts its moment first. */
const FOCUS_NEED: Record<SessionType, string> = { flare: 'flare-3', sleep: 'sleep-10', notice: 'scan-10', fear: 'worry-5' };

export function HomeScreen() {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listen = useListen();
  const { sessions, checkIns, prefs } = useData();
  const tz = currentTz();
  const now = useNow();
  const todayKey = dayKey(now, tz);
  const program = prefs.program ?? EMPTY_PROGRAM;
  const { day, doneToday, finished } = currentDay(program, todayKey);
  const today = programDay(day);
  const read = program.read.includes(day);
  const strip = useMemo(() => weekStrip(sessions, now, tz), [sessions, now, tz]);
  const stats = useMemo(() => practiceStats(sessions, now, tz), [sessions, now, tz]);
  const checkedInToday = checkIns.some((c) => !c.isSample && dayKey(c.at, tz) === dayKey(now, tz));
  const known = { prefs, checkIns };

  // Keep the reminders in step with the latest practice and the program: dated one-offs, daily
  // for four days after a practice, then weekly (voice/reminders.ts). A new day re-plans too, so
  // the reminder copy names the right day. Rescheduling with nothing changed is a no-op.
  useEffect(() => {
    scheduleReminders(prefs.reminder, stats.lastPractice, prefs.program);
  }, [prefs.reminder, stats.lastPractice, prefs.program, todayKey]);

  const { warm } = useVoiceSession();
  // Ready the practice while the person reads Today, so Begin goes straight to the guide's first words.
  useEffect(() => warm(today.practice.sessionType, prefs.voiceId), [today.practice.sessionType, prefs.voiceId, warm]);

  const begin = () => {
    haptic('soft');
    if (!read) router.push({ pathname: '/lesson/[day]', params: { day: String(day) } });
    else startPractice(dayPlan(day, known));
  };

  // The short day (r2-copy §5): 3 active minutes of the same practice complete the day. Straight
  // into the practice: the lesson is never a gate, and a low-energy day shouldn't start with reading.
  const short = !doneToday && today.practice.minutes > 3;
  const beginShort = () => {
    haptic('soft');
    startPractice(shortDayPlan(day, known));
  };
  const firstWeek = showFirstWeek(program, prefs.firstWeekDone, todayKey) ? <FirstWeekCard now={now} tz={tz} /> : null;

  const lead = prefs.focus ? FOCUS_NEED[prefs.focus] : undefined;
  const needs = lead ? [...NEED_IT.filter((n) => n.id === lead), ...NEED_IT.filter((n) => n.id !== lead)] : NEED_IT;
  const tomorrow = !finished && day < PROGRAM_DAYS ? programDay(day + 1) : undefined;
  // The week strip appears once there is something on it. Before the first practice it was
  // seven empty circles under a button — a row of absences on the first screen anyone sees.
  const showWeek = stats.sessions > 0;

  const week = showWeek ? (
    <View style={{ marginTop: space.xxl }}>
      <WeekStrip days={strip} />
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.m }}>
        {weekLine(stats, now)}
      </Txt>
    </View>
  ) : null;

  const logPain = !checkedInToday ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log today’s pain. Ten seconds."
      onPress={() => router.push('/checkin')}
      style={({ pressed }) => [styles.logRow, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={{ flex: 1 }}>
        <Txt variant="headline">log today’s pain</Txt>
        <Txt variant="footnote" tone="secondary">
          10 seconds. Over weeks, a record you can look back on.
        </Txt>
      </View>
      <Icon name="chevron.right" size={14} tint={color.textTertiary} />
    </Pressable>
  ) : null;

  // Practices are text rows; photographs belong to sounds. Two kinds of thing, two looks, so
  // nobody taps a forest expecting rain and gets a voice.
  const needIt = (
    <View style={{ marginTop: space.xxl }}>
      <SectionLabel>when you need it</SectionLabel>
      <View>
        {needs.map((n, i) => {
          const p = presetById(n.id)!;
          return (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              accessibilityLabel={`${n.label}. ${p.title}, ${n.detail}. Begins now.`}
              onPress={() => {
                haptic('soft');
                startPractice(presetPlan(p, known));
              }}
              style={({ pressed }) => [styles.needRow, i === needs.length - 1 && styles.needLast, { opacity: pressed ? 0.55 : 1 }]}
            >
              <Txt variant="title2" style={{ flex: 1, textTransform: 'lowercase' }}>
                {n.label}
              </Txt>
              <Txt variant="footnote" tone="tertiary">
                {n.detail}
              </Txt>
              <Txt variant="callout" importantForAccessibility="no" accessibilityElementsHidden>
                →
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const dayLine = finished ? 'all 28 days done' : `day ${day} of ${PROGRAM_DAYS} · ${WEEKS[today.week].name.toLowerCase()}`;
  const meta = doneToday
    ? tomorrow
      ? `tomorrow · day ${tomorrow.day} · ${tomorrow.lesson.title.toLowerCase()}`
      : 'every practice stays here, whenever you want it'
    : read
      ? `${today.practice.minutes} min practice`
      : `2 min lesson · ${today.practice.minutes} min practice`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: space.xl }}
    >
      {/* Daisy's opening: the hour's sky, full-bleed, the wordmark over it, today's day on it. */}
      <Photo scene={sceneForHour(new Date(now).getHours())} width={width} height={Math.round(height * 0.36)} drift style={{ marginHorizontal: -space.xl }}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
        <View style={[styles.heroTop, { paddingTop: insets.top + space.xs }]}>
          <View style={{ width: HIT }} />
          <Wordmark tone="onImage" />
          <IconButton icon="gearshape" label="Settings" onPress={() => router.push('/settings')} tint={color.onImage} />
        </View>
        <View style={styles.heroBottom}>
          <Txt variant="callout" style={[styles.onImage, styles.shadow, { opacity: 0.9, marginBottom: space.xs }]}>
            {dayLine}
          </Txt>
          <Txt variant="display" accessibilityRole="header" style={[styles.onImage, styles.shadow]}>
            {doneToday ? 'done for today.' : today.lesson.title}
          </Txt>
        </View>
      </Photo>

      {/* The one thing to do today, flat on the page: what it takes, then the button. */}
      <Animated.View entering={FadeIn.duration(600)} style={{ marginTop: space.xl }}>
        <Txt variant="callout" tone="secondary">
          {meta}
        </Txt>
        {doneToday ? (
          <OutlineButton label="practice again" onPress={() => startPractice(dayPlan(day, known))} style={{ marginTop: space.l }} />
        ) : (
          <>
            <PrimaryButton label={read ? 'begin practice' : `begin day ${day}`} onPress={begin} style={{ marginTop: space.l }} />
            {short ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Short on energy? 3 minutes completes the day. Begins now."
                onPress={beginShort}
                hitSlop={4}
                style={({ pressed }) => [styles.shortRow, { opacity: pressed ? 0.55 : 1 }]}
              >
                <Txt variant="callout" tone="secondary">
                  short on energy? 3 minutes completes the day. <Txt variant="callout" tone="secondary" importantForAccessibility="no" accessibilityElementsHidden>→</Txt>
                </Txt>
              </Pressable>
            ) : null}
            {/* Day 1 has nothing to adjust yet: the welcome just chose length and voice. */}
            {day > 1 ? (
              <QuietButton
                label="adjust length, voice or sound"
                onPress={() => router.push({ pathname: '/before', params: { day: String(day) } })}
                style={{ alignSelf: 'flex-start', paddingHorizontal: 0, marginTop: space.xs }}
              />
            ) : null}
          </>
        )}
      </Animated.View>

      {/* Once today's practice is done, the next thing someone might want is a practice for a moment. */}
      {firstWeek}

      {doneToday ? (
        <>
          {needIt}
          {week}
          {logPain}
        </>
      ) : (
        <>
          {week}
          {logPain}
          {needIt}
        </>
      )}

      {/* Sounds have their own tab; while one plays, it can be paused from here. */}
      {listen.id ? (
        <View style={{ marginTop: space.xxl }}>
          <SectionLabel>playing</SectionLabel>
          <NowPlaying listen={listen} />
        </View>
      ) : null}
    </ScrollView>
  );
}

/**
 * The time Today reads its day from. Held in state and refreshed when the app comes back to
 * the foreground, and at local midnight while it stays open: an app left open overnight
 * otherwise shows yesterday's day, done, until something else re-renders it.
 */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 1, 0);
    const t = setTimeout(() => setNow(Date.now()), midnight.getTime() - now);
    return () => clearTimeout(t);
  }, [now]);
  return now;
}

/** While a sound plays on its own: what it is, how long is left, pause in place. */
function NowPlaying({ listen }: { listen: ReturnType<typeof useListen> }) {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const s = soundscape(listen.id) ?? soundscape('rain')!;
  return (
    <Card label={`${s.name}, ${listen.playing ? 'playing' : 'paused'}. Open`} onPress={() => router.push('/listen')} style={styles.playing}>
      <Photo scene={s.id} width={52} height={52} radius={radius.s} />
      <View style={{ flex: 1 }}>
        <Txt variant="headline">{s.name}</Txt>
        <Txt variant="footnote" tone="secondary">
          {listen.playing ? timerLabel(listen.timer, listen.timerElapsedMs) : 'Paused'}
        </Txt>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listen.playing ? 'Pause' : 'Resume'}
        hitSlop={8}
        onPress={() => {
          haptic('select');
          if (listen.playing) pauseListening();
          else resumeListening();
        }}
        style={styles.playBtn}
      >
        <Icon name={listen.playing ? 'pause.fill' : 'play.fill'} size={13} tint={color.onAccent} />
      </Pressable>
    </Card>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.s },
    heroBottom: { position: 'absolute', left: space.xl, right: space.xl, bottom: space.xl },
    onImage: { color: color.onImage },
    shadow: { textShadowColor: 'rgba(5,8,9,0.3)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 1 } },
    logRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.m,
      minHeight: 64,
      marginTop: space.xxl,
      paddingVertical: space.m,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: color.hairline,
    },
    needRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.m,
      minHeight: 60,
      paddingVertical: space.m,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: color.hairline,
    },
    needLast: { borderBottomWidth: StyleSheet.hairlineWidth },
    shortRow: { justifyContent: 'center', minHeight: HIT, marginTop: space.xs },
    playing: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.s, paddingRight: space.l },
    playBtn: { width: 40, height: 40, borderRadius: 3, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  });
