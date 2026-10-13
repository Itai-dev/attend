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
