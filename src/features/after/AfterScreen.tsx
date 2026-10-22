import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { currentTz } from '@/domain/checkin';
import { milestones, newlyEarned, practiceStats } from '@/domain/engagement';
import { EMPTY_PROGRAM, PROGRAM_DAYS, programDay, type ProgramState } from '@/domain/program';
import { quoteFor } from '@/domain/quotes';
import type { Session, SessionFeeling } from '@/domain/types';
import { Chip, Icon, PrimaryButton, QuietButton, Txt } from '@/design/components';
import { color, radius, space } from '@/design/theme';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { Enso } from '@/viz/Enso';

/**
 * After a guided session: a soft completion moment. What was done (minutes, days this
 * week, the program), how it felt (one optional tap, about the practice, never the pain),
 * any milestone this session earned, and tomorrow. Then a closing screen (22 Oct 2026): the
 * practice marked complete and one line to leave on (domain/quotes.ts), and the app is left.
 */

const FEELINGS: Array<{ value: SessionFeeling; label: string }> = [
  { value: 'settled', label: 'Settled' },
  { value: 'curious', label: 'Curious' },
  { value: 'restless', label: 'Restless' },
  { value: 'hard', label: 'Hard today' },
];

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

function withoutDay(p: ProgramState, day?: number): ProgramState {
  if (!day || !p.done[day]) return p;
  const done = { ...p.done };
  delete done[day];
  return { ...p, done };
}

/** Straight after a session. Every session ends here now: no recap map, no journey (22 Oct 2026). */
export function RecapRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions } = useData();
  const session = sessions.find((s) => s.id === id);
  if (session) return <AfterScreen session={session} />;
  return (
    <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
      <Txt tone="secondary">This session is no longer here.</Txt>
      <QuietButton label="Back" onPress={() => router.navigate('/')} />
    </View>
  );
}

export function AfterScreen({ session }: { session: Session }) {
  const insets = useSafeAreaInsets();
  const { sessions, prefs, setFeeling } = useData();
  const vs = useVoiceSession();
  const tz = currentTz();
  const now = Date.now();
  const program = prefs.program ?? EMPTY_PROGRAM;
  const minutes = Math.max(1, Math.round((session.endedAt - session.startedAt) / 60_000));
  const stats = useMemo(() => practiceStats(sessions, now, tz), [sessions, now, tz]);
  const earned = useMemo(() => {
    const moments = prefs.moments?.length ?? 0;
    const before = milestones({
      sessions: sessions.filter((s) => s.id !== session.id),
      program: withoutDay(program, session.programDay),
      moments,
      tz,
    });
    const after = milestones({ sessions, program, moments, tz });
    return newlyEarned(before, after);
  }, [sessions, program, prefs.moments, session.id, session.programDay, tz]);
  const dayDone = session.programDay && program.done[session.programDay];
  const next = session.programDay && session.programDay < PROGRAM_DAYS ? programDay(session.programDay + 1) : undefined;
  const early = session.outcome === 'ended_early';
  const [closing, setClosing] = useState(false);

  const done = () => {
    vs.reset();
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/');
  };

  if (closing) return <Closing session={session} dayDone={!!dayDone} onDone={done} />;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space.xl,
          paddingBottom: space.xl,
          paddingHorizontal: space.l,
        }}
      >
        <Animated.View entering={FadeIn.duration(1400)} style={{ alignItems: 'center' }}>
          <Enso width={150} height={150} mode="idle" dim={0.95} />
          <Txt
            variant="caption"
            style={{
              color: color.practice,
              letterSpacing: 1.4,
              marginTop: space.xs,
            }}
          >
            {dayDone ? `DAY ${session.programDay} COMPLETE` : 'PRACTICE COMPLETE'}
          </Txt>
          <Txt variant="display" align="center" style={{ marginTop: space.s }}>
            {early ? `You stopped after ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}. That still counts.` : `${WORDS[minutes] ?? minutes} quiet minutes, done.`}
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(900).duration(900)} style={styles.tiles}>
          <View style={styles.tile}>
            <Txt variant="title">{String(stats.daysThisWeek)}</Txt>
            <Txt variant="caption" tone="tertiary" align="center">
              {stats.daysThisWeek === 1 ? 'day this week' : 'days this week'}
            </Txt>
          </View>
          <View style={styles.tile}>
            <Txt variant="title">{String(stats.minutes)}</Txt>
            <Txt variant="caption" tone="tertiary" align="center">
              minutes, all time
            </Txt>
          </View>
          <View style={styles.tile}>
            <Txt variant="title">{`${Object.keys(program.done).length}/${PROGRAM_DAYS}`}</Txt>
            <Txt variant="caption" tone="tertiary" align="center">
              days of the program
            </Txt>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(1300).duration(900)}>
          <Txt variant="headline" style={{ marginTop: space.xl }}>
            How did that feel?
          </Txt>
          <View style={styles.feelings}>
            {FEELINGS.map((f) => (
              <Chip key={f.value} label={f.label} selected={session.feeling === f.value} style={{ flexGrow: 1 }} onPress={() => setFeeling(session.id, session.feeling === f.value ? null : f.value)} />
            ))}
          </View>
          <Txt variant="caption" tone="tertiary" style={{ marginTop: space.s }}>
            Optional. About the practice, not the pain.
          </Txt>

          {earned.map((m) => (
            <View key={m.id} style={styles.milestone} accessible accessibilityLabel={`New milestone: ${m.label}. ${m.detail}`}>
              <Icon name="star.fill" size={22} tint={color.milestone} />
              <View style={{ flex: 1 }}>
                <Txt variant="headline">New milestone: {m.label.charAt(0).toLowerCase() + m.label.slice(1)}</Txt>
                <Txt variant="footnote" tone="secondary">
                  {m.detail}
                </Txt>
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: space.l,
          paddingBottom: insets.bottom + space.l,
          gap: space.m,
        }}
      >
        {next ? (
          <Txt variant="footnote" tone="tertiary" align="center">
            Tomorrow · Day {next.day} · {next.lesson.title}
          </Txt>
        ) : null}
        <PrimaryButton label="Continue" onPress={() => setClosing(true)} />
      </View>
    </View>
  );
}

