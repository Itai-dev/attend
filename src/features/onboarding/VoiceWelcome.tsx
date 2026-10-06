import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import { SPOKEN, type WelcomeAnswers } from '@/domain/welcome';
import { IconButton, PrimaryButton, QuietButton, Txt } from '@/design/components';
import { color, space } from '@/design/theme';
import type { WelcomeResult } from '@/engine/WelcomeRunner';
import { useVoiceSession } from '@/voice/VoiceSessionProvider';
import { BreathingField } from '@/viz/BreathingField';
import { breathMode, STATUS_WORD } from '../session/SessionScreen';
import { DevPanel } from '../session/DevPanel';

/**
 * The welcome, spoken: the same screen as a session — a breathing form, one quiet word,
 * pause and end — so the first thing the person does in Attend is what every session is.
 * The guide asks what brings them here, how long they have and which voice feels right,
 * then says the safety note. The only words on screen come after, and only if "I understand"
 * wasn't heard clearly: the safety note is never assumed.
 */

type Phase = 'ready' | 'running' | 'confirm';

export function VoiceWelcome({ onTapInstead }: { onTapInstead: () => void }) {
  const vs = useVoiceSession();
  const { prefs, setPrefs } = useData();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('ready');
  const answers = useRef<WelcomeAnswers>({});
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Leaving the screen mid-welcome stops it.
  useEffect(() => () => vs.end(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!confirmEnd) return;
    const t = setTimeout(() => setConfirmEnd(false), 3000);
    return () => clearTimeout(t);
  }, [confirmEnd]);

  const finish = async (a: WelcomeAnswers) => {
    await setPrefs({ onboarded: true, focus: a.focus, sessionMinutes: a.minutes, voiceId: a.voice === 'later' ? undefined : a.voice });
    router.replace('/');
  };

  const begin = async () => {
    setPhase('running');
    const r: WelcomeResult = await vs.startWelcome();
    answers.current = r.answers;
    // Asked to stop, or listening isn't available here (no permission, no recogniser, no voice server).
    if (r.ended) return onTapInstead();
    if (r.answers.understood) return finish(r.answers);
    setPhase('confirm');
  };

  if (phase === 'confirm') {
    return (
      <View style={[styles.root, styles.pad, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
        <View style={{ flex: 1, gap: space.l }}>
          {SPOKEN.safety.map((l) => (
            <Txt key={l} variant="title2" style={{ fontWeight: '300' }}>
              {l}
            </Txt>
          ))}
        </View>
        <PrimaryButton label="I understand" onPress={() => finish({ ...answers.current, understood: true })} />
      </View>
    );
  }

  const running = phase === 'running';
  const paused = vs.status === 'paused';
  const word = running ? STATUS_WORD[vs.status] : undefined;

  return (
    <View style={styles.root}>
      <BreathingField width={width} height={height} mode={running ? breathMode(vs.status) : 'idle'} style={StyleSheet.absoluteFill} />

      <View style={[styles.top, { paddingTop: insets.top + space.l }]} pointerEvents="none">
        <Txt variant="caption" tone="tertiary" style={styles.status}>
          {word ?? ' '}
        </Txt>
      </View>

      {!running ? (
        <Animated.View entering={FadeIn.duration(1200)} exiting={FadeOut.duration(800)} style={[styles.intro, { paddingBottom: insets.bottom + space.xl }]}>
          <Txt variant="display" align="center">
            Attend is spoken.
          </Txt>
          <Txt variant="body" tone="secondary" align="center" style={{ marginTop: space.m, marginBottom: space.xxl }}>
            Turn your sound up. When you’re ready, tap Begin and answer out loud. You can close your eyes.
          </Txt>
          <PrimaryButton label="Begin" onPress={begin} />
          <QuietButton label="I’d rather tap through" style={{ alignSelf: 'center', marginTop: space.m }} onPress={onTapInstead} />
        </Animated.View>
      ) : (
        <View style={[styles.controls, { paddingBottom: insets.bottom + space.xl }]}>
          {confirmEnd ? (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={{ marginBottom: space.m }}>
              <Txt variant="footnote" tone="secondary">
                Tap again to tap through instead
              </Txt>
            </Animated.View>
          ) : null}
          <View style={styles.buttons}>
            <IconButton
              icon={paused ? 'play.fill' : 'pause.fill'}
              label={paused ? 'Resume' : 'Pause'}
              variant="filled"
              size={60}
              iconSize={20}
              tint={color.textSecondary}
              onPress={() => (paused ? vs.resume() : vs.pause())}
            />
            <IconButton
              icon="xmark"
              label={confirmEnd ? 'Confirm: tap through instead' : 'Stop the spoken welcome'}
              variant="filled"
              size={60}
              iconSize={18}
              tint={color.textSecondary}
              onPress={() => {
                if (confirmEnd) {
                  setConfirmEnd(false);
                  vs.end();
                } else setConfirmEnd(true);
              }}
            />
          </View>
        </View>
      )}

      {__DEV__ && prefs.dev.panel && running ? <DevPanel /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  pad: { paddingHorizontal: space.xl },
  top: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  status: { letterSpacing: 2, textTransform: 'uppercase', fontSize: 11 },
  intro: { position: 'absolute', left: space.xl, right: space.xl, bottom: 0 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  buttons: { flexDirection: 'row', gap: space.xxl },
});
