import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import { BREATH_SKSL, ECLIPSE_SKSL, MOTIF_SKSL } from './shaders';

/**
 * The shaders, compiled lazily on first use, not at import time: on web, CanvasKit is only
 * loaded once SkiaGate has finished, and compiling earlier would throw.
 */
type Name = 'breath' | 'eclipse' | 'motif';
const SOURCE: Record<Name, string> = { breath: BREATH_SKSL, eclipse: ECLIPSE_SKSL, motif: MOTIF_SKSL };
const cache = new Map<Name, SkRuntimeEffect | null>();

export function effect(name: Name): SkRuntimeEffect | null {
  if (cache.has(name)) return cache.get(name) ?? null;
  let fx: SkRuntimeEffect | null = null;
  try {
    fx = Skia.RuntimeEffect.Make(SOURCE[name]);
    if (!fx && __DEV__) console.warn(`[attend] ${name} shader failed to compile`);
  } catch (err) {
    if (__DEV__) console.warn(`[attend] ${name} shader error`, err);
  }
  cache.set(name, fx);
  return fx;
}
