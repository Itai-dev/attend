import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUIDE_SCRIPT } from '../server/lib/guideScript';
import { currentDay, completePractice, dayCompleted, EMPTY_PROGRAM, PROGRAM, programDay, SHORT_DAY_MINUTES } from '../src/domain/program';
import { dayKey } from '../src/domain/checkin';
import { INTO_PRACTICE, lessonLines, listenFirst } from '../src/domain/lessonVoice';
import { PRESETS, presetById, presetTheme } from '../src/domain/presets';
import { afterPractice, SLEEP_TAIL_MINUTES, LISTEN_TIMERS } from '../src/domain/soundscapes';
import { violatesGuideLanguage } from '../src/domain/safety';
import * as L from '../src/engine/guide/lines';
import { runSession } from './helpers';

/** Studio round 2 (18 Oct 2026): the body scan, the short day, the start-date rule, listening to the lesson, sleep's tail. */

const NECK = { region: 'neck' } as const;
const BODY_LINES = GUIDE_SCRIPT.SCAN_BODY.flat().map(([t]) => t);

// ——— the body scan ———

test('the body scan bank: sixteen steps, no placeholders, no questions, in the guide’s voice', () => {
  assert.equal(GUIDE_SCRIPT.SCAN_BODY.length, 16);
  for (const t of BODY_LINES) {
    assert.doesNotMatch(t, /\{(place|usual|usualWord|word|noun|dest)\}/, t);
    assert.doesNotMatch(t, /\?/, t);
    assert.doesNotMatch(t, /\bthe sensation\b/i, t);
    assert.ok(!violatesGuideLanguage(t), t);
  }
});

test('the scan-10 preset scans with SCAN_BODY, with or without a place, and asks nothing', async () => {
  const p = presetById('scan-10')!;
  assert.equal(p.scan, 'body');
  for (const place of [undefined, NECK]) {
    const r = await runSession({}, { mode: 'guided', type: p.type, minutes: p.minutes, theme: presetTheme(p), scan: p.scan, place, maxTurns: 300 });
    const label = `place ${!!place}`;
    for (const t of BODY_LINES) assert.ok(r.spoken.includes(t), `${label}: never heard "${t}"`);
    // In order: the feet before the scalp, and the whole body last.
    assert.ok(r.spoken.indexOf('Start with your feet.') < r.spoken.indexOf('And the top of the head.'), label);
    assert.equal(r.asks.length, 0, label);
    assert.equal(r.session.outcome, 'completed', label);
    const said = r.spoken.join(' ');
    assert.ok(!r.spoken.some((l) => l.includes('?')), label);
    assert.doesNotMatch(said, /\{place\}|your neck/, label);
    assert.match(said, /body as a whole/, label);
    assert.match(r.spoken[r.spoken.length - 1], /open your eyes/, label);
    const target = p.minutes * 60_000;
    assert.ok(r.durationMs > target * 0.85 && r.durationMs < target * 1.2, `${label}: ${Math.round(r.durationMs / 1000)}s`);
  }
});

test('only the body scan has SCAN_BODY: an open-theme program day keeps SCAN_FULL and its theme', async () => {
  assert.deepEqual(PRESETS.filter((p) => p.scan).map((p) => p.id), ['scan-10']);
  for (const n of [14, 21, 28]) {
    const d = programDay(n);
    assert.equal(d.practice.theme, 'open');
    const r = await runSession({}, { mode: 'guided', type: d.practice.sessionType, theme: d.practice.theme, minutes: 10, place: NECK, maxTurns: 300 });
    assert.ok(!r.spoken.some((l) => BODY_LINES.includes(l) && !GUIDE_SCRIPT.SCAN_FULL.flat().some(([t]) => t === l)), `day ${n} heard the body scan`);
    assert.ok(r.spoken.includes(GUIDE_SCRIPT.SCAN_FULL[1][0][0]), `day ${n} missed SCAN_FULL`);
    const open = GUIDE_SCRIPT.GUIDED_THEMES.open.flat().map(([t]) => t);
    assert.ok(r.spoken.some((l) => open.includes(l)), `day ${n} never heard its theme`);
  }
});

