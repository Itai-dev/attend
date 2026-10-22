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
import { Card, haptic, Icon, PrimaryButton, SettingsButton, Txt } from '@/design/components';
import { Pill } from '@/design/media';
import { color, HIT, radius, space } from '@/design/theme';
import { scheduleReminders } from '@/voice/reminders';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { greeting } from '../shared/format';
import { WeekStrip } from '../shared/WeekStrip';

/**
 * Today: one next step. The day's lesson and practice, this week's practice days, and a
 * quiet way to check in. Kept this simple on purpose (22 Oct 2026): other sessions live in
 * Explore, the record and milestones on the person's own tab, settings behind the gear.
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
          {prefs.name?.trim() ? `${greeting().replace(/\.$/, '')},\n${prefs.name.trim()}.` : greeting()}
        </Txt>
        <SettingsButton />
      </View>
      <View style={{ flexDirection: 'row', marginTop: space.m }}>
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

      <Card label="Check in. How it is today, and where" onPress={() => router.push('/checkin')} style={styles.checkin}>
        <View style={[styles.quickIcon, { backgroundColor: color.practiceSoft }]}>
          <Icon name="square.and.pencil" size={17} tint={color.practice} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="headline">Check in</Txt>
          <Txt variant="footnote" tone="secondary">
            How it is today, and where
          </Txt>
        </View>
        <Icon name="chevron.right" size={14} tint={color.textTertiary} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.m },
  today: { marginTop: space.xl, padding: space.l + 4, gap: space.m, borderRadius: radius.l },
  kicker: { color: color.practice, letterSpacing: 1.4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: HIT },
  mark: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: color.text, alignItems: 'center', justifyContent: 'center' },
  markDone: { borderWidth: 0, backgroundColor: color.practiceSoft },
  checkin: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.m, padding: space.l, borderRadius: radius.l },
  quickIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
