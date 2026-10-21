import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { currentTz, dayKey, latestPlace } from '@/domain/checkin';
import { practiceStats, weekLine, weekStrip } from '@/domain/engagement';
import { presetById, PRESETS, voiceFor } from '@/domain/presets';
import { currentDay, EMPTY_PROGRAM, PROGRAM_DAYS, programDay, WEEKS } from '@/domain/program';
import { speakPlace } from '@/domain/regions';
import { CATEGORY_ART, WEEK_ART } from '@/design/art';
import { haptic, Icon, Txt } from '@/design/components';
import { CoverArt, HeaderGradient, Pill, PlayButton, Shelf, ShelfCard, Tile } from '@/design/media';
import { color, HIT, radius, space } from '@/design/theme';
import { scheduleReminders } from '@/voice/reminders';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { greeting } from '../shared/format';
import { startPreset } from '../shared/PresetCard';
import { WeekStrip } from '../shared/WeekStrip';

/**
 * Today: one next step, laid out like a listening app's home. The day's lesson and practice
 * first, as a card with its cover and a play button; then quick tiles (a flare, a check-in,
 * sleep, the goal); this week's practice days; and a shelf of any-time sessions. The pain
 * record isn't here — Today is about doing, Progress is for looking back (docs/RESEARCH.md §5).
 */

