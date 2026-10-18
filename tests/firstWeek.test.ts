import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstWeekCard, NONE_REPLY, showFirstWeek, SIGNS, toggleSign } from '../src/domain/firstWeek';
import { completeDay, EMPTY_PROGRAM, markRead, programDay, type ProgramState } from '../src/domain/program';
import type { Session } from '../src/domain/types';

const DAY = 86_400_000;
const TZ = 0;
const NOW = Date.UTC(2026, 9, 18, 9); // Sunday 18 Oct
const key = (t: number) => new Date(t).toISOString().slice(0, 10);
const s = (daysAgo: number, mins: number, extra: Partial<Session> = {}): Session =>
  ({ id: `s${daysAgo}-${Math.random()}`, startedAt: NOW - daysAgo * DAY, endedAt: NOW - daysAgo * DAY + mins * 60_000, sessionType: 'notice', outcome: 'completed', ...extra }) as Session;

function week(lastAgo = 1): ProgramState {
  let p = EMPTY_PROGRAM;
  for (let d = 1; d <= 7; d++) p = markRead(completeDay(p, d, key(NOW - (lastAgo + 7 - d) * DAY)), d);
  return p;
}

test('the card shows the day after Day 7 is done, until done is tapped', () => {
  const today = key(NOW);
  assert.equal(showFirstWeek(EMPTY_PROGRAM, undefined, today), false);
  assert.equal(showFirstWeek(week(0), undefined, today), false); // Day 7 done today
  assert.equal(showFirstWeek(week(1), undefined, today), true);
  assert.equal(showFirstWeek(week(5), undefined, today), true);
  assert.equal(showFirstWeek(week(1), NOW - 1000, today), false);
});

test('the card says what was done: days, active minutes, lessons, how practice felt, in chip order', () => {
  const sessions = [s(7, 5, { feeling: 'hard' }), s(6, 5, { feeling: 'settled' }), s(5, 5, { feeling: 'hard' }), s(4, 5), s(3, 5, { feeling: 'curious' }), s(2, 7), s(1, 7)];
  const card = firstWeekCard({ sessions, program: week(1), now: NOW, tz: TZ });
  assert.equal(card.kicker, 'your first week');
  assert.equal(card.title, 'a week of practice');
  assert.deepEqual(card.lines, ['7 days of practice, 39 minutes with eyes closed.', '7 lessons.', 'How practice felt: settled, curious, and hard today.']);
  assert.equal(card.footnote, 'day 8 is open today');
  for (const l of [...card.lines, card.closing]) assert.doesNotMatch(l, /of 7|miss|pain|\?/i);
});

test('lines with nothing to show are left out, and hard today alone gets its own line', () => {
  const program = completeDay(week(1), 7, key(NOW - DAY));
  const bare = firstWeekCard({ sessions: [], program: { ...program, read: [] }, now: NOW, tz: TZ });
  assert.deepEqual(bare.lines, []);
  const hard = firstWeekCard({ sessions: [s(2, 5, { feeling: 'hard' }), s(1, 1, { feeling: 'hard' })], program: { ...program, read: [1] }, now: NOW, tz: TZ });
  assert.deepEqual(hard.lines, ['2 days of practice, 6 minutes with eyes closed.', '1 lesson.', 'How practice felt: hard today. Hard ones count the same.']);
});

test('the first week stays the first week: later sessions and samples are not counted', () => {
  const sessions = [s(3, 5), s(2, 5), s(0, 10, { feeling: 'restless' }), s(2, 5, { isSample: true, feeling: 'curious' })];
  const card = firstWeekCard({ sessions, program: week(1), now: NOW, tz: TZ });
  assert.equal(card.lines[0], '2 days of practice, 10 minutes with eyes closed.');
  assert.ok(!card.lines.some((l) => l.startsWith('How practice felt')));
});

test('the footnote names the next day once today is done', () => {
  const program = completeDay(week(1), 8, key(NOW));
  assert.equal(firstWeekCard({ sessions: [], program, now: NOW, tz: TZ }).footnote, 'day 9 opens tomorrow');
});

test('the signs question: the four Day 4 signs, several allowed; none and not sure stand alone', () => {
  const lesson = programDay(4).lesson.cards[1].text.join(' ').toLowerCase();
  for (const sign of ['stressful time', 'moves', 'spreads', 'mood or setting', 'absorbed']) assert.ok(lesson.includes(sign), sign);
  assert.equal(SIGNS.length, 4);
  let picked = toggleSign([], 'moves');
  picked = toggleSign(picked, 'mood');
  assert.deepEqual(picked, ['moves', 'mood']);
  assert.deepEqual(toggleSign(picked, 'none'), ['none']);
  assert.deepEqual(toggleSign(['unsure'], 'stress'), ['stress']);
  assert.deepEqual(toggleSign(['stress'], 'stress'), []);
  assert.doesNotMatch(NONE_REPLY, /safe|nothing is wrong|brain|\?/i);
});
