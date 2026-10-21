import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { currentTz, dayKey, latestPlace } from '@/domain/checkin';
import { practiceStats, weekLine, weekStrip } from '@/domain/engagement';
import { voiceFor } from '@/domain/presets';
import { currentDay, EMPTY_PROGRAM, PROGRAM_DAYS, programDay, WEEKS } from '@/domain/program';
import { speakPlace } from '@/domain/regions';
import { Card, haptic, Icon, PrimaryButton, Txt } from '@/design/components';
import { Pill } from '@/design/media';
import { color, HIT, radius, space } from '@/design/theme';
import { scheduleReminders } from '@/voice/reminders';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { greeting } from '../shared/format';
import { ListenCard } from '../shared/ListenCard';
import { WeekStrip } from '../shared/WeekStrip';

/**
 * Today: one next step. The day's lesson and practice, this week's practice days, a way in
 * for a flare, a check-in, and the person's goal. The pain record isn't here — Today is
 * about doing, Progress is for looking back (docs/RESEARCH.md §5).
 */

export function HomeScreen() {
  const insets = useSafeAreaInsets();
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
  useEffect(() => warm(today.practice.sessionType, voiceFor(today.practice.sessionType, prefs.voices)), [today.practice.sessionType, prefs.voices, warm]);

  const go = () => {
    haptic('soft');
    if (!read && !doneToday) router.push({ pathname: '/lesson/[day]', params: { day: String(day) } });
    else router.push({ pathname: '/before', params: { day: String(day) } });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.l, paddingBottom: insets.bottom + 120, paddingHorizontal: space.l }}
    >
      <View style={styles.head}>
        <Txt variant="display" accessibilityRole="header" style={{ flex: 1 }}>
          {greeting()}
        </Txt>
        <Pill label={finished ? 'Program complete' : `Day ${day} of ${PROGRAM_DAYS}`} />
      </View>

      <Animated.View entering={FadeIn.duration(800)} style={{ marginTop: space.xl }}>
        <WeekStrip days={strip} />
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.m }}>
          {weekLine(stats, now)}
        </Txt>
      </Animated.View>

      <Card style={styles.today}>
        <Txt variant="caption" style={styles.kicker}>
          {finished ? 'ANY TIME' : `TODAY · WEEK ${today.week} · ${WEEKS[today.week].name.toUpperCase()}`}
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
            <Txt variant="headline">{today.practice.title}</Txt>
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
          <View style={[styles.quickIcon, { backgroundColor: color.practiceSoft }]}>
            <Icon name="wind" size={18} tint={color.practice} />
          </View>
          <Txt variant="headline" style={{ marginTop: space.m }}>
            Flare?
          </Txt>
          <Txt variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
            A 3-minute session for right now
          </Txt>
        </Card>
        <Card label="Check in. How it is today, and where" onPress={() => router.push('/checkin')} style={styles.quickCard}>
          <View style={[styles.quickIcon, { backgroundColor: color.practiceSoft }]}>
            <Icon name="square.and.pencil" size={17} tint={color.practice} />
          </View>
          <Txt variant="headline" style={{ marginTop: space.m }}>
            Check in
          </Txt>
          <Txt variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
            How it is today, and where
          </Txt>
        </Card>
      </View>
      <View style={{ marginTop: space.m }}>
        <ListenCard />
      </View>

      {prefs.goal ? (
        <Card style={styles.goal}>
          <Txt variant="caption" style={{ color: color.milestone, letterSpacing: 1.2 }}>
            TOWARD · {prefs.goal.toUpperCase()}
          </Txt>
          <Txt variant="callout" style={{ marginTop: space.xs }}>
            {lastMoment ? `Last moment you saved: “${lastMoment.text}”` : 'Did something toward it today, however small? Save it as a moment.'}
          </Txt>
          <Pressable accessibilityRole="button" onPress={() => router.push('/moment')} style={styles.goalLink} hitSlop={8}>
            <Txt variant="callout" style={{ color: color.milestone }}>
              Save a moment
            </Txt>
          </Pressable>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  today: { marginTop: space.xl, padding: space.l + 4, gap: space.m, borderRadius: radius.l },
  kicker: { color: color.practice, letterSpacing: 1.4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: HIT },
  mark: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: color.text, alignItems: 'center', justifyContent: 'center' },
  markDone: { borderWidth: 0, backgroundColor: color.practiceSoft },
  quick: { flexDirection: 'row', gap: space.m, marginTop: space.m },
  quickCard: { flex: 1, padding: space.l, minHeight: 112, borderRadius: radius.l },
  quickIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  goal: { marginTop: space.m, padding: space.l, borderRadius: radius.l, backgroundColor: color.milestoneSoft },
  goalLink: { minHeight: 36, justifyContent: 'center', marginTop: space.xs, alignSelf: 'flex-start' },
});