/** A program day's cover: its week's art with the day number set large, like a daily mix. */
export function DayCover({ day, week, size }: { day: number; week: 1 | 2 | 3 | 4; size: number }) {
  return (
    <CoverArt art={WEEK_ART[week]} seed={day} size={size}>
      <View style={{ position: 'absolute', left: size * 0.1, bottom: size * 0.08 }}>
        <Txt variant="caption" style={{ fontSize: Math.max(9, size * 0.1), letterSpacing: 1.2, opacity: 0.85 }}>
          DAY
        </Txt>
        <Txt style={{ fontSize: size * 0.42, lineHeight: size * 0.44, fontWeight: '800', letterSpacing: -size * 0.02, color: color.text }}>{String(day)}</Txt>
      </View>
    </CoverArt>
  );
}

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

  const { width } = useWindowDimensions();
  const flare = presetById('flare-3')!;
  const sleep = presetById('sleep-5')!;
  const worry = presetById('worry-5')!;
  const anytime = PRESETS.filter((p) => !['flare-3', 'sleep-5', 'notice-5'].includes(p.id));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
      <HeaderGradient art={WEEK_ART[today.week]} width={width} height={insets.top + 260} />
      <View style={[styles.head, { paddingTop: insets.top + space.l }]}>
        <Txt variant="title" accessibilityRole="header" style={{ flex: 1 }}>
          {greeting()}
        </Txt>
        <Pill label={finished ? 'Program complete' : `Day ${day} of ${PROGRAM_DAYS}`} />
      </View>

      <Animated.View entering={FadeIn.duration(500)} style={styles.section}>
        <View style={styles.today}>
          <View style={styles.todayTop}>
            <DayCover day={day} week={today.week} size={92} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt variant="caption" style={styles.kicker} numberOfLines={1}>
                {finished ? 'ANY TIME' : `TODAY · WEEK ${today.week} · ${WEEKS[today.week].name.toUpperCase()}`}
              </Txt>
              <Txt variant="title2" numberOfLines={2} style={{ marginTop: 2 }}>
                {today.practice.title}
              </Txt>
              <Txt variant="footnote" tone="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
                {today.practice.minutes} min practice · rests on {restsOn}
              </Txt>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Lesson: ${today.lesson.title}. ${read ? 'Read.' : '2 minutes.'}`}
            onPress={() => router.push({ pathname: '/lesson/[day]', params: { day: String(day) } })}
            style={({ pressed }) => [styles.lesson, pressed && { backgroundColor: color.surfacePressed }]}
          >
            <Icon name={read ? 'checkmark.circle.fill' : 'book.fill'} size={18} tint={read ? color.practice : color.textSecondary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt variant="callout" numberOfLines={1} style={{ fontWeight: '600' }}>
                {today.lesson.title}
              </Txt>
              <Txt variant="footnote" tone="secondary">
                {read ? 'Lesson read' : 'Lesson · 2 min · read first'}
              </Txt>
            </View>
            <Icon name="chevron.right" size={13} tint={color.textTertiary} />
          </Pressable>

          <View style={styles.todayBottom}>
            {doneToday ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, flex: 1 }}>
                <Icon name="checkmark.circle.fill" size={20} tint={color.practice} />
                <Txt variant="callout" tone="secondary" style={{ flex: 1 }}>
                  {finished ? 'All 28 days done. Every practice stays here.' : `Day ${day} is done. Day ${day + 1} opens tomorrow.`}
                </Txt>
              </View>
            ) : (
              <>
                <Txt variant="footnote" tone="secondary" style={{ flex: 1 }}>
                  {read ? `Ready · ${today.practice.minutes} min` : `Lesson, then ${today.practice.minutes} min practice`}
                </Txt>
                <PlayButton label={read ? `Begin Day ${day}` : `Continue Day ${day}`} onPress={go} size={52} />
              </>
            )}
          </View>
        </View>
      </Animated.View>

      <View style={[styles.section, styles.grid]}>
        <View style={styles.gridRow}>
          <Tile art={CATEGORY_ART.flare} seed={3} title="Flare? 3 min" label="Flare. A 3-minute session for right now" onPress={() => startPreset(flare)} />
          <Tile art="slate" seed={5} title="Check in" label="Check in. How it is today, and where" onPress={() => router.push('/checkin')} />
        </View>
        <View style={styles.gridRow}>
          <Tile art={CATEGORY_ART.sleep} seed={7} title={sleep.title} onPress={() => startPreset(sleep)} />
          {prefs.goal ? (
            <Tile art="moss" seed={9} title="Save a moment" label={`Save a moment toward ${prefs.goal}`} onPress={() => router.push('/moment')} />
          ) : (
            <Tile art={CATEGORY_ART.worry} seed={9} title={worry.title} onPress={() => startPreset(worry)} />
          )}
        </View>
      </View>

      <View style={[styles.section, { paddingHorizontal: space.l }]}>
        <Txt variant="title2" accessibilityRole="header" style={{ marginBottom: space.m }}>
          This week
        </Txt>
        <WeekStrip days={strip} />
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.m }}>
          {weekLine(stats, now)}
        </Txt>
      </View>

      <Shelf title="Any time" style={styles.section}>
        {anytime.map((p, i) => (
          <ShelfCard key={p.id} art={CATEGORY_ART[p.category]} seed={i + 11} title={p.title} subtitle={`${p.minutes} min · ${p.voiceName}`} onPress={() => startPreset(p)} />
        ))}
      </Shelf>

      {prefs.goal ? (
        <View style={[styles.section, { paddingHorizontal: space.l }]}>
          <View style={styles.goal}>
            <Txt variant="caption" style={{ color: color.milestone, letterSpacing: 1.2 }}>
              TOWARD · {prefs.goal.toUpperCase()}
            </Txt>
            <Txt variant="callout" style={{ marginTop: space.xs }}>
              {lastMoment ? `Last moment you saved: “${lastMoment.text}”` : 'Did something toward it today, however small? Save it as a moment.'}
            </Txt>
            <Pressable accessibilityRole="button" onPress={() => router.push('/moment')} style={styles.goalLink} hitSlop={8}>
              <Txt variant="callout" style={{ color: color.milestone, fontWeight: '700' }}>
                Save a moment
              </Txt>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.l },
  section: { marginTop: space.xl },
  today: { marginHorizontal: space.l, padding: space.m, gap: space.m, borderRadius: radius.m, backgroundColor: color.surface },
  todayTop: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  kicker: { color: color.practice, letterSpacing: 1.1 },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: HIT + 8,
    paddingHorizontal: space.m,
    borderRadius: radius.s,
    backgroundColor: color.surfaceStrong,
  },
  todayBottom: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 52 },
  grid: { paddingHorizontal: space.l, gap: space.s },
  gridRow: { flexDirection: 'row', gap: space.s },
  goal: { padding: space.l, borderRadius: radius.m, backgroundColor: color.milestoneSoft },
  goalLink: { minHeight: 36, justifyContent: 'center', marginTop: space.xs, alignSelf: 'flex-start' },
});
