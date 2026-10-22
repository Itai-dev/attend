import { Canvas, Fill, Shader, useClock } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useColors, useScheme } from '../design/theme';
import { effect } from './effects';

/**
 * The only thing on screen during a session, and it barely needs to be
 * there. It breathes slowly; it warms a little while the guide speaks and
 * opens, listening, when it is the person's turn — responding to their voice
 * if a level is available. Under Reduce Motion it is a still, soft glow.
 *
 * Back in the session (22 Oct 2026) after a day as the ensō: a still brush line read as
 * static, and the founder wanted the form that moves. It follows the appearance: light on
 * charcoal at night, a soft moss-ink wash on the paper by day.
 */

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Washi's ink with a little moss in it: the wash reads as calm, not as a grey smudge. */
function mossInk(text: string, accent: string): [number, number, number] {
  const a = rgb(text);
  const b = rgb(accent);
  return [a[0] * 0.7 + b[0] * 0.3, a[1] * 0.7 + b[1] * 0.3, a[2] * 0.7 + b[2] * 0.3];
}

export type BreathMode = 'idle' | 'speaking' | 'listening' | 'holding' | 'paused';

type Props = {
  width: number;
  height: number;
  mode: BreathMode;
  level?: SharedValue<number>;
  /** 0..1 overall brightness, for fades in and out of a session. */
  dim?: number;
  style?: StyleProp<ViewStyle>;
};

export function BreathingField({ width, height, mode, level, dim = 1, style }: Props) {
  const fx = effect('breath');
  const c = useColors();
  const paper = useScheme() === 'light';
  const bg = useMemo(() => rgb(c.bg), [c.bg]);
  const ink = useMemo(() => mossInk(c.text, c.accent), [c.text, c.accent]);
  const reduceMotion = useReducedMotion();
  const clock = useClock();
  const speak = useSharedValue(0);
  const listen = useSharedValue(0);
  const bright = useSharedValue(dim);

  useEffect(() => {
    speak.value = withTiming(mode === 'speaking' ? 1 : 0, { duration: 1200 });
    listen.value = withTiming(mode === 'listening' ? 1 : 0, { duration: 1400 });
  }, [mode, speak, listen]);

  useEffect(() => {
    bright.value = withTiming(mode === 'paused' ? dim * 0.45 : dim, { duration: 1600 });
  }, [dim, mode, bright]);

  const uniforms = useDerivedValue(() => {
    return {
      uRes: [width, height],
      uTime: reduceMotion ? 4 : clock.value / 1000,
      uMotion: reduceMotion ? 0 : 1,
      uSpeak: speak.value,
      uListen: listen.value,
      uLevel: level ? level.value : 0,
      uDim: bright.value,
      uBg: bg,
      uInk: ink,
      uPaper: paper ? 1 : 0,
    };
  }, [width, height, reduceMotion, level, bg, ink, paper]);

  if (!fx) return <View style={[{ width, height, backgroundColor: c.bg }, style]} />;
  return (
    // Skia's web canvas does not accept style arrays; flatten them.
    <Canvas style={StyleSheet.flatten([{ width, height }, style])}>
      <Fill>
        <Shader source={fx} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
