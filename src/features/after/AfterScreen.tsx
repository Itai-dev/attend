import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { currentTz } from '@/domain/checkin';
import { milestones, newlyEarned, practiceStats, weekLine, weekStrip } from '@/domain/engagement';
import { EMPTY_PROGRAM, PROGRAM_DAYS, programDay, type ProgramState } from '@/domain/program';
import type { Session, SessionFeeling } from '@/domain/types';
import { Chip, Icon, PrimaryButton, Txt } from '@/design/components';
import { space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { BreathingField } from '@/viz/BreathingField';
import { WeekStrip } from '../shared/WeekStrip';

/**
 * After a guided session: one soft completion moment, not a dashboard. What was done (the
 * minutes, this week's dots), how it felt (one optional tap, about the practice, never the
 * pain), any milestone this session earned, and tomorrow. Then Done, and the app is left.
 * Totals live in Progress; three number tiles here turned a quiet moment into a report.
 */

const FEELINGS: Array<{ value: SessionFeeling; label: string }> = [
  { value: 'settled', label: 'Settled' },
  { value: 'curious', label: 'Curious' },
  { value: 'restless', label: 'Restless' },
  { value: 'hard', label: 'Hard today' },
];

/** Said under the chips when the person picks "Hard today": a hard session is never a failed one. */
const HARD_LINE = 'Hard sessions count the same. Showing up was the practice.';

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

function withoutDay(p: ProgramState, day?: number): ProgramState {
  if (!day || !p.done[day]) return p;
  const done = { ...p.done };
  delete done[day];
  return { ...p, done };
}

export function AfterScreen({ session }: { session: Session }) {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { sessions, prefs, setFeeling } = useData();
  const vs = useVoiceSession();
  const tz = currentTz();
  const now = Date.now();
  const program = prefs.program ?? EMPTY_PROGRAM;
  const minutes = Math.max(1, Math.round((session.endedAt - session.startedAt) / 60_000));
  const stats = useMemo(() => practiceStats(sessions, now, tz), [sessions, now, tz]);
  const strip = useMemo(() => weekStrip(sessions, now, tz), [sessions, now, tz]);
  const said = WORDS[minutes] ?? String(minutes);
  const quiet = `${said} quiet ${minutes === 1 ? 'minute' : 'minutes'}`;
  const earned = useMemo(() => {
    const moments = prefs.moments?.length ?? 0;
    const before = milestones({ sessions: sessions.filter((s) => s.id !== session.id), program: withoutDay(program, session.programDay), moments, tz });
    const after = milestones({ sessions, program, moments, tz });
    return newlyEarned(before, after);
  }, [sessions, program, prefs.moments, session.id, session.programDay, tz]);
  const dayDone = session.programDay && program.done[session.programDay];
  const next = session.programDay && session.programDay < PROGRAM_DAYS ? programDay(session.programDay + 1) : undefined;
  const early = session.outcome === 'ended_early';

  const done = () => {
    vs.reset();
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/');
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.xl, paddingBottom: space.xl, paddingHorizontal: space.xl }}>
        <Animated.View entering={FadeIn.duration(1400)} style={{ alignItems: 'center' }}>
          <BreathingField width={150} height={150} mode="idle" dim={0.95} />
          <Txt variant="caption" style={{ color: color.practice, letterSpacing: 1.4, marginTop: space.xs }}>
            {dayDone ? `day ${session.programDay} complete` : 'practice complete'}
          </Txt>
          <Txt variant="title" align="center" style={{ marginTop: space.s }}>
            {/* Ending early was the person's choice, said as one: no "still counts", which concedes it might not. */}
            {early ? `${quiet}.` : `${quiet}, done.`}
          </Txt>
          {early ? (
            // A sentence to read, so sentence case; the title above is lowercase by type.
            <Txt variant="callout" tone="secondary" align="center" style={{ marginTop: space.xs }}>
              You chose when to stop.
            </Txt>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(900).duration(900)} style={{ marginTop: space.xxl }}>
          <WeekStrip days={strip} />
          <Txt variant="footnote" tone="secondary" style={{ marginTop: space.m }}>
            {weekLine(stats, now)}
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(1300).duration(900)}>
          <Txt variant="headline" style={{ marginTop: space.xl }}>
            How did that feel?
          </Txt>
          <View style={styles.feelings}>
            {FEELINGS.map((f) => (
              <Chip
                key={f.value}
                label={f.label}
                selected={session.feeling === f.value}
                style={styles.feeling}
                onPress={() => setFeeling(session.id, session.feeling === f.value ? null : f.value)}
              />
            ))}
          </View>
          {session.feeling === 'hard' ? (
            <Animated.View entering={FadeIn.duration(500)}>
              <Txt variant="callout" style={{ marginTop: space.m }}>
                {HARD_LINE}
              </Txt>
            </Animated.View>
          ) : null}
          <Txt variant="caption" tone="tertiary" style={{ marginTop: space.s }}>
            Optional. About the practice, not the pain.
          </Txt>

          {earned.map((m) => (
            <View key={m.id} style={styles.milestone} accessible accessibilityLabel={`Milestone: ${m.label}.`}>
              <Icon name="star.fill" size={18} tint={color.milestone} />
              <Txt variant="headline" style={{ textTransform: 'lowercase' }}>
                {m.label}
              </Txt>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <View style={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.l, gap: space.m }}>
        {next ? (
          <Txt variant="footnote" tone="tertiary" align="center">
            tomorrow · day {next.day} · {next.lesson.title.toLowerCase()}
          </Txt>
        ) : null}
        <PrimaryButton label="Done" onPress={done} />
      </View>
    </View>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  // Two by two: four equal answers, none sitting apart as the odd one out.
  feelings: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.m },
  feeling: { flexBasis: '45%', flexGrow: 1, alignSelf: 'auto', justifyContent: 'space-between' },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: space.xl },
});
