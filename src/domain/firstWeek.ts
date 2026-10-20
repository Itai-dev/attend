import { dayKey } from './checkin';
import { practiceSessions, practiceStats } from './engagement';
import { currentDay, type ProgramState } from './program';
import type { Session, SessionFeeling } from './types';

/**
 * The "your first week" card on Today (docs/studio/r2-copy.md §3): shown the day after Day 7
 * is done, until the person taps done. It says what they did — days, minutes, lessons, how
 * practice felt in their own taps — and nothing about the pain. No "of 7", no ranking, no
 * line for a count of zero.
 *
 * Its one optional question asks which of Day 4's signs the person has noticed. It is asked
 * once and has three states (never asked, skipped, answered), and the answer feeds nothing:
 * no score, no copy elsewhere, no lesson chosen by it. It is theirs to notice, not ours to read.
 *
 * Pure: no React, so the card's every line is checked in Node.
 */

/** Day 4's signs, card 2, in its order. */
export const SIGNS = [
  { id: 'stress', label: 'began during a stressful time' },
  { id: 'moves', label: 'moves or spreads' },
  { id: 'mood', label: 'changes with mood or setting' },
  { id: 'absorbed', label: 'fades when absorbed' },
] as const;

export type SignId = (typeof SIGNS)[number]['id'];
/** A sign, or one of the answers that isn't a sign. "not now" is not an answer: it is a skip. */
export type SignAnswer = SignId | 'none' | 'unsure';

/** Stored in prefs. Absent: never asked. `skipped`: asked, and "not now". Otherwise answered. */
export type SignsReply = { at: number; skipped?: true; signs?: SignAnswer[] };

export const SIGNS_PROMPT = 'Day 4 named some signs. Which, if any, sound familiar?';
/**
 * "Signs can show up later" read as "keep watching for them", an invitation to check the body
 * (safety review round 3). Many people's pain shows none of these; the practice doesn't depend
 * on it, and weighing what's behind the pain is the doctor's part, not the app's.
 */
export const NONE_REPLY = 'That’s worth knowing too. Not everyone’s pain shows these. The practice is the same either way, and your doctor can help you weigh what’s behind it.';
/**
 * Shown under the question after any answer (signs, none, or not sure). Ticking signs must not
 * read as a result: the app never concludes what someone's pain is.
 */
export const SIGNS_NOTE = 'These are things to notice, not a diagnosis.';
export const SIGN_EXTRAS: Array<{ id: 'none' | 'unsure'; label: string }> = [
  { id: 'none', label: 'none of these' },
  { id: 'unsure', label: 'not sure' },
];
export const NOT_NOW = 'not now';

/**
 * The After screen's chips, in its order: shown there, and listed by the card, from this one
 * list so the two never drift. Labels are display only; the stored value is `value`.
 */
export const FEELING_ORDER: Array<{ value: SessionFeeling; label: string }> = [
  { value: 'settled', label: 'settled' },
  { value: 'curious', label: 'curious' },
  { value: 'restless', label: 'restless' },
  { value: 'hard', label: 'hard today' },
];

/** The card shows the day after Day 7 was done, and stays until the person taps done. */
export function showFirstWeek(program: ProgramState, dismissedAt: number | undefined, today: string): boolean {
  const seventh = program.done[7];
  return !!seventh && seventh < today && dismissedAt === undefined;
}

export type FirstWeekCard = {
  kicker: string;
  title: string;
  lines: string[];
  closing: string;
  footnote?: string;
};

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function list(words: string[]): string {
  if (words.length <= 2) return words.join(' and ');
  return `${words.slice(0, -1).join(', ')}, and ${words[words.length - 1]}`;
}

/**
 * The card's lines. Counted up to the end of the day Day 7 was done, so it is the first week
 * however late the card is opened, and doesn't grow while it waits.
 */
export function firstWeekCard(input: { sessions: Session[]; program: ProgramState; now: number; tz: number }): FirstWeekCard {
  const { program, now, tz } = input;
  const end = program.done[7] ?? dayKey(now, tz);
  const week = input.sessions.filter((s) => dayKey(s.startedAt, tz) <= end);
  const stats = practiceStats(week, now, tz);
  const lessons = program.read.filter((d) => d <= 7).length;
  const felt = new Set(practiceSessions(week).map((s) => s.feeling).filter(Boolean));
  const chips = FEELING_ORDER.filter((f) => felt.has(f.value)).map((f) => f.label);

  const lines: string[] = [];
  if (stats.days > 0) {
    lines.push(
      stats.minutes > 0
        ? `${plural(stats.days, 'day', 'days')} of practice, ${plural(stats.minutes, 'minute', 'minutes')} with eyes closed.`
        : `${plural(stats.days, 'day', 'days')} of practice.`,
    );
  }
  if (lessons > 0) lines.push(`${plural(lessons, 'lesson', 'lessons')}.`);
  if (chips.length === 1 && chips[0] === 'hard today') lines.push('How practice felt: hard today. Showing up was the practice.');
  else if (chips.length) lines.push(`How practice felt: ${list(chips)}.`);

  // Only once today's day is done does the footnote add anything ("day 9 opens tomorrow"); on a
  // day still open, Today already shows it, and a second line pointing at it reads as a nudge.
  const { day, doneToday, finished } = currentDay(program, dayKey(now, tz));
  const footnote = doneToday && !finished ? `day ${day + 1} opens tomorrow` : undefined;

  return {
    kicker: 'your first week',
    title: 'a week of practice',
    lines,
    // Not "keep noticing your own signs": that invites checking the body (copy review round 3).
    closing: 'Save moments as they come. They gather in Progress, in your own words.',
    footnote,
  };
}

/**
 * One tap on the signs question. Signs can be several; "none of these" and "not sure" stand
 * alone, so picking one clears the rest, and a sign clears them.
 */
export function toggleSign(current: SignAnswer[], tapped: SignAnswer): SignAnswer[] {
  if (current.includes(tapped)) return current.filter((s) => s !== tapped);
  if (tapped === 'none' || tapped === 'unsure') return [tapped];
  return [...current.filter((s) => s !== 'none' && s !== 'unsure'), tapped];
}
