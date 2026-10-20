import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { lessonLines, listenFirst } from '@/domain/lessonVoice';
import { EMPTY_PROGRAM, markRead, programDay, type ProgramDay } from '@/domain/program';
import { haptic, Icon, IconButton, PrimaryButton, QuietButton, Txt } from '@/design/components';
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
 * Reading and listening are both ways in. Listen plays the lesson in the guide's voice
 * (domain/lessonVoice.ts), then flows into the practice on the same dark screen, so the eyes can
 * close at the start of the lesson and stay closed. Round 5 found two equal buttons on the first
 * card read as a puzzle ("read →" looked like "read more"), so "next" is the one big button and
 * "listen instead" a small link. The choice is remembered (prefs.lessonMode): someone who
 * listened yesterday opens today's lesson listening, with "read instead". Until a choice is
 * made, listen leads (the big button, "read instead" small) from 21:00 or for someone who came
 * for sleep, and the screen is dark.
 */

/** Said on the card when the voice couldn't be had: reading is the way in now, nothing failed. */
export const LISTEN_FAILED_LINE = 'The guide’s voice couldn’t load just now. The lesson is here to read.';

export function LessonScreen() {
  const { day: dayParam } = useLocalSearchParams<{ day: string }>();
  const day = programDay(Number(dayParam) || 1);
  const { prefs, setPrefs, checkIns } = useData();
  const vs = useVoiceSession();
  // Decided once, when the lesson opens: the screen doesn't change under someone reading at 20:59.
  // A remembered choice wins; the night default is only for someone who hasn't chosen yet.
  const [first] = useState(() => (prefs.lessonMode ? prefs.lessonMode === 'listen' : listenFirst(new Date().getHours(), prefs.focus)));
  const [listening, setListening] = useState(false);
  // "read instead" on a listen-first card: from then on this lesson is read.
  const [readChosen, setReadChosen] = useState(false);
  const opened = useRef(false);
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
  const remember = (lessonMode: 'read' | 'listen') => {
    if (prefs.lessonMode !== lessonMode) setPrefs({ lessonMode });
  };

  const finish = async () => {
    haptic('soft');
    await setPrefs({ program: markRead(prefs.program ?? EMPTY_PROGRAM, day.day) });
    // Straight into the practice: the lesson's last line is the invitation, and a settings
    // screen between them broke the thread (Before stays reachable from Today's "adjust").
    startPractice(plan(), 'replace');
  };

  const listen = async () => {
    remember('listen');
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
    remember('read');
    setReadChosen(true);
    vs.stopSpeaking();
    setListening(false);
  };

  // Someone who chose listening before opens straight into it: the remembered choice, not a
  // button to find again. Once, on open; "read instead" is there from the first second.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    if (prefs.lessonMode === 'listen') listen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const body = (
    <LessonBody
      day={day}
      i={i}
      setI={setI}
      listenLead={first && !readChosen}
      listening={listening}
      voiceState={voiceState}
      failed={failed}
      minutes={plan().minutes}
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
  /** The first card's big button is "listen" (night, or a sleeper, before any choice) rather than "next". */
  listenLead: boolean;
  listening: boolean;
  voiceState: 'speaking' | 'holding';
  failed: boolean;
  /** Today's length, with any choice from practice settings. */
  minutes: number;
  onListen: () => void;
  onReadInstead: () => void;
  onFinish: () => void;
};

function LessonBody({ day, i, setI, listenLead, listening, voiceState, failed, minutes, onListen, onReadInstead, onFinish }: BodyProps) {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cards = day.lesson.cards;
  const card = cards[i];
  const last = i === cards.length - 1;
  // One name per day (round 5): the lesson title is the day's name; the week's name left the kicker.
  const kicker = `day ${day.day} · week ${day.week}`;

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
        {i === 0 && !failed && listenLead ? (
          // Night, or someone who came for sleep, and no choice yet: hearing it is the way in.
          <>
            <PrimaryButton label="listen" detail="the guide reads it, then the practice" accessibilityLabel="Listen. The guide reads the lesson, then the practice begins" onPress={onListen} />
            <QuietButton label="read instead" style={{ alignSelf: 'center' }} onPress={onReadInstead} />
          </>
        ) : i === 0 && !failed ? (
          // One way forward, and a small way to hear it instead (remembered for next time).
          <>
            <PrimaryButton
              label="next"
              onPress={() => {
                haptic('select');
                setI(1);
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Listen instead. The guide reads the lesson, then the practice begins"
              hitSlop={8}
              onPress={() => {
                haptic('select');
                onListen();
              }}
              style={({ pressed }) => [styles.listen, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Icon name="speaker.wave.2.fill" size={14} tint={color.textSecondary} />
              <Txt variant="callout" tone="secondary">
                listen instead
              </Txt>
            </Pressable>
          </>
        ) : last ? (
          // What it takes, above the button, as on Today: inside the button it broke onto a
          // second line with "your eyes" alone.
          <>
            <Txt variant="footnote" tone="secondary" style={{ marginBottom: space.xs }}>
              {minutes} min · find a comfortable place, then close your eyes
            </Txt>
            <PrimaryButton label="begin practice" accessibilityLabel={`Begin practice. ${minutes} minutes. Find a comfortable place, then close your eyes`} onPress={onFinish} />
          </>
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
  listen: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: space.s, minHeight: 44, paddingHorizontal: space.s },
});
