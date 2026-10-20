import { dayKey, MIN_DAYS_FOR_PICTURE, painDays, practiceDays, type CheckIn } from './checkin';
import type { Session } from './types';

/**
 * Progress: the pain record over weeks, beside the days practiced.
 *
 * It shows; it does not conclude. No trend line, no "better than last week", no arrow, no
 * percentage: Pattern learned that a verdict on the pain is the surface most likely to turn
 * a record into checking, and a practice that asks people to stop treating sensation as an
 * emergency cannot then grade them on it. The person reads the picture.
 *
 * The only sentences are counts of what was entered, and the one about what the picture
 * does not mean.
 */

/**
 * The chart's window fits the record. It starts at the first check-in or the first practice,
 * whichever came first, and ends today. Eight empty weeks with two dots squeezed into the last
 * few millimetres read as "nothing here" (Round 5): the picture should fill its card.
 * It's never shorter than two weeks, so a first week isn't stretched edge to edge. It's never
 * longer than eight weeks, so a dot stays a dot.
 */
export const PROGRESS_MIN_DAYS = 14;
export const PROGRESS_MAX_DAYS = 56;

export type ProgressDay = {
  day: string;
  /** The day's peak, as entered. Absent: no check-in that day, which is not a day without pain. */
  peak?: number;
  practised: boolean;
};

export type Progress = {
  days: ProgressDay[];
  /** The window's ends for the chart's axis: "Oct 8" … "today". */
  startLabel: string;
  endLabel: string;
  checkInDays: number;
  practiceDays: number;
  /** Enough check-in days in the window to draw a picture at all. */
  enough: boolean;
  /** Until the picture exists, how close it is, as a plain count. Undefined once it's drawn. */
  untilPicture?: string;
  /** Plain counts, never a comparison. */
  summary: string;
};

export const PROGRESS_MEANING =
  'Each dot is the highest number you entered that day. A day without a dot had no check-in — not a day without pain. Pain moves for many reasons; this is a record to look at, not a verdict on you or on the practice.';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-08" → "Oct 8". From the day key itself, so it is the day the person lived, in any time zone. */
export function shortDate(day: string): string {
  const [, m, d] = day.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/**
 * How close the record is to a picture, as a count of what was entered. Zero says what the
 * picture will be rather than "0 of 5": a count of nothing reads as a score not yet earned.
 */
export function untilPictureText(checkInDays: number): string | undefined {
  if (checkInDays >= MIN_DAYS_FOR_PICTURE) return undefined;
  const after = `your pain over the weeks appears here, beside the days you practiced.`;
  if (checkInDays === 0) return `After check-ins on ${MIN_DAYS_FOR_PICTURE} different days, ${after}`;
  return `${checkInDays} of ${MIN_DAYS_FOR_PICTURE} check-in days. After ${MIN_DAYS_FOR_PICTURE}, ${after}`;
}

export function buildProgress(checkIns: CheckIn[], sessions: Session[], opts: { now?: number; tz: number }): Progress {
  const now = opts.now ?? Date.now();
  const own = checkIns.filter((c) => !c.isSample);
  const peaks = new Map(painDays(own).map((d) => [d.day, d.peak]));
  const practised = practiceDays(
    sessions.filter((s) => !s.isSample),
    opts.tz,
  );

  const today = dayKey(now, opts.tz);
  // Day keys sort as dates, so the earliest is the smallest.
  const first = [...peaks.keys(), ...practised].filter((d) => d <= today).sort()[0];
  const span = first ? daysBetween(first, today) + 1 : 0;
  const n = Math.min(PROGRESS_MAX_DAYS, Math.max(PROGRESS_MIN_DAYS, span));

  const days: ProgressDay[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = dayKey(now - i * 86_400_000, opts.tz);
    const peak = peaks.get(day);
    days.push({ day, ...(peak !== undefined ? { peak } : {}), practised: practised.has(day) });
  }
  const checkInDays = days.filter((d) => d.peak !== undefined).length;
  const practiceDayCount = days.filter((d) => d.practised).length;
  const startLabel = shortDate(days[0].day);
  const summary =
    checkInDays === 0 && practiceDayCount === 0
      ? 'Nothing recorded yet.'
      : `Since ${startLabel}: checked in on ${plural(checkInDays, 'day')}, practiced on ${plural(practiceDayCount, 'day')}.`;
  return {
    days,
    startLabel,
    endLabel: 'today',
    checkInDays,
    practiceDays: practiceDayCount,
    enough: checkInDays >= MIN_DAYS_FOR_PICTURE,
    untilPicture: untilPictureText(checkInDays),
    summary,
  };
}

/** Whole calendar days from one day key to another. UTC on both sides, so no clock change bends it. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
