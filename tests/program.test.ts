import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUIDE_SCRIPT } from '../server/lib/guideScript';
import { violatesGuideLanguage } from '../src/domain/safety';
import { completeDay, currentDay, EMPTY_PROGRAM, PROGRAM, PROGRAM_DAYS, WEEKS } from '../src/domain/program';
import * as L from '../src/engine/guide/lines';
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

/**
 * Every line a guided session can reach (LocalGuideBrain.guidedTurn, and phaseTurn for arrive,
 * scan and the endings), bundled and fixed. Round 3 found REAPPRAISE_CORE missing from the
 * question test, and a question in it that guided sessions spoke.
 */
function guidedReachable(): string[] {
  const variants = [
    ...Object.values(GUIDE_SCRIPT.ARRIVE).flat(),
    ...GUIDE_SCRIPT.SCAN_BRIEF,
    ...GUIDE_SCRIPT.SCAN_SHORT,
    ...GUIDE_SCRIPT.SCAN_FULL,
    ...GUIDE_SCRIPT.SCAN_BODY,
    ...GUIDE_SCRIPT.GUIDED_SETTLE,
    ...GUIDE_SCRIPT.GUIDED_OBSERVE,
    ...GUIDE_SCRIPT.GUIDE_OBSERVE,
    ...GUIDE_SCRIPT.GUIDED_OPEN,
    ...Object.values(GUIDE_SCRIPT.GUIDED_THEMES).flat(),
    ...GUIDE_SCRIPT.REAPPRAISE_CORE,
    ...Object.values(GUIDE_SCRIPT.CLOSE_PREPARE).flat(),
  ];
  const flat = [GUIDE_SCRIPT.OPEN_AWARENESS, ...Object.values(GUIDE_SCRIPT.CLOSE), L.ARRIVAL_SAFETY.fear, [L.ARRIVAL_SAFETY.flare, L.ARRIVAL_SAFETY.first, L.ARRIVAL_SAFETY.stop, L.RESUME], L.EARLY_CLOSE];
  return [...variants.flat(), ...flat.flat()].map(([t]) => t);
}

test('the guide invites; it never asks: no line a guided session can reach is a question', () => {
  // Guided sessions never listen, so a question leaves the person waiting to answer (studio round 1).
  const reachable = guidedReachable();
  assert.ok(reachable.length > 150, `${reachable.length}`);
  for (const text of reachable) assert.doesNotMatch(text, /\?/, text);
});

test('no line a guided session can reach implies the sensation is benign, or checks the body for health worries', () => {
  const benign = /not a problem|rather than a problem|a problem that|as an emergency|harmless|benign|nothing (is )?wrong|you'?re safe|is safe|nothing you need to fix|nothing you have to do|in this moment, nothing|where in the body the fear|breastbone|throat/i;
  for (const text of guidedReachable()) {
    assert.doesNotMatch(text, benign, text);
    assert.ok(!violatesGuideLanguage(text), text);
  }
  // "Nothing to fix" is about the practice, never the body.
  const said = guidedReachable().join(' ');
  assert.match(said, /There's nothing to fix in this practice\./);
  assert.match(said, /Nothing needs fixing in this practice\./);
  assert.match(said, /Nothing to do here but breathe\./);
});

test('guided sessions never speak a question, across seeds, types, lengths, themes and places', async () => {
  const themes = Object.keys(GUIDE_SCRIPT.GUIDED_THEMES) as Array<keyof typeof GUIDE_SCRIPT.GUIDED_THEMES>;
  for (let seed = 1; seed <= 30; seed++) {
    for (const type of ['notice', 'flare', 'sleep', 'fear'] as const) {
      for (const minutes of [3, 5, 7, 10] as const) {
        for (const place of [{ region: 'neck' } as const, undefined]) {
          const theme = seed % 3 === 0 ? undefined : themes[seed % themes.length];
          const r = await runSession({}, { mode: 'guided', type, minutes, place, theme, seed, firstSession: seed % 2 === 0, maxTurns: 300 });
          const label = `seed ${seed}, ${type}, ${minutes} min, theme ${theme}, place ${!!place}`;
          assert.equal(r.asks.length, 0, label);
          for (const l of r.spoken) assert.doesNotMatch(l, /\?/, `${label}: ${l}`);
        }
      }
    }
    const scan = await runSession({}, { mode: 'guided', minutes: 10, theme: 'open', scan: 'body', seed, maxTurns: 300 });
    for (const l of scan.spoken) assert.doesNotMatch(l, /\?/, `body scan, seed ${seed}: ${l}`);
  }
});

test('lessons name the other half: signs that need a closer look, and worry that is a reason to check', () => {
  const day = (n: number) => PROGRAM[n - 1].lesson.cards.flatMap((c) => c.text).join(' ');
  assert.match(day(3), /This doesn’t mean worry causes pain\. Worry about something new is a reason to have it checked\./);
  assert.match(day(4), /They also look for signs that need a closer look\. That’s why anything new or changing goes to a doctor first\./);
  // The closer-look line comes before the signs are listed.
  assert.ok(day(4).indexOf('closer look') < day(4).indexOf('It began during a stressful time'));
});

test('the doctor line sits beside care, and the early lessons include pain with no injury', () => {
  const words = PROGRAM.slice(0, 3).flatMap((d) => d.lesson.cards.flatMap((c) => c.text)).join(' ');
  assert.match(words, /Keep any treatment you have/);
  assert.match(words, /no injury at all/);
  assert.doesNotMatch(words, /before practi[sc]ing with it/);
});
