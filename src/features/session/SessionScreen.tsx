import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import type { SessionType } from '@/domain/types';
import { IconButton, PrimaryButton, QuietButton, Txt } from '@/design/components';
import { color, space } from '@/design/theme';
import { SESSION_LENGTHS } from '@/engine/phases';
import { useVoiceSession, type SessionStatus } from '@/voice/VoiceSessionProvider';
import { BreathingField, type BreathMode } from '@/viz/BreathingField';
import { clock } from '../shared/format';
import { DevPanel } from './DevPanel';

/**
 * The session. The person's eyes are closed; this screen should feel almost
 * unnecessary. A breathing form, a single quiet word, pause and end. No
 * transcript, no questions written out, no body diagram.
 */

const STATUS_WORD: Partial<Record<SessionStatus, string>> = {
  preparing: 'Preparing',
  speaking: 'Speaking',
  listening: 'Listening',
  paused: 'Paused',
};

function breathMode(s: SessionStatus): BreathMode {
  if (s === 'speaking') return 'speaking';
  if (s === 'listening') return 'listening';
  if (s === 'paused' || s === 'error' || s === 'unavailable') return 'paused';
  if (s === 'holding') return 'holding';
  return 'idle';
}

export function SessionScreen() {
  const params = useLocalSearchParams<{ type?: string; minutes?: string }>();
  const type = (['notice', 'flare', 'sleep', 'fear'].includes(params.type ?? '') ? params.type : 'notice') as SessionType;
  const minutes = SESSION_LENGTHS.find((m) => String(m) === params.minutes);
  const vs = useVoiceSession();
  const { prefs, setPrefs } = useData();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const started = useRef(false);
  // A completion id left over from an earlier session must not navigate this one.
  const sawThisSession = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [hint, setHint] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    vs.reset();
    vs.start(type, minutes);
    const t = setTimeout(() => setHint(false), 6000);
    return () => {
      clearTimeout(t);
      vs.end();
    };
    // Starting once per mount is the point; the session owns its own lifecycle after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setElapsed(vs.activeMs()), 1000);
    return () => clearInterval(t);
  }, [vs]);

  if (vs.status === 'preparing') sawThisSession.current = true;

  useEffect(() => {
    if (!sawThisSession.current || vs.completedSessionId === undefined) return;
    if (vs.completedSessionId) router.replace({ pathname: '/recap/[id]', params: { id: vs.completedSessionId } });
    else router.back();
  }, [vs.completedSessionId]);

  useEffect(() => {
    if (!confirmEnd) return;
    const t = setTimeout(() => setConfirmEnd(false), 3000);
    return () => clearTimeout(t);
  }, [confirmEnd]);

  const paused = vs.status === 'paused';
  const blocked = vs.status === 'unavailable' || (vs.status === 'error' && !!vs.error);
  const word = STATUS_WORD[vs.status];

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <BreathingField width={width} height={height} mode={breathMode(vs.status)} level={vs.level} style={StyleSheet.absoluteFill} />

      <View style={[styles.top, { paddingTop: insets.top + space.l }]} pointerEvents="none">
        <Txt variant="caption" tone="tertiary" style={styles.status} accessibilityLiveRegion="none">
          {word ?? ' '}
        </Txt>
        <Txt variant="caption" tone="tertiary" style={[styles.status, { opacity: 0.6 }]}>
          {elapsed > 0 ? clock(elapsed) : ' '}
        </Txt>
      </View>

      {hint && !blocked ? (
        <Animated.View entering={FadeIn.duration(1200).delay(400)} exiting={FadeOut.duration(1600)} style={styles.hint} pointerEvents="none">
          <Txt variant="title2" align="center" style={{ fontWeight: '300' }}>
            Put the phone down.
          </Txt>
          <Txt variant="title2" align="center" tone="secondary" style={{ fontWeight: '300' }}>
            Close your eyes.
          </Txt>
        </Animated.View>
      ) : null}

      {blocked ? (
        <View style={styles.blocked}>
          <Txt variant="title2" align="center">
            {vs.error?.code === 'permission' ? 'Attend can’t hear you yet.' : 'Listening isn’t available here.'}
          </Txt>
          <Txt variant="callout" tone="secondary" align="center" style={{ marginTop: space.s, marginBottom: space.xl }}>
            {vs.error?.code === 'permission'
              ? 'Allow the microphone and speech recognition in Settings. What you say is turned into words on this iPhone and never saved as audio.'
              : 'This build has no on-device speech recognition. A development build adds it.'}
          </Txt>
          {vs.error?.code === 'permission' && Platform.OS !== 'web' ? (
            <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} />
          ) : null}
          {__DEV__ ? (
            <QuietButton
              label="Use the simulated participant"
              style={{ alignSelf: 'center', marginTop: space.m }}
              onPress={async () => {
                await setPrefs({ dev: { ...prefs.dev, inputMode: 'simulated' } });
                router.back();
              }}
            />
          ) : null}
          <QuietButton
            label="Close"
            style={{ alignSelf: 'center', marginTop: space.s }}
            onPress={() => {
              vs.end();
              router.back();
            }}
          />
        </View>
      ) : null}

      {!blocked ? (
        <View style={[styles.controls, { paddingBottom: insets.bottom + space.xl }]}>
          {confirmEnd ? (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.confirm}>
              <Txt variant="footnote" tone="secondary">
                Tap again to end
              </Txt>
            </Animated.View>
          ) : null}
          <View style={styles.buttons}>
            <IconButton
              icon={paused ? 'play.fill' : 'pause.fill'}
              label={paused ? 'Resume session' : 'Pause session'}
              variant="filled"
              size={60}
              iconSize={20}
              tint={color.textSecondary}
              onPress={() => (paused ? vs.resume() : vs.pause())}
            />
            <IconButton
              icon="xmark"
              label={confirmEnd ? 'Confirm end session' : 'End session'}
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
      ) : null}

      {__DEV__ && prefs.dev.panel ? <DevPanel /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', gap: 4 },
  status: { letterSpacing: 2, textTransform: 'uppercase', fontSize: 11 },
  hint: { position: 'absolute', left: space.xl, right: space.xl, top: '62%', gap: 2 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  buttons: { flexDirection: 'row', gap: space.xxl },
  confirm: { marginBottom: space.m },
  blocked: { position: 'absolute', left: space.xl, right: space.xl, top: '30%' },
});
