import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { currentTz, dayKey, MIN_DAYS_FOR_PICTURE } from '@/domain/checkin';
import { practiceSessions, practiceStats, weekLine, weekStrip } from '@/domain/engagement';
import { showFirstWeek } from '@/domain/firstWeek';
import { currentDay, EMPTY_PROGRAM, PROGRAM_DAYS, programDay } from '@/domain/program';
import { needItOrder, needItSubtitle, presetById } from '@/domain/presets';
import { buildProgress } from '@/domain/progress';
import { soundscape, timerLabel } from '@/domain/soundscapes';
import { Card, haptic, Icon, IconButton, OutlineButton, PrimaryButton, SectionLabel, Txt, Wordmark } from '@/design/components';
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
 * Today answers one question: what do I need right now? (studio round 5: it read as a course.)
 *
 *  1. Right now: the moments people open the app for — a flare, a night without sleep, a body
 *     scan, a worried hour — above the fold, one tap each, each saying it's a voice and how
 *     long. At night "can't sleep" leads.
 *  2. Your daily practice: the program's day, begun with one tap (the short lesson first if it
 *     hasn't been read, then straight into the practice, eyes closed). After any practice today
 *     it goes quiet: once is enough for a day, and a second ask after a flare reads as homework.
 *  3. Log today's pain, with how far the record is from being a picture.
 *
 * A playing sound is pinned under the photo, where it can be found. Sounds have their own tab.
 */

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** "tuesday evening." The small hours still belong to the night before: 1am Wednesday is Tuesday night. */
function partOfDay(now: number): string {
  const d = new Date(now);
  const h = d.getHours();
  const part = h < 5 || h >= 21 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const day = new Date(h < 5 ? now - 6 * 3_600_000 : now).getDay();
  return `${WEEKDAYS[day]} ${part}.`;
}

