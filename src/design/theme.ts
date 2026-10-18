import { Platform, type TextStyle } from 'react-native';

/**
 * Attend's visual language, "evening pine": a deep green-blue night instead of black, warm
 * cream type, and soft colours taken from outdoors at dusk — sage for practice, sun for
 * milestones, sky for sound. Calm and friendly, never clinical. No red anywhere: red would
 * read as "bad", and nothing on these screens is a verdict.
 *
 * Dark only, by design. The product is used with the eyes closed, often at night; a bright
 * screen is the wrong first thing to see on opening them.
 */

export const color = {
  bg: '#0D1615',
  bgElevated: '#13201F',
  surface: 'rgba(214,236,226,0.055)',
  surfaceStrong: 'rgba(214,236,226,0.10)',
  hairline: 'rgba(214,236,226,0.11)',
  text: '#F2ECE0',
  textSecondary: 'rgba(242,236,224,0.68)',
  textTertiary: 'rgba(242,236,224,0.46)',
  accent: '#F2ECE0',
  onAccent: '#0D1615',
  focusRing: '#A8DCC4',
  /** The program's colour: days done, the week strip, the path. Practice, never pain. */
  practice: '#A8DCC4',
  practiceSoft: 'rgba(168,220,196,0.14)',
  /** Milestones and the person's goal: warm, and only ever about what they did. */
  milestone: '#F4C98B',
  milestoneSoft: 'rgba(244,201,139,0.10)',
  /** Sound: Just listen and what plays under a session. */
  sky: '#A9C9EC',
  skySoft: 'rgba(169,201,236,0.12)',
} as const;

export { fieldColor, familyColor } from './palette';

export const space = { xxs: 2, xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48, huge: 72 } as const;
export const radius = { s: 12, m: 18, l: 28, pill: 999 } as const;

/** Minimum touch target (Apple HIG). */
export const HIT = 44;

const family = Platform.select({ web: 'system-ui, -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif', default: undefined });
/**
 * Headings in SF Pro Rounded: softer and friendlier than the default face, still the system
 * font (optical sizes, Dynamic Type, every language). Body text stays in SF Pro for reading.
 */
const rounded = Platform.select({ ios: 'ui-rounded', web: 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, sans-serif', default: undefined });

export const type = {
  display: { fontFamily: rounded, fontSize: 36, lineHeight: 41, fontWeight: '400', letterSpacing: -0.6 },
  title: { fontFamily: rounded, fontSize: 28, lineHeight: 33, fontWeight: '400', letterSpacing: -0.4 },
  title2: { fontFamily: rounded, fontSize: 22, lineHeight: 27, fontWeight: '500', letterSpacing: -0.3 },
  headline: { fontFamily: rounded, fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.15 },
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
