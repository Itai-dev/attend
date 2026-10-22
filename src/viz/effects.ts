import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import { BREATH_SKSL } from './shaders';

/**
 * The breathing orb's shader, compiled lazily on first use, not at import time: on web,
 * CanvasKit is only loaded once SkiaGate has finished, and compiling earlier would throw.
 */
let cache: SkRuntimeEffect | null | undefined;

export function effect(_name: 'breath'): SkRuntimeEffect | null {
  if (cache !== undefined) return cache;
  try {
    cache = Skia.RuntimeEffect.Make(BREATH_SKSL);
    if (!cache && __DEV__) console.warn('[attend] breath shader failed to compile');
  } catch (err) {
    if (__DEV__) console.warn('[attend] breath shader error', err);
    cache = null;
  }
  return cache;
}
