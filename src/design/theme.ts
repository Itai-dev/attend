import { Platform, type TextStyle } from 'react-native';

/**
 * Attend's visual language (21 Oct 2026): Spotify's design approach on Apple foundations,
 * in grey tones. A near-black base, opaque grey surfaces that step up in brightness to show
 * depth, bold system type with tight tracking, and white for the one thing to do next.
 * Hierarchy comes from lightness, weight and size, not hue: nothing competes with the
 * practice, and nothing on these screens can read as a verdict. The body map keeps its
 * colours, because there colour names a kind of sensation.
 *
 * Dark only, by design. The product is used with the eyes closed, often at night; a bright
 * screen is the wrong first thing to see on opening them.
 */

export const color = {
  bg: '#121212',
  bgElevated: '#181818',
  /** Cards, tiles, rows: opaque, so stacked surfaces never muddy. */
  surface: '#1F1F1F',
  surfaceStrong: '#2A2A2A',
  /** Pressed state of a surface. */
  surfacePressed: '#333333',
  hairline: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textTertiary: '#7A7A7A',
  /** The one thing to do next: white on the dark, the brightest thing on screen. Never decoration. */
  accent: '#FFFFFF',
  onAccent: '#0B0B0D',
  focusRing: '#FFFFFF',
  /** The program's marks: days done, the week strip, the path. Practice, never pain. */
  practice: '#E4E4E4',
  practiceSoft: 'rgba(255,255,255,0.12)',
  /** Milestones and the person's goal: a softer grey, and only ever about what they did. */
  milestone: '#C8C8C8',
  milestoneSoft: 'rgba(255,255,255,0.06)',
} as const;

export { fieldColor, familyColor } from './palette';

export const space = { xxs: 2, xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48, huge: 72 } as const;
/** Small radii, as on Spotify: cover art and cards are near-square; only buttons and chips are round. */
export const radius = { xs: 4, s: 6, m: 8, l: 12, pill: 999 } as const;

/** Minimum touch target (Apple HIG). */
export const HIT = 44;

const family = Platform.select({ web: 'system-ui, -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif', default: undefined });

/**
 * Bold and tight at the top, plain and open at the bottom: tracking is negative on large
 * sizes and near zero on small ones, and hierarchy comes from weight as much as size.
 */
export const type = {
  display: { fontFamily: family, fontSize: 32, lineHeight: 36, fontWeight: '800', letterSpacing: -1.1 },
  title: { fontFamily: family, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.7 },
  title2: { fontFamily: family, fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.45 },
  headline: { fontFamily: family, fontSize: 16, lineHeight: 21, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontFamily: family, fontSize: 16, lineHeight: 23, fontWeight: '400', letterSpacing: -0.15 },
  callout: { fontFamily: family, fontSize: 14, lineHeight: 19, fontWeight: '400', letterSpacing: -0.05 },
  footnote: { fontFamily: family, fontSize: 13, lineHeight: 17, fontWeight: '400', letterSpacing: 0 },
  caption: { fontFamily: family, fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.6 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

export const motion = {
  /** Calm, unhurried: nothing on these screens should snap. */
  slow: 900,
  medium: 520,
  quick: 260,
};
