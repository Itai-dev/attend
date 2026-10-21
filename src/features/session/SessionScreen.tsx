import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_VOICES } from '@/config';
import { useData } from '@/data/store';
import { programDay, type PracticeTheme } from '@/domain/program';
import type { Place, SessionType } from '@/domain/types';
import { IconButton, PrimaryButton, QuietButton, Txt } from '@/design/components';
import { PlayButton } from '@/design/media';
import { color, HIT, radius, space } from '@/design/theme';
import { SESSION_LENGTHS } from '@/engine/phases';
import { useVoiceSession, type SessionStatus } from '@/voice/VoiceSessionProvider';
import { BreathingField, type BreathMode } from '@/viz/BreathingField';
import { clock } from '../shared/format';
import { DevPanel } from './DevPanel';

/**
 * The session, laid out like a listening app's Now Playing screen. The person's eyes are
 * closed, so the screen should feel almost unnecessary: the breathing form fills it, and on
 * top sit only what a glance needs — what this is, how far along, a single quiet word, pause
 * and end. No transcript, no questions written out, no body diagram.
 */

export const STATUS_WORD: Partial<Record<SessionStatus, string>> = {
  preparing: 'Preparing',
  speaking: 'Speaking',
  listening: 'Listening',
  paused: 'Paused',
};

export function breathMode(s: SessionStatus): BreathMode {
  if (s === 'speaking') return 'speaking';
  if (s === 'listening') return 'listening';
  if (s === 'paused' || s === 'error' || s === 'unavailable') return 'paused';
  if (s === 'holding') return 'holding';
  return 'idle';
}

export function SessionScreen() {
  const params = useLocalSearchParams<{ type?: string; minutes?: string; voice?: string; theme?: string; day?: string; place?: string; title?: string }>();
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

  const day = params.day ? programDay(Number(params.day) || 1) : undefined;
  const kicker = day ? `DAY ${day.day} · WEEK ${day.week}` : 'ANY TIME';
  const title = params.title || day?.practice.title || 'Practice';
  const voiceName = GUIDE_VOICES.find((v) => v.id === params.voice)?.name;
  const targetMs = (minutes ?? 5) * 60_000;
  // The session closes gently around its length, so it can run a little over: the bar stops full.
  const shown = Math.min(elapsed, targetMs);
  const end = () => {
    if (confirmEnd) {
      setConfirmEnd(false);
      vs.end();
    } else setConfirmEnd(true);
  };

  const paused = vs.status === 'paused';
  const blocked = vs.status === 'unavailable' || (vs.status === 'error' && !!vs.error);
  const word = STATUS_WORD[vs.status];

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {/* No indication of the person's own voice for now: no VoiceGlow, no mic level on the field. VoiceGlow stays in viz/ to bring back. */}
      <BreathingField width={width} height={height} mode={breathMode(vs.status)} style={StyleSheet.absoluteFill} />

      <View style={[styles.top, { paddingTop: insets.top + space.s }]}>
        {!blocked ? (
          <IconButton icon="chevron.down" label={confirmEnd ? 'Confirm end session' : 'End session'} onPress={end} tint={color.text} iconSize={20} />
        ) : (
          <View style={{ width: HIT }} />
        )}
        <View style={styles.topText} pointerEvents="none">
          <Txt variant="caption" tone="secondary" style={styles.kicker}>
            {kicker}
          </Txt>
          <Txt variant="footnote" style={{ fontWeight: '700' }} accessibilityLiveRegion="none">
            {word ?? ' '}
          </Txt>
        </View>
        <View style={{ width: HIT }} />
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
          <Txt variant="title2" numberOfLines={2}>
            {title}
          </Txt>
          <Txt variant="callout" tone="secondary" style={{ marginTop: 2 }}>
            {[voiceName, `${minutes ?? 5} min`].filter(Boolean).join(' · ')}
          </Txt>

          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityLabel="Time in this session"
            accessibilityValue={{ min: 0, max: Math.round(targetMs / 1000), now: Math.round(shown / 1000) }}
          >
            <View style={[styles.fill, { width: `${(shown / targetMs) * 100}%` }]} />
          </View>
          <View style={styles.times}>
            <Txt variant="caption" tone="secondary" style={styles.time}>
              {clock(shown)}
            </Txt>
            <Txt variant="caption" tone="secondary" style={styles.time}>
              -{clock(targetMs - shown)}
            </Txt>
          </View>

          <View style={styles.buttons}>
            <View style={styles.side}>
              <IconButton icon="xmark" label={confirmEnd ? 'Confirm end session' : 'End session'} onPress={end} tint={color.textSecondary} iconSize={20} />
            </View>
            <PlayButton
              size={68}
              playing={!paused}
              label={paused ? 'Resume session' : 'Pause session'}
              onPress={() => (paused ? vs.resume() : vs.pause())}
            />
            <View style={styles.side} />
          </View>
          <View style={styles.confirm}>
            {confirmEnd ? (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <Txt variant="footnote" tone="secondary" align="center">
                  Tap again to end
                </Txt>
              </Animated.View>
            ) : null}
          </View>
        </View>
      ) : null}

      {__DEV__ && prefs.dev.panel ? <DevPanel /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.s },
  topText: { flex: 1, alignItems: 'center', gap: 2 },
  kicker: { letterSpacing: 1.4 },
  hint: { position: 'absolute', left: space.xl, right: space.xl, top: '36%', gap: 2 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.l },
  track: { height: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: space.xl, overflow: 'hidden' },
  fill: { height: 4, borderRadius: radius.pill, backgroundColor: color.text },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.s },
  time: { fontWeight: '500', letterSpacing: 0, fontVariant: ['tabular-nums'] },
  buttons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.l },
  side: { width: 72, alignItems: 'flex-start' },
  confirm: { height: 22, marginTop: space.s, justifyContent: 'center' },
  blocked: { position: 'absolute', left: space.xl, right: space.xl, top: '30%' },
});