test('the body scan needs its ten minutes: shorter, or in a conversation, the usual scan plays', async () => {
  const short = await runSession({}, { mode: 'guided', minutes: 5, theme: 'open', scan: 'body', maxTurns: 300 });
  assert.ok(!short.spoken.includes('Start with your feet.'));
  assert.equal(short.engine.scan, undefined);
  const talk = await runSession({ notice: 'My neck.' }, { minutes: 10, scan: 'body', maxTurns: 80 });
  assert.equal(talk.engine.scan, undefined);
});

test('a remote script without SCAN_BODY keeps the bundled one; an off-voice one is rejected', () => {
  try {
    const { SCAN_BODY: _omit, ...older } = GUIDE_SCRIPT;
    assert.deepEqual(L.applyScript(older), []);
    assert.equal(L.SCAN_BODY, GUIDE_SCRIPT.SCAN_BODY);
    const bad = { ...GUIDE_SCRIPT, SCAN_BODY: [[['Thank you for sharing.', 3000]]] };
    assert.deepEqual(L.applyScript(bad), ['SCAN_BODY']);
    assert.equal(L.SCAN_BODY, GUIDE_SCRIPT.SCAN_BODY);
  } finally {
    L.resetScript();
  }
});

// ——— a shorter day ———

const MIN = 60_000;
const run = (outcome: 'completed' | 'ended_early' | 'safety_pause' | 'crisis_pause', activeMin: number) => ({ outcome, startedAt: 0, endedAt: activeMin * MIN });

test('a day is done after three active minutes, or when its practice ran to its end', () => {
  assert.equal(SHORT_DAY_MINUTES, 3);
  assert.equal(dayCompleted(run('completed', 2.6)), true);
  assert.equal(dayCompleted(run('ended_early', 3)), true);
  assert.equal(dayCompleted(run('ended_early', 2.95)), false);
  // The old rule counted anything past 90 seconds.
  assert.equal(dayCompleted(run('ended_early', 1.6)), false);
  // A safety or crisis pause stops the practice for something else; it never completes a day.
  assert.equal(dayCompleted(run('safety_pause', 6)), false);
  assert.equal(dayCompleted(run('crisis_pause', 6)), false);
  // Practised time, when recorded, is what counts.
  assert.equal(dayCompleted({ outcome: 'ended_early', startedAt: 0, endedAt: 20 * MIN, activeMs: 2 * MIN }), false);
});

test('every day’s 3-minute version runs to its end, so it completes the day', async () => {
  for (const d of PROGRAM) {
    const r = await runSession({}, { mode: 'guided', type: d.practice.sessionType, theme: d.practice.theme, minutes: SHORT_DAY_MINUTES, place: NECK, maxTurns: 200 });
    assert.equal(r.session.outcome, 'completed', `day ${d.day}`);
    assert.equal(r.asks.length, 0, `day ${d.day}`);
    assert.ok(dayCompleted(r.session), `day ${d.day}`);
    assert.ok(r.durationMs < 3.6 * MIN, `day ${d.day}: ${Math.round(r.durationMs / 1000)}s`);
    assert.equal(r.session.activeMs, r.session.endedAt - r.session.startedAt);
  }
});

test('ended by the person, the practised minutes decide, and a pause never counts', async () => {
  const { SessionEngine } = await import('../src/engine/SessionEngine');
  const endAfter = (activeMs: number, pausedMs: number) => {
    let t = 1_000_000;
    const e = new SessionEngine({ sessionType: 'notice', minutes: 5, now: () => t, mode: 'guided', seed: 1 });
    t += activeMs / 2;
    e.pauseClock();
    t += pausedMs;
    e.resumeClock();
    t += activeMs / 2;
    e.abort();
    return e.finalize().session;
  };
  const longPause = endAfter(2 * MIN, 20 * MIN);
  assert.equal(longPause.outcome, 'ended_early');
  assert.equal(longPause.activeMs, 2 * MIN);
  assert.equal(dayCompleted(longPause), false);
  assert.ok(longPause.createdAt - longPause.startedAt >= 22 * MIN);
  assert.equal(dayCompleted(endAfter(3 * MIN + 5000, 10 * MIN)), true);
});

// ——— the program day is the day the practice began ———

