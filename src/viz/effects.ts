import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import { BODY3D_SKSL, BODY_SKSL, BREATH_SKSL } from './shaders';

/**
 * Effects are compiled lazily, on first use, not at import time: on web,
 * CanvasKit is only loaded once SkiaGate has finished, and compiling earlier
 * would throw.
 */
type EffectName = 'body' | 'body3d' | 'breath';
const SOURCES: Record<EffectName, string> = { body: BODY_SKSL, body3d: BODY3D_SKSL, breath: BREATH_SKSL };
const cache: Partial<Record<EffectName, SkRuntimeEffect | null>> = {};

export function effect(name: EffectName): SkRuntimeEffect | null {
  if (cache[name]) return cache[name]!;
  try {
    const e = Skia.RuntimeEffect.Make(SOURCES[name]);
    if (!e && __DEV__) console.warn(`[attend] ${name} shader failed to compile`);
    cache[name] = e;
  } catch (err) {
    if (__DEV__) console.warn(`[attend] ${name} shader error`, err);
    cache[name] = null;
  }
  return cache[name]!;
}

export const BG_RGB: [number, number, number] = [9 / 255, 9 / 255, 11 / 255];
