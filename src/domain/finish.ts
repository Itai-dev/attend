import { dayKey } from './checkin';
import { practiceSessions, type Milestone, type MilestoneId } from './engagement';
import { dayCompleted, PROGRAM_DAYS, programDay, WEEKS, type ProgramState } from './program';
import type { Session, SessionType } from './types';

/**
 * The end of a practice (founder, 20 Oct 2026: "more screens for finishing a session… the UX
 * should be better"). Progress done quietly, after Duolingo's shape and Daisy's look: a place
 * fades up, the day's dot fills in, a postcard of the place is kept. No confetti, no "!", no
 * praise, no flame: it says what was done (AGENTS.md: nothing is manufactured) and never how the
 * sensation was, and nothing here reads the pain record (reward practice, never pain).
 *
 * Which screens show, and what they say, is decided here, in pure functions, so the rules are
 * tested: the common case is two screens (the completion moment, then what's next), never more
 * than three in a row, and at most one milestone per finish.
 */

// ——— places: a postcard for each program day ———

/**
 * The photographs a place can be. Named by the file in assets/images/photos, not by the sound
 * that once used it: sounds change (the tones, 20 Oct 2026) and a day's place must not.
 */
export type PlacePhoto = 'dawn' | 'day' | 'dusk' | 'evening' | 'rain' | 'forest' | 'stream' | 'waterfall' | 'ocean' | 'night' | 'fire' | 'fog';

/** Which part of the (3:2) photograph a postcard frames: a portrait crop from its left, middle or right. */
export type PlaceFocus = 'left' | 'center' | 'right';

export type ProgramPlace = { day: number; photo: PlacePhoto; focus: PlaceFocus; name: string };

/**
 * Twenty-eight places, one per program day. Twelve photographs, each framed in a different part
 * where it repeats, and named for what that framing shows ("old forest", "light through trees"),
 * so no two postcards are the same picture. Lowercase: a name is glanced at. Places, never a body.
 * The light runs from first light in week 1 toward evening in week 4.
 */
const PLACE_DEFS: Array<[PlacePhoto, PlaceFocus, string]> = [
  // Week 1 · Understand
  ['dawn', 'center', 'valley, first light'],
  ['fog', 'center', 'fog on the water'],
  ['forest', 'left', 'old forest'],
  ['stream', 'center', 'stream over stones'],
  ['day', 'left', 'the headland'],
  ['rain', 'center', 'lake in rain'],
  ['dusk', 'center', 'lake, at dusk'],
  // Week 2 · Notice
  ['waterfall', 'right', 'the falls'],
  ['ocean', 'center', 'end of the pier'],
  ['forest', 'right', 'light through trees'],
  ['night', 'center', 'meadow, night'],
  ['dawn', 'right', 'ridges, morning'],
  ['fire', 'center', 'fire on the shore'],
  ['evening', 'right', 'hills, moonrise'],
  // Week 3 · Soften
  ['rain', 'left', 'pines in the rain'],
  ['stream', 'left', 'moss and water'],
  ['fog', 'right', 'still water'],
  ['day', 'right', 'open sea, overcast'],
  ['waterfall', 'left', 'cliffs in cloud'],
  ['dusk', 'left', 'pines at the water'],
  ['ocean', 'right', 'grey waves'],
  // Week 4 · Live
  ['forest', 'center', 'the fern floor'],
  ['dawn', 'left', 'a slope of pines'],
  ['fire', 'right', 'embers by the lake'],
  ['night', 'right', 'treeline, stars'],
  ['evening', 'left', 'dark pines, mist'],
  ['rain', 'right', 'far hills in cloud'],
  ['dusk', 'right', 'last light'],
];

export const PLACES: ProgramPlace[] = PLACE_DEFS.map(([photo, focus, name], i) => ({ day: i + 1, photo, focus, name }));

export function placeForDay(day: number): ProgramPlace {
  return PLACES[Math.max(1, Math.min(PROGRAM_DAYS, day)) - 1];
}

export type Postcard = ProgramPlace & { earned: boolean; doneOn?: string };

