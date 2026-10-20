import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayKey } from '../src/domain/checkin';
import { MILESTONE_COPY, milestones, newlyEarned, nextMilestone, type Milestone } from '../src/domain/engagement';
import {
  describeFinish,
  FINISH_FORBIDDEN,
  finishSteps,
  isReturn,
  mostSignificant,
  nextUp,
  PLACES,
  postcards,
  postcardWeeks,
  programSummaryLines,
  reminderLine,
  weekSummary,
  type FinishInput,
} from '../src/domain/finish';
import { completeDay, EMPTY_PROGRAM, PROGRAM_DAYS, WEEKS, type ProgramState } from '../src/domain/program';
import type { Session } from '../src/domain/types';

const DAY = 86_400_000;
// Tuesday 20 Oct 2026, 19:00 in New York (−04:00).
const NOW = Date.UTC(2026, 9, 20, 23, 0);
const TZ = -240;
const key = (t: number) => dayKey(t, TZ);

let n = 0;
const s = (daysAgo: number, extra: Partial<Session> = {}): Session =>
  ({ id: `s${n++}`, startedAt: NOW - daysAgo * DAY, endedAt: NOW - daysAgo * DAY + 7 * 60_000, sessionType: 'notice', outcome: 'completed', mode: 'guided', ...extra }) as Session;

/** A program run one day a day, ending today with `days` done: its sessions and its state. */
function run(days: number, extra: Partial<Session> = {}): { sessions: Session[]; program: ProgramState } {
  const sessions = Array.from({ length: days }, (_, i) => s(days - 1 - i, { programDay: i + 1, ...(i === days - 1 ? extra : {}) }));
  let program = EMPTY_PROGRAM;
  for (const x of sessions) program = completeDay(program, x.programDay!, key(x.startedAt));
  return { sessions, program: { ...program, read: Array.from({ length: days }, (_, i) => i + 1) } };
}

/** What the finish flow would show for the last session, as AfterScreen computes it. */
function flow(input: Omit<FinishInput, 'tz'>, moments = 0) {
  const finish = describeFinish({ ...input, tz: TZ });
  const without = { ...input.program, done: { ...input.program.done } };
  if (finish.kind === 'day' && finish.day) delete without.done[finish.day];
  const before = milestones({ sessions: input.sessions.filter((x) => x.id !== input.session.id), program: without, moments, tz: TZ });
  const after = milestones({ sessions: input.sessions, program: input.program, moments, tz: TZ });
  const earned = newlyEarned(before, after);
  return { finish, earned, steps: finishSteps(finish, earned).map((st) => (st.kind === 'milestone' ? `milestone:${st.milestone.id}` : st.kind === 'chapter' ? `chapter:${st.week}` : st.kind)) };
}

test('a normal program day is two screens: the completion moment, then what is next', () => {
  const { sessions, program } = run(9);
  const f = flow({ session: sessions[8], sessions, program });
  assert.deepEqual(f.steps, ['moment', 'next']);
  assert.equal(f.finish.title, 'day 9 · done');
  assert.equal(f.finish.facts, '7 minutes, eyes closed.');
  assert.equal(f.finish.kind, 'day');
});

test('day 7 is the chapter, after the milestone it earned; never more than three screens', () => {
  const { sessions, program } = run(7);
  const f = flow({ session: sessions[6], sessions, program });
  assert.deepEqual(f.steps, ['moment', 'milestone:seven_days', 'chapter:1']);
  const w = weekSummary(1, sessions, TZ);
  assert.equal(w.practices, 7);
  assert.equal(w.days, 7);
  assert.equal(w.minutes, 49);
  assert.equal(w.about, WEEKS[1].about);
});

test('day 14: the chapter already says halfway, so it gets no screen of its own', () => {
  const { sessions, program } = run(14);
  assert.deepEqual(flow({ session: sessions[13], sessions, program }).steps, ['moment', 'chapter:2']);
});

test('day 28 ends on the program card, which links to the record and never shows it', () => {
  const { sessions, program } = run(28);
  const f = flow({ session: sessions[27], sessions, program }, 3);
  assert.deepEqual(f.steps, ['moment', 'program']);
  const lines = programSummaryLines({ days: 28, minutes: 196, lessons: 28, wins: 3 });
  assert.deepEqual(lines, ['28 days of practice, 196 minutes with eyes closed.', '28 lessons.', '3 small wins saved toward your goal.']);
  // Zeros are left out: "0 small wins" reads as a gap to fill.
  assert.equal(programSummaryLines({ days: 28, minutes: 196, lessons: 0, wins: 0 }).length, 1);
});

