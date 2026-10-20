import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Linking, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/data/store';
import type { PracticeTheme } from '@/domain/program';
import { resolveBackground, soundscape, SOUNDSCAPES, type Background, type BackgroundPref } from '@/domain/soundscapes';
import type { Place, SessionType } from '@/domain/types';
import { ChoiceRow, haptic, Hairline, IconButton, PrimaryButton, QuietButton, RowGroup, Txt } from '@/design/components';
import { space, type Palette } from '@/design/theme';
import { useColors, useStyles } from '@/design/ThemeProvider';
import { SESSION_LENGTHS } from '@/engine/phases';
import { stopListening } from '@/voice/listen';
import { useVoiceSession, type SessionStatus } from '@/voice/VoiceSessionProvider';
import { BreathingField, type BreathMode, type TimeRing } from '@/viz/BreathingField';
import { DevPanel } from './DevPanel';
import { SessionClock } from './SessionClock';

/**
 * The session. The person's eyes are closed; this screen should feel almost
 * unnecessary. A breathing form, a quiet word only when one is needed, the time left, pause and
 * end. No transcript, no questions written out, no body diagram.
 *
 * The form follows the guide's voice (20 Oct 2026): it swells and ripples with the words and
 * settles into its breath in the silences (BreathingField, `vs.voice`).
 *
 * The controls fade away after a few seconds, so a phone lying face-up in a dim room
 * is just the breathing form. A tap anywhere brings them back; that first tap only
 * shows them, so a hand reaching for the phone never pauses or ends by accident.
 * The end control is the exception: a tap on it while faded shows the controls and arms the
 * confirm in one go, so stopping is two taps, not three (round 3: three taps with closed eyes
 * was too many for someone who needs to stop). While paused, end is one tap.
 * VoiceOver reaches pause and end at all times, faded or not.
 *
 * The time left is always there, quietly (20 Oct 2026, the founder: "a timer in the session";
 * it replaces round 5's "about N min left", which showed only with the controls): a hairline ring
 * around the form that fills with practised time, and a small "6:12" under the status word.
 * Pauses don't count. Dim at rest, full while the controls show, never animated, never a colour
 * that changes near the end, never a sound (SessionClock). Not on the resting screen.
 *
 * Under pause and end, with them and only with them, a quiet "sound · 432 Hz ›" (20 Oct 2026: "an
 * option to change the background or remove the background sound"). It opens a small list of
 * the sounds and "no sound"; a choice crosses over in about two seconds while the guide carries
 * on. It is for this practice only — practice settings is where it is kept — so trying a sound
 * mid-practice never changes the next one behind the person's back.
 */

/**
 * The control's words: "sound · 432 Hz", "sound · none". The sound's name as written, not
 * lowercased: tones are named by their pitch, and "432 hz" is a misspelt unit.
 */
export function soundControlLabel(b: Background): string {
  return `sound · ${b === 'none' ? 'none' : (soundscape(b)?.name ?? '')}`;
}

/**
 * The status word, only where it tells the person something: the session is getting
 * ready, or it is paused. "Speaking" and "listening" said what an eyes-closed person
 * could already hear.
 */
export const STATUS_WORD: Partial<Record<SessionStatus, string>> = {
  // Lowercase in source, not only on screen: VoiceOver reads the string, not the style.
  preparing: 'preparing',
  paused: 'paused',
};

/** Shown instead of "paused" when the guide's voice couldn't be had (SessionRunner pauses with 'error'). */
export const VOICE_FAILED_LINE = 'The guide’s voice couldn’t load. Check your connection, then resume.';

/** After a sleep practice: the one word on a near-black screen, if the phone is woken. */
export const RESTING_WORD = 'resting';
/** The breathing form after a sleep practice: there, barely, for someone who wakes the phone. */
const RESTING_DIM = 0.14;

/** How long the controls stay after the session starts or a tap, and how slowly they go. */
const CONTROLS_FIRST_MS = 8000;
const CONTROLS_AGAIN_MS = 6000;
const CONTROLS_FADE_MS = 1600;
/** How long "tap again to end" waits. 3 s was too short to find the button again by feel. */
const CONFIRM_END_MS = 6000;

export function breathMode(s: SessionStatus): BreathMode {
  if (s === 'speaking') return 'speaking';
  if (s === 'listening') return 'listening';
  if (s === 'paused' || s === 'error' || s === 'unavailable') return 'paused';
  if (s === 'holding') return 'holding';
  return 'idle';
}

