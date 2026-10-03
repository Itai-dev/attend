import type { QualityFamily } from './types';

/**
 * Sensation words people actually use, mapped to a canonical word (which the
 * guide can say back), a noun form ("Notice that tightness."), and the visual
 * family the body map draws it with.
 *
 * The canonical word stays close to what the person said. "Tense" is not
 * rewritten to "tight" in speech; it only shares tight's visual family.
 */
export type Descriptor = {
  word: string;
  noun: string;
  family: QualityFamily;
  re: RegExp;
};

export const DESCRIPTORS: Descriptor[] = [
  { word: 'pins and needles', noun: 'pins and needles', family: 'grain', re: /\bpins and needles\b/ },
  { word: 'tight', noun: 'tightness', family: 'contract', re: /\b(tight|tightness|tighter|tightening)\b/ },
  { word: 'tense', noun: 'tension', family: 'contract', re: /\b(tense|tension|tensed)\b/ },
  { word: 'stiff', noun: 'stiffness', family: 'contract', re: /\b(stiff|stiffness)\b/ },
  { word: 'knotted', noun: 'knot', family: 'contract', re: /\b(knot|knotted|knots)\b/ },
  { word: 'clenched', noun: 'clenching', family: 'contract', re: /\b(clench|clenched|clenching)\b/ },
  { word: 'squeezing', noun: 'squeezing', family: 'contract', re: /\b(squeez\w*|gripp?ing|grip|vice|clamp\w*)\b/ },
  { word: 'cramping', noun: 'cramping', family: 'contract', re: /\b(cramp|cramps|cramping|crampy)\b/ },
  { word: 'pressure', noun: 'pressure', family: 'press', re: /\b(pressure|pressing|pressed|pushing|compress\w*)\b/ },
  { word: 'pulling', noun: 'pulling', family: 'pull', re: /\b(pull|pulls|pulling|pulled|tugg?ing|tug|dragging|drag)\b/ },
  { word: 'stretching', noun: 'stretching', family: 'pull', re: /\b(stretch|stretching|stretched|strained|strain)\b/ },
  { word: 'twisting', noun: 'twisting', family: 'pull', re: /\b(twist|twisting|twisted|wrench\w*)\b/ },
  { word: 'burning', noun: 'burning', family: 'warm', re: /\b(burn|burns|burning|burnt|fiery|scald\w*|on fire)\b/ },
  { word: 'hot', noun: 'heat', family: 'warm', re: /\b(hot|heat)\b/ },
  { word: 'warm', noun: 'warmth', family: 'warm', re: /\b(warm|warmth|warmer)\b/ },
  { word: 'raw', noun: 'rawness', family: 'warm', re: /\b(raw|rawness)\b/ },
  { word: 'buzzing', noun: 'buzzing', family: 'grain', re: /\b(buzz|buzzing|buzzy|vibrat\w*|humming|hum|fizz\w*)\b/ },
  { word: 'electric', noun: 'electric feeling', family: 'grain', re: /\b(electric\w*|zapp?ing)\b/ },
  { word: 'tingling', noun: 'tingling', family: 'grain', re: /\b(tingl\w*|prickl\w*|crawling|itch\w*)\b/ },
  { word: 'cold', noun: 'coldness', family: 'cold', re: /\b(cold|cool|icy|chilly|chill)\b/ },
  { word: 'heavy', noun: 'heaviness', family: 'heavy', re: /\b(heavy|heaviness|weight|weighed down|leaden|dense)\b/ },
  { word: 'aching', noun: 'ache', family: 'heavy', re: /\b(ache|aches|aching|achy)\b/ },
  { word: 'sore', noun: 'soreness', family: 'heavy', re: /\b(sore|soreness|tender|tenderness|bruised)\b/ },
  { word: 'dull', noun: 'dullness', family: 'heavy', re: /\b(dull)\b/ },
  { word: 'sharp', noun: 'sharpness', family: 'point', re: /\b(sharp|sharpness|stabbing|stab|piercing|knife|knives|cutting)\b/ },
  { word: 'shooting', noun: 'shooting feeling', family: 'point', re: /\b(shooting|shoots)\b/ },
  { word: 'throbbing', noun: 'throbbing', family: 'pulse', re: /\b(throb\w*|pulsing|pulsating|pounding|beating)\b/ },
  { word: 'numb', noun: 'numbness', family: 'mute', re: /\b(numb|numbness|dead feeling|can'?t feel it)\b/ },
];

/** Words that say "it hurts" without saying how. They prompt a gentle quality question. */
export const GENERIC_PAIN = /\b(pain|painful|hurts?|hurting|uncomfortable|discomfort|bad|awful|horrible|agony)\b/;

const BY_WORD = new Map(DESCRIPTORS.map((d) => [d.word, d]));

export function descriptorInfo(word: string): Descriptor | undefined {
  return BY_WORD.get(word);
}

export function familyOf(words: string[]): QualityFamily {
  for (const w of words) {
    const d = BY_WORD.get(w);
    if (d) return d.family;
  }
  return 'unknown';
}

/** "tight" → "tightness"; unknown words pass through. */
export function nounOf(word: string): string {
  return BY_WORD.get(word)?.noun ?? word;
}
