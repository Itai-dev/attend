import { Canvas, Fill, Shader, useClock } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { color } from '../design/theme';
import { BG_RGB, effect } from './effects';

/**
 * The only thing on screen during a session, and it barely needs to be
 * there. It breathes slowly; it warms a little while the guide speaks and
 * opens, listening, when it is the person's turn — responding to their voice
 * if a level is available. Under Reduce Motion it is a still, soft glow.
 */

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
      uBg: BG_RGB,
    };
  }, [width, height, reduceMotion, level]);

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
