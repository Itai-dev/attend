import { dayKey } from './checkin';
import type { ProgramState } from './program';
import type { Session } from './types';

/**
 * Engagement that rewards practice, never pain (docs/RESEARCH.md §5).
 *
 *  - Practice is counted by DAYS PER WEEK, not consecutive days. Nothing resets, so there is
 *    no streak to lose; a missed day only means a day without a dot.
 *  - Milestones are about showing up: sessions, days, program progress, a flare met with a
 *    practice, a step saved toward the person's own goal. None of them reads the pain record.
 *  - Coming back after a break is greeted, never scolded.
 *
 * Pure functions over sessions and the program state, so every rule here is tested.
 */

/** Sessions that count as practice: own (not samples), not stopped by a safety pause, and given a real minute. */
export function practiceSessions(sessions: Session[]): Session[] {
  return sessions.filter(
    (s) => !s.isSample && s.outcome !== 'safety_pause' && s.outcome !== 'crisis_pause' && s.endedAt - s.startedAt >= 60_000,
  );
}

const DAY = 86_400_000;

/** Monday-first week containing `now`, as local day keys. */
export function weekDays(now: number, tz: number): string[] {
  const local = new Date(now + tz * 60_000);
  const dow = (local.getUTCDay() + 6) % 7; // Monday = 0
  const monday = now - dow * DAY;
  return Array.from({ length: 7 }, (_, i) => dayKey(monday + i * DAY, tz));
}

export type WeekStripDay = { day: string; label: string; practised: boolean; today: boolean; future: boolean };

const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function weekStrip(sessions: Session[], now: number, tz: number): WeekStripDay[] {
  const practised = new Set(practiceSessions(sessions).map((s) => dayKey(s.startedAt, tz)));
  const today = dayKey(now, tz);
  return weekDays(now, tz).map((day, i) => ({ day, label: LABELS[i], practised: practised.has(day), today: day === today, future: day > today }));
}

export type PracticeStats = { days: number; minutes: number; sessions: number; daysThisWeek: number; lastPractice?: number };

export function practiceStats(sessions: Session[], now: number, tz: number): PracticeStats {
  const own = practiceSessions(sessions);
  const days = new Set(own.map((s) => dayKey(s.startedAt, tz)));
  const week = new Set(weekDays(now, tz));
  return {
    days: days.size,
    minutes: Math.round(own.reduce((m, s) => m + (s.endedAt - s.startedAt), 0) / 60_000),
    sessions: own.length,
    daysThisWeek: [...days].filter((d) => week.has(d)).length,
    lastPractice: own.length ? Math.max(...own.map((s) => s.startedAt)) : undefined,
  };
}

/** One line under the week strip. Never a count of missed days, never a judgement. */
export function weekLine(stats: PracticeStats, now: number): string {
  if (stats.sessions === 0) return 'Practice days show here as dots.';
  const away = stats.lastPractice ? Math.floor((now - stats.lastPractice) / DAY) : 0;
  if (away >= 4) return 'Welcome back. Pick up wherever you like.';
  if (stats.daysThisWeek === 0) return 'A new week. Nothing to catch up on.';
  return stats.daysThisWeek === 1 ? '1 practice day this week.' : `${stats.daysThisWeek} practice days this week.`;
}

export type MilestoneId = 'first' | 'three_days' | 'seven_days' | 'flare_met' | 'first_moment' | 'halfway' | 'program_done';

export type Milestone = { id: MilestoneId; label: string; detail: string; earned: boolean };

export const MILESTONE_COPY: Record<MilestoneId, { label: string; detail: string }> = {
  first: { label: 'first practice', detail: 'You began.' },
  three_days: { label: '3 days', detail: 'Three days of practice.' },
  seven_days: { label: 'a full week', detail: 'Seven practice days since you began.' },
  flare_met: { label: 'a flare met', detail: 'You met a flare with a practice.' },
  first_moment: { label: 'a first step', detail: 'You saved a moment toward your goal.' },
  halfway: { label: 'halfway', detail: 'Fourteen days of the program.' },
  program_done: { label: '28 days', detail: 'The whole program, done.' },
};

export function milestones(input: { sessions: Session[]; program: ProgramState; moments: number; tz: number }): Milestone[] {
  const own = practiceSessions(input.sessions);
  const days = new Set(own.map((s) => dayKey(s.startedAt, input.tz))).size;
  const programDone = Object.keys(input.program.done).length;
  const earned: Record<MilestoneId, boolean> = {
    first: own.length >= 1,
    three_days: days >= 3,
    seven_days: days >= 7,
    flare_met: own.some((s) => s.sessionType === 'flare'),
    first_moment: input.moments >= 1,
    halfway: programDone >= 14,
    program_done: programDone >= 28,
  };
  return (Object.keys(MILESTONE_COPY) as MilestoneId[]).map((id) => ({ id, ...MILESTONE_COPY[id], earned: earned[id] }));
}

/** Milestones earned by the latest session: earned with it, not without it. */
export function newlyEarned(before: Milestone[], after: Milestone[]): Milestone[] {
  const had = new Set(before.filter((m) => m.earned).map((m) => m.id));
  return after.filter((m) => m.earned && !had.has(m.id));
}

/** A step toward the person's goal, in their own words. Kept on the device. */
export type Moment = { id: string; at: number; text: string };
