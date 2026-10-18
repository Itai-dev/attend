import assert from 'node:assert/strict';
import { test } from 'node:test';
import { violatesGuideLanguage } from '../src/domain/safety';
import { runSession } from './helpers';

const LOWER_BACK = { region: 'lower_back', side: 'center' } as const;

test('a guided session never asks and never waits for an answer', async () => {
  for (const minutes of [3, 5, 10] as const) {
    const r = await runSession({}, { mode: 'guided', place: LOWER_BACK, minutes, maxTurns: 200 });
    assert.equal(r.asks.length, 0, `${minutes} min: ${r.asks.join()}`);
    assert.equal(r.session.outcome, 'completed');
    assert.equal(r.session.mode, 'guided');
    assert.ok(!r.spoken.some((l) => l.trim().endsWith('?')), r.spoken.filter((l) => l.endsWith('?')).join(' | '));
  }
});

test('a guided session rests on the place, then reappraises and closes', async () => {
  const r = await runSession({}, { mode: 'guided', place: LOWER_BACK, minutes: 10, maxTurns: 200 });
  const said = r.spoken.join(' ');
  assert.match(said, /the middle of your lower back/);
  assert.match(said, /rather than a problem|difference between feeling something|You don't need to solve/);
  assert.match(r.spoken[r.spoken.length - 1], /open your eyes/);
  assert.ok(r.session.signals.observedSeconds > 4 * 60, `${r.session.signals.observedSeconds}`);
});

test('a guided session fills its length, rather than ending early', async () => {
  for (const minutes of [3, 5, 10] as const) {
    for (const place of [LOWER_BACK, undefined]) {
      const r = await runSession({}, { mode: 'guided', place, minutes, maxTurns: 200 });
      const target = minutes * 60_000;
      assert.ok(r.durationMs > target * 0.85 && r.durationMs < target * 1.2, `${minutes} min, place ${!!place}: ${Math.round(r.durationMs / 1000)}s`);
    }
  }
});

test('with no place, a guided session stays with the body as a whole', async () => {
  const r = await runSession({}, { mode: 'guided', minutes: 5, maxTurns: 200 });
  assert.match(r.spoken.join(' '), /body as a whole/);
  assert.equal(r.session.place, undefined);
  assert.equal(r.session.title, 'You rested with the body as a whole.');
});

test('a guided recap says where attention rested, never how the sensation was', async () => {
  const r = await runSession({}, { mode: 'guided', place: LOWER_BACK, minutes: 5, maxTurns: 200 });
  assert.equal(r.session.title, 'You spent time with the middle of your lower back.');
  assert.match(r.session.summary, /for about \d minutes/);
  assert.doesNotMatch(r.session.summary, /soft|eased|changed|better|worse/);
  assert.equal(r.session.changes.length, 0);
  assert.equal(r.session.bodyMapEnd.sensations.length, 0);
});

test('every guided line is in the guide’s voice, and a fear session never promises voice control', async () => {
  for (const type of ['notice', 'flare', 'sleep', 'fear'] as const) {
    const r = await runSession({}, { mode: 'guided', type, place: LOWER_BACK, minutes: 10, maxTurns: 200 });
    for (const l of r.spoken) assert.ok(!violatesGuideLanguage(l), l);
    assert.doesNotMatch(r.spoken.join(' '), /saying so|tell me|say it/i);
  }
});

test('a guided line is not repeated back to back', async () => {
  const r = await runSession({}, { mode: 'guided', place: LOWER_BACK, minutes: 10, maxTurns: 200 });
  for (let i = 1; i < r.spoken.length; i++) assert.notEqual(r.spoken[i], r.spoken[i - 1]);
});

test('a place is ignored by a conversation, which finds its own', async () => {
  const r = await runSession({ notice: 'My neck.' }, { place: LOWER_BACK, maxTurns: 40 });
  assert.equal(r.session.place, undefined);
  assert.ok(r.asks.length > 0);
});

/**
 * Drive a guided session the way the runner does, with a pause between two lines: the clock
 * stops, the wall clock runs on for `pauseMs`, then the session resumes ("Let's continue.").
 */
async function guidedWithPause(pauseAfterMs: number | null, pauseMs: number, minutes: 5 | 10 = 10) {
  const { SessionEngine } = await import('../src/engine/SessionEngine');
  const { LocalGuideBrain } = await import('../src/engine/guide/LocalGuideBrain');
  const start = 1_000_000;
  let t = start;
  const engine = new SessionEngine({ sessionType: 'notice', minutes, now: () => t, seed: 3, mode: 'guided', place: LOWER_BACK });
  const brain = new LocalGuideBrain();
  const spoken: string[] = [];
  let paused = false;
  let elapsedAtResume = 0;
  for (let turns = 0; !engine.done && turns < 200; turns++) {
    const turn = await brain.next(engine.context());
    engine.recordGuideTurn(turn);
    let cut = false;
    for (const l of turn.lines) {
      spoken.push(l.text);
      t += l.text.length * 70 + l.pauseAfterMs;
      if (!paused && pauseAfterMs !== null && engine.elapsedMs >= pauseAfterMs) {
        paused = true;
        engine.pauseClock();
        t += pauseMs;
        engine.resumeClock();
        elapsedAtResume = engine.elapsedMs;
        engine.markInterrupted();
        cut = true;
        break;
      }
    }
    if (!cut) engine.afterGuideTurn(turn);
  }
  const { session } = engine.finalize();
  return { session, spoken, elapsedAtResume, wallMs: t - start };
}

test('a long pause does not cut a guided practice short: its clock is the time practised', async () => {
  const plain = await guidedWithPause(null, 0);
  // Twenty minutes paused, three minutes into a ten-minute practice.
  const paused = await guidedWithPause(3 * 60_000, 20 * 60_000);
  assert.equal(paused.session.outcome, 'completed');
  assert.match(paused.spoken[paused.spoken.length - 1], /open your eyes/);
  const target = 10 * 60_000;
  const practised = paused.session.endedAt - paused.session.startedAt;
  // On the wall clock the session would have closed straight after resume; it runs its length.
  assert.ok(practised > target * 0.85 && practised < target * 1.2, `practised ${Math.round(practised / 1000)}s`);
  assert.ok(practised - paused.elapsedAtResume > 5 * 60_000, `after resume ${Math.round((practised - paused.elapsedAtResume) / 1000)}s`);
  // Recorded minutes exclude the pause; the real end is kept.
  assert.ok(paused.wallMs > practised + 19 * 60_000);
  assert.equal(paused.session.createdAt, paused.session.startedAt + paused.wallMs);
  assert.ok(Math.abs(practised - (plain.session.endedAt - plain.session.startedAt)) < 60_000);
  // Observed time is practice time too.
  assert.ok(paused.session.signals.observedSeconds < 10 * 60, `${paused.session.signals.observedSeconds}`);
  assert.ok(Math.abs(paused.session.signals.observedSeconds - plain.session.signals.observedSeconds) < 60);
});
