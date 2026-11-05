import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayKey, formatPain, latestPlace, painDays, painLabel, type CheckIn } from '../src/domain/checkin';
import { buildProgress, progressMeaning, PROGRESS_MEANING } from '../src/domain/progress';
import { setLang } from '../src/i18n';
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
  const many = buildProgress([0, 1, 2, 4, 6, 9].map((d) => ci(d, 6 - (d % 3))), sessions, { now: NOW, tz: 180 });
  assert.equal(many.enough, true);
  assert.equal(many.days.length, 56);
  assert.equal(many.checkInDays, 6);
  // A safety pause is not practice.
  assert.equal(many.practiceDays, 1);
  assert.match(many.summary, /checked in on 6 days, practised on 1 day/);
  for (const text of [many.summary, PROGRESS_MEANING]) {
    assert.doesNotMatch(text, /better|worse|improv|declin|%|streak|than last/i);
  }
});

test('samples never enter progress', () => {
  const p = buildProgress([ci(0, 5, { isSample: true })], [{ startedAt: NOW, outcome: 'completed', isSample: true } as Session], { now: NOW, tz: 180 });
  assert.equal(p.checkInDays, 0);
  assert.equal(p.practiceDays, 0);
  assert.equal(p.summary, 'Nothing recorded yet.');
});

test('in Hebrew the five words describe the pain, at every score, and the number travels with its word', () => {
  setLang('he');
  try {
    assert.deepEqual(
      Array.from({ length: 11 }, (_, i) => painLabel(i)),
      ['אין כאב', 'קל', 'קל', 'קל', 'בינוני', 'בינוני', 'בינוני', 'חזק', 'חזק', 'חזק', 'הכי חזק'],
    );
    assert.equal(formatPain(5), '5 · בינוני');
  } finally {
    setLang('en');
  }
  assert.equal(painLabel(10), 'Most intense');
});

test('in Hebrew progress counts plainly and keeps its sentence about what it does not mean', () => {
  setLang('he');
  try {
    const p = buildProgress([0, 1, 2, 4, 6, 9].map((d) => ci(d, 5)), [{ startedAt: NOW - DAY, outcome: 'completed' } as Session], { now: NOW, tz: 180 });
    assert.equal(p.summary, 'ב־8 השבועות האחרונים: צ׳ק־אין ב־6 ימים, תרגול ביום אחד.');
    const none = buildProgress([ci(0, 5)], [], { now: NOW, tz: 180 });
    assert.equal(none.summary, 'ב־8 השבועות האחרונים: צ׳ק־אין ביום אחד, בלי תרגול.');
    assert.equal(buildProgress([], [], { now: NOW, tz: 180 }).summary, 'עוד לא נרשם כלום.');
    assert.match(progressMeaning(), /לא יום בלי כאב/);
    for (const text of [p.summary, progressMeaning()]) assert.doesNotMatch(text, /השתפר|החמיר|יותר טוב|%|רצף/);
  } finally {
    setLang('en');
  }
  assert.equal(progressMeaning(), PROGRESS_MEANING);
});