test('a practice begun at 23:55 counts for that day, and the next day opens the next morning', () => {
  const tz = 120; // UTC+2
  const local = (iso: string) => Date.parse(`${iso}Z`) - tz * MIN;
  const dayOf = (at: number) => dayKey(at, tz);
  const start = local('2026-10-01T23:55:00');
  const session = { outcome: 'completed' as const, startedAt: start, endedAt: start + 7 * MIN };
  assert.equal(dayOf(session.endedAt), '2026-10-02');
  let s = completePractice(EMPTY_PROGRAM, 1, session, dayOf);
  assert.equal(s.done[1], '2026-10-01');
  // The next morning: Day 2 is today's, not "opens tomorrow".
  assert.deepEqual(currentDay(s, '2026-10-02'), { day: 2, doneToday: false, finished: false });
  // A practice that doesn't count leaves the program as it was.
  s = completePractice(s, 2, { outcome: 'ended_early', startedAt: start, endedAt: start + MIN }, dayOf);
  assert.equal(s.done[2], undefined);
});

// ——— listening to the lesson ———

test('every lesson read aloud: the intro, every card in order, silences, then into the practice', () => {
  for (const d of PROGRAM) {
    const ls = lessonLines(d);
    const texts = ls.map(([t]) => t);
    assert.match(texts[0], new RegExp(`^Day ${d.day}\\.`), `day ${d.day}`);
    assert.equal(texts[1], 'You can close your eyes, and just listen.');
    assert.deepEqual(ls.slice(-2), INTO_PRACTICE);
    const body = d.lesson.cards.flatMap((c) => [...c.text, ...(c.notice ? [c.notice] : [])]);
    assert.deepEqual(texts.slice(2, -2), body, `day ${d.day}`);
    for (const c of d.lesson.cards) {
      const lastText = ls.find(([t]) => t === c.text[c.text.length - 1])!;
      assert.equal(lastText[1], c.notice ? 4000 : 2500, `day ${d.day}: ${lastText[0]}`);
    }
    for (const [t, ms] of ls) {
      assert.doesNotMatch(t, /\?/, `day ${d.day}: ${t}`);
      assert.ok(!violatesGuideLanguage(t), `day ${d.day}: ${t}`);
      assert.ok(ms > 0 && ms <= 4000, `day ${d.day}: ${t}`);
    }
  }
  assert.equal(lessonLines(programDay(1))[0][0], 'Day 1. Pain is real.');
  // Day 28's lesson is titled "Day 28": said once.
  assert.equal(lessonLines(programDay(28))[0][0], 'Day 28.');
});

test('listen comes first at night and for Nights; read and listen are both always there', () => {
  assert.equal(listenFirst(20), false);
  assert.equal(listenFirst(21), true);
  assert.equal(listenFirst(2), true);
  assert.equal(listenFirst(9), false);
  assert.equal(listenFirst(9, 'sleep'), true);
  assert.equal(listenFirst(9, 'flare'), false);
});

// ——— sleep ———

test('a sleep practice that ran its course rests, and its sound carries on for 30 minutes', () => {
  assert.ok((LISTEN_TIMERS as readonly number[]).includes(SLEEP_TAIL_MINUTES));
  assert.equal(SLEEP_TAIL_MINUTES, 30);
  assert.deepEqual(afterPractice('sleep', 'completed', 'hz528'), { rest: true, sound: 'hz528' });
  // No sound chosen: dark and quiet, nothing starts.
  assert.deepEqual(afterPractice('sleep', 'completed', 'none'), { rest: true });
  // Ended by the person: they are awake, and After is where they asked to go.
  assert.deepEqual(afterPractice('sleep', 'ended_early', 'hz528'), { rest: false });
  assert.deepEqual(afterPractice('notice', 'completed', 'hz528'), { rest: false });
});

test('a sleep practice records its guided minutes only, and ends in rest without a wake-up', async () => {
  const r = await runSession({}, { mode: 'guided', type: 'sleep', minutes: 10, theme: 'open', maxTurns: 300 });
  assert.equal(r.session.outcome, 'completed');
  // The recorded minutes are the guided ones; the sound's tail is not part of the session.
  assert.equal(r.session.activeMs, r.durationMs);
  assert.doesNotMatch(r.spoken[r.spoken.length - 1], /open your eyes/);
});
