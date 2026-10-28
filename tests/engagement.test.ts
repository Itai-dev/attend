import assert from 'node:assert/strict';
import { test } from 'node:test';
import { milestones, newlyEarned, practiceStats, weekLine, weekStrip } from '../src/domain/engagement';
import { completeDay, EMPTY_PROGRAM } from '../src/domain/program';
import type { Session } from '../src/domain/types';
import { setLang } from '../src/i18n';

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
  assert.equal(weekLine(practiceStats([], NOW, TZ), NOW), 'Your first practice is waiting.');
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

test('in Hebrew the week runs Sunday to Saturday, labelled א׳ to ש׳; English stays Monday-first', () => {
  setLang('he');
  try {
    const strip = weekStrip([s(0), s(2), s(5), s(9)], NOW, TZ);
    assert.deepEqual(strip.map((d) => d.label), ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']);
    assert.equal(strip[0].day, '2026-10-11'); // Sunday
    assert.deepEqual(strip.map((d) => d.practised), [false, true, false, false, true, false, true]);
    assert.equal(strip.findIndex((d) => d.today), 6);
    // On a Sunday a Hebrew week has just begun; the English week is ending.
    const sunday = NOW + DAY;
    assert.equal(weekStrip([], sunday, TZ)[0].day, '2026-10-18');
    assert.equal(practiceStats([s(0)], sunday, TZ).daysThisWeek, 0);
  } finally {
    setLang('en');
  }
  const sunday = NOW + DAY;
  assert.equal(weekStrip([], sunday, TZ)[0].day, '2026-10-12');
  assert.equal(weekStrip([], sunday, TZ)[6].today, true);
  assert.equal(practiceStats([s(0)], sunday, TZ).daysThisWeek, 1);
});

test('in Hebrew the week line counts practice days that agree, and coming back is welcomed', () => {
  setLang('he');
  try {
    assert.equal(weekLine(practiceStats([s(0), s(2), s(5)], NOW, TZ), NOW), '3 ימי תרגול השבוע.');
    assert.equal(weekLine(practiceStats([s(0)], NOW, TZ), NOW), 'יום תרגול אחד השבוע.');
    assert.equal(weekLine(practiceStats([s(0), s(2)], NOW, TZ), NOW), 'יומיים של תרגול השבוע.');
    assert.equal(weekLine(practiceStats([s(6)], NOW, TZ), NOW), 'ברוכים השבים. אפשר להמשיך מאיפה שנוח.');
    assert.equal(weekLine(practiceStats([], NOW, TZ), NOW), 'התרגול הראשון מחכה.');
    const lines = [0, 2, 6].map((d) => weekLine(practiceStats([s(d)], NOW, TZ), NOW));
    for (const line of lines) assert.doesNotMatch(line, /פספס|החמצ|רצף|הפסד|נשבר|מאחור/);
  } finally {
    setLang('en');
  }
});

test('Hebrew milestones count showing up, never the pain, and English is unchanged after', () => {
  setLang('he');
  try {
    const marks = milestones({ sessions: [s(0)], program: EMPTY_PROGRAM, moments: 1, tz: TZ });
    assert.equal(marks.find((m) => m.id === 'first')?.label, 'תרגול ראשון');
    for (const m of marks) {
      assert.match(m.label, /[֐-׿]|\d/);
      assert.doesNotMatch(`${m.label} ${m.detail}`, /כאב|ירד|השתפר|טוב יותר/);
    }
  } finally {
    setLang('en');
  }
  assert.equal(milestones({ sessions: [], program: EMPTY_PROGRAM, moments: 0, tz: TZ })[0].label, 'First session');
});