/**
 * The places collection: derived from the program's done days, so it needs no storage of its own
 * and can never disagree with the 28 days. An unearned postcard is a day not reached yet, never a
 * day missed: it carries no date and nothing counts it.
 */
export function postcards(program: ProgramState): Postcard[] {
  return PLACES.map((p) => ({ ...p, earned: !!program.done[p.day], ...(program.done[p.day] ? { doneOn: program.done[p.day] } : {}) }));
}

/**
 * The weeks whose postcards Progress draws: up to the week in progress. Twenty-one empty frames on
 * day 2 read as a debt to work off (the program path's own rule), so later weeks wait.
 */
export function postcardWeeks(program: ProgramState): Array<1 | 2 | 3 | 4> {
  const done = Object.keys(program.done).map(Number);
  const reached = Math.min(PROGRAM_DAYS, (done.length ? Math.max(...done) : 0) + 1);
  const last = Math.ceil(reached / 7) as 1 | 2 | 3 | 4;
  return ([1, 2, 3, 4] as const).filter((w) => w <= last);
}

/** The photograph for a practice that is not a program day: a place that suits it, never a verdict. */
export function placeForPractice(type: SessionType, opts: { scan?: boolean; hour: number }): PlacePhoto {
  if (opts.scan) return 'forest';
  if (type === 'flare') return 'rain';
  if (type === 'sleep') return 'night';
  if (type === 'fear') return 'fog';
  const h = opts.hour;
  return h >= 5 && h < 10 ? 'dawn' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'evening';
}

// ——— what this finish was ———

const DAY_MS = 86_400_000;

export type FinishInput = {
  session: Session;
  /** Every session, this one included. */
  sessions: Session[];
  /** The program as it stands now, this session's day included. */
  program: ProgramState;
  tz: number;
  /** The session was the body scan (remembered when it started: features/finish/started.ts). */
  scan?: boolean;
};

export type FinishKind =
  /** A program day this practice completed. */
  | 'day'
  /** A program day already done, practiced again. */
  | 'again'
  /** A program day ended before it counted (under three active minutes). */
  | 'open'
  /** Anything else: a preset or a one-tap moment. */
  | 'practice';

export type Finish = {
  kind: FinishKind;
  day?: number;
  minutes: number;
  /** "day 9 · done", "a flare, met", "body scan · done". Lowercase: glanced at. */
  title: string;
  /** What was done, in a sentence: "7 minutes, eyes closed." */
  facts: string;
  /** A second sentence, when one is true: the short day, the person's own stop. */
  note?: string;
  /** The first practice after four days or more without: greeted, never counted. */
  returned: boolean;
};

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

export function minutesOf(s: Pick<Session, 'startedAt' | 'endedAt'>): number {
  return Math.max(1, Math.round((s.endedAt - s.startedAt) / 60_000));
}

function minutesText(n: number): string {
  return `${n} ${n === 1 ? 'minute' : 'minutes'}`;
}

/** "Seven" for a sentence's start; numerals past twelve. */
export function spelled(n: number): string {
  const w = WORDS[n];
  return w ? w[0].toUpperCase() + w.slice(1) : String(n);
}

/** Whether `session` is the practice that made its program day done (not a repeat of a done day). */
function completedItsDay(input: FinishInput): boolean {
  const { session, sessions, program } = input;
  const day = session.programDay;
  if (!day || !program.done[day] || !dayCompleted(session)) return false;
  // Done by an earlier practice of the same day: this one is "practice again".
  return !sessions.some((s) => s.id !== session.id && s.programDay === day && s.startedAt < session.startedAt && !s.isSample && dayCompleted(s));
}

/** The first practice after four days or more without one (weekLine's own measure). Never a count of the days. */
export function isReturn(session: Session, sessions: Session[]): boolean {
  const earlier = practiceSessions(sessions).filter((s) => s.id !== session.id && s.startedAt < session.startedAt);
  if (!earlier.length) return false;
  const last = Math.max(...earlier.map((s) => s.startedAt));
  return session.startedAt - last >= 4 * DAY_MS;
}

