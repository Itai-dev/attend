import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completeDay, EMPTY_PROGRAM, markRead, PROGRAM, type ProgramState } from '../src/domain/program';
import { allReminderCopy, dailyTitle, planReminders, QUIET_DAYS, WEEKLY_COUNT, type ReminderPlanInput } from '../src/domain/reminderPlan';

const TZ = 180; // Tel Aviv, +03:00
/** Local wall-clock time in TZ, as a timestamp. */
const at = (date: string, h: number, m = 0) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), h, m) - TZ * 60_000;

const plan = (over: Partial<ReminderPlanInput>) => planReminders({ hour: 20, minute: 30, now: at('2026-10-18', 9), tz: TZ, program: EMPTY_PROGRAM, ...over });
const daily = (p: ReturnType<typeof plan>) => p.filter((r) => r.kind === 'daily');
const weekly = (p: ReturnType<typeof plan>) => p.filter((r) => r.kind === 'weekly');

function programThrough(n: number, lastOn: string): ProgramState {
  let p = EMPTY_PROGRAM;
  for (let d = 1; d <= n; d++) p = completeDay(p, d, d === n ? lastOn : `2026-09-${String(d).padStart(2, '0')}`);
  return p;
}

test('four dated daily reminders after a practice, then weekly on the same weekday', () => {
  // Day 2 done yesterday; today (Sunday 18 Oct) is open, its time still ahead.
  const p = plan({ program: programThrough(2, '2026-10-17'), lastPractice: at('2026-10-17', 8) });
  assert.deepEqual(daily(p).map((r) => r.date), ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21']);
  const w = weekly(p);
  assert.equal(w.length, WEEKLY_COUNT);
  assert.equal(w[0].date, '2026-10-28');
  assert.equal(w[1].date, '2026-11-04');
  assert.ok(p.every((r) => r.hour === 20 && r.minute === 30));
  assert.equal(daily(p)[0].title, 'day 3');
});

test('today is skipped once practiced, and no reminder fires on a practiced day', () => {
  const p = plan({ program: programThrough(3, '2026-10-18'), lastPractice: at('2026-10-18', 8) });
  assert.deepEqual(daily(p).map((r) => r.date), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22']);
  // Tomorrow's reminders point to the next day.
  assert.equal(daily(p)[0].title, 'day 4');
  // A practice outside the program counts as practice too.
  const preset = plan({ program: programThrough(2, '2026-10-17'), lastPractice: at('2026-10-18', 7) });
  assert.ok(!preset.some((r) => r.date === '2026-10-18'));
});

test('a time already passed today is skipped, and the step-down still comes after four quiet days', () => {
  const p = plan({ now: at('2026-10-18', 21), program: programThrough(2, '2026-10-17'), lastPractice: at('2026-10-17', 8) });
  assert.deepEqual(daily(p).map((r) => r.date), ['2026-10-19', '2026-10-20', '2026-10-21']);
  assert.equal(weekly(p)[0].date, '2026-10-28');
});

test('after four quiet days only weekly reminders are planned, and replanning gives the same plan', () => {
  const program = programThrough(5, '2026-10-01');
  const last = at('2026-10-01', 8);
  const p = plan({ program, lastPractice: last });
  assert.equal(daily(p).length, 0);
  // Anchored on the last practice (1 Oct): weekly from the 5th, so 12th, 19th, 26th…
  assert.equal(weekly(p)[0].date, '2026-10-19');
  assert.equal(weekly(p).length, WEEKLY_COUNT);
  // Opening the app the next day doesn't move the week or its line.
  const next = plan({ now: at('2026-10-20', 9), program, lastPractice: last });
  assert.deepEqual(next[0], weekly(p)[1]);
  assert.deepEqual(plan({ program, lastPractice: last }), p);
});

test('weekly bodies keep the day where it was; never a count of missed days', () => {
  const p = plan({ program: programThrough(8, '2026-10-01'), lastPractice: at('2026-10-01', 8) });
  for (const r of weekly(p)) assert.equal(r.title, '');
  assert.ok(weekly(p).some((r) => r.body.includes('day 9') || r.body.includes('Day 9')));
});

test('daily bodies rotate, give the minutes, and leave out the lesson once it is read', () => {
  const program = programThrough(5, '2026-10-17');
  const p = daily(plan({ program, lastPractice: at('2026-10-17', 8) }));
  assert.ok(new Set(p.map((r) => r.body)).size > 1);
  assert.ok(p.some((r) => r.body.includes('7 minutes'))); // Day 6 is 7 minutes
  const read = daily(plan({ program: markRead(program, 6), lastPractice: at('2026-10-17', 8) }));
  for (const r of read) assert.doesNotMatch(r.body, /lesson/);
});

test('day 28 is the last day, and after the program the post-program lines', () => {
  assert.equal(dailyTitle(28), 'day 28 · the last day');
  const p = plan({ program: programThrough(28, '2026-10-17'), lastPractice: at('2026-10-17', 8) });
  assert.equal(daily(p).length, QUIET_DAYS);
  for (const r of p) {
    assert.equal(r.title, '');
    assert.ok(['A practice is here whenever you’d like one.', 'The body scan, or 3 quiet minutes, eyes closed. Here when you want them.'].includes(r.body));
  }
});

test('never practiced: four days from now, then weekly', () => {
  const p = plan({});
  assert.deepEqual(daily(p).map((r) => r.date), ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21']);
  assert.equal(daily(p)[0].title, 'day 1');
  const late = plan({ now: at('2026-10-18', 22) });
  assert.equal(daily(late)[0].date, '2026-10-19');
  assert.equal(daily(late).length, QUIET_DAYS);
});

test('the queue fits under the iOS limit of 64', () => {
  assert.ok(QUIET_DAYS + WEEKLY_COUNT <= 64);
});

test('reminder copy: no missed-day counts, no guilt, no pain words beyond a lesson title, no questions', () => {
  const titles = Array.from({ length: 28 }, (_, i) => dailyTitle(i + 1));
  for (const line of allReminderCopy()) {
    assert.doesNotMatch(line, /miss|streak|lost|behind|broke|overdue|should|don’t forget|haven’t/i, line);
    assert.doesNotMatch(line, /\?/, line);
    // Titles too: a lock screen is read by whoever is near the phone (safety review round 3).
    assert.doesNotMatch(line, /pain|hurt|symptom|ache|heal|relax|flare|waiting/i, line);
  }
  for (const t of titles) assert.equal(t, t.toLowerCase());
});

test('nothing on the lock screen reveals health information: no lesson title, no pain, no flare', () => {
  const lessonTitles = PROGRAM.map((d) => d.lesson.title.toLowerCase()).filter((t) => !/^day \d+$/.test(t));
  const banned = /pain|waiting|missed|streak/i;
  const lines = new Set(allReminderCopy());
  // And every reminder a real plan schedules, across the program and after it.
  for (const n of [0, 2, 5, 13, 27, 28]) {
    for (const r of plan({ program: n ? programThrough(n, '2026-10-01') : EMPTY_PROGRAM, lastPractice: n ? at('2026-10-01', 8) : undefined })) {
      lines.add(r.title);
      lines.add(r.body);
    }
  }
  for (let d = 1; d <= 28; d++) assert.match(dailyTitle(d), /^day \d+( · the last day)?$/);
  for (const line of lines) {
    assert.doesNotMatch(line, banned, line);
    for (const t of lessonTitles) assert.ok(!line.toLowerCase().includes(t), `${line} names the lesson "${t}"`);
  }
});

test('a reminder date is a calendar day, whatever the hour of now', () => {
  const p = plan({ now: at('2026-10-18', 0, 5), program: programThrough(2, '2026-10-17'), lastPractice: at('2026-10-17', 23) });
  assert.equal(daily(p)[0].date, '2026-10-18');
  assert.ok(p.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date)));
});
