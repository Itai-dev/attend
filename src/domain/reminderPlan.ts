import { dayKey } from './checkin';
import { currentDay, PROGRAM_DAYS, programDay, type ProgramState } from './program';

/**
 * Which reminders to schedule, as dated one-offs (studio round 2, docs/studio/r2-copy.md §4).
 *
 * A repeating daily trigger could only step down to weekly when the app was opened again, so
 * someone who had stopped kept getting a daily tap on the shoulder. Dated one-offs carry the
 * whole rule with them: a reminder on each of the four days after the latest practice
 * (skipping a day already practiced), then one a week, on the same weekday, with nothing to
 * open. Every later practice reschedules from scratch.
 *
 * The plan is anchored on the latest practice, not on "now", so opening the app without
 * practicing doesn't push the step-down back, and rescheduling twice gives the same plan.
 *
 * Copy rules (researcher, safety review round 3): nothing on the lock screen says what the app
 * is for. A lesson title ("day 1 · pain is real") above a notification told anyone glancing at
 * the phone that its owner has chronic pain, so titles carry the day number only and no line
 * names pain, a flare, or a lesson. Never a count of days missed, never "waiting" as an
 * obligation. Pure: no React, no Expo, tested in Node.
 */

export type PlannedReminder = {
  /** The local calendar day it fires on, YYYY-MM-DD. */
  date: string;
  hour: number;
  minute: number;
  kind: 'daily' | 'weekly';
  /** Empty when the copy has no title: the lock screen shows the app's name above the body. */
  title: string;
  body: string;
};

export type ReminderPlanInput = {
  hour: number;
  minute: number;
  now: number;
  /** Minutes east of UTC, as dayKey takes it. */
  tz: number;
  program: ProgramState;
  /** Start of the latest session that counts as practice (engagement.practiceStats). */
  lastPractice?: number;
};

/** Daily reminders after the latest practice, before the step-down (AGENTS.md: weekly after four quiet days). */
export const QUIET_DAYS = 4;
/**
 * How many weekly reminders are queued past the step-down. iOS keeps at most 64 pending, and
 * any finite queue ends somewhere; twelve is about three months. Whether weekly reminders
 * should stop sooner (after four unanswered) is Itai's call (docs/STUDIO.md round 2).
 */
export const WEEKLY_COUNT = 12;

const DAY = 86_400_000;

/** Days since the epoch for a YYYY-MM-DD key. Calendar arithmetic, so no clock or DST enters it. */
function index(key: string): number {
  return Math.round(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / DAY);
}

function keyOf(i: number): string {
  return new Date(i * DAY).toISOString().slice(0, 10);
}

const DAILY_BODIES: Array<(m: number) => string> = [
  (m) => `${m} minutes, or 3 if that’s what today has.`,
  (m) => `A short lesson, then eyes closed. ${m} minutes, or 3 on a low day.`,
  (m) => `Eyes closed, just listen. ${m} minutes, or 3 if that’s what today has.`,
  () => 'Listen to the lesson, then the practice. 3 minutes is there too.',
  () => 'Ready when you are. There’s a 3-minute version if energy is low.',
];
/** The bodies that speak of the lesson: left out once that day's lesson has been read. */
const MENTIONS_LESSON = new Set([1, 3]);
const SHORT_DAY = '3 minutes, eyes closed.';

const WEEKLY_BODIES: Array<(n: number) => string> = [
  (n) => `Whenever you’d like to come back, day ${n} is right where it was.`,
  (n) => `Nothing has reset. Day ${n} is here whenever you are.`,
  () => 'Your practice is here. Nothing to catch up on.',
  (n) => `Day ${n} is just as you left it. 3 minutes is enough to begin.`,
  (n) => `A few minutes, eyes closed, whenever you want them. Day ${n} is ready.`,
  () => 'Come back any time. The next practice starts from where you are.',
];

const AFTER_PROGRAM = [
  'A practice is here whenever you’d like one.',
  'The body scan, or 3 quiet minutes, eyes closed. Here when you want them.',
];

/**
 * `day 3`: the number only. The lesson's title is health information on a lock screen (see
 * the copy rules above). Day 28 keeps its own words, which say nothing about health.
 */
export function dailyTitle(day: number): string {
  if (day === PROGRAM_DAYS) return `day ${PROGRAM_DAYS} · the last day`;
  return `day ${day}`;
}

export function planReminders(input: ReminderPlanInput): PlannedReminder[] {
  const { hour, minute, now, tz, program } = input;
  const todayKey = dayKey(now, tz);
  const today = index(todayKey);
  const local = new Date(now + tz * 60_000);
  const passed = local.getUTCHours() * 60 + local.getUTCMinutes() >= hour * 60 + minute;
  const { day, doneToday, finished } = currentDay(program, todayKey);

  // The day the latest practice happened: a counted session, or a program day completed.
  const practiced = [input.lastPractice !== undefined ? index(dayKey(input.lastPractice, tz)) : -Infinity, ...Object.values(program.done).map(index)];
  let anchor = Math.max(...practiced);
  if (!Number.isFinite(anchor)) {
    // Never practiced: the four days start now, from today if its time is still ahead.
    anchor = passed ? today : today - 1;
  }

  // What the reminders point to: today's day, or tomorrow's once today's is done.
  const next = finished ? undefined : doneToday ? Math.min(day + 1, PROGRAM_DAYS) : day;
  const minutes = next ? programDay(next).practice.minutes : 0;
  const read = next ? program.read.includes(next) : false;

  const future = (i: number) => i > today || (i === today && !passed);
  const plan: PlannedReminder[] = [];

  for (let gap = 1; gap <= QUIET_DAYS; gap++) {
    const i = anchor + gap;
    // Never on a day already practiced: the anchor is the latest practice, so `i` can only be
    // today or later when today is still unpracticed.
    if (!future(i)) continue;
    let body: string;
    if (!next) body = AFTER_PROGRAM[i % AFTER_PROGRAM.length];
    else if (minutes <= 3) body = SHORT_DAY;
    else {
      const bodies = DAILY_BODIES.map((b, k) => ({ b, k })).filter(({ k }) => !(read && MENTIONS_LESSON.has(k)));
      body = bodies[i % bodies.length].b(minutes);
    }
    plan.push({ date: keyOf(i), hour, minute, kind: 'daily', title: next ? dailyTitle(next) : '', body });
  }

  // Weekly, on the weekday of the last daily one. Counted from the anchor, so the same week
  // always gets the same line however often this is recomputed.
  const lastDaily = anchor + QUIET_DAYS;
  const firstWeek = Math.max(1, Math.ceil((today - lastDaily) / 7));
  for (let w = firstWeek; plan.filter((p) => p.kind === 'weekly').length < WEEKLY_COUNT; w++) {
    const i = lastDaily + w * 7;
    if (!future(i)) continue;
    const body = next ? WEEKLY_BODIES[(w - 1) % WEEKLY_BODIES.length](next) : AFTER_PROGRAM[(w - 1) % AFTER_PROGRAM.length];
    plan.push({ date: keyOf(i), hour, minute, kind: 'weekly', title: '', body });
  }
  return plan;
}

/** Every line the plan can show, for the copy tests. */
export function allReminderCopy(): string[] {
  const days = Array.from({ length: PROGRAM_DAYS }, (_, i) => i + 1);
  return [
    ...days.map(dailyTitle),
    ...DAILY_BODIES.map((b) => b(7)),
    SHORT_DAY,
    ...WEEKLY_BODIES.map((b) => b(9)),
    ...AFTER_PROGRAM,
  ];
}