test('a flare preset: named as met, with its milestone, and back to today', () => {
  const sessions = [s(3), s(2), s(0, { sessionType: 'flare', endedAt: NOW + 3 * 60_000 })];
  const f = flow({ session: sessions[2], sessions, program: EMPTY_PROGRAM });
  assert.equal(f.finish.title, 'a flare, met');
  assert.equal(f.finish.facts, '3 minutes, eyes closed.');
  assert.equal(f.finish.kind, 'practice');
  // three_days and flare_met are both new; only the more significant gets a screen.
  assert.deepEqual(f.earned.map((m) => m.id).sort(), ['flare_met', 'three_days']);
  assert.deepEqual(f.steps, ['moment', 'milestone:flare_met', 'next']);
});

test('the body scan is named when the start was remembered, and falls back to the type when not', () => {
  const x = s(0, { endedAt: NOW + 10 * 60_000 });
  assert.equal(describeFinish({ session: x, sessions: [x], program: EMPTY_PROGRAM, tz: TZ, scan: true }).title, 'body scan · done');
  assert.equal(describeFinish({ session: x, sessions: [x], program: EMPTY_PROGRAM, tz: TZ }).title, 'practice · done');
  const early = { ...x, outcome: 'ended_early' as const };
  const f = describeFinish({ session: early, sessions: [early], program: EMPTY_PROGRAM, tz: TZ, scan: true });
  assert.equal(f.title, 'body scan');
  assert.equal(f.note, 'You chose when to stop.');
});

test('three minutes completes the day, said plainly', () => {
  const { sessions, program } = run(4, { endedAt: NOW + 3 * 60_000 });
  const f = describeFinish({ session: sessions[3], sessions, program, tz: TZ });
  assert.equal(f.kind, 'day');
  assert.equal(f.note, 'Three minutes completes the day.');
});

test('a program day ended under three minutes stays open: no postcard, no verdict', () => {
  const { sessions, program } = run(3);
  const x = s(0, { programDay: 4, outcome: 'ended_early', endedAt: NOW + 2 * 60_000 });
  const f = flow({ session: x, sessions: [...sessions.map((y, i) => ({ ...y, startedAt: y.startedAt - DAY, endedAt: y.endedAt - DAY, id: `o${i}` })), x], program });
  assert.equal(f.finish.kind, 'open');
  assert.equal(f.finish.title, 'day 4 · 2 minutes');
  assert.match(f.finish.note!, /Day 4 stays open/);
  assert.deepEqual(f.steps, ['moment', 'next']);
});

test('practicing a done day again is named as again, and earns nothing new', () => {
  const { sessions, program } = run(5);
  const again = s(0, { programDay: 5, startedAt: NOW + 3600_000, endedAt: NOW + 3600_000 + 5 * 60_000 });
  const f = flow({ session: again, sessions: [...sessions, again], program });
  assert.equal(f.finish.kind, 'again');
  assert.equal(f.finish.title, 'day 5 · again');
  assert.deepEqual(f.steps, ['moment', 'next']);
});

test('whatever is earned, a finish is at most three screens and at most one milestone', () => {
  const all: Milestone[] = (Object.keys(MILESTONE_COPY) as Array<keyof typeof MILESTONE_COPY>).map((id) => ({ id, ...MILESTONE_COPY[id], earned: true }));
  for (const day of [1, 6, 7, 13, 14, 21, 27, 28]) {
    for (const earned of [[], all, all.slice(0, 3), all.slice(5)]) {
      const steps = finishSteps({ kind: 'day', day, minutes: 7, title: '', facts: '', returned: false }, earned);
      assert.ok(steps.length >= 2 && steps.length <= 3, `day ${day}: ${steps.length} screens`);
      assert.equal(steps[0].kind, 'moment');
      assert.ok(steps.filter((x) => x.kind === 'milestone').length <= 1);
      assert.ok(['next', 'chapter', 'program'].includes(steps[steps.length - 1].kind));
    }
  }
  assert.equal(mostSignificant(all)?.id, 'program_done');
});

