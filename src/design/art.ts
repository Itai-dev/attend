/**
 * Colour palettes for the program's weeks and kinds of session: the wash behind Today's
 * header, the plan in onboarding. Colour says which week or kind of session it is, never
 * anything about pain, and there is no red.
 *
 * Kept free of React Native so it can be checked in Node.
 */

export type ArtKey = 'violet' | 'teal' | 'amber' | 'moss' | 'night' | 'slate';

export type ArtPalette = {
  /** Gradient from the top-left corner to the bottom-right. */
  from: string;
  to: string;
  /** The soft light that blooms inside the art. */
  glow: string;
  /** The page header behind a cover fades from this into the background. */
  header: string;
};

// Grey tones (21 Oct 2026): the weeks and kinds of session differ in lightness, not hue.
export const ART: Record<ArtKey, ArtPalette> = {
  violet: { from: '#5A5A5A', to: '#1C1C1C', glow: '#D6D6D6', header: '#3A3A3A' },
  teal: { from: '#525252', to: '#191919', glow: '#CCCCCC', header: '#353535' },
  amber: { from: '#626262', to: '#1F1F1F', glow: '#DEDEDE', header: '#3E3E3E' },
  moss: { from: '#4C4C4C', to: '#171717', glow: '#C4C4C4', header: '#323232' },
  night: { from: '#3A3A3A', to: '#0F0F0F', glow: '#ADADAD', header: '#262626' },
  slate: { from: '#4A4A4A', to: '#161616', glow: '#D0D0D0', header: '#333333' },
};

/** The program's weeks: Understand, Notice, Soften, Live. */
export const WEEK_ART: Record<1 | 2 | 3 | 4, ArtKey> = { 1: 'violet', 2: 'teal', 3: 'amber', 4: 'moss' };

/** Any-time sessions, by what they're for. */
export const CATEGORY_ART = { familiar: 'violet', flare: 'amber', sleep: 'night', worry: 'teal' } as const satisfies Record<string, ArtKey>;

/** Where the two glows sit, varied by a seed so two covers of one colour still differ. */
export function glowSpots(seed: number): Array<{ x: number; y: number; r: number; a: number }> {
  const f = (n: number) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return [
    { x: 0.55 + f(1) * 0.35, y: 0.1 + f(2) * 0.3, r: 0.55 + f(3) * 0.2, a: 0.8 },
    { x: 0.05 + f(4) * 0.3, y: 0.7 + f(5) * 0.3, r: 0.4 + f(6) * 0.2, a: 0.45 },
  ];
}
