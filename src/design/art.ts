/**
 * Cover art palettes. Every practice gets generated cover art, the way every album and
 * podcast on Spotify has one: it makes a list scannable at a glance and gives each kind of
 * practice a face. Colour says which week or kind of session it is, never anything about
 * pain, and there is no red.
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

export const ART: Record<ArtKey, ArtPalette> = {
  violet: { from: '#5A49C2', to: '#1E1648', glow: '#C9BCFF', header: '#3B2F86' },
  teal: { from: '#1F8576', to: '#0B302B', glow: '#A6EBDB', header: '#175E54' },
  amber: { from: '#C47A36', to: '#3D1E0C', glow: '#FFD2A8', header: '#80502A' },
  moss: { from: '#4F8240', to: '#162B12', glow: '#CDEBA6', header: '#355A2B' },
  night: { from: '#2C3680', to: '#090B22', glow: '#9FA9FF', header: '#222A63' },
  slate: { from: '#4A4F5E', to: '#16171C', glow: '#D6DAE6', header: '#33363F' },
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