test('postcards come from the program days done: no storage, nothing marks a day missed', () => {
  const { program } = run(9);
  const cards = postcards(program);
  assert.equal(cards.length, PROGRAM_DAYS);
  assert.equal(cards.filter((c) => c.earned).length, 9);
  assert.ok(cards.filter((c) => !c.earned).every((c) => c.doneOn === undefined));
  assert.deepEqual(postcardWeeks(program), [1, 2]);
  assert.deepEqual(postcardWeeks(EMPTY_PROGRAM), [1]);
  assert.deepEqual(postcardWeeks(run(7).program), [1, 2]);
  assert.deepEqual(postcardWeeks(run(28).program), [1, 2, 3, 4]);
  // Twenty-eight different pictures and names, even where a photograph repeats.
  assert.equal(new Set(PLACES.map((p) => `${p.photo}:${p.focus}`)).size, PROGRAM_DAYS);
  assert.equal(new Set(PLACES.map((p) => p.name)).size, PROGRAM_DAYS);
  for (const p of PLACES) assert.equal(p.name, p.name.toLowerCase());
});

test('quiet firsts: a first lesson, a first night, and a return greeted without counting', () => {
  const back = [s(9), s(8), s(2)];
  assert.equal(isReturn(back[2], back), true);
  assert.equal(isReturn(back[1], back), false);
  const before = milestones({ sessions: back.slice(0, 2), program: EMPTY_PROGRAM, moments: 0, tz: TZ });
  const after = milestones({ sessions: back, program: EMPTY_PROGRAM, moments: 0, tz: TZ });
  assert.deepEqual(newlyEarned(before, after).map((m) => m.id).sort(), ['returned', 'three_days']);
  assert.equal(MILESTONE_COPY.returned.label, 'welcome back');
  assert.doesNotMatch(`${MILESTONE_COPY.returned.label} ${MILESTONE_COPY.returned.detail}`, /\d|day|miss|away|break|lost/i);
  // Three days away is not a return.
  assert.equal(milestones({ sessions: [s(5), s(2)], program: EMPTY_PROGRAM, moments: 0, tz: TZ }).find((m) => m.id === 'returned')?.earned, false);
  const sleep = milestones({ sessions: [s(0, { sessionType: 'sleep' })], program: EMPTY_PROGRAM, moments: 0, tz: TZ });
  assert.equal(sleep.find((m) => m.id === 'before_sleep')?.earned, true);
  const lesson = milestones({ sessions: [s(0)], program: { done: {}, read: [1] }, moments: 0, tz: TZ });
  assert.equal(lesson.find((m) => m.id === 'first_lesson')?.earned, true);
  // A quiet first is never offered as the next thing to walk toward.
  const none = milestones({ sessions: [], program: EMPTY_PROGRAM, moments: 0, tz: TZ });
  assert.equal(nextMilestone(none)?.id, 'first');
  const fresh = milestones({ sessions: [s(0)], program: EMPTY_PROGRAM, moments: 0, tz: TZ });
  assert.equal(nextMilestone(fresh)?.id, 'three_days');
});

test('what is next: tomorrow after today is done, the reminder in plain time', () => {
  const { program } = run(9);
  assert.deepEqual(nextUp(program, key(NOW)), { when: 'tomorrow', day: 10, lesson: 'when a sensation moves', minutes: 7 });
  assert.equal(nextUp(program, key(NOW + DAY))?.when, 'today');
  assert.equal(nextUp(EMPTY_PROGRAM, key(NOW))?.when, 'next');
  assert.equal(nextUp(run(28).program, key(NOW)), undefined);
  assert.equal(reminderLine({ enabled: true, hour: 20, minute: 30 }), 'a reminder at 8:30 pm');
  assert.equal(reminderLine({ enabled: false, hour: 20, minute: 30 }), undefined);
});

test('nothing in the finish praises, exclaims, or speaks of the pain', () => {
  const words: string[] = [];
  for (const m of Object.values(MILESTONE_COPY)) words.push(m.label, m.detail);
  for (const p of PLACES) words.push(p.name);
  const { sessions, program } = run(9);
  const variants: Session[] = [
    sessions[8],
    { ...sessions[8], outcome: 'ended_early' },
    { ...sessions[8], programDay: undefined, sessionType: 'flare' },
    { ...sessions[8], programDay: undefined, sessionType: 'fear' },
    { ...sessions[8], programDay: undefined, sessionType: 'sleep', outcome: 'ended_early' },
  ];
  for (const v of variants) {
    const f = describeFinish({ session: v, sessions, program, tz: TZ });
    words.push(f.title, f.facts, f.note ?? '');
    assert.equal(f.title, f.title.toLowerCase(), 'titles are glanced at: lowercase');
  }
  words.push(...programSummaryLines({ days: 28, minutes: 196, lessons: 28, wins: 2 }));
  for (const w of words) {
    assert.doesNotMatch(w, FINISH_FORBIDDEN, w);
    assert.doesNotMatch(w, /\?/, w);
  }
});
