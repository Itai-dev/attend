import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { lessonLines, listenFirst } from '@/domain/lessonVoice';
import { EMPTY_PROGRAM, markRead, programDay, WEEKS, type ProgramDay } from '@/domain/program';
import { haptic, IconButton, OutlineButton, PrimaryButton, QuietButton, Txt } from '@/design/components';
import { radius, space, type Palette } from '@/design/theme';
import { ForceDark, useColors, useStyles } from '@/design/ThemeProvider';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { BreathingField } from '@/viz/BreathingField';
import { dayPlan, startPractice } from '../shared/start';

/**
 * A lesson: a few short cards, one idea each, then straight into the day's practice.
 * Education alone barely changes pain; paired with practice it does better
 * (docs/RESEARCH.md §2), so the last card's button is the practice, not "done".
 *
 * Listening and reading are equal ways in (studio round 2): the first card offers both. Listen
 * plays the lesson in the guide's voice (domain/lessonVoice.ts), then flows into the practice
 * on the same dark screen, so the eyes can close at the start of the lesson and stay closed.
 * From 21:00, or for someone who came for sleep, listen comes first and the screen is dark.
 */

/** Said on the card when the voice couldn't be had: reading is the way in now, nothing failed. */
export const LISTEN_FAILED_LINE = 'The guide’s voice couldn’t load just now. The lesson is here to read.';

export function LessonScreen() {
  const { day: dayParam } = useLocalSearchParams<{ day: string }>();
  const day = programDay(Number(dayParam) || 1);
  const { prefs, setPrefs, checkIns } = useData();
  const vs = useVoiceSession();
  // Decided once, when the lesson opens: the screen doesn't change under someone reading at 20:59.
  const [first] = useState(() => listenFirst(new Date().getHours(), prefs.focus));
  const [listening, setListening] = useState(false);
  const [voiceState, setVoiceState] = useState<'speaking' | 'holding'>('holding');
  const [failed, setFailed] = useState(false);
  const [i, setI] = useState(0);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
      vs.stopSpeaking();
    },
    // vs.stopSpeaking is stable; the lesson stops speaking when it is left, however it is left.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const plan = () => dayPlan(day.day, { prefs, checkIns });

  const finish = async () => {
    haptic('soft');
    await setPrefs({ program: markRead(prefs.program ?? EMPTY_PROGRAM, day.day) });
    // Straight into the practice: the lesson's last line is the invitation, and a settings
    // screen between them broke the thread (Before stays reachable from Today's "adjust").
    startPractice(plan(), 'replace');
  };

  const listen = async () => {
    setFailed(false);
    setListening(true);
    const p = plan();
    const result = await vs.speakLines(lessonLines(day), { type: p.type, voiceId: p.voice, onState: setVoiceState });
    if (!mounted.current) return;
    if (result === 'done') {
      // Heard to the end counts as read, and the practice follows on the same dark screen with
      // no tap: the eyes are already closed.
      await setPrefs({ program: markRead(prefs.program ?? EMPTY_PROGRAM, day.day) });
      startPractice(p, 'replace');
      return;
    }
    setListening(false);
    if (result === 'failed') setFailed(true);
  };

  const readInstead = () => {
    vs.stopSpeaking();
    setListening(false);
  };

  const body = (
    <LessonBody
      day={day}
      i={i}
      setI={setI}
      first={first}
      listening={listening}
      voiceState={voiceState}
      failed={failed}
      onListen={listen}
      onReadInstead={readInstead}
      onFinish={finish}
    />
  );
  // Dark while listening, and whenever listen came first: someone about to close their eyes in a
  // dim room shouldn't open them onto a white page.
  return first || listening ? <ForceDark>{body}</ForceDark> : body;
}

type BodyProps = {
  day: ProgramDay;
  i: number;
  setI: (i: number) => void;
  first: boolean;
  listening: boolean;
  voiceState: 'speaking' | 'holding';
  failed: boolean;
  onListen: () => void;
  onReadInstead: () => void;
  onFinish: () => void;
};

