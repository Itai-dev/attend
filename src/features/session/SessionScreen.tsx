import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import type { PracticeTheme } from '@/domain/program';
import type { Place, SessionType } from '@/domain/types';
import { IconButton, PrimaryButton, QuietButton, Txt } from '@/design/components';
import { color, space } from '@/design/theme';
import { SESSION_LENGTHS } from '@/engine/phases';
import { isHe, tr } from '@/i18n';
import { useVoiceSession, type SessionStatus } from '@/voice/VoiceSessionProvider';
import { BreathingField, type BreathMode } from '@/viz/BreathingField';
import { clock } from '../shared/format';
import { DevPanel } from './DevPanel';

/**
 * The session. The person's eyes are closed; this screen should feel almost
 * unnecessary. A breathing form, a single quiet word, pause and end. No
 * transcript, no questions written out, no body diagram.
 */

export const STATUS_WORD: Partial<Record<SessionStatus, string>> = {
  preparing: 'Preparing',
  speaking: 'Speaking',
  listening: 'Listening',
  paused: 'Paused',
};

/** In Hebrew, nouns: a verb would need a gender for the guide, which has none (docs/HEBREW.md). */
const HE_STATUS_WORD: Partial<Record<SessionStatus, string>> = {
  preparing: 'הכנה',
  speaking: 'דיבור',
  listening: 'הקשבה',
  paused: 'מושהה',
};

export function statusWord(s: SessionStatus): string | undefined {
  return tr(STATUS_WORD, HE_STATUS_WORD)[s];
}

export function breathMode(s: SessionStatus): BreathMode {
  if (s === 'speaking') return 'speaking';
  if (s === 'listening') return 'listening';
  if (s === 'paused' || s === 'error' || s === 'unavailable') return 'paused';
  if (s === 'holding') return 'holding';
  return 'idle';
}

export function SessionScreen() {
  const params = useLocalSearchParams<{ type?: string; minutes?: string; voice?: string; theme?: string; day?: string; place?: string }>();
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
    // From the Before screen: the day's theme, the program day, and where attention rests
    // ('none' = the whole body). Anything malformed falls back to the session's own choice.
    let place: Place | null | undefined;
    try {
      place = params.place === 'none' ? null : params.place ? (JSON.parse(params.place) as Place) : undefined;
    } catch {
      place = undefined;
    }
    vs.start(type, minutes, params.voice, {
      theme: params.theme as PracticeTheme | undefined,
      programDay: params.day ? Number(params.day) || undefined : undefined,
      place,
    });
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
  const word = statusWord(vs.status);

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {/* No indication of the person's own voice for now: no VoiceGlow, no mic level on the field. VoiceGlow stays in viz/ to bring back. */}
      {/* The moving orb, not the ensō (22 Oct 2026): a still line read as static during a session. */}
      <BreathingField width={width} height={height} mode={breathMode(vs.status)} style={StyleSheet.absoluteFill} />

      <View style={[styles.top, { paddingTop: insets.top + space.l }]} pointerEvents="none">
        <Txt variant="caption" tone="tertiary" style={[styles.status, isHe() && styles.statusHe]} accessibilityLiveRegion="none">
          {word ?? ' '}
        </Txt>
        <Txt variant="caption" tone="tertiary" style={[styles.status, { opacity: 0.6 }]}>
          {elapsed > 0 ? clock(elapsed) : ' '}
        </Txt>
      </View>

      {hint && !blocked ? (
        <Animated.View entering={FadeIn.duration(1200).delay(400)} exiting={FadeOut.duration(1600)} style={styles.hint} pointerEvents="none">
          <Txt variant="title2" align="center" style={{ fontWeight: '300' }}>
            {tr('Put the phone down.', 'הניחו את הטלפון.')}
          </Txt>
          <Txt variant="title2" align="center" tone="secondary" style={{ fontWeight: '300' }}>
            {tr('Close your eyes.', 'עצמו את העיניים.')}
          </Txt>
        </Animated.View>
      ) : null}

      {blocked ? (
        <View style={styles.blocked}>
          <Txt variant="title2" align="center">
            {vs.error?.code === 'permission' ? tr('Attend can’t hear you yet.', 'עוד אין גישה למיקרופון.') : tr('Listening isn’t available here.', 'אי אפשר להקשיב כאן.')}
          </Txt>
          <Txt variant="callout" tone="secondary" align="center" style={{ marginTop: space.s, marginBottom: space.xl }}>
            {vs.error?.code === 'permission'
              ? tr(
                  'Allow the microphone and speech recognition in Settings. What you say is turned into words on this iPhone and never saved as audio.',
                  'אפשר לאשר מיקרופון וזיהוי דיבור בהגדרות. מה שאומרים הופך למילים כאן באייפון, ולא נשמר כהקלטה.',
                )
              : tr('This build has no on-device speech recognition. A development build adds it.', 'בגרסה הזו אין זיהוי דיבור במכשיר. גרסת פיתוח מוסיפה אותו.')}
          </Txt>
          {vs.error?.code === 'permission' && Platform.OS !== 'web' ? (
            <PrimaryButton label={tr('Open Settings', 'לפתוח את ההגדרות')} onPress={() => Linking.openSettings()} />
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
            label={tr('Close', 'לסגור')}
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
                {tr('Tap again to end', 'נגיעה נוספת לסיום')}
              </Txt>
            </Animated.View>
          ) : null}
          <View style={styles.buttons}>
            <IconButton
              icon={paused ? 'play.fill' : 'pause.fill'}
              label={paused ? tr('Resume session', 'להמשיך את התרגול') : tr('Pause session', 'להשהות את התרגול')}
              variant="filled"
              size={60}
              iconSize={20}
              tint={color.textSecondary}
              onPress={() => (paused ? vs.resume() : vs.pause())}
            />
            <IconButton
              icon="xmark"
              label={confirmEnd ? tr('Confirm end session', 'לאשר את סיום התרגול') : tr('End session', 'לסיים את התרגול')}
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
  // Hebrew has no capitals, and tracking pulls its letters apart.
  statusHe: { letterSpacing: 0, fontSize: 12 },
  // Below the orb, never across it.
  hint: { position: 'absolute', left: space.xl, right: space.xl, top: '66%', gap: 2 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  buttons: { flexDirection: 'row', gap: space.xxl },
  confirm: { marginBottom: space.m },
  blocked: { position: 'absolute', left: space.xl, right: space.xl, top: '30%' },
});