export function HomeScreen() {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listen = useListen();
  const params = useLocalSearchParams<{ saved?: string }>();
  const { sessions, checkIns, prefs } = useData();
  const tz = currentTz();
  const now = useNow();
  const hour = new Date(now).getHours();
  const todayKey = dayKey(now, tz);
  const program = prefs.program ?? EMPTY_PROGRAM;
  const { day, doneToday, finished } = currentDay(program, todayKey);
  const today = programDay(day);
  const read = program.read.includes(day);
  // The length the practice will actually run: practice settings can change today's (start.ts).
  const minutes = dayPlan(day, { prefs, checkIns }).minutes;
  const strip = useMemo(() => weekStrip(sessions, now, tz), [sessions, now, tz]);
  const stats = useMemo(() => practiceStats(sessions, now, tz), [sessions, now, tz]);
  // Any practice today, not only the program's: a flare met at noon is the day's practice too.
  const practisedToday = useMemo(() => practiceSessions(sessions).some((s) => dayKey(s.startedAt, tz) === todayKey), [sessions, tz, todayKey]);
  const record = useMemo(() => buildProgress(checkIns, sessions, { now, tz }), [checkIns, sessions, now, tz]);
  const checkedInToday = checkIns.some((c) => !c.isSample && dayKey(c.at, tz) === todayKey);
  const known = { prefs, checkIns };
  const saved = useSavedNote(params.saved, checkIns);

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

  // The short version: 3 active minutes of the same practice, straight in — a low-energy day
  // shouldn't start with reading. Offered only while nothing has been practiced today; after a
  // practice it was a second ask ("completes the day" read as homework, round 5).
  const short = !doneToday && !practisedToday && minutes > 3;
  const beginShort = () => {
    haptic('soft');
    startPractice(shortDayPlan(day, known));
  };
  const firstWeek = showFirstWeek(program, prefs.firstWeekDone, todayKey) ? <FirstWeekCard now={now} tz={tz} /> : null;

  const needs = needItOrder(prefs.focus, hour);
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

  // How far the record is from a picture, in check-in days (the same count Progress draws from),
  // so "is this helping?" has a visible path to an answer (round 5). Counts what was entered,
  // never what wasn't.
  const recordLine = record.enough
    ? '10 seconds. A record you can look back on.'
    : record.checkInDays === 0
      ? `10 seconds. After ${MIN_DAYS_FOR_PICTURE} check-in days, your record appears.`
      : `${record.checkInDays} of ${MIN_DAYS_FOR_PICTURE} check-in days, then your record appears.`;

  const logRow = saved ? (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(500)} style={[styles.logRow, styles.savedRow]} accessibilityLiveRegion="polite">
      <Icon name="checkmark" size={15} tint={color.practice} />
      <Txt variant="callout">Saved to your record.</Txt>
    </Animated.View>
  ) : !checkedInToday ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Log today’s pain. ${recordLine}`}
      onPress={() => router.push('/checkin')}
      style={({ pressed }) => [styles.logRow, { opacity: pressed ? 0.6 : 1 }]}
    >
      {/* The arrow sits with the label, as on every other row here, so the line under it has the
          full width (beside a chevron it broke with one word left over). */}
      <View style={styles.logHead}>
        <Txt variant="headline" style={{ flex: 1 }}>
          log today’s pain
        </Txt>
        <Txt variant="callout" importantForAccessibility="no" accessibilityElementsHidden>
          →
        </Txt>
      </View>
      <Txt variant="footnote" tone="secondary">
        {recordLine}
      </Txt>
    </Pressable>
  ) : null;
  // Its own label, apart from the practice above it: the record and practice sit side by side, never mixed.
  const logPain = logRow ? (
    <View style={{ marginTop: space.xxl }}>
      <SectionLabel style={{ marginBottom: 0 }}>your pain record</SectionLabel>
      {logRow}
    </View>
  ) : null;

  // Practices are text rows; photographs belong to sounds. Two kinds of thing, two looks, so
  // nobody taps a forest expecting rain and gets a voice — and each row says it's a voice.
  const rightNow = (
    <View style={{ marginTop: space.xl }}>
      <SectionLabel>right now</SectionLabel>
      <View>
        {needs.map((n, i) => {
          const p = presetById(n.id)!;
          const sub = needItSubtitle(n);
          return (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              accessibilityLabel={`${n.label}. ${p.title}, ${sub}. Begins now.`}
              onPress={() => {
                haptic('soft');
                startPractice(presetPlan(p, known));
              }}
              style={({ pressed }) => [styles.needRow, i === needs.length - 1 && styles.needLast, { opacity: pressed ? 0.55 : 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Txt variant="title2" style={{ textTransform: 'lowercase' }}>
                  {n.label}
                </Txt>
                <Txt variant="footnote" tone="secondary" style={{ marginTop: space.xxs }}>
                  {sub}
                </Txt>
              </View>
              <Txt variant="callout" importantForAccessibility="no" accessibilityElementsHidden>
                →
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  // One name per day: the lesson's title, and no week name in the kicker ("· understand" read as
  // an instruction, round 5).
  const kicker = finished ? 'your daily practice · all 28 days done' : `your daily practice · day ${day} of ${PROGRAM_DAYS}`;
  const title = doneToday ? 'done for today.' : today.lesson.title;
  const quiet = !doneToday && practisedToday;
  const meta = doneToday
    ? tomorrow
      ? `Tomorrow: day ${tomorrow.day}, ${tomorrow.lesson.title.toLowerCase()}.`
      : 'Every practice stays here, whenever you want it.'
    : quiet
      ? `You practiced today. Day ${day} is here tomorrow too.`
      : read
        ? `${minutes} min practice`
        : `2 min lesson (read or listen) · ${minutes} min practice`;

  const daily = (
    <Animated.View entering={FadeIn.duration(600)} style={styles.daily}>
      <SectionLabel style={{ marginBottom: space.s }}>{kicker}</SectionLabel>
      <Txt variant="title" accessibilityRole="header">
        {title}
      </Txt>
      <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
        {meta}
      </Txt>
      {doneToday ? (
        <OutlineButton label="practice again" onPress={() => startPractice(dayPlan(day, known))} style={{ marginTop: space.l }} />
      ) : quiet ? (
        // Still there for anyone who wants it, but no longer the loud thing on the page.
        <OutlineButton label={read ? `day ${day} practice` : `begin day ${day}`} onPress={begin} style={{ marginTop: space.l }} />
      ) : (
        <PrimaryButton label={read ? 'begin practice' : `begin day ${day}`} onPress={begin} style={{ marginTop: space.l }} />
      )}
      {short ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Or a 3-minute version. Begins now."
          onPress={beginShort}
          hitSlop={4}
          style={({ pressed }) => [styles.shortRow, { opacity: pressed ? 0.55 : 1 }]}
        >
          <Txt variant="callout" tone="secondary">
            or a 3-minute version{' '}
            <Txt variant="callout" tone="secondary" importantForAccessibility="no" accessibilityElementsHidden>
              →
            </Txt>
          </Txt>
        </Pressable>
      ) : null}
      {/* A row, not a caption: "adjust" was read as a note and missed (round 5). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Practice settings. Voice, length and sound."
        onPress={() => router.push({ pathname: '/before', params: { day: String(day) } })}
        style={({ pressed }) => [styles.settingsRow, { opacity: pressed ? 0.55 : 1 }]}
      >
        <Txt variant="callout" style={{ flex: 1 }}>
          practice settings
        </Txt>
        <Txt variant="title2" tone="secondary" importantForAccessibility="no" accessibilityElementsHidden>
          ›
        </Txt>
      </Pressable>
    </Animated.View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: space.xl }}
    >
      {/* Daisy's opening: the hour's sky, full-bleed, the wordmark over it. Shorter than it was, so
          the moments sit above the fold on a 393×852 screen. */}
      <Photo
        scene={sceneForHour(hour)}
        width={width}
        height={Math.max(180, Math.round(height * 0.24)) + insets.top}
        drift
        style={{ marginHorizontal: -space.xl }}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
        <View style={[styles.heroTop, { paddingTop: insets.top + space.xs }]}>
          <View style={{ width: HIT }} />
          <Wordmark tone="onImage" />
          <IconButton icon="gearshape" label="Settings" onPress={() => router.push('/settings')} tint={color.onImage} />
        </View>
        <View style={styles.heroBottom}>
          <Txt variant="title" accessibilityRole="header" style={[styles.onImage, styles.shadow]}>
            {partOfDay(now)}
          </Txt>
        </View>
      </Photo>

      {/* While a sound plays, it is the first thing under the photo: it was below the fold (round 5). */}
      {listen.id ? (
        <View style={{ marginTop: space.l }}>
          <NowPlaying listen={listen} />
        </View>
      ) : null}

      {rightNow}
      {daily}
      {logPain}
      {firstWeek}
      {week}
    </ScrollView>
  );
}

/**
 * A quiet "saved" for three seconds after a check-in, because a save with no confirmation left
 * people unsure it had worked (round 5). Shown when the check-in screen returns with `?saved=1`,
 * or when a check-in landed in the last five seconds (so it works whichever way the check-in
 * screen closes).
 */
function useSavedNote(param: string | undefined, checkIns: Array<{ at: number; isSample?: boolean }>): boolean {
  const latest = useMemo(() => checkIns.reduce((m, c) => (c.isSample ? m : Math.max(m, c.at)), 0), [checkIns]);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (param === '1') {
      setSaved(true);
      router.setParams({ saved: undefined });
    } else if (latest && Date.now() - latest < 5000) setSaved(true);
  }, [param, latest]);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);
  return saved;
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
          {listen.playing ? timerLabel(listen.timer, listen.timerElapsedMs) : 'paused'}
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
      justifyContent: 'center',
      gap: space.xxs,
      minHeight: 64,
      marginTop: space.s,
      paddingVertical: space.m,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: color.hairline,
    },
    logHead: { flexDirection: 'row', alignItems: 'center', gap: space.m },
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
    daily: { marginTop: space.xxl },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: HIT + 4,
      marginTop: space.s,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: color.hairline,
    },
    savedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: space.s },
    playing: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.s, paddingRight: space.l },
    playBtn: { width: 40, height: 40, borderRadius: 3, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  });
