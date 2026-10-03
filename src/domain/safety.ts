import type { Observation } from './extract';

/**
 * The line the practice does not cross.
 *
 * Somatic tracking is for familiar, long-standing sensations that the person
 * already understands are suitable for it. The guide can help someone meet a
 * familiar ache with less alarm; it cannot decide that an unexplained one is
 * harmless, and it must never try.
 *
 * Three levels, checked on every utterance, locally, before anything else:
 *
 *  - CRISIS: words about not wanting to live or hurting oneself. The practice
 *    stops; the person is pointed toward people who can help right now.
 *  - URGENT: symptoms that can signal an emergency. The practice stops,
 *    neutrally, with a suggestion to seek care.
 *  - CHECK: hints that a symptom may be new, sudden or changing. The guide
 *    asks once whether the sensation is familiar. "Familiar" continues;
 *    "new" or "not sure" ends the practice gently with a suggestion to have
 *    it looked at. No reinterpretation is ever offered for it.
 *
 * Over-triggering costs a session. Under-triggering could cost far more. The
 * patterns lean toward asking.
 */

export type SafetyLevel = 'none' | 'check' | 'urgent' | 'crisis';

export type SafetyResult = {
  level: SafetyLevel;
  reason?: string;
};

const CRISIS =
  /\b(kill myself|killing myself|want to die|wanna die|end (my life|it all)|suicid\w*|hurt myself|harm myself|self[- ]harm|don'?t want to (be here|live|be alive)|no reason to live|better off dead|can'?t go on)\b/;

const URGENT = [
  /\b(can'?t breathe|cannot breathe|struggling to breathe|short(ness)? of breath|out of breath)\b/,
  /\b(crushing|squeezing|heavy|tight) (pain|pressure|feeling)? ?(in|on) my chest\b.*\b(arm|jaw|breath|sweat\w*|sick)\b/,
  /\b(worst (headache|pain) (of my life|ever|i'?ve ever had)|thunderclap)\b/,
  /\b(passed out|fainted|fainting|blacked out|black out)\b/,
  /\b(slurr\w*|can'?t (speak|talk) properly|face (is )?droop\w*)\b/,
  /\b(can'?t (move|feel) my (arm|arms|leg|legs|face|hand|foot))\b/,
  /\bsudden(ly)? (numb\w*|weak\w*|loss of)\b/,
  /\b(lost control of my (bladder|bowels?)|can'?t control my (bladder|bowels?))\b/,
  /\b(coughing (up )?blood|vomiting blood|throwing up blood|blood in my)\b/,
  /\b(high fever|stiff neck and (a )?fever|fever and (a )?stiff neck)\b/,
  /\b(bleeding (a lot|heavily|badly))\b/,
];

const CHECK = [
  /\b(chest pain|pain in my chest)\b/,
  /\b(after (a|the|my) (fall|accident|crash|car accident|injury|hit|operation|surgery))\b/,
  // Not "suddenly" on its own: "it suddenly softened" is an observation, not a red flag.
  /\b(getting (much |a lot |really )?worse (fast|quickly|every day|by the hour)|rapidly getting worse|worse and worse every)\b/,
  /\b(swollen|swelling) and (hot|red)\b/,
  /\b(can'?t (put|bear) (any )?weight)\b/,
  /\b(fever|feverish)\b/,
  /\b(numb\w*) (is )?spreading\b/,
  /\bnever (felt|had) (this|anything like (this|it))\b/,
];

export function screen(obs: Observation): SafetyResult {
  const t = obs.text;
  if (CRISIS.test(t)) return { level: 'crisis', reason: 'crisis_language' };
  for (const re of URGENT) if (re.test(t)) return { level: 'urgent', reason: re.source.slice(0, 40) };
  if (obs.familiarity === 'new') return { level: 'check', reason: 'described_as_new' };
  for (const re of CHECK) if (re.test(t)) return { level: 'check', reason: re.source.slice(0, 40) };
  return { level: 'none' };
}

/**
 * Words the guide must never say, whoever wrote the line — the local bank or
 * a remote model. They claim medical certainty, promise safety, or turn the
 * practice into cheerleading. A line containing any of them is replaced.
 */
export const FORBIDDEN_GUIDE_LANGUAGE: RegExp[] = [
  /\bnothing( is|'s) wrong\b/i,
  /\b(you are|you're) (completely |totally |perfectly )?safe\b/i,
  /\b(definitely|certainly|just) (caused by|coming from) your (brain|mind|nervous system)\b/i,
  /\bit'?s (all )?in your head\b/i,
  /\b(harmless|benign|not dangerous)\b/i,
  /\bdiagnos\w*\b/i,
  /\b(ignore|stop taking|don'?t need) (your )?(doctor|medication|medicine|treatment)\b/i,
  /\bthank you for sharing\b/i,
  /\bi hear you\b/i,
  /\bi'?m (so )?sorry (you'?re|that you|to hear)\b/i,
  /\b(great|good) job\b/i,
  /\b(amazing|awesome|fantastic|wonderful|well done)\b/i,
  /\bas an ai\b/i,
  /\bpain score\b/i,
  /\bon a scale\b/i,
];

export function violatesGuideLanguage(text: string): boolean {
  return FORBIDDEN_GUIDE_LANGUAGE.some((re) => re.test(text));
}
