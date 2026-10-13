import type { BodyRegion, Place, Session } from './types';

/**
 * The pain record, ported from Pattern (pattern-native, src/painScale.ts and src/model.ts)
 * on 12 Oct 2026, cut down to what the practice needs: a number, and where.
 *
 * Pattern's rules come with it, because they were argued out there:
 *  - the number is what the person entered; nothing is derived, averaged or composited;
 *  - a day's pain is the PEAK of its check-ins, never the latest, so a day reads the same
 *    however many times it was entered;
 *  - optional answers are three-state: never asked (`places` absent), asked and nothing
 *    chosen (`places: []`), asked and declined (`placesSkipped`). A skip is never a negative.
 *
 * Check-ins are separate from sessions. There is no check-in before or after a session: a
 * number taken either side of every practice turns each one into a test of the pain.
 */

export const PAIN_MIN = 0;
export const PAIN_MAX = 10;

export type CheckIn = {
  id: string;
  /** UTC epoch ms. */
  at: number;
  /** Local offset from UTC in minutes at capture, so a day is the day it was where it was entered. */
  tz: number;
  /** Integer 0–10, as entered. */
  pain: number;
  /** Absent: never asked. []: asked, nothing chosen. */
  places?: Place[];
  /** Asked, and the person chose not to answer. Distinct from choosing nothing. */
  placesSkipped?: true;
  isSample?: boolean;
};

/**
 * Pattern's scale, version 3: five categories used identically everywhere.
 * 0 = No pain · 1–3 = Mild · 4–6 = Moderate · 7–9 = Severe · 10 = Most intense.
 */
export function painLabel(v: number): string {
  const i = clampPain(v);
  if (i === 0) return 'No pain';
  if (i <= 3) return 'Mild';
  if (i <= 6) return 'Moderate';
  if (i <= 9) return 'Severe';
  return 'Most intense';
}

export const PAIN_END_LOW = 'No pain';
export const PAIN_END_HIGH = 'Most intense';

export function clampPain(v: number): number {
  return Math.max(PAIN_MIN, Math.min(PAIN_MAX, Math.round(v)));
}

/** Anything from storage or an old build coerced into the domain, or null if unusable. */
export function normalizePain(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return clampPain(v);
}

/** "5 · Moderate": the number always travels with its word. */
export function formatPain(v: number): string {
  return `${clampPain(v)} · ${painLabel(v)}`;
}

/** The local calendar day a moment fell on, as YYYY-MM-DD, in the offset it was recorded in. */
export function dayKey(at: number, tzMinutes: number): string {
  const d = new Date(at + tzMinutes * 60_000);
  return d.toISOString().slice(0, 10);
}

/** The offset to record now. Date's offset has the opposite sign to "minutes from UTC". */
export function currentTz(date = new Date()): number {
  return -date.getTimezoneOffset();
}

export type PainDay = { day: string; peak: number; checkIns: number };

/** Each day's peak, oldest first. Days without a check-in are absent, never zero. */
export function painDays(checkIns: CheckIn[]): PainDay[] {
  const byDay = new Map<string, PainDay>();
  for (const c of checkIns) {
    const pain = normalizePain(c.pain);
    if (pain === null) continue;
    const day = dayKey(c.at, c.tz);
    const d = byDay.get(day);
    if (d) {
      d.peak = Math.max(d.peak, pain);
      d.checkIns++;
    } else byDay.set(day, { day, peak: pain, checkIns: 1 });
  }
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
}

/** Days with a session that ran its course or was ended by the person, in the session's local day. */
export function practiceDays(sessions: Session[], tz: number): Set<string> {
  const days = new Set<string>();
  for (const s of sessions) {
    if (s.outcome === 'crisis_pause' || s.outcome === 'safety_pause') continue;
    days.add(dayKey(s.startedAt, tz));
  }
  return days;
}

/**
 * The place to rest attention on in a guided session: the most recent check-in that named
 * one place. Several places, or none, leave the choice to earlier sessions or the whole body
 * — a guided session holds one place, and picking among several would be the app deciding
 * which pain matters.
 */
export function latestPlace(checkIns: CheckIn[], withinDays = 14, now = Date.now()): Place | undefined {
  const recent = checkIns
    .filter((c) => now - c.at <= withinDays * 86_400_000)
    .sort((a, b) => b.at - a.at)
    .find((c) => c.places && c.places.length > 0);
  return recent?.places?.length === 1 ? recent.places[0] : undefined;
}

/** Fewer days than this is not a picture yet: the progress view says so instead of drawing one. */
export const MIN_DAYS_FOR_PICTURE = 5;

/** Where people with chronic pain most often point, in the order they'd look. Shared by onboarding, check-in and Before. */
export const WHERE_REGIONS: BodyRegion[] = [
  'lower_back',
  'upper_back',
  'neck',
  'shoulder',
  'head',
  'jaw',
  'chest',
  'abdomen',
  'pelvis',
  'hip',
  'arm',
  'hand',
  'leg',
  'knee',
  'foot',
  'whole_body',
];