const TYPE_TITLE: Record<SessionType, string> = {
  flare: 'a flare, met',
  fear: 'a worried moment, met',
  sleep: 'a practice before sleep',
  notice: 'practice · done',
};

export function describeFinish(input: FinishInput): Finish {
  const { session, scan } = input;
  const minutes = minutesOf(session);
  const early = session.outcome === 'ended_early';
  const day = session.programDay;
  const facts = `${minutesText(minutes)}, eyes closed.`;
  // Said once, as a choice: no "still counts", which concedes it might not (copy review round 3).
  const stopped = early ? 'You chose when to stop.' : undefined;
  const returned = isReturn(session, input.sessions);
  if (day) {
    if (completedItsDay(input)) {
      // Three minutes is a whole day, and says so in the words Today promised it with.
      const short = minutes <= 3 ? 'Three minutes completes the day.' : undefined;
      return { kind: 'day', day, minutes, title: `day ${day} · done`, facts, note: short ?? stopped, returned };
    }
    if (input.program.done[day]) return { kind: 'again', day, minutes, title: `day ${day} · again`, facts, note: stopped, returned };
    // Under three active minutes: a practice all the same, and the day simply stays open.
    return { kind: 'open', day, minutes, title: `day ${day} · ${minutesText(minutes)}`, facts, note: `${stopped ?? ''} Day ${day} stays open for whenever you like.`.trim(), returned };
  }
  // "· done" for a practice that ran its course; one the person ended is named, not marked done.
  const title = scan ? (early ? 'body scan' : 'body scan · done') : early && session.sessionType === 'notice' ? 'a practice' : TYPE_TITLE[session.sessionType];
  return { kind: 'practice', minutes, title, facts, note: stopped, returned };
}

// ——— milestones: at most one screen ———

/**
 * The most significant first: the program's own marks, then the first practice, a return, the
 * rest. Only one milestone gets a screen per finish; the others are on Progress.
 */
const SIGNIFICANCE: MilestoneId[] = ['program_done', 'halfway', 'seven_days', 'first', 'returned', 'flare_met', 'three_days', 'first_moment', 'first_lesson', 'before_sleep'];

export function mostSignificant(earned: Milestone[]): Milestone | undefined {
  return [...earned].sort((a, b) => SIGNIFICANCE.indexOf(a.id) - SIGNIFICANCE.indexOf(b.id))[0];
}

/** The photograph behind a milestone's card. */
export const MILESTONE_PHOTO: Record<MilestoneId, PlacePhoto> = {
  first: 'dawn',
  first_lesson: 'fog',
  before_sleep: 'night',
  returned: 'ocean',
  three_days: 'stream',
  seven_days: 'forest',
  flare_met: 'evening',
  first_moment: 'day',
  halfway: 'waterfall',
  program_done: 'dusk',
};

// ——— which screens, in what order ———

export type FinishStep =
  | { kind: 'moment' }
  | { kind: 'milestone'; milestone: Milestone }
  /** Day 7, 14 or 21 done: the week as a chapter. Last, and carries what's next. */
  | { kind: 'chapter'; week: 1 | 2 | 3 }
  /** Day 28 done: the program as a whole. Last; links to the pain record, never shows it. */
  | { kind: 'program' }
  | { kind: 'next' };

/**
 * The screens after a practice. Always the completion moment first. Then at most one milestone
 * (never the one the chapter or the program card already is). Then exactly one closing card: the
 * program's, a week's chapter, or what's next. So: two screens on a normal day, three at most.
 */
export function finishSteps(finish: Finish, earned: Milestone[]): FinishStep[] {
  const steps: FinishStep[] = [{ kind: 'moment' }];
  const programDone = finish.kind === 'day' && finish.day === PROGRAM_DAYS;
  const chapter = finish.kind === 'day' && finish.day && finish.day % 7 === 0 && !programDone ? ((finish.day / 7) as 1 | 2 | 3) : undefined;
  // The closing card already says these, so they don't also get a screen.
  const said = new Set<MilestoneId>(programDone ? ['program_done'] : chapter === 2 ? ['halfway'] : []);
  const m = mostSignificant(earned.filter((e) => !said.has(e.id)));
  if (m) steps.push({ kind: 'milestone', milestone: m });
  steps.push(programDone ? { kind: 'program' } : chapter ? { kind: 'chapter', week: chapter } : { kind: 'next' });
  return steps;
}

