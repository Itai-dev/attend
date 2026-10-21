import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '../design/theme';
import type { BreathMode } from './BreathingField';

/**
 * The ensō: one brush circle, left a little open, the way a Zen circle is drawn in a single
 * breath. It is the app's breathing form (21 Oct 2026), replacing the glowing orb: ink on paper
 * by day, rice-paper on charcoal at night.
 *
 * It breathes very slowly (one cycle every ten seconds, about six breaths a minute), deepens
 * a little while the guide speaks, rests while it holds silence, and fades when paused. Under
 * Reduce Motion it is still: a slow loop is exactly what reduced motion asks to remove.
 */

const BREATH_MS = 5000;

// Drawn in a 100×100 box: the main stroke, and a thin second pass that gives it a brush's dry edge.
const MAIN = 'M78 30 C 66 12, 34 10, 20 30 C 6 50, 18 82, 46 86 C 72 90, 90 70, 86 48 C 84 38, 80 33, 76 31';
const DRY = 'M22 34 C 14 48, 18 70, 36 80';

type Props = {
  width: number;
  height: number;
  mode: BreathMode;
  /** 0..1 overall strength. */
  dim?: number;
  style?: StyleProp<ViewStyle>;
};

export function Enso({ width, height, mode, dim = 1, style }: Props) {
  const ink = useColors().text;
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(0);
  const strength = useSharedValue(dim);

  const main = useMemo(() => Skia.Path.MakeFromSVGString(MAIN), []);
  const dry = useMemo(() => Skia.Path.MakeFromSVGString(DRY), []);

  useEffect(() => {
    if (reduceMotion || mode === 'paused') {
      cancelAnimation(breath);
      breath.value = withTiming(0.5, { duration: 1200 });
      return;
    }
    breath.value = withRepeat(withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [mode, reduceMotion, breath]);

  useEffect(() => {
    const target = mode === 'paused' ? 0.35 : mode === 'speaking' ? 1 : mode === 'holding' ? 0.8 : 0.85;
    strength.value = withTiming(target * dim, { duration: 1600 });
  }, [mode, dim, strength]);

  // The circle fills a little under two thirds of the shorter side, centred.
  const size = Math.min(width, height) * 0.62;
  const k = size / 100;
  const transform = useDerivedValue(() => {
    const s = k * (0.97 + breath.value * 0.06);
    return [{ translateX: width / 2 }, { translateY: height / 2 }, { scale: s }, { translateX: -53 }, { translateY: -50 }];
  }, [width, height, k]);
  const opacity = useDerivedValue(() => strength.value * (0.82 + breath.value * 0.18));

  if (!main || !dry) return <View style={[{ width, height }, style]} />;
  return (
    // Skia's web canvas does not accept style arrays; flatten them.
    <Canvas style={StyleSheet.flatten([{ width, height }, style])}>
      <Group transform={transform} opacity={opacity}>
        <Path path={main} color={ink} style="stroke" strokeWidth={5.5} strokeCap="round" opacity={0.88} />
        <Path path={dry} color={ink} style="stroke" strokeWidth={2} strokeCap="round" opacity={0.4} />
      </Group>
    </Canvas>
  );
}
