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

// Colour returns for Explore (22 Oct 2026, after Headspace's tiles): muted Japanese dyes, so the
// shelves are told apart at a glance and still feel calm. Indigo, moss, ochre, wisteria, night,
// river blue. Earthy and low in saturation; no red, and no colour ever says anything about pain.
export const ART: Record<ArtKey, ArtPalette> = {
  violet: { from: '#8C7BA8', to: '#4A3F63', glow: '#E4DAF2', header: '#5E5278' },
  teal: { from: '#5E8E92', to: '#2B4A50', glow: '#D2ECEC', header: '#3C6066' },
  amber: { from: '#C49A5C', to: '#7A5A2E', glow: '#F6E2BE', header: '#8E6C3C' },
  moss: { from: '#7F9A68', to: '#3E5233', glow: '#E0ECCF', header: '#556B46' },
  night: { from: '#4A5878', to: '#1D2438', glow: '#C9D3EC', header: '#2E3850' },
  slate: { from: '#6F8BA6', to: '#33475E', glow: '#D8E6F2', header: '#46607A' },
};

/** The program's weeks: Understand, Notice, Soften, Live. */
export const WEEK_ART: Record<1 | 2 | 3 | 4, ArtKey> = { 1: 'violet', 2: 'teal', 3: 'amber', 4: 'moss' };

/** Any-time sessions, by what they're for. */
export const CATEGORY_ART = { familiar: 'moss', flare: 'amber', sleep: 'night', worry: 'violet' } as const satisfies Record<string, ArtKey>;

/** The nature sounds in Explore: stream, waves, rain, wind. */
export const SOUND_ART = { notice: 'teal', flare: 'slate', sleep: 'night', fear: 'moss' } as const satisfies Record<string, ArtKey>;

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