export function SessionScreen() {
  const color = useColors();
  const styles = useStyles(makeStyles);
  const params = useLocalSearchParams<{ type?: string; minutes?: string; voice?: string; theme?: string; day?: string; place?: string; background?: string; scan?: string }>();
  const type = (['notice', 'flare', 'sleep', 'fear'].includes(params.type ?? '') ? params.type : 'notice') as SessionType;
  const minutes = SESSION_LENGTHS.find((m) => String(m) === params.minutes);
  const vs = useVoiceSession();
  const { prefs, setPrefs } = useData();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const started = useRef(false);
  // A completion id left over from an earlier session must not navigate this one.
  const sawThisSession = useRef(false);
  const [hint, setHint] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);
  /** The "sound ›" list is open: the controls stay while it is. */
  const [soundSheet, setSoundSheet] = useState(false);

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
    const theme = params.theme as PracticeTheme | undefined;
    // Plans send a resolved sound; a "matched" from anywhere else is resolved for this practice.
    const bg = params.background;
    vs.start(type, minutes, params.voice, {
      theme,
      programDay: params.day ? Number(params.day) || undefined : undefined,
      place,
      background: bg === 'none' || bg === 'matched' || soundscape(bg) ? resolveBackground(bg as BackgroundPref, { type, theme }) : undefined,
      scan: params.scan === 'body' ? 'body' : undefined,
    });
    const t = setTimeout(() => setHint(false), 6000);
    return () => {
      clearTimeout(t);
      vs.end();
    };
    // Starting once per mount is the point; the session owns its own lifecycle after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (vs.status === 'preparing') sawThisSession.current = true;

  useEffect(() => {
    if (!sawThisSession.current || vs.completedSessionId === undefined) return;
    if (vs.completedSessionId) {
      // A sleep practice ends in rest: no buzz, no After screen. The screen stays dark (below)
      // and the sound, handed to Just listen, fades on its own.
      if (vs.resting) return;
      // One soft tap in the hand or on the floor: the practice is over, before the screen changes.
      haptic('soft');
      router.replace({ pathname: '/recap/[id]', params: { id: vs.completedSessionId } });
    } else router.back();
  }, [vs.completedSessionId]);

  useEffect(() => {
    if (!confirmEnd) return;
    const t = setTimeout(() => setConfirmEnd(false), CONFIRM_END_MS);
    return () => clearTimeout(t);
  }, [confirmEnd]);

  const paused = vs.status === 'paused';
  const blocked = vs.status === 'unavailable' || (vs.status === 'error' && !!vs.error);
  const voiceFailed = paused && vs.pausedBy === 'error';
  const word = voiceFailed ? undefined : STATUS_WORD[vs.status];
  // Listening copy belongs to a conversation; a guided session never listens.
  const listeningProblem = vs.sessionMode === 'conversation' || vs.error?.code === 'permission';

  // VoiceOver hears the line too; a live region alone is Android-only.
  useEffect(() => {
    if (voiceFailed) AccessibilityInfo.announceForAccessibility(VOICE_FAILED_LINE);
  }, [voiceFailed]);

  // ——— controls that fade away ———
  const [shown, setShown] = useState(true);
  const [screenReader, setScreenReader] = useState(false);
  const controlsOpacity = useSharedValue(1);
  const controlsStyle = useAnimatedStyle(() => ({ opacity: controlsOpacity.value }));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sawShow = useRef(false);
  // While paused the controls are what the person needs (resume), so they stay. With VoiceOver
  // on they never fade: iOS drops a view at opacity 0 from VoiceOver and from touch, and a
  // VoiceOver user must be able to find pause and end at any moment.
  const keepControls = paused || blocked || confirmEnd || screenReader || soundSheet;

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled()
      .then(setScreenReader)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => sub.remove();
  }, []);

  // The time ring: SessionClock writes progress and presence; the controls' opacity lifts it.
  const ringProgress = useSharedValue(0);
  const ringPresence = useSharedValue(0);
  const ring = useMemo<TimeRing>(
    () => ({ progress: ringProgress, presence: ringPresence, lift: controlsOpacity }),
    [ringProgress, ringPresence, controlsOpacity],
  );

  const showControls = useCallback(
    (forMs: number) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShown(true);
      controlsOpacity.value = withTiming(1, { duration: 300 });
      hideTimer.current = setTimeout(() => {
        setShown(false);
        controlsOpacity.value = withTiming(0, { duration: CONTROLS_FADE_MS });
      }, forMs);
    },
    [controlsOpacity],
  );

  useEffect(() => {
    if (keepControls) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShown(true);
      controlsOpacity.value = withTiming(1, { duration: 300 });
    } else showControls(sawShow.current ? CONTROLS_AGAIN_MS : CONTROLS_FIRST_MS);
    sawShow.current = true;
  }, [keepControls, showControls, controlsOpacity]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  /**
   * Fully faded, iOS hit-tests through the controls (a view below alpha 0.01 takes no touch),
   * so a tap aimed at ✕ lands on the full-screen catcher instead. It checks where it landed:
   * on the end control, it arms the confirm (which also brings the controls back).
   */
  const endRef = useRef<View>(null);
  const END_SLOP = 12;
  const onBackgroundPress = (e: GestureResponderEvent) => {
    // While paused they are already held on screen; a tap must not start them fading.
    if (keepControls) return;
    const { pageX, pageY } = e.nativeEvent;
    const node = endRef.current;
    if (!node) return showControls(CONTROLS_AGAIN_MS);
    node.measureInWindow((x, y, w, h) => {
      const onEnd = w > 0 && pageX >= x - END_SLOP && pageX <= x + w + END_SLOP && pageY >= y - END_SLOP && pageY <= y + h + END_SLOP;
      if (onEnd) setConfirmEnd(true);
      else showControls(CONTROLS_AGAIN_MS);
    });
  };

  /**
   * A press on faded pause only brings the controls back (end arms its confirm instead, below).
   * With VoiceOver on, the person
   * chose the control by name, so it acts at once.
   */
  const act = (fn: () => void) => () => {
    if (!shown && !screenReader) {
      showControls(CONTROLS_AGAIN_MS);
      return;
    }
    fn();
    if (!keepControls) showControls(CONTROLS_AGAIN_MS);
  };

  // Hidden while preparing (nothing has started) and in a blocked or resting session.
  const running = vs.status !== 'preparing' && vs.status !== 'idle' && !blocked;

  if (vs.resting) {
    return (
      <View style={styles.root}>
        <StatusBar hidden />
        <BreathingField width={width} height={height} mode="holding" dim={RESTING_DIM} style={StyleSheet.absoluteFill} />
        <View style={[styles.top, { paddingTop: insets.top + space.l }]} pointerEvents="none">
          <Txt variant="caption" tone="tertiary" style={[styles.status, { opacity: 0.6 }]}>
            {RESTING_WORD}
          </Txt>
        </View>
        <View style={[styles.controls, { paddingBottom: insets.bottom + space.xl }]}>
          <QuietButton
            label="stop"
            accessibilityLabel="Stop the sound and close"
            tone="secondary"
            style={{ opacity: 0.55 }}
            onPress={() => {
              // Woken, and done: the sound fades and the room is given back.
              stopListening();
              vs.reset();
              router.back();
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {/* No indication of the person's own voice for now: no VoiceGlow, no mic level on the field. VoiceGlow stays in viz/ to bring back. */}
      <BreathingField width={width} height={height} mode={breathMode(vs.status)} voice={vs.voice} ring={ring} style={StyleSheet.absoluteFill} />

      {/* Anywhere on the screen: bring the controls back. Hidden from VoiceOver, which reaches the controls directly. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onBackgroundPress}
        accessible={false}
        importantForAccessibility="no"
        accessibilityElementsHidden
      />

      <View style={[styles.top, { paddingTop: insets.top + space.l }]} pointerEvents="none">
        <Txt variant="caption" tone="tertiary" style={styles.status} accessibilityLiveRegion="polite">
          {word ?? ' '}
        </Txt>
        <SessionClock running={running} targetMs={vs.targetMs} activeMs={vs.activeMs} progress={ringProgress} presence={ringPresence} emphasis={controlsOpacity} />
      </View>

      {voiceFailed ? (
        // Waits for "Close your eyes" to finish fading when the voice fails early: they share a
        // place on screen, and for a second and a half both were legible on top of each other.
        <Animated.View entering={FadeIn.duration(800).delay(hint ? 1600 : 0)} exiting={FadeOut.duration(800)} style={styles.notice} pointerEvents="none">
          <Txt variant="callout" tone="secondary" align="center" accessibilityLiveRegion="polite">
            {VOICE_FAILED_LINE}
          </Txt>
        </Animated.View>
      ) : null}

      {hint && !blocked && !voiceFailed ? (
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
            {vs.error?.code === 'permission'
              ? 'Attend can’t hear you yet.'
              : listeningProblem
                ? 'Listening isn’t available here.'
                : 'The session stopped.'}
          </Txt>
          <Txt variant="callout" tone="secondary" align="center" style={{ marginTop: space.s, marginBottom: space.xl }}>
            {vs.error?.code === 'permission'
              ? 'Allow the microphone and speech recognition in Settings. What you say is turned into words on this iPhone and never saved as audio.'
              : listeningProblem
                ? 'This build has no on-device speech recognition. A development build adds it.'
                : 'Something went wrong and it couldn’t go on. Close, and begin again when you’re ready.'}
          </Txt>
          {vs.error?.code === 'permission' && Platform.OS !== 'web' ? (
            <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} />
          ) : null}
          {__DEV__ && listeningProblem ? (
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
        <Animated.View style={[styles.controls, { paddingBottom: insets.bottom + space.xl }, controlsStyle]}>
          {confirmEnd ? (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.confirm}>
              <Txt variant="footnote" tone="secondary">
                tap again to end
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
              onPress={act(() => (paused ? vs.resume() : vs.pause()))}
            />
            <View ref={endRef} collapsable={false}>
              <IconButton
                icon="xmark"
                label={confirmEnd ? 'Confirm end session' : 'End session'}
                variant="filled"
                size={60}
                iconSize={18}
                tint={color.textSecondary}
                // Not wrapped in act(): a faded tap here reveals and arms at once (arming the confirm
                // holds the controls on screen). Paused, the person has already stopped; one tap ends.
                onPress={() => {
                  if (paused || confirmEnd) {
                    setConfirmEnd(false);
                    vs.end();
                  } else setConfirmEnd(true);
                }}
              />
            </View>
          </View>
          {/* Inside the fading controls, so it is there only when they are. A faded tap only reveals. */}
          {running && vs.background ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sound under this practice: ${vs.background === 'none' ? 'none' : soundscape(vs.background)?.name}. Change`}
              hitSlop={8}
              onPress={act(() => {
                haptic('select');
                setSoundSheet(true);
              })}
              style={({ pressed }) => [styles.sound, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Txt variant="footnote" tone="tertiary" style={styles.soundText}>
                {`${soundControlLabel(vs.background)} ›`}
              </Txt>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {soundSheet && vs.background ? (
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(250)} style={StyleSheet.absoluteFill}>
          {/* Outside the list: close, back to the session as it was. */}
          <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={() => setSoundSheet(false)} accessibilityLabel="Close" accessibilityRole="button" />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space.l, maxHeight: height - insets.top - space.xl }]} accessibilityViewIsModal>
            <View style={styles.sheetTop}>
              <Txt variant="footnote" tone="tertiary" style={styles.soundText} accessibilityRole="header">
                sound under this practice
              </Txt>
              <QuietButton label="done" tone="primary" onPress={() => setSoundSheet(false)} />
            </View>
            <ScrollView>
              <RowGroup>
                {SOUNDSCAPES.map((sc, i) => (
                  <View key={sc.id}>
                    {i ? <Hairline /> : null}
                    <ChoiceRow label={sc.name} selected={vs.background === sc.id} onPress={() => vs.setBackground(sc.id)} />
                  </View>
                ))}
                <Hairline />
                <ChoiceRow label="no sound" selected={vs.background === 'none'} onPress={() => vs.setBackground('none')} />
              </RowGroup>
              <Txt variant="footnote" tone="tertiary" style={{ marginTop: space.s, paddingHorizontal: space.xs }}>
                To keep it for every practice: practice settings.
              </Txt>
            </ScrollView>
          </View>
        </Animated.View>
      ) : null}

      {__DEV__ && prefs.dev.panel ? <DevPanel /> : null}
    </View>
  );
}

const makeStyles = (color: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', gap: 4 },
  status: { letterSpacing: 0.4, textTransform: 'lowercase', fontSize: 13 },
  // Below the time ring (radius 0.385 of the width around the centre), not across its hairline.
  hint: { position: 'absolute', left: space.xl, right: space.xl, top: '71%', gap: 2 },
  notice: { position: 'absolute', left: space.xl, right: space.xl, top: '71%' },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  buttons: { flexDirection: 'row', gap: space.xxl },
  confirm: { marginBottom: space.m },
  sound: { marginTop: space.l, minHeight: 32, paddingHorizontal: space.m, justifyContent: 'center' },
  soundText: { fontSize: 13, letterSpacing: 0.2 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.l, paddingTop: space.s, backgroundColor: color.bgElevated, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.xs, marginBottom: space.xs },
  blocked: { position: 'absolute', left: space.xl, right: space.xl, top: '30%' },
});
