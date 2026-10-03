import { Platform, type TextStyle } from 'react-native';

/**
 * Attend's visual language: near-black ink, warm white type, and colour that
 * appears only inside the body fields — soft, luminous, never alarming.
 * No red anywhere: red would read as "bad", and nothing on these screens is
 * a verdict.
 *
 * Dark only, by design. The product is used with the eyes closed, often at
 * night; a bright screen is the wrong first thing to see on opening them.
 */

export const color = {
  bg: '#09090B',
  bgElevated: '#111114',
  surface: 'rgba(255,255,255,0.045)',
  surfaceStrong: 'rgba(255,255,255,0.085)',
  hairline: 'rgba(255,255,255,0.09)',
  text: '#F2F0EB',
  textSecondary: 'rgba(242,240,235,0.66)',
  textTertiary: 'rgba(242,240,235,0.46)',
  accent: '#F2F0EB',
  onAccent: '#0B0B0D',
  focusRing: '#CFC6FF',
} as const;

export { fieldColor, familyColor } from './palette';

export const space = { xxs: 2, xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48, huge: 72 } as const;
export const radius = { s: 12, m: 18, l: 28, pill: 999 } as const;

/** Minimum touch target (Apple HIG). */
export const HIT = 44;

const family = Platform.select({ web: 'system-ui, -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif', default: undefined });

export const type = {
  display: { fontFamily: family, fontSize: 38, lineHeight: 43, fontWeight: '300', letterSpacing: -0.8 },
  title: { fontFamily: family, fontSize: 28, lineHeight: 34, fontWeight: '300', letterSpacing: -0.5 },
  title2: { fontFamily: family, fontSize: 22, lineHeight: 28, fontWeight: '400', letterSpacing: -0.35 },
  headline: { fontFamily: family, fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontFamily: family, fontSize: 17, lineHeight: 25, fontWeight: '400', letterSpacing: -0.2 },
  callout: { fontFamily: family, fontSize: 15, lineHeight: 21, fontWeight: '400', letterSpacing: -0.1 },
  footnote: { fontFamily: family, fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0 },
  caption: { fontFamily: family, fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.4 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

export const motion = {
  /** Calm, unhurried: nothing on these screens should snap. */
  slow: 900,
  medium: 520,
  quick: 260,
};
