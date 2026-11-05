import { Atlas, Canvas, Fill, Skia, useColorBuffer, useRSXformBuffer, type SkImage } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useFrameCallback, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useColors } from '../design/theme';
import type { BreathMode } from './BreathingField';
import { look, makeRing, restState, STRIDE, stepRing } from './particles';

/**
 * The session's ring as a particle system (5 Nov 2026; see viz/particles.ts for the physics).
 * Stepped every frame on the UI thread and drawn with one Atlas call: each particle is a round
 * dot sprite, moved and tinted per frame. Sumi ink on washi by day, rice paper on charcoal at
 * night, with the afterimage colours showing in the particles the voice has moved. Under Reduce
 * Motion the particles rest at home: a still ring.
 */

const COUNT = 2400;
const SPRITE = 32;

/** One soft round dot, white, so the Atlas can tint it any colour. Made once. */
let dot: SkImage | null | undefined;
function dotImage(): SkImage | null {
  if (dot !== undefined) return dot;
  try {
    const surface = Skia.Surface.Make(SPRITE, SPRITE);
    if (!surface) return (dot = null);
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(Skia.Color('white'));
    surface.getCanvas().drawCircle(SPRITE / 2, SPRITE / 2, SPRITE / 2 - 1, paint);
    surface.flush();
    dot = surface.makeImageSnapshot();
  } catch {
    dot = null;
  }
  return dot;
}

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
  dim?: number;
  /** The ring's outer radius as a fraction of the shorter side. */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function ParticleRing({ width, height, mode, level, dim = 1, size = 0.27, style }: Props) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const image = dotImage();
  const ring = useMemo(() => makeRing(COUNT), []);
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) * size;
  const sim = useSharedValue<number[]>(restState(ring, cx, cy, R));
  const clock = useSharedValue(0);
  const heard = useSharedValue(0);
  const speak = useSharedValue(0);
  const strength = useSharedValue(dim);
  const ink = useMemo(() => rgb(c.text), [c.text]);
  const paper = useMemo(() => rgb(c.bg).reduce((a, b) => a + b, 0) / 3 > 0.5, [c.bg]);
  const sprites = useMemo(() => Array.from({ length: COUNT }, () => Skia.XYWHRect(0, 0, SPRITE, SPRITE)), []);

  useEffect(() => {
    speak.value = withTiming(mode === 'speaking' ? 1 : 0, { duration: 800 });
    strength.value = withTiming(mode === 'paused' ? dim * 0.4 : dim, { duration: 1600 });
  }, [mode, dim, speak, strength]);

  useEffect(() => {
    sim.value = restState(ring, cx, cy, R);
  }, [ring, cx, cy, R, sim]);

  useFrameCallback((frame) => {
    'worklet';
    if (reduceMotion) return;
    // Capped, so a dropped frame or a return from the background doesn't fling the ring.
    const dt = Math.min(1 / 30, (frame.timeSincePreviousFrame ?? 16) / 1000);
    const t = clock.value + dt;
    clock.value = t;
    // The voice, or a slow swell while the guide speaks if the voice can't be measured.
    const measured = level ? level.value : 0;
    const v = Math.max(measured, speak.value * (0.18 + 0.1 * Math.sin(t * 1.3)));
    const attack = Math.max(0, v - heard.value);
    heard.value = v;
    sim.modify((st) => {
      'worklet';
      stepRing(ring, st, { cx, cy, R, dt, t, level: v, attack });
      return st;
    });
  }, true);

  const transforms = useRSXformBuffer(COUNT, (val, i) => {
    'worklet';
    const st = sim.value;
    const l = look(ring, i, st[i * STRIDE + 4], heard.value);
    const s = l.size / SPRITE;
    val.set(s, 0, st[i * STRIDE] - l.size / 2, st[i * STRIDE + 1] - l.size / 2);
  });

  const colors = useColorBuffer(COUNT, (col, i) => {
    'worklet';
    const l = look(ring, i, sim.value[i * STRIDE + 4], heard.value);
    // On paper the afterimage colours are an ink: deeper, and used more lightly.
    const k = paper ? 0.8 : 1;
    const amt = l.color * (paper ? 0.65 : 1);
    col[0] = ink[0] + (ring.tint[i * 3] * k - ink[0]) * amt;
    col[1] = ink[1] + (ring.tint[i * 3 + 1] * k - ink[1]) * amt;
    col[2] = ink[2] + (ring.tint[i * 3 + 2] * k - ink[2]) * amt;
    col[3] = l.alpha * strength.value;
  });

  if (!image) return <View style={[{ width, height, backgroundColor: c.bg }, style]} />;
  return (
    // Skia's web canvas does not accept style arrays; flatten them.
    <Canvas style={StyleSheet.flatten([{ width, height }, style])}>
      <Fill color={c.bg} />
      <Atlas image={image} sprites={sprites} transforms={transforms} colors={colors} colorBlendMode="modulate" />
    </Canvas>
  );
}
