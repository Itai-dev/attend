import { dayKey, MIN_DAYS_FOR_PICTURE, painDays, practiceDays, type CheckIn } from './checkin';
import type { Session } from './types';
import { heCount, isHe, tr } from '../i18n';

/**
 * Progress: the pain record over weeks, beside the days practised.
 *
 * It shows; it does not conclude. No trend line, no "better than last week", no arrow, no
 * percentage: Pattern learned that a verdict on the pain is the surface most likely to turn
 * a record into checking, and a practice that asks people to stop treating sensation as an
 * emergency cannot then grade them on it. The person reads the picture.
 *
 * The only sentences are counts of what was entered, and the one about what the picture
 * does not mean.
 */

export const PROGRESS_DAYS = 56;

export type ProgressDay = {
  day: string;
  /** The day's peak, as entered. Absent: no check-in that day, which is not a day without pain. */
  peak?: number;
  practised: boolean;
};

export type Progress = {
  days: ProgressDay[];
  checkInDays: number;
  practiceDays: number;
  /** Enough check-in days in the window to draw a picture at all. */
  enough: boolean;
  /** Plain counts, never a comparison. */
  summary: string;
};

export const PROGRESS_MEANING =
  'Each dot is the highest number you entered that day. A day without a dot had no check-in — not a day without pain. Pain moves for many reasons; this is a record to look at, not a verdict on you or on the practice.';

const HE_PROGRESS_MEANING =
  'כל נקודה היא המספר הגבוה ביותר שהוזן באותו יום. יום בלי נקודה הוא יום בלי צ׳ק־אין – לא יום בלי כאב. כאב משתנה מהרבה סיבות; זה תיעוד שאפשר להסתכל עליו, לא פסק דין עליכם או על התרגול.';

/** The sentence about what the picture does not mean, in the app's language. */
export function progressMeaning(): string {
  return tr(PROGRESS_MEANING, HE_PROGRESS_MEANING);
}

export function buildProgress(checkIns: CheckIn[], sessions: Session[], opts: { now?: number; tz: number; days?: number }): Progress {
  const now = opts.now ?? Date.now();
  const n = opts.days ?? PROGRESS_DAYS;
  const own = checkIns.filter((c) => !c.isSample);
  const peaks = new Map(painDays(own).map((d) => [d.day, d.peak]));
  const practised = practiceDays(
    sessions.filter((s) => !s.isSample),
    opts.tz,
  );

  const days: ProgressDay[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = dayKey(now - i * 86_400_000, opts.tz);
    const peak = peaks.get(day);
    days.push({ day, ...(peak !== undefined ? { peak } : {}), practised: practised.has(day) });
  }
  const checkInDays = days.filter((d) => d.peak !== undefined).length;
  const practiceDayCount = days.filter((d) => d.practised).length;
  const weeks = Math.round(n / 7);
  const summary =
    checkInDays === 0 && practiceDayCount === 0
      ? tr('Nothing recorded yet.', 'עוד לא נרשם כלום.')
      : isHe()
        ? `ב־${weeks} השבועות האחרונים: ${checkInDays ? `צ׳ק־אין ${onDays(checkInDays)}` : 'בלי צ׳ק־אין'}, ${practiceDayCount ? `תרגול ${onDays(practiceDayCount)}` : 'בלי תרגול'}.`
        : `In the last ${weeks} weeks: checked in on ${plural(checkInDays, 'day')}, practised on ${plural(practiceDayCount, 'day')}.`;
  return { days, checkInDays, practiceDays: practiceDayCount, enough: checkInDays >= MIN_DAYS_FOR_PICTURE, summary };
}

/** "ביום אחד", "ביומיים", "ב־6 ימים". None is said as "בלי …" by the caller, never "ב־0 ימים". */
function onDays(n: number) {
  return heCount(n, 'ביום אחד', 'ימים', 'ביומיים').replace(/^(\d)/, 'ב־$1');
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
