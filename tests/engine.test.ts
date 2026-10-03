import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RemoteGuideBrain } from '../src/engine/guide/RemoteGuideBrain';
import { BACK_SCRIPT, NECK_SCRIPT, runSession } from './helpers';

test('a full session: arrive → notice → explore → observe → reappraise → close', async () => {
  const r = await runSession(NECK_SCRIPT);
  assert.equal(r.session.outcome, 'completed');
  assert.equal(r.spoken[0], 'Take a moment to settle in.');
  assert.match(r.spoken[r.spoken.length - 1], /open your eyes/);
  const types = r.session.changes.map((c) => c.type);
  assert.ok(types.includes('moved'), types.join());
  assert.match(r.session.summary, /moving upward toward the back of your head/);
  assert.equal(r.session.bodyMapStart.sensations[0].movement?.type, 'static');
  assert.equal(r.session.bodyMapEnd.sensations[0].movement?.destinationRegion, 'head_back');
  // A real session length, not a questionnaire.
  assert.ok(r.durationMs > 4 * 60_000 && r.durationMs < 10 * 60_000, `${r.durationMs}`);
});

test('the guide never asks the same kind of question twice in a row, and never interrogates', async () => {
  const r = await runSession(NECK_SCRIPT);
  for (let i = 1; i < r.asks.length; i++) {
    if (r.asks[i] === 'change') continue; // holds end on an open "what's here now?"
    assert.notEqual(r.asks[i], r.asks[i - 1], r.asks.join(' → '));
  }
  assert.ok(r.asks.length <= 12, r.asks.join(' → '));
});

test('a known slot is not asked about', async () => {
  const r = await runSession({ ...NECK_SCRIPT, notice: 'A tight small spot on the left side of my neck, with a clear edge. It pulses.' });
  assert.ok(!r.asks.includes('shape'), r.asks.join());
  assert.ok(!r.asks.includes('temporal'), r.asks.join());
  assert.ok(!r.asks.includes('locate_side'), r.asks.join());
});

test('nothing changing is a complete session, described as such', async () => {
  const r = await runSession(BACK_SCRIPT);
  assert.equal(r.session.outcome, 'completed');
  assert.equal(r.session.title, 'The sensation stayed mostly the same today.');
  assert.ok(r.session.signals.urgeToFix);
  assert.ok(r.session.signals.acceptance);
  assert.match(r.session.summary, /urge to make it stop, and stayed with it anyway/);
});

test('a sensation described as new ends the practice with a medical suggestion, without reinterpretation', async () => {
  const r = await runSession({ ...NECK_SCRIPT, notice: "There's a new pain in my side, I've never felt anything like this before." });
  assert.equal(r.session.outcome, 'safety_pause');
  const said = r.spoken.join(' ');
  assert.match(said, /doctor|medical professional/);
  assert.doesNotMatch(said, /emergency\b.*treating|without immediately treating it as an emergency/);
});

test('a hint of something new asks once; "familiar" continues the practice', async () => {
  const r = await runSession({ ...NECK_SCRIPT, notice: 'My neck is tight. I hurt it after a fall last year.' });
  assert.ok(r.asks.includes('familiar'));
  assert.equal(r.session.outcome, 'completed');
  assert.ok(r.session.signals.familiarConfirmed);
});

test('crisis language stops the practice immediately', async () => {
  const r = await runSession({ ...NECK_SCRIPT, quality_deepen: "It's too much. Sometimes I want to die." });
  assert.equal(r.session.outcome, 'crisis_pause');
  assert.match(r.spoken.join(' '), /emergency number, or a crisis line/);
});

test('"stop" closes gently and keeps what was noticed', async () => {
  const r = await runSession({ ...NECK_SCRIPT, shape: "I'm done, I want to stop." });
  assert.equal(r.session.outcome, 'ended_early');
  assert.match(r.spoken[r.spoken.length - 1], /open your eyes/);
  assert.equal(r.session.bodyMapEnd.sensations[0].region, 'neck');
});

test('silence when asked what is there is fine: the guide waits, then rests with the whole body', async () => {
  const r = await runSession({ notice: null });
  assert.equal(r.session.outcome, 'completed');
  assert.match(r.spoken.join(' '), /body as a whole/);
  assert.equal(r.session.title, 'You rested with the body as a whole.');
});

test('sleep sessions end in rest, not with "open your eyes"', async () => {
  const r = await runSession(NECK_SCRIPT, { type: 'sleep' });
  assert.match(r.spoken[r.spoken.length - 1], /Just rest/);
});

test('remote guide: a forbidden phrase from the model falls back to the local line', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ lines: [{ text: "Nothing is wrong. You're completely safe. Where is it?", pauseAfterMs: 0 }] }), { status: 200 })) as typeof fetch;
  try {
    const brain = new RemoteGuideBrain({ url: 'https://example.test/attend' });
    const r = await runSession(NECK_SCRIPT, { brain });
    assert.doesNotMatch(r.spoken.join(' '), /Nothing is wrong|completely safe/);
    assert.equal(r.session.outcome, 'completed');
  } finally {
    globalThis.fetch = original;
  }
});

test('remote guide: good model wording is used, structure stays local', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ lines: [{ text: 'Stay with that pulling.', pauseAfterMs: 4000 }, { text: 'Does it stay in one place?', pauseAfterMs: 0 }] }), { status: 200 })) as typeof fetch;
  try {
    const brain = new RemoteGuideBrain({ url: 'https://example.test/attend' });
    const r = await runSession(NECK_SCRIPT, { brain });
    assert.ok(r.spoken.includes('Stay with that pulling.'));
    assert.equal(r.spoken[0], 'Take a moment to settle in.'); // arrival is never sent to the model
    assert.match(r.spoken[r.spoken.length - 1], /open your eyes/); // nor is the close
  } finally {
    globalThis.fetch = original;
  }
});

test('remote guide: a network failure is invisible to the person', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('offline');
  }) as typeof fetch;
  try {
    const r = await runSession(NECK_SCRIPT, { brain: new RemoteGuideBrain({ url: 'https://example.test/attend' }) });
    assert.equal(r.session.outcome, 'completed');
  } finally {
    globalThis.fetch = original;
  }
});