/** The last screen of a session: done, one quiet line, and back to the day. */
function Closing({ session, dayDone, onDone }: { session: Session; dayDone: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const quote = useMemo(() => quoteFor(session.id), [session.id]);
  return (
    <View style={[styles.root, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.l, paddingHorizontal: space.l }]}>
      <View style={styles.closing}>
        <Animated.View entering={ZoomIn.duration(900).easing(Easing.out(Easing.cubic))} style={styles.seal} accessible accessibilityLabel={dayDone ? `Day ${session.programDay} complete` : 'Practice complete'}>
          <Icon name="checkmark" size={30} tint={color.practice} weight="medium" />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(300).duration(1200)}>
          <Txt variant="caption" align="center" style={{ color: color.practice, letterSpacing: 1.4, marginTop: space.l }}>
            {dayDone ? `DAY ${session.programDay} COMPLETE` : 'PRACTICE COMPLETE'}
          </Txt>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(900).duration(1400)} style={{ marginTop: space.xxxl }}>
          <Txt variant="title" align="center" style={{ fontWeight: '500' }}>
            {quote.text}
          </Txt>
          <Txt variant="footnote" tone="tertiary" align="center" style={{ marginTop: space.l }}>
            {quote.by}
          </Txt>
        </Animated.View>
      </View>
      <Animated.View entering={FadeIn.delay(1800).duration(900)}>
        <PrimaryButton label="Done" onPress={onDone} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  closing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.s },
  seal: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.practiceSoft,
  },
  tiles: { flexDirection: 'row', gap: space.s, marginTop: space.xl },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    padding: space.m,
    borderRadius: radius.m,
    backgroundColor: color.surface,
  },
  feelings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s,
    marginTop: space.m,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    marginTop: space.l,
    padding: space.l,
    borderRadius: radius.m,
    backgroundColor: color.milestoneSoft,
  },
});