// ——— the closing cards ———

export type WeekSummary = { week: 1 | 2 | 3 | 4; name: string; about: string; practices: number; minutes: number; days: number };

/** A program week, by what was practiced in it: its days' sessions, their minutes. */
export function weekSummary(week: 1 | 2 | 3 | 4, sessions: Session[], tz: number): WeekSummary {
  const first = (week - 1) * 7 + 1;
  const own = practiceSessions(sessions).filter((s) => s.programDay && s.programDay >= first && s.programDay < first + 7);
  return {
    week,
    name: WEEKS[week].name.toLowerCase(),
    about: WEEKS[week].about,
    practices: own.length,
    minutes: Math.round(own.reduce((m, s) => m + (s.endedAt - s.startedAt), 0) / 60_000),
    days: new Set(own.map((s) => dayKey(s.startedAt, tz))).size,
  };
}

export type ProgramSummary = { days: number; minutes: number; lessons: number; wins: number };

/** The 28 days, by showing up: practice days, minutes, lessons, small wins. Nothing from the pain record. */
export function programSummary(sessions: Session[], program: ProgramState, wins: number, tz: number): ProgramSummary {
  const own = practiceSessions(sessions);
  return {
    days: new Set(own.map((s) => dayKey(s.startedAt, tz))).size,
    minutes: Math.round(own.reduce((m, s) => m + (s.endedAt - s.startedAt), 0) / 60_000),
    lessons: program.read.length,
    wins,
  };
}

/** Each a line to read, zeros left out: "0 small wins" reads as a gap to fill. */
export function programSummaryLines(s: ProgramSummary): string[] {
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  return [
    s.days ? `${n(s.days, 'day', 'days')} of practice, ${n(s.minutes, 'minute', 'minutes')} with eyes closed.` : '',
    s.lessons ? `${n(s.lessons, 'lesson', 'lessons')}.` : '',
    s.wins ? `${n(s.wins, 'small win', 'small wins')} saved toward your goal.` : '',
  ].filter(Boolean);
}

export type NextUp = {
  /** "tomorrow", "today" or "next": when the program's next day is. */
  when: 'tomorrow' | 'today' | 'next';
  day: number;
  /** The lesson's title, lowercase: "the edges of a sensation". */
  lesson: string;
  minutes: number;
};

/**
 * What the program offers next, after this finish. A day completed today means the next one
 * opens tomorrow (one new day per calendar day); an open day is still today's. Undefined once the
 * 28 days are done.
 */
export function nextUp(program: ProgramState, today: string): NextUp | undefined {
  const doneDays = Object.keys(program.done).length;
  if (doneDays >= PROGRAM_DAYS) return undefined;
  let next = 1;
  while (program.done[next] && next <= PROGRAM_DAYS) next++;
  const doneToday = Object.values(program.done).includes(today);
  const d = programDay(next);
  return { when: doneToday ? 'tomorrow' : doneDays ? 'today' : 'next', day: next, lesson: d.lesson.title.toLowerCase(), minutes: d.practice.minutes };
}

/** "a reminder at 8:30 pm", when there is one. */
export function reminderLine(reminder: { enabled: boolean; hour: number; minute: number } | undefined): string | undefined {
  if (!reminder?.enabled) return undefined;
  const h = reminder.hour % 12 === 0 ? 12 : reminder.hour % 12;
  return `a reminder at ${h}:${String(reminder.minute).padStart(2, '0')} ${reminder.hour < 12 ? 'am' : 'pm'}`;
}

/**
 * Every word the finish flow can show, for the guard in tests: no praise, no "!", nothing about
 * the pain.
 */
export const FINISH_FORBIDDEN = /!|great job|well done|amazing|awesome|proud|congrat|streak|keep it up|don.t break|missed|behind|pain (is|was|went)|less pain|better|improv|heal|calmer/i;
