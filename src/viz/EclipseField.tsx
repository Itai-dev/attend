import { Canvas, Fill, Shader, useClock } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useColors } from '../design/theme';
import type { BreathMode } from './BreathingField';
import { effect } from './effects';

/**
 * The ring of grain (5 Nov 2026), drawn by ECLIPSE_SKSL. With `eclipse` it is the mark from the
 * icon (tools/make-mark.py), breathing slowly on the app's other screens. Without, it is the
 * session's ring: whole and perfect at rest, loosening into grain with the guide's voice and
 * gathering back in the silence. It follows the appearance: sumi ink on washi by day, rice paper on
 * charcoal at night. Under Reduce Motion it is the still mark.
 */

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

type Props = {
  width: number;
  height: number;
  mode: BreathMode;
  /** The guide's loudness, 0..1. Without it the ring swells gently while the guide speaks. */
  level?: SharedValue<number>;
  /** 0..1 overall strength, for fades. */
  dim?: number;
  /** Draw the background too (the full-screen session). Off: the mark alone, over any screen. */
  opaque?: boolean;
  /** The ring's outer radius as a fraction of the shorter side. */
  size?: number;
  /** The mark's eclipse on the right. Off in the session, where the ring is whole until the voice moves it. */
  eclipse?: boolean;
  /** The session's living ring: always slightly coming apart and gathering, with soft afterimage colours. */
  alive?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function EclipseField({ width, height, mode, level, dim = 1, opaque = false, size = 0.31, eclipse = true, alive = false, style }: Props) {
  const fx = effect('eclipse');
  const c = useColors();
  const bg = useMemo(() => rgb(c.bg), [c.bg]);
  const ink = useMemo(() => rgb(c.text), [c.text]);
  const reduceMotion = useReducedMotion();
  const clock = useClock();
  const speak = useSharedValue(0);
  const strength = useSharedValue(dim);

  useEffect(() => {
    speak.value = withTiming(mode === 'speaking' ? 1 : 0, { duration: 1400 });
  }, [mode, speak]);

  useEffect(() => {
    strength.value = withTiming(mode === 'paused' ? dim * 0.4 : dim, { duration: 1600 });
  }, [dim, mode, strength]);

  // Grain of about two device pixels on a phone, whatever the mark's size.
  const grain = Math.max(0.6, Math.min(width, height) / 600);

  const uniforms = useDerivedValue(
    () => ({
      uRes: [width, height],
      uTime: reduceMotion ? 0 : clock.value / 1000,
      uMotion: reduceMotion ? 0 : 1,
      uLevel: level ? level.value : 0,
      uSpeak: speak.value,
      uDim: strength.value,
      uBg: bg,
      uInk: ink,
      uOpaque: opaque ? 1 : 0,
      uSize: size,
      uGrain: grain,
      uEclipse: eclipse ? 1 : 0,
      uColor: alive ? 1 : 0,
      uIdle: alive ? 1 : 0,
    }),
    [width, height, reduceMotion, level, bg, ink, opaque, size, grain, eclipse, alive],
  );

  if (!fx) return <View style={[{ width, height, backgroundColor: opaque ? c.bg : undefined }, style]} />;
  return (
    // Skia's web canvas does not accept style arrays; flatten them.
    <Canvas style={StyleSheet.flatten([{ width, height }, style])}>
      <Fill>
        <Shader source={fx} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
