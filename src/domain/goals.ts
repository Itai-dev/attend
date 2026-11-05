import { tr } from '../i18n';

/**
 * The goal chips from onboarding (what the person wants to get back to).
 *
 * The goal is stored as the words shown, so each language keeps its own list, index for
 * index: a chip picked in English is the same chip in Hebrew. Without this, someone who chose
 * "Working without breaks" and then switched the phone to Hebrew saw their goal in English on
 * a Hebrew screen. A goal the person wrote themselves is shown exactly as typed.
 */
const GOALS_EN = ['Long walks', 'Playing with my kids', 'Sleeping through', 'Working without breaks', 'Sport', 'Time with friends'];
const GOALS_HE = ['הליכות ארוכות', 'משחק עם הילדים', 'לילה שלם של שינה', 'יום עבודה מלא', 'ספורט', 'זמן עם חברים'];

export function goals(): string[] {
  return tr(GOALS_EN, GOALS_HE);
}

/** A stored goal in the app's language: a chip becomes its twin in the other list; own words stay. */
export function localGoal(g: string | undefined): string | undefined {
  if (!g) return g;
  const i = Math.max(GOALS_EN.indexOf(g), GOALS_HE.indexOf(g));
  return i >= 0 ? goals()[i] : g;
}
