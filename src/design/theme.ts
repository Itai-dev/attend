import { Platform, type TextStyle } from 'react-native';

/**
 * Attend's visual language, after Daisy (daisysound.com): quiet, editorial, mostly air.
 * By day, off-white with ink type and misty photographs; at night, Daisy's black sections —
 * the app follows the phone's appearance, or the choice in Settings. A few accents, all
 * muted: a deep sea-teal for practice, a warm amber for milestones, slate for sound. No red
 * anywhere: red would read as "bad", and nothing on these screens is a verdict.
 *
 * The session, the recap and the body map are always dark (ForceDark): eyes open onto them
 * in a dim room, and a bright screen is the wrong first thing to see.
 */

export type Palette = {
  scheme: 'light' | 'dark';
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceStrong: string;
  hairline: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  /** The one filled control per screen: ink by day, a warm stone grey at night. */
  accent: string;
  onAccent: string;
  focusRing: string;
  /** The program's colour: days done, the week strip, the path. Practice, never pain. */
  practice: string;
  practiceSoft: string;
  /** Milestones and the person's goal: warm, and only ever about what they did. */
  milestone: string;
  milestoneSoft: string;
  /** Sound: Just listen and what plays under a session. */
  sky: string;
  skySoft: string;
  /** Text and controls laid over a photograph. */
  onImage: string;
  scrim: string;
  destructive: string;
};

export const light: Palette = {
  scheme: 'light',
  bg: '#F7F7F5',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceStrong: '#ECEDEA',
  hairline: 'rgba(10,12,12,0.12)',
  text: '#0B0C0C',
  textSecondary: 'rgba(11,12,12,0.64)',
  // 0.57, not 0.44: tertiary carries sentences that matter (what the pain chart does not mean,
  // "Optional.", the legal lines), and 0.44 was 3:1 on paper, under WCAG's 4.5 for small type.
  textTertiary: 'rgba(11,12,12,0.57)',
  accent: '#0B0C0C',
  onAccent: '#FFFFFF',
  focusRing: '#0D3035',
  practice: '#0D3035',
  practiceSoft: 'rgba(13,48,53,0.08)',
  milestone: '#8A5A22',
  milestoneSoft: 'rgba(176,122,52,0.09)',
  sky: '#36556E',
  skySoft: 'rgba(54,85,110,0.08)',
  onImage: '#FFFFFF',
  scrim: 'rgba(5,8,9,0.28)',
  destructive: '#9A3B2E',
};

export const dark: Palette = {
  scheme: 'dark',
  bg: '#050606',
  bgElevated: '#0E1010',
  surface: 'rgba(255,255,255,0.055)',
  surfaceStrong: 'rgba(255,255,255,0.10)',
  hairline: 'rgba(255,255,255,0.13)',
  text: '#F3F3F0',
  textSecondary: 'rgba(243,243,240,0.66)',
  textTertiary: 'rgba(243,243,240,0.5)',
  // Not paper-white: at night a near-white bar was the brightest thing in a dim room, and
  // people in dark mode called it a glare (Round 5). A warm stone grey, still clearly the one
  // filled control: its ink label is 10.8:1, and a button's 62% detail line is 4.6:1 (WCAG AA
  // 4.5 for small type). Don't go darker without rechecking that detail line.
  accent: '#C2BCB2',
  onAccent: '#050606',
  focusRing: '#A3CACC',
  practice: '#A3CACC',
  practiceSoft: 'rgba(163,202,204,0.13)',
  milestone: '#E5C18D',
  milestoneSoft: 'rgba(229,193,141,0.10)',
  sky: '#AFC6DA',
  skySoft: 'rgba(175,198,218,0.11)',
  onImage: '#FFFFFF',
  // A touch deeper than by day's: a photograph shouldn't be the bright patch on a night screen.
  scrim: 'rgba(0,0,0,0.44)',
  destructive: '#FFB4A8',
};

export { fieldColor, familyColor } from './palette';

export const space = { xxs: 2, xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48, huge: 72 } as const;
/** Daisy's corners: nearly square. Soft enough not to feel sharp, never bubbly. */
export const radius = { s: 4, m: 6, l: 10, pill: 999 } as const;

/** Minimum touch target (Apple HIG). */
export const HIT = 44;

/**
 * One neo-grotesk, the system's: SF Pro, close to Daisy's Neue Montreal and free of licences,
 * with Dynamic Type and every language. Headings are lowercase and tightly tracked, set in a
 * regular weight — presence from size and air, not boldness.
 */
const family = Platform.select({ web: 'system-ui, -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif', default: undefined });

export const type = {
  display: { fontFamily: family, fontSize: 38, lineHeight: 40, fontWeight: '400', letterSpacing: -1.1, textTransform: 'lowercase' },
  title: { fontFamily: family, fontSize: 30, lineHeight: 32, fontWeight: '400', letterSpacing: -0.8, textTransform: 'lowercase' },
  title2: { fontFamily: family, fontSize: 22, lineHeight: 26, fontWeight: '400', letterSpacing: -0.45 },
  headline: { fontFamily: family, fontSize: 17, lineHeight: 22, fontWeight: '500', letterSpacing: -0.25 },
  body: { fontFamily: family, fontSize: 17, lineHeight: 24, fontWeight: '400', letterSpacing: -0.2 },
  callout: { fontFamily: family, fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.15 },
  footnote: { fontFamily: family, fontSize: 13, lineHeight: 17, fontWeight: '400', letterSpacing: -0.05 },
  caption: { fontFamily: family, fontSize: 12, lineHeight: 15, fontWeight: '500', letterSpacing: 0.2 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

export const motion = {
  /** Calm, unhurried: nothing on these screens should snap. */
  slow: 900,
  medium: 520,
  quick: 260,
};
