import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import type { SessionType } from '@/domain/types';
import { currentTz, dayKey } from '@/domain/checkin';
import { practiceStats, weekLine, weekStrip } from '@/domain/engagement';
import { currentDay, EMPTY_PROGRAM, PROGRAM_DAYS, programDay, WEEKS } from '@/domain/program';
import { NEED_IT, presetById } from '@/domain/presets';
import { soundscape, timerLabel } from '@/domain/soundscapes';
import { Card, haptic, Icon, IconButton, PrimaryButton, QuietButton, SectionLabel, Txt, Wordmark } from '@/design/components';
import { Photo, sceneForHour, type SceneId } from '@/design/Photo';
import { HIT, radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { pauseListening, resumeListening, useListen } from '@/voice/listen';
import { scheduleReminders } from '@/voice/reminders';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { greeting } from '../shared/format';
import { dayPlan, presetPlan, startPractice } from '../shared/start';
import { WeekStrip } from '../shared/WeekStrip';

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

/** A place for each moment, from the same photographs as the sounds. */
const NEED_SCENE: Record<string, SceneId> = { 'flare-3': 'ocean', 'sleep-10': 'evening', 'scan-10': 'forest', 'worry-5': 'stream' };
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
  const now = Date.now();
  const program = prefs.program ?? EMPTY_PROGRAM;
  const { day, doneToday, finished } = currentDay(program, dayKey(now, tz));
  const today = programDay(day);
  const read = program.read.includes(day);
  const strip = useMemo(() => weekStrip(sessions, now, tz), [sessions, now, tz]);
  const stats = useMemo(() => practiceStats(sessions, now, tz), [sessions, now, tz]);
  const checkedInToday = checkIns.some((c) => !c.isSample && dayKey(c.at, tz) === dayKey(now, tz));
  const known = { prefs, checkIns };

  // Keep the reminder in step with the latest practice: daily while practising, weekly after
  // four quiet days (voice/reminders.ts). Rescheduling is idempotent.
  useEffect(() => {
    scheduleReminders(prefs.reminder, stats.lastPractice);
  }, [prefs.reminder, stats.lastPractice]);

  const { warm } = useVoiceSession();
  // Ready the practice while the person reads Today, so Begin goes straight to the guide's first words.
  useEffect(() => warm(today.practice.sessionType, prefs.voiceId), [today.practice.sessionType, prefs.voiceId, warm]);

  const begin = () => {
    haptic('soft');
    if (!read) router.push({ pathname: '/lesson/[day]', params: { day: String(day) } });
    else startPractice(dayPlan(day, known));
  };

  const lead = prefs.focus ? FOCUS_NEED[prefs.focus] : undefined;
  const needs = lead ? [...NEED_IT.filter((n) => n.id === lead), ...NEED_IT.filter((n) => n.id !== lead)] : NEED_IT;
  const tile = (width - space.xl * 2 - space.m) / 2;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: space.xl }}
    >
      {/* Daisy's opening: the hour's sky, full-bleed, the wordmark over it. */}
      <Photo scene={sceneForHour(new Date(now).getHours())} width={width} height={Math.round(height * 0.42)} drift style={{ marginHorizontal: -space.xl }}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
        <View style={[styles.heroTop, { paddingTop: insets.top + space.xs }]}>
          <View style={{ width: HIT }} />
          <Wordmark tone="onImage" />
          <IconButton icon="gearshape" label="Settings" onPress={() => router.push('/settings')} tint={color.onImage} />
        </View>
        <View style={styles.heroBottom}>
          <Txt variant="display" accessibilityRole="header" style={[styles.onImage, styles.shadow]}>
            {greeting()}
          </Txt>
          <Txt variant="callout" style={[styles.onImage, styles.shadow, { opacity: 0.9, marginTop: space.xs }]}>
            {finished ? 'all 28 days done' : `day ${day} of ${PROGRAM_DAYS} · ${WEEKS[today.week].name.toLowerCase()}`}
          </Txt>
        </View>
      </Photo>

      {/* The one thing to do today. */}
      <Animated.View entering={FadeIn.duration(600)}>
        <Card style={styles.today}>
          <Txt variant="footnote" style={styles.kicker}>
            {doneToday ? 'done for today' : finished ? 'any day' : 'today'}
          </Txt>
          <Txt variant="title" style={{ marginTop: space.xs }}>
            {today.lesson.title}
          </Txt>
          <Txt variant="callout" tone="secondary" style={{ marginTop: space.xs }}>
            {doneToday
              ? finished
                ? 'Every practice stays here, whenever you want it.'
                : `Day ${day + 1} opens tomorrow. Nothing else to do.`
              : read
                ? `${today.practice.minutes} min practice · eyes closed`
                : `2 min read, then ${today.practice.minutes} min practice · eyes closed`}
          </Txt>
          {doneToday ? (
            <QuietButton label="Practise again" tone="primary" onPress={() => startPractice(dayPlan(day, known))} style={{ alignSelf: 'flex-start', marginTop: space.s, paddingHorizontal: 0 }} />
          ) : (
            <>
              <PrimaryButton label={read ? 'begin practice' : `begin day ${day}`} onPress={begin} style={{ marginTop: space.l }} />
              <QuietButton
                label="Adjust length, voice or sound"
                onPress={() => router.push({ pathname: '/before', params: { day: String(day) } })}
                style={{ alignSelf: 'center', marginTop: space.xs }}
              />
            </>
          )}
        </Card>
      </Animated.View>

      <View style={{ marginTop: space.xl }}>
        <WeekStrip days={strip} />
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.m }}>
          {weekLine(stats, now)}
        </Txt>
      </View>

      {!checkedInToday ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log today’s pain. Ten seconds."
          onPress={() => router.push('/checkin')}
          style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
        >
          <View style={{ flex: 1 }}>
            <Txt variant="headline">Log today’s pain</Txt>
            <Txt variant="footnote" tone="secondary">
              10 seconds. Over weeks, it shows you what’s changing.
            </Txt>
          </View>
          <Icon name="chevron.right" size={14} tint={color.textTertiary} />
        </Pressable>
      ) : null}

      {/* Outside the program: the moments people open the app for anyway. */}
      <SectionLabel style={{ marginTop: space.xxl }}>when you need it</SectionLabel>
      <View style={styles.grid}>
        {needs.map((n) => {
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
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Photo scene={NEED_SCENE[n.id] ?? 'tone'} width={tile} height={Math.round(tile * 0.78)} radius={radius.s}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
                <View style={styles.tileText}>
                  <Txt variant="headline" style={[styles.onImage, styles.shadow]}>
                    {n.label}
                  </Txt>
                  <Txt variant="footnote" style={[styles.onImage, styles.shadow, { opacity: 0.9 }]}>
                    {n.detail}
                  </Txt>
                </View>
              </Photo>
            </Pressable>
          );
        })}
      </View>

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
    heroBottom: { position: 'absolute', left: space.xl, right: space.xl, bottom: space.xl + space.l },
    onImage: { color: color.onImage },
    shadow: { textShadowColor: 'rgba(5,8,9,0.3)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 1 } },
    today: { marginTop: -space.l, padding: space.xl },
    kicker: { color: color.practice, fontWeight: '600' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.m,
      minHeight: 64,
      marginTop: space.xl,
      paddingVertical: space.m,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: color.hairline,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
    tileText: { position: 'absolute', left: space.m, right: space.m, bottom: space.m },
    playing: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.s, paddingRight: space.l },
    playBtn: { width: 40, height: 40, borderRadius: 3, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  });
