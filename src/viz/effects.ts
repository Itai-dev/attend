import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import { BODY_SKSL, BREATH_SKSL } from './shaders';

/**
 * Effects are compiled lazily, on first use, not at import time: on web,
 * CanvasKit is only loaded once SkiaGate has finished, and compiling earlier
 * would throw.
 */
const cache: Partial<Record<'body' | 'breath', SkRuntimeEffect | null>> = {};

export function effect(name: 'body' | 'breath'): SkRuntimeEffect | null {
  if (cache[name]) return cache[name]!;
  try {
    const e = Skia.RuntimeEffect.Make(name === 'body' ? BODY_SKSL : BREATH_SKSL);
    if (!e && __DEV__) console.warn(`[attend] ${name} shader failed to compile`);
    cache[name] = e;
  } catch (err) {
    if (__DEV__) console.warn(`[attend] ${name} shader error`, err);
    cache[name] = null;
  }
  return cache[name]!;
}

/** design/theme.ts color.bg, as the shaders want it. */
export const BG_RGB: [number, number, number] = [13 / 255, 22 / 255, 21 / 255];
