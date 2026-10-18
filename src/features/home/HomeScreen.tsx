import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { currentTz, dayKey, latestPlace } from '@/domain/checkin';
import { practiceStats, weekLine, weekStrip } from '@/domain/engagement';
import { currentDay, EMPTY_PROGRAM, PROGRAM_DAYS, programDay, WEEKS } from '@/domain/program';
import { soundscape, timerLabel } from '@/domain/soundscapes';
import { speakPlace } from '@/domain/regions';
import { Card, haptic, Icon, OutlineButton, PrimaryButton, SectionLabel, Txt, Wordmark } from '@/design/components';
import { HIT, radius, space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { pauseListening, resumeListening, useListen } from '@/voice/listen';
import { scheduleReminders } from '@/voice/reminders';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { Photo, sceneForHour } from '@/design/Photo';
import { greeting } from '../shared/format';
import { WeekStrip } from '../shared/WeekStrip';

/**
 * Today: a window onto the hour's sky, then one next step. The day's lesson and practice, this week's practice days, a way in
 * for a flare, a check-in, and the person's goal. The pain record isn't here — Today is
 * about doing, Progress is for looking back (docs/RESEARCH.md §5).
 */

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
  const place = latestPlace(checkIns) ?? prefs.place;
  const restsOn = today.practice.theme === 'open' || !place ? 'the body as a whole' : speakPlace(place.region, place.side);
  const lastMoment = prefs.moments?.[0];

  // Keep the reminder in step with the latest practice: daily while practising, weekly after
  // four quiet days (voice/reminders.ts). Rescheduling is idempotent.
  useEffect(() => {
    scheduleReminders(prefs.reminder, stats.lastPractice);
  }, [prefs.reminder, stats.lastPractice]);

  const { warm } = useVoiceSession();
  // Ready the practice while the person reads Today, so Begin goes straight to the guide's first words.
  useEffect(() => warm(today.practice.sessionType, prefs.voiceId), [today.practice.sessionType, prefs.voiceId, warm]);

  const go = () => {
    haptic('soft');
    if (!read && !doneToday) router.push({ pathname: '/lesson/[day]', params: { day: String(day) } });
    else router.push({ pathname: '/before', params: { day: String(day) } });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: space.xl }}
    >
      {/* Daisy's opening: a full-bleed photograph of the hour's sky, the wordmark over it. */}
      <Photo scene={sceneForHour(new Date(now).getHours())} width={width} height={Math.round(height * 0.5)} drift style={{ marginHorizontal: -space.xl }}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} />
        <View style={[styles.hero, { paddingTop: insets.top + space.s }]}>
          <Wordmark tone="onImage" style={{ alignSelf: 'center' }} />
          <View>
            <Txt variant="display" accessibilityRole="header" style={[styles.onImage, styles.onSky]}>
              {greeting()}
            </Txt>
            <Txt variant="callout" style={[styles.onImage, styles.onSky, { opacity: 0.9, marginTop: space.xs }]}>
              {finished ? 'program complete' : `day ${day} of ${PROGRAM_DAYS}`}
            </Txt>
          </View>
        </View>
      </Photo>

      <Animated.View entering={FadeIn.duration(800)} style={{ marginTop: space.xl }}>
        <WeekStrip days={strip} />
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.m }}>
          {weekLine(stats, now)}
        </Txt>
      </Animated.View>

      <Card style={styles.today}>
        <Txt variant="footnote" style={styles.kicker}>
          {finished ? 'any time' : `today · week ${today.week} · ${WEEKS[today.week].name.toLowerCase()}`}
        </Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Lesson: ${today.lesson.title}. ${read ? 'Read.' : '2 minutes.'}`}
          onPress={() => router.push({ pathname: '/lesson/[day]', params: { day: String(day) } })}
          style={({ pressed }) => [styles.step, { opacity: pressed ? 0.6 : read ? 0.72 : 1 }]}
        >
          <View style={[styles.mark, read && styles.markDone]}>
            {read ? <Icon name="checkmark" size={13} tint={color.practice} weight="bold" /> : <Txt variant="footnote" style={{ fontWeight: '700' }}>1</Txt>}
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="body">{today.lesson.title}</Txt>
            <Txt variant="footnote" tone="secondary">
              Lesson · 2 min
            </Txt>
          </View>
        </Pressable>
        <View style={[styles.step, { opacity: doneToday ? 0.72 : 1 }]}>
          <View style={[styles.mark, doneToday && styles.markDone]}>
            {doneToday ? <Icon name="checkmark" size={13} tint={color.practice} weight="bold" /> : <Txt variant="footnote" style={{ fontWeight: '700' }}>2</Txt>}
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="body" style={{ fontWeight: '600' }}>
              {today.practice.title}
            </Txt>
            <Txt variant="footnote" tone="secondary">
              Practice · {today.practice.minutes} min · rests on {restsOn}
            </Txt>
          </View>
        </View>
        {doneToday ? (
          <Txt variant="callout" tone="secondary" style={{ marginTop: space.xs }}>
            {finished ? 'All 28 days done. Every practice stays here.' : `Day ${day} is done. Day ${day + 1} opens tomorrow.`}
          </Txt>
        ) : (
          <PrimaryButton label={read ? `Begin Day ${day}` : `Continue Day ${day}`} onPress={go} style={{ marginTop: space.s }} />
        )}
      </Card>

      <View style={styles.quick}>
        <Card label="Flare. A 3-minute session for right now" onPress={() => router.push({ pathname: '/before', params: { preset: 'flare-3' } })} style={styles.quickCard}>
          <SectionLabel style={{ marginBottom: space.xs }}>flare?</SectionLabel>
          <Txt variant="callout">A 3-minute session for right now →</Txt>
        </Card>
        <Card label="Check in. How it is today, and where" onPress={() => router.push('/checkin')} style={styles.quickCard}>
          <SectionLabel style={{ marginBottom: space.xs }}>check in</SectionLabel>
          <Txt variant="callout">How it is today, and where →</Txt>
        </Card>
      </View>

      <ListenCard listen={listen} lastId={prefs.listen?.id} />

      {prefs.goal ? (
        <Card style={styles.goal}>
          <Txt variant="footnote" style={{ color: color.milestone, fontWeight: '500' }}>
            toward · {prefs.goal.toLowerCase()}
          </Txt>
          <Txt variant="callout" style={{ marginTop: space.xs }}>
            {lastMoment ? `Last moment you saved: “${lastMoment.text}”` : 'Did something toward it today, however small? Save it as a moment.'}
          </Txt>
          <OutlineButton label="save a moment" onPress={() => router.push('/moment')} style={{ marginTop: space.m }} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

/**
 * Just listen: a sound on its own, with a sleep timer. While one plays, the card shows it and
 * pauses it in place; otherwise it opens the sounds.
 */
function ListenCard({ listen, lastId }: { listen: ReturnType<typeof useListen>; lastId?: string }) {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const s = soundscape(listen.id ?? lastId) ?? soundscape('rain')!;
  const live = !!listen.id;
  return (
    <Card style={styles.listen}>
      <Photo scene={s.id} width={132} height={164} />
      <View style={styles.listenText}>
        <Txt variant="footnote" style={{ color: color.sky, fontWeight: '500' }}>
          {live ? (listen.playing ? 'playing' : 'paused') : 'just listen'}
        </Txt>
        <Txt variant="title2" style={{ marginTop: 2 }}>
          {live ? s.name.toLowerCase() : 'rain, forest, water'}
        </Txt>
        <Txt variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
          {live ? timerLabel(listen.timer, listen.timerElapsedMs) : 'Nature sounds, with a sleep timer.'}
        </Txt>
        <View style={{ flexDirection: 'row', gap: space.s, marginTop: space.m, alignItems: 'center' }}>
          <OutlineButton label={live ? 'sounds' : 'listen'} onPress={() => router.push('/listen')} />
          {live ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={listen.playing ? 'Pause' : 'Resume'}
              hitSlop={8}
              onPress={() => {
                haptic('select');
                if (listen.playing) pauseListening();
                else resumeListening();
              }}
              style={styles.listenBtn}
            >
              <Icon name={listen.playing ? 'pause.fill' : 'play.fill'} size={13} tint={color.onAccent} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
  hero: { flex: 1, justifyContent: 'space-between', paddingHorizontal: space.xl, paddingBottom: space.xl },
  onImage: { color: color.onImage },
  onSky: { textShadowColor: 'rgba(5,8,9,0.3)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 1 } },
  listen: { marginTop: space.m, flexDirection: 'row' },
  listenText: { flex: 1, padding: space.l, justifyContent: 'center' },
  listenBtn: { width: 40, height: 40, borderRadius: 3, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  today: { marginTop: space.xl, padding: space.l, gap: space.m },
  kicker: { color: color.practice, fontWeight: '500' },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: HIT },
  mark: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: color.text, alignItems: 'center', justifyContent: 'center' },
  markDone: { borderWidth: 0, backgroundColor: color.practiceSoft },
  quick: { flexDirection: 'row', gap: space.m, marginTop: space.m },
  quickCard: { flex: 1, padding: space.l, minHeight: 96 },
  goal: { marginTop: space.m, padding: space.l, backgroundColor: color.milestoneSoft, borderColor: color.hairline },
});
