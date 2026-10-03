import type { QualityFamily } from '../domain/types';

/**
 * Kept free of React Native imports so the body-map uniforms (and their
 * tests) can use it in plain Node.
 */
/** The field palette. Desaturated, luminous, distinguishable from each other. */
export const fieldColor = {
  lilac: '#B9A8FF',
  apricot: '#FFC39A',
  seaglass: '#9FE2D2',
  moon: '#F4EFE6',
  dusk: '#8D99FF',
  rose: '#EFA9CB',
  ash: '#A6A4B0',
  frost: '#BFE3FF',
} as const;

export const familyColor: Record<QualityFamily, string> = {
  contract: fieldColor.lilac,
  press: '#A9A2FF',
  pull: '#C6A6F5',
  warm: fieldColor.apricot,
  grain: fieldColor.seaglass,
  pulse: fieldColor.rose,
  point: fieldColor.moon,
  heavy: fieldColor.dusk,
  mute: fieldColor.ash,
  cold: fieldColor.frost,
  unknown: '#D8D3EA',
};

