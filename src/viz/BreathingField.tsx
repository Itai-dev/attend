import { Canvas, Fill, Shader, useClock } from '@shopify/react-native-skia';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, withTiming, type FrameInfo, type SharedValue } from 'react-native-reanimated';
import { useColors } from '../design/ThemeProvider';
import { BG_RGB, effect } from './effects';
import { followEnvelope, syntheticVoice } from './voiceEnvelope';

/**
 * The only thing on screen during a session, and it barely needs to be there. A soft form whose
 * outline is never quite still, breathing slowly; while the guide speaks it swells and ripples
 * with the words, and in the silences it settles back into the breath (20 Oct 2026: "the orb
 * reacts to the narration"). Someone who opens their eyes sees that the voice and the form are
 * one thing, and nothing on it asks to be read.
 *
 * Everything moves on the UI thread: the envelope is advanced once a frame in a frame callback
 * and handed to the shader as a uniform, so React never renders at audio or frame rate.
 *
 * The voice: a measured level when the provider has one (`voice.measured`), otherwise, while the
 * mode is 'speaking', a made-up envelope of syllables (voiceEnvelope.ts), so the form is never
 * dead on web, Android or a build without sampling. Under Reduce Motion: a slow, shallow breath
 * and nothing else — no morphing, no turning, no voice.
 *
 * `ring`: the practice's time as a hairline ring that fills around the form (the session only).
 */

export type BreathMode = 'idle' | 'speaking' | 'listening' | 'holding' | 'paused';

/** The guide's voice as the provider measures it (VoiceSessionProvider `voice`). */
export type GuideVoice = {
  /** 0..1, the latest measured level of the playing line; 0 between lines. */
  level: SharedValue<number>;
  /** 1 once a level has been measured in this session: from then on the form follows only what is measured. */
  measured: SharedValue<number>;
};

export type TimeRing = {
  /** 0..1 of the planned practice done. */
  progress: SharedValue<number>;
  /** 0..1: whether the ring is there at all (it fades in and out). */
  presence: SharedValue<number>;
  /** 0..1: brighter while the controls are showing. */
  lift: SharedValue<number>;
};

type Props = {
  width: number;
  height: number;
  mode: BreathMode;
  /** The person's microphone level (conversation mode only). */
  level?: SharedValue<number>;
  voice?: GuideVoice;
  ring?: TimeRing;
  /** 0..1 overall brightness, for fades in and out of a session. */
  dim?: number;
  style?: StyleProp<ViewStyle>;
};

export function BreathingField({ width, height, mode, level, voice, ring, dim = 1, style }: Props) {
  const color = useColors();
  const fx = effect('breath');
  const reduceMotion = useReducedMotion();
  const clock = useClock();
  const speak = useSharedValue(0);
  const listen = useSharedValue(0);
  const bright = useSharedValue(dim);
  /** 1 while the guide is speaking, at once (no fade): only the synthetic voice reads it. */
  const speakingNow = useSharedValue(0);
  const env = useSharedValue(0);
  const envOut = useSharedValue(0);

  useEffect(() => {
    speak.value = withTiming(mode === 'speaking' ? 1 : 0, { duration: 1200 });
    listen.value = withTiming(mode === 'listening' ? 1 : 0, { duration: 1400 });
    speakingNow.value = mode === 'speaking' ? 1 : 0;
  }, [mode, speak, listen, speakingNow]);

  useEffect(() => {
    bright.value = withTiming(mode === 'paused' ? dim * 0.45 : dim, { duration: 1600 });
  }, [dim, mode, bright]);

  // Memoised: useFrameCallback re-registers whenever its callback changes.
  const step = useCallback(
    (frame: FrameInfo) => {
      'worklet';
      let target = 0;
      if (!reduceMotion) {
        if (voice && voice.measured.value > 0.5) target = voice.level.value;
        else if (speakingNow.value > 0.5) target = syntheticVoice(frame.timestamp);
      }
      const next = followEnvelope({ env: env.value, out: envOut.value }, target, frame.timeSincePreviousFrame ?? 16);
      env.value = next.env;
      envOut.value = next.out;
    },
    [reduceMotion, voice, speakingNow, env, envOut],
  );
  useFrameCallback(step);

  const uniforms = useDerivedValue(() => {
    return {
      uRes: [width, height],
      uTime: clock.value / 1000,
      uMotion: reduceMotion ? 0 : 1,
      uSpeak: speak.value,
      uListen: listen.value,
      uLevel: level ? level.value : 0,
      uVoice: reduceMotion ? 0 : envOut.value,
      uDim: bright.value,
      uBg: BG_RGB,
      uRing: ring ? ring.presence.value : 0,
      uRingLift: ring ? ring.lift.value : 0,
      uProg: ring ? ring.progress.value : 0,
    };
  }, [width, height, reduceMotion, level, ring]);

  if (!fx) return <View style={[{ width, height, backgroundColor: color.bg }, style]} />;
  return (
    // Skia's web canvas does not accept style arrays; flatten them.
    <Canvas style={StyleSheet.flatten([{ width, height }, style])}>
      <Fill>
        <Shader source={fx} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
