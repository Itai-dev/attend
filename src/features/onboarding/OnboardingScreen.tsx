import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_VOICES, hasRemote } from '@/config';
import { useData } from '@/data/store';
import { recommendedPreset } from '@/domain/presets';
import { nextStep, WELCOME, type WelcomeAnswers, type WelcomeStep } from '@/domain/welcome';
import { Chip, haptic, PrimaryButton, Txt } from '@/design/components';
import { color, radius, space } from '@/design/theme';
import { previewVoice, stopPreview } from '@/voice/voicePreview';
import { BreathingField } from '@/viz/BreathingField';
import { VoiceWelcome } from './VoiceWelcome';

/**
 * The welcome is spoken first (VoiceWelcome): the same experience as a session. This
 * tap-through version is its fallback — the guide's lines on the left, ready answers on the
 * right, tapping an earlier answer goes back to it. Both end by setting up the session Today
 * offers.
 */

export function OnboardingScreen() {
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  return mode === 'voice' ? <VoiceWelcome onTapInstead={() => setMode('text')} /> : <TextWelcome />;
}

const LATER = 'later';

function answerLabel(step: WelcomeStep, a: WelcomeAnswers): string | undefined {
  switch (step.id) {
    case 'intro':
      return step.choices[0].label;
    case 'focus':
      return step.choices.find((c) => c.value === a.focus)?.label;
    case 'minutes':
      return step.choices.find((c) => c.value === a.minutes)?.label;
    case 'voice':
      return a.voice === LATER ? 'Let each session choose' : GUIDE_VOICES.find((v) => v.id === a.voice)?.name;
    case 'safety':
      return a.understood ? step.choices[0].label : undefined;
  }
}

/** Clear this step's answer and everything after it. */
function rewind(a: WelcomeAnswers, id: WelcomeStep['id']): WelcomeAnswers {
  const order: Array<keyof WelcomeAnswers> = ['focus', 'minutes', 'voice', 'understood'];
  const from = id === 'intro' ? 0 : order.indexOf(id === 'safety' ? 'understood' : (id as keyof WelcomeAnswers));
  const next = { ...a };
  for (const k of order.slice(from)) delete next[k];
  return next;
}

function GuideLines({ lines, fresh }: { lines: string[]; fresh: boolean }) {
  return (
    <View style={{ gap: space.m }}>
      {lines.map((l, i) => (
        <Animated.View key={l} entering={fresh ? FadeIn.duration(700).delay(250 + i * 650) : undefined}>
          <Txt variant="title2" style={{ fontWeight: '300' }}>
            {l}
          </Txt>
        </Animated.View>
      ))}
    </View>
  );
}

/** The tap-through welcome: for when listening isn't available, or the person prefers it. */
export function TextWelcome() {
  const insets = useSafeAreaInsets();
  const { setPrefs } = useData();
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<WelcomeAnswers>({});
  const [voice, setVoice] = useState<string | undefined>();
  const scroller = useRef<ScrollView>(null);
  useEffect(() => stopPreview, []);

  const current = nextStep(answers, started);
  const done = WELCOME.slice(0, current ? WELCOME.indexOf(current) : WELCOME.length);
  const progress = done.length / WELCOME.length;
  const delay = current ? 250 + current.say.length * 650 : 0;

  useEffect(() => {
    const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [current?.id]);

  const answer = (patch: WelcomeAnswers) => {
    stopPreview();
    setAnswers((a) => ({ ...a, ...patch }));
  };

  const finish = async () => {
    stopPreview();
    await setPrefs({
      onboarded: true,
      focus: answers.focus,
      sessionMinutes: answers.minutes,
      voiceId: answers.voice === LATER ? undefined : answers.voice,
    });
    router.replace('/');
  };

  const first = recommendedPreset({ focus: answers.focus, minutes: answers.minutes, voiceId: answers.voice });

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.s }]}>
      <View style={styles.header}>
        <BreathingField width={44} height={44} mode="idle" dim={0.9} />
        <View style={styles.track} accessibilityLabel={`Step ${done.length + 1} of ${WELCOME.length}`}>
          <View style={[styles.fill, { width: `${Math.max(8, progress * 100)}%` }]} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxxl, gap: space.xl }}>
        {done.map((s) => (
          <View key={s.id} style={{ gap: space.l }}>
            <GuideLines lines={s.say} fresh={false} />
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Changes this answer"
              onPress={() => {
                haptic('select');
                if (s.id === 'intro') return;
                stopPreview();
                setVoice(undefined);
                setAnswers((a) => rewind(a, s.id));
              }}
              style={({ pressed }) => [styles.answer, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Txt variant="headline" style={{ fontWeight: '500' }}>
                {answerLabel(s, answers)}
              </Txt>
            </Pressable>
          </View>
        ))}

        {current ? (
          <GuideLines key={current.id} lines={current.say} fresh />
        ) : (
          <Animated.View entering={FadeIn.duration(700).delay(200)} style={{ gap: space.m }}>
            <Txt variant="title2" style={{ fontWeight: '300' }}>
              Your first session is ready.
            </Txt>
            <Txt variant="title2" tone="secondary" style={{ fontWeight: '300' }}>
              {first.title}, {first.minutes} minutes{answers.voice === LATER ? '' : `, with ${first.voiceName}`}. It’s on Today whenever you are.
            </Txt>
          </Animated.View>
        )}
      </ScrollView>

      <Animated.View key={current?.id ?? 'end'} entering={FadeInDown.duration(600).delay(delay)} style={[styles.choices, { paddingBottom: insets.bottom + space.l }]}>
        {current?.id === 'intro' ? <Chip label={current.choices[0].label} onPress={() => setStarted(true)} /> : null}
        {current?.id === 'focus' ? current.choices.map((c) => <Chip key={c.value} label={c.label} onPress={() => answer({ focus: c.value })} />) : null}
        {current?.id === 'minutes' ? current.choices.map((c) => <Chip key={c.value} label={c.label} onPress={() => answer({ minutes: c.value })} />) : null}
        {current?.id === 'voice' ? (
          <>
            <View style={styles.voices}>
              {GUIDE_VOICES.map((v) => (
                <Chip
                  key={v.id}
                  label={v.name}
                  selected={voice === v.id}
                  style={styles.voiceChip}
                  onPress={() => {
                    setVoice(v.id);
                    if (hasRemote) previewVoice(v.id);
                  }}
                />
              ))}
            </View>
            <Chip label="Let each session choose" selected={voice === LATER} onPress={() => {
                stopPreview();
                setVoice(LATER);
              }}
            />
            <PrimaryButton label="Next" disabled={!voice} style={{ opacity: voice ? 1 : 0.4, marginTop: space.s }} onPress={() => voice && answer({ voice })} />
          </>
        ) : null}
        {current?.id === 'safety' ? <Chip label={current.choices[0].label} onPress={() => answer({ understood: true })} /> : null}
        {!current ? <PrimaryButton label="Go to Today" onPress={finish} /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.l, gap: space.l },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: color.surfaceStrong, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: color.textSecondary },
  answer: {
    alignSelf: 'flex-end',
    paddingHorizontal: space.xl,
    paddingVertical: space.m,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceStrong,
  },
  choices: { paddingHorizontal: space.xl, gap: space.m, alignItems: 'stretch' },
  voices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: space.s },
  voiceChip: { minHeight: 46, paddingLeft: space.l },
});
