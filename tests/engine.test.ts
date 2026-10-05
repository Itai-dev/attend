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

test('when the guide voice cannot be reached, the session pauses instead of switching voices', async () => {
  const { SessionEngine } = await import('../src/engine/SessionEngine');
  const { LocalGuideBrain } = await import('../src/engine/guide/LocalGuideBrain');
  const { SessionRunner } = await import('../src/engine/SessionRunner');
  const engine = new SessionEngine({ sessionType: 'notice', seed: 3 });
  let failNext = true;
  const spoken: string[] = [];
  const states: Array<{ status: string; pausedBy?: string }> = [];
  const runner = new SessionRunner({
    engine,
    brain: new LocalGuideBrain(),
    onState: (s) => states.push({ status: s.status, pausedBy: s.pausedBy }),
    voice: {
      output: {
        id: 'fake',
        label: 'fake',
        isAvailable: async () => true,
        speak: async (text) => {
          if (failNext) {
            failNext = false;
            throw { code: 'network', message: 'offline' };
          }
          spoken.push(text);
        },
        stop() {},
        dispose() {},
      },
      input: {
        id: 'fake',
        label: 'fake',
        isAvailable: async () => true,
        requestPermission: async () => true,
        listen: async () => ({ kind: 'aborted' }),
        dispose() {},
      },
    },
  });
  const run = runner.run();
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(runner.isPaused);
  assert.deepEqual(states[states.length - 1], { status: 'paused', pausedBy: 'error' });
  assert.equal(spoken.length, 0);
  // Resuming tries the voice again; the guide carries on in the same voice.
  runner.resume();
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(spoken.length > 0);
  runner.end();
  await run;
});

test('the length chosen on Home sets the session length; shorter says less, it does not hurry', async () => {
  const short = await runSession(NECK_SCRIPT, { minutes: 3 });
  const mid = await runSession(NECK_SCRIPT, { minutes: 5 });
  const long = await runSession(NECK_SCRIPT, { minutes: 10 });
  for (const r of [short, mid, long]) {
    assert.equal(r.session.outcome, 'completed');
    assert.match(r.spoken[r.spoken.length - 1], /open your eyes/);
  }
  assert.ok(short.durationMs < 4 * 60_000, `3 min ran ${short.durationMs}`);
  assert.ok(mid.durationMs < 6.5 * 60_000, `5 min ran ${mid.durationMs}`);
  assert.ok(long.durationMs > mid.durationMs && long.durationMs < 12 * 60_000, `10 min ran ${long.durationMs}`);
  assert.ok(short.asks.length < long.asks.length, `${short.asks.length} vs ${long.asks.length}`);
});

test('an edited guide script changes the words; off-voice or malformed sections keep the bundled words', async () => {
  const { applyScript, resetScript, VOICE_DIRECTION } = await import('../src/engine/guide/lines');
  const { GUIDE_SCRIPT } = await import('../server/lib/guideScript');
  try {
    const edited = JSON.parse(JSON.stringify(GUIDE_SCRIPT));
    edited.ARRIVE.notice = [[['Arrive here, slowly.', 4000]]];
    edited.voice.direction = '[whispers]';
    edited.CLOSE.notice = [["You're safe now. Open your eyes.", 0]]; // forbidden language
    edited.HOLD = 'not a list'; // malformed
    const rejected = applyScript(edited);
    assert.deepEqual(rejected.sort(), ['CLOSE', 'HOLD']);
    const r = await runSession(NECK_SCRIPT);
    assert.equal(r.spoken[0], 'Arrive here, slowly.');
    assert.ok(!r.spoken.some((l) => /safe now/.test(l)));
    assert.match(r.spoken[r.spoken.length - 1], /open your eyes/);
    const lines = await import('../src/engine/guide/lines');
    assert.equal(lines.VOICE_DIRECTION, '[whispers]');
  } finally {
    resetScript();
  }
  const lines = await import('../src/engine/guide/lines');
  assert.equal(lines.VOICE_DIRECTION, VOICE_DIRECTION);
  assert.equal((await runSession(NECK_SCRIPT)).spoken[0], 'Take a moment to settle in.');
});

test("the ElevenLabs agent's first message opens the session; an off-voice one is ignored", async () => {
  const { applyOpening, resetScript } = await import('../src/engine/guide/lines');
  try {
    assert.equal(applyOpening('notice', "Let's arrive."), true);
    const r = await runSession(NECK_SCRIPT);
    assert.equal(r.spoken[0], "Let's arrive.");
    assert.equal(applyOpening('notice', "Relax, you're safe."), false);
    assert.equal((await runSession(NECK_SCRIPT)).spoken[0], "Let's arrive.");
  } finally {
    resetScript();
  }
  assert.equal((await runSession(NECK_SCRIPT)).spoken[0], 'Take a moment to settle in.');
});