function LessonBody({ day, i, setI, first, listening, voiceState, failed, onListen, onReadInstead, onFinish }: BodyProps) {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cards = day.lesson.cards;
  const card = cards[i];
  const last = i === cards.length - 1;
  const kicker = `day ${day.day} · week ${day.week} · ${WEEKS[day.week].name.toLowerCase()}`;

  if (listening) {
    return (
      <View style={[styles.root, { backgroundColor: color.bg, paddingTop: insets.top + space.m, paddingBottom: insets.bottom + space.l }]}>
        <StatusBar hidden />
        <BreathingField width={width} height={height} mode={voiceState} dim={0.7} style={StyleSheet.absoluteFill} />
        <View style={styles.top}>
          <Txt variant="footnote" tone="tertiary">
            {kicker}
          </Txt>
          <IconButton icon="xmark" label="Stop and close" onPress={() => router.back()} tint={color.textSecondary} />
        </View>
        <View style={{ flex: 1 }} />
        <View style={styles.footer}>
          {/* Never a transcript of what the guide reads: the lesson is heard, or read, not both at once. */}
          <QuietButton label="read instead" style={{ alignSelf: 'center' }} onPress={onReadInstead} />
        </View>
      </View>
    );
  }

  const listenButton = <OutlineButton key="listen" label="listen" accessibilityLabel="Listen to the lesson, then the practice" onPress={onListen} style={styles.choice} />;
  const readButton = <OutlineButton key="read" label="read" accessibilityLabel="Read the lesson" onPress={() => setI(1)} style={styles.choice} />;

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.m, paddingBottom: insets.bottom + space.l }]}>
      <View style={styles.bars} accessibilityLabel={`Card ${i + 1} of ${cards.length}`}>
        {cards.map((_, k) => (
          <View key={k} style={[styles.bar, k <= i && { backgroundColor: color.text }]} />
        ))}
      </View>
      <View style={styles.top}>
        <Txt variant="footnote" tone="tertiary">
          {kicker}
        </Txt>
        <IconButton icon="xmark" label="Close" onPress={() => router.back()} tint={color.textSecondary} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {failed ? (
          <Txt variant="callout" tone="secondary" style={{ marginBottom: space.l }} accessibilityLiveRegion="polite">
            {LISTEN_FAILED_LINE}
          </Txt>
        ) : null}
        {i === 0 ? (
          <Txt variant="title" accessibilityRole="header">
            {day.lesson.title}
          </Txt>
        ) : null}
        <Animated.View key={i} entering={FadeIn.duration(500)} style={{ gap: space.l, marginTop: space.l }}>
          {card.text.map((p) => (
            <Txt key={p} variant="body" style={{ fontSize: 19, lineHeight: 28 }}>
              {p}
            </Txt>
          ))}
          {card.notice ? (
            <View style={styles.notice}>
              <Txt variant="caption" style={{ color: color.practice }}>
                notice
              </Txt>
              <Txt variant="callout" style={{ marginTop: space.xs }}>
                {card.notice}
              </Txt>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        {i === 0 && !failed ? (
          // Two equal ways in, the same control side by side; at night, listen is the first.
          <View style={styles.choices}>{first ? [listenButton, readButton] : [readButton, listenButton]}</View>
        ) : last ? (
          <PrimaryButton label="begin the practice" detail={`${day.practice.minutes} min · find a comfortable place, then close your eyes`} onPress={onFinish} />
        ) : (
          <PrimaryButton
            label="next"
            onPress={() => {
              haptic('select');
              setI(i + 1);
            }}
          />
        )}
        {i > 0 ? <QuietButton label="Back" style={{ alignSelf: 'center' }} onPress={() => setI(i - 1)} /> : null}
      </View>
    </View>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgElevated },
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: space.xl },
  bar: { flex: 1, height: 2, borderRadius: 1, backgroundColor: color.hairline },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.xl, paddingRight: space.s },
  body: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: space.l, paddingBottom: space.xxl },
  notice: { padding: space.l, borderRadius: radius.m, backgroundColor: color.practiceSoft },
  footer: { paddingHorizontal: space.xl, gap: space.s },
  choices: { flexDirection: 'row', gap: space.m },
  choice: { flex: 1, alignSelf: 'stretch', justifyContent: 'space-between', minHeight: 52 },
});
