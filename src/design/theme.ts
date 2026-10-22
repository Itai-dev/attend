import { Appearance, DynamicColorIOS, Platform, useColorScheme, type ColorValue, type TextStyle } from 'react-native';

/**
 * Attend's visual language (21 Oct 2026): a quiet Japanese clinic. Washi by day — warm paper,
 * sumi ink — and Sumi at night — warm charcoal, rice-paper text — following the phone's own
 * light and dark setting, so a session opened at night never starts with a bright screen.
 *
 * - Ma: room around everything, few boxes, soft corners and soft shadows instead of edges.
 * - Type: a light serif for what you read as a title (Newsreader), the system sans for the
 *   rest. Gentle, not bold.
 * - One leading colour, moss: green is the hue most linked with calm and restoration (lower
 *   heart rate in green surroundings, Frontiers in Psychology 2019; early trials of green
 *   light easing migraine and fibromyalgia pain, University of Arizona). Earthy and low in
 *   saturation, so it soothes rather than signals. Used only for the one thing to do next and
 *   for practice done. Never decoration, never anything about pain, and never red.
 * - The ensō, the brush circle, marks the app's screens (viz/Enso.tsx); sessions show the moving orb (viz/BreathingField.tsx).
 *
 * Colours are dynamic on iOS (DynamicColorIOS), so StyleSheets stay static and still follow
 * the appearance. Where a plain string is needed (Skia, string maths), use `useColors()`.
 */

const WASHI = {
  bg: '#F3EEE5',
  bgElevated: '#EFE9DE',
  /** Cards: a lighter sheet of paper on the paper. */
  surface: '#FBF8F2',
  surfaceStrong: '#E8E1D4',
  surfacePressed: '#DED6C7',
  hairline: 'rgba(47,43,38,0.10)',
  text: '#2F2B26',
  textSecondary: 'rgba(47,43,38,0.62)',
  textTertiary: 'rgba(47,43,38,0.42)',
  accent: '#6E8B5B',
  onAccent: '#FFFFFF',
  focusRing: '#6E8B5B',
  practice: '#6E8B5B',
  practiceSoft: 'rgba(110,139,91,0.14)',
  milestone: '#94714C',
  milestoneSoft: 'rgba(148,113,76,0.10)',
  /** Soft shadow under a card: paper lifting off paper. */
  shadow: 'rgba(80,60,40,0.16)',
};

const SUMI: typeof WASHI = {
  bg: '#1C1A17',
  bgElevated: '#211F1B',
  surface: '#25221E',
  surfaceStrong: '#2E2A25',
  surfacePressed: '#36312B',
  hairline: 'rgba(237,230,218,0.08)',
  text: '#EDE6DA',
  textSecondary: 'rgba(237,230,218,0.62)',
  textTertiary: 'rgba(237,230,218,0.42)',
  accent: '#9DB38A',
  onAccent: '#1C1A17',
  focusRing: '#9DB38A',
  practice: '#9DB38A',
  practiceSoft: 'rgba(157,179,138,0.16)',
  milestone: '#D2B48C',
  milestoneSoft: 'rgba(210,180,140,0.10)',
  shadow: 'rgba(0,0,0,0)',
};

export type Palette = typeof WASHI;
export const palettes = { light: WASHI, dark: SUMI } as const;

/** Where colours can't follow the appearance live (web preview, Android): the appearance at launch. */
function launchScheme(): 'light' | 'dark' {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

const atLaunch = launchScheme();

export const color = Object.fromEntries(
  (Object.keys(WASHI) as Array<keyof Palette>).map((k) => [
    k,
    Platform.OS === 'ios' ? DynamicColorIOS({ light: WASHI[k], dark: SUMI[k] }) : palettes[atLaunch][k],
  ]),
) as Record<keyof Palette, ColorValue>;

/** The palette as plain strings, for Skia and anything that does maths on a colour. Follows the appearance live on iOS. */
export function useColors(): Palette {
  const live = useColorScheme();
  return palettes[Platform.OS === 'ios' ? (live === 'light' ? 'light' : 'dark') : atLaunch];
}

/** Which appearance is showing, for the few places that change more than a colour (status bar, nav theme). */
export function useScheme(): 'light' | 'dark' {
  const live = useColorScheme();
  return Platform.OS === 'ios' ? (live === 'light' ? 'light' : 'dark') : atLaunch;
}

export { fieldColor, familyColor } from './palette';

export const space = { xxs: 2, xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48, huge: 72 } as const;
/** Soft corners: cards like smoothed paper, buttons and chips fully round. */
export const radius = { xs: 6, s: 10, m: 16, l: 22, pill: 999 } as const;

/** Minimum touch target (Apple HIG). */
export const HIT = 44;

const sans = Platform.select({ web: 'system-ui, -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif', default: undefined });
/** Loaded in app/_layout.tsx before anything renders. */
export const serif = { light: 'Newsreader_300Light', regular: 'Newsreader_400Regular', medium: 'Newsreader_500Medium' } as const;

/**
 * Titles in a light serif with open tracking; everything read in passing in the system sans.
 * Hierarchy from size and leading, not weight: nothing on these screens raises its voice.
 */
export const type = {
  display: { fontFamily: serif.light, fontSize: 36, lineHeight: 42, fontWeight: '400', letterSpacing: -0.4 },
  title: { fontFamily: serif.regular, fontSize: 27, lineHeight: 33, fontWeight: '400', letterSpacing: -0.3 },
  title2: { fontFamily: serif.regular, fontSize: 22, lineHeight: 28, fontWeight: '400', letterSpacing: -0.2 },
  headline: { fontFamily: serif.regular, fontSize: 19, lineHeight: 24, fontWeight: '400', letterSpacing: -0.1 },
  body: { fontFamily: sans, fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: -0.1 },
  callout: { fontFamily: sans, fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0 },
  footnote: { fontFamily: sans, fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0 },
  caption: { fontFamily: sans, fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 1.2 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

export const motion = {
  /** Calm, unhurried: nothing on these screens should snap. */
  slow: 1100,
  medium: 650,
  quick: 320,
};
