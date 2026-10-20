import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayKey, latestPlace, painDays, painLabel, type CheckIn } from '../src/domain/checkin';
import { buildProgress, PROGRESS_MAX_DAYS, PROGRESS_MEANING, PROGRESS_MIN_DAYS, shortDate } from '../src/domain/progress';
import type { Session } from '../src/domain/types';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 12, 18, 0);
const ci = (daysAgo: number, pain: number, extra: Partial<CheckIn> = {}): CheckIn => ({
  id: `c${daysAgo}${pain}${Math.random()}`,
  at: NOW - daysAgo * DAY,
  tz: 180,
  pain,
  ...extra,
});

test("Pattern's five words, at every score", () => {
  assert.deepEqual(
    Array.from({ length: 11 }, (_, i) => painLabel(i)),
    ['No pain', 'Mild', 'Mild', 'Mild', 'Moderate', 'Moderate', 'Moderate', 'Severe', 'Severe', 'Severe', 'Most intense'],
  );
});

test("a day's pain is its peak, never the latest, and a day without a check-in is absent, not zero", () => {
  const days = painDays([ci(0, 3), ci(0, 7), ci(0, 2), ci(2, 4)]);
  assert.deepEqual(
    days.map((d) => [d.peak, d.checkIns]),
    [
      [4, 1],
      [7, 3],
    ],
  );
});

test('the day is the local day where it was entered', () => {
  // 22:30 UTC is already tomorrow at +03:00.
  assert.equal(dayKey(Date.UTC(2026, 9, 12, 22, 30), 180), '2026-10-13');
  assert.equal(dayKey(Date.UTC(2026, 9, 12, 22, 30), -300), '2026-10-12');
});

test('a guided session rests on the latest check-in that named one place', () => {
  const back = { region: 'lower_back' } as const;
  const neck = { region: 'neck' } as const;
  assert.deepEqual(latestPlace([ci(3, 5, { places: [neck] }), ci(1, 4, { places: [back] })], 14, NOW), back);
  // Several places: the app doesn't pick which pain matters.
  assert.equal(latestPlace([ci(1, 4, { places: [back, neck] })], 14, NOW), undefined);
  // A later check-in without a place doesn't erase the place named before it.
  assert.deepEqual(latestPlace([ci(2, 4, { places: [back] }), ci(0, 6, { places: [] })], 14, NOW), back);
  // Old places expire.
  assert.equal(latestPlace([ci(30, 4, { places: [back] })], 14, NOW), undefined);
});

test('progress draws only past enough days, counts plainly, and never compares', () => {
  const sessions = [{ startedAt: NOW - DAY, outcome: 'completed' } as Session, { startedAt: NOW - 3 * DAY, outcome: 'safety_pause' } as Session];
  const few = buildProgress([ci(0, 5), ci(1, 4)], sessions, { now: NOW, tz: 180 });
  assert.equal(few.enough, false);
  // Until the picture exists, the card says how close it is, in check-in days.
  assert.equal(few.untilPicture, '2 of 5 check-in days. After 5, your pain over the weeks appears here, beside the days you practiced.');
  const many = buildProgress([0, 1, 2, 4, 6, 9].map((d) => ci(d, 6 - (d % 3))), sessions, { now: NOW, tz: 180 });
  assert.equal(many.enough, true);
  assert.equal(many.untilPicture, undefined);
  // Ten days of record fill the two-week minimum, not eight empty weeks.
  assert.equal(many.days.length, PROGRESS_MIN_DAYS);
  assert.equal(many.checkInDays, 6);
  // A safety pause is not practice.
  assert.equal(many.practiceDays, 1);
  assert.match(many.summary, /checked in on 6 days, practiced on 1 day/);
  for (const text of [many.summary, PROGRESS_MEANING, few.untilPicture!]) {
    assert.doesNotMatch(text, /better|worse|improv|declin|%|streak|than last/i);
  }
});

test("the chart's window fits the record: from the first check-in or practice, two to eight weeks", () => {
  const tz = 180;
  const today = dayKey(NOW, tz);
  // Nothing yet: two weeks, ending today, nothing counted, and the card says what is coming.
  const none = buildProgress([], [], { now: NOW, tz });
  assert.equal(none.days.length, PROGRESS_MIN_DAYS);
  assert.equal(none.days.at(-1)!.day, today);
  assert.equal(none.endLabel, 'today');
  assert.equal(none.untilPicture, 'After check-ins on 5 different days, your pain over the weeks appears here, beside the days you practiced.');
  // Twenty days of record: twenty-one days drawn, starting on the first check-in.
  const three = buildProgress([ci(20, 5), ci(3, 4)], [], { now: NOW, tz });
  assert.equal(three.days.length, 21);
  assert.equal(three.days[0].day, dayKey(NOW - 20 * DAY, tz));
  assert.equal(three.days[0].peak, 5);
  assert.equal(three.startLabel, shortDate(dayKey(NOW - 20 * DAY, tz)));
  assert.match(three.summary, new RegExp(`^Since ${three.startLabel}:`));
  // Practice that came before the first check-in starts the window: the two sit side by side.
  const practisedFirst = buildProgress([ci(2, 4)], [{ startedAt: NOW - 30 * DAY, outcome: 'completed' } as Session], { now: NOW, tz });
  assert.equal(practisedFirst.days.length, 31);
  assert.equal(practisedFirst.days[0].practised, true);
  // A paused session isn't practice, so it doesn't stretch the window either.
  const paused = buildProgress([ci(2, 4)], [{ startedAt: NOW - 30 * DAY, outcome: 'safety_pause' } as Session], { now: NOW, tz });
  assert.equal(paused.days.length, PROGRESS_MIN_DAYS);
  // A long record is capped at eight weeks; what fell outside isn't counted.
  const long = buildProgress([ci(100, 6), ci(1, 5)], [], { now: NOW, tz });
  assert.equal(long.days.length, PROGRESS_MAX_DAYS);
  assert.equal(long.checkInDays, 1);
  assert.equal(long.days.at(-1)!.day, today);
  // Every day in the window is there once, in order, with no gaps.
  for (const p of [none, three, practisedFirst, long]) {
    for (let i = 1; i < p.days.length; i++) assert.ok(p.days[i - 1].day < p.days[i].day);
  }
});

test('the date labels are the day as lived, in short US form', () => {
  assert.equal(shortDate('2026-10-08'), 'Oct 8');
  assert.equal(shortDate('2027-01-31'), 'Jan 31');
});

test('samples never enter progress', () => {
  const p = buildProgress([ci(0, 5, { isSample: true })], [{ startedAt: NOW, outcome: 'completed', isSample: true } as Session], { now: NOW, tz: 180 });
  assert.equal(p.checkInDays, 0);
  assert.equal(p.practiceDays, 0);
  assert.equal(p.summary, 'Nothing recorded yet.');
});
