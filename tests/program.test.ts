import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUIDE_SCRIPT } from '../server/lib/guideScript';
import { violatesGuideLanguage } from '../src/domain/safety';
import { completeDay, currentDay, EMPTY_PROGRAM, PROGRAM, PROGRAM_DAYS, WEEKS } from '../src/domain/program';
import { runSession } from './helpers';

test('28 days, seven a week, each with a lesson and a practice', () => {
  assert.equal(PROGRAM.length, PROGRAM_DAYS);
  for (const w of [1, 2, 3, 4] as const) assert.equal(PROGRAM.filter((d) => d.week === w).length, 7, WEEKS[w].name);
  for (const d of PROGRAM) {
    assert.ok(d.lesson.cards.length >= 2 && d.lesson.cards.length <= 4, `day ${d.day}`);
    assert.ok(GUIDE_SCRIPT.GUIDED_THEMES[d.practice.theme].length > 0, d.practice.theme);
  }
});

test('no lesson tells the person their pain is safe, benign, or in their head', () => {
  const claims = /\b(you'?re safe|you are safe|is safe|harmless|benign|nothing (is )?wrong|in your head|it'?s your brain|not (a sign of )?damage|pain[- ]free|cure)\b/i;
  for (const d of PROGRAM) {
    for (const c of d.lesson.cards) {
      for (const t of [...c.text, c.notice ?? '']) {
        assert.ok(!violatesGuideLanguage(t), `day ${d.day}: ${t}`);
        assert.doesNotMatch(t, claims, `day ${d.day}: ${t}`);
      }
    }
  }
});

test('every theme line is in the guide’s voice and assumes nothing was said', () => {
  for (const [theme, bank] of Object.entries(GUIDE_SCRIPT.GUIDED_THEMES)) {
    for (const v of bank) for (const [text] of v) {
      assert.ok(!violatesGuideLanguage(text), `${theme}: ${text}`);
      assert.doesNotMatch(text, /\{word\}|\{noun\}|you said|you described/, `${theme}: ${text}`);
    }
  }
});

test('every program day runs as a guided session: no questions, its theme heard, on time', async () => {
  for (const d of PROGRAM) {
    const r = await runSession({}, { mode: 'guided', type: d.practice.sessionType, theme: d.practice.theme, place: { region: 'neck' }, minutes: d.practice.minutes === 7 ? 5 : d.practice.minutes, maxTurns: 200 });
    assert.equal(r.asks.length, 0, `day ${d.day}`);
    const bank = GUIDE_SCRIPT.GUIDED_THEMES[d.practice.theme].flat().map(([t]) => t.replace('{place}', 'your neck'));
    assert.ok(r.spoken.some((l) => bank.includes(l)), `day ${d.day} (${d.practice.theme}) never heard its theme`);
    assert.match(r.spoken[r.spoken.length - 1], /open your eyes|Just rest/, `day ${d.day}`);
  }
});

test('an open-theme day stays with the whole body even when a place is known', async () => {
  const r = await runSession({}, { mode: 'guided', theme: 'open', place: { region: 'neck' }, minutes: 5, maxTurns: 200 });
  assert.match(r.spoken.join(' '), /body as a whole/);
  assert.doesNotMatch(r.spoken.join(' '), /your neck/);
});

test('one new day a day; a missed day waits; nothing is lost', () => {
  let s = EMPTY_PROGRAM;
  assert.deepEqual(currentDay(s, '2026-10-01'), { day: 1, doneToday: false, finished: false });
  s = completeDay(s, 1, '2026-10-01');
  // Same day: Day 1 stays today's, done.
  assert.deepEqual(currentDay(s, '2026-10-01'), { day: 1, doneToday: true, finished: false });
  // Three days later, Day 2 is simply next.
  assert.deepEqual(currentDay(s, '2026-10-04'), { day: 2, doneToday: false, finished: false });
  s = completeDay(s, 2, '2026-10-04');
  assert.equal(completeDay(s, 2, '2026-10-05'), s);
  for (let d = 3; d <= 28; d++) s = completeDay(s, d, `2026-11-${String(d).padStart(2, '0')}`);
  assert.equal(currentDay(s, '2026-12-01').finished, true);
});
