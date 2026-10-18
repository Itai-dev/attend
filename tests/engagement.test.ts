import assert from 'node:assert/strict';
import { test } from 'node:test';
import { milestones, newlyEarned, practiceStats, weekLine, weekStrip } from '../src/domain/engagement';
import { completeDay, EMPTY_PROGRAM } from '../src/domain/program';
import type { Session } from '../src/domain/types';

const DAY = 86_400_000;
// Saturday 17 Oct 2026, 18:00 in Tel Aviv (+03:00).
const NOW = Date.UTC(2026, 9, 17, 15, 0);
const TZ = 180;
const s = (daysAgo: number, extra: Partial<Session> = {}): Session =>
  ({ id: `s${daysAgo}${Math.random()}`, startedAt: NOW - daysAgo * DAY, endedAt: NOW - daysAgo * DAY + 7 * 60_000, sessionType: 'notice', outcome: 'completed', ...extra }) as Session;

test('the week runs Monday to Sunday, marks practice days, today and the future', () => {
  const strip = weekStrip([s(0), s(2), s(5), s(9)], NOW, TZ);
  assert.deepEqual(strip.map((d) => d.label).join(''), 'MTWTFSS');
  assert.deepEqual(strip.map((d) => d.practised), [true, false, false, true, false, true, false]);
  assert.equal(strip.findIndex((d) => d.today), 5);
  assert.equal(strip[6].future, true);
});

test('a missed day is a day without a dot, nothing resets, and coming back is welcomed', () => {
  const stats = practiceStats([s(0), s(2), s(5)], NOW, TZ);
  assert.equal(stats.daysThisWeek, 3);
  assert.equal(weekLine(stats, NOW), '3 practice days this week.');
  const away = practiceStats([s(6)], NOW, TZ);
  assert.equal(weekLine(away, NOW), 'Welcome back. Pick up wherever you like.');
  assert.equal(weekLine(practiceStats([], NOW, TZ), NOW), 'Practice days show here as dots.');
  for (const line of [weekLine(stats, NOW), weekLine(away, NOW)]) assert.doesNotMatch(line, /miss|lost|broke|streak|behind/i);
});

test('samples, safety pauses and sessions under a minute are not practice', () => {
  const stats = practiceStats([s(0, { isSample: true }), s(1, { outcome: 'safety_pause' }), s(2, { endedAt: NOW - 2 * DAY + 20_000 }), s(3)], NOW, TZ);
  assert.equal(stats.sessions, 1);
  assert.equal(stats.minutes, 7);
});

test('milestones count showing up, and the newly earned one is found', () => {
  const before = milestones({ sessions: [s(3), s(2)], program: EMPTY_PROGRAM, moments: 0, tz: TZ });
  const after = milestones({ sessions: [s(3), s(2), s(0, { sessionType: 'flare' })], program: completeDay(EMPTY_PROGRAM, 1, '2026-10-17'), moments: 0, tz: TZ });
  assert.deepEqual(newlyEarned(before, after).map((m) => m.id).sort(), ['flare_met', 'three_days']);
  for (const m of after) assert.doesNotMatch(`${m.label} ${m.detail}`, /pain (went|is) (down|lower)|better|improv/i);
});
