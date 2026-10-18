import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SpeakOptions, SpeechInput, SpeechOutput } from '../src/voice/types';

/**
 * The real SessionRunner, on a compressed clock: one real millisecond is one session second.
 * The guide's silences (voice/types sleep) are compressed the same way, through the
 * development time scale, so a ten-minute guided session runs in well under two seconds.
 */
const SCALE = 1000;
(globalThis as { __DEV__?: boolean }).__DEV__ = true;
(globalThis as { __attendTimeScale?: number }).__attendTimeScale = 1 / SCALE;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const silentInput: SpeechInput = {
  id: 'none',
  label: 'none',
  isAvailable: async () => true,
  requestPermission: async () => true,
  listen: async () => ({ kind: 'silence', waitedMs: 0 }),
  dispose() {},
};

async function guidedRunner(output: Partial<SpeechOutput> & Pick<SpeechOutput, 'speak'>, minutes: 5 | 10 = 10) {
  const { SessionEngine } = await import('../src/engine/SessionEngine');
  const { LocalGuideBrain } = await import('../src/engine/guide/LocalGuideBrain');
  const { SessionRunner } = await import('../src/engine/SessionRunner');
  const base = Date.now();
  const now = () => base + (Date.now() - base) * SCALE;
  const engine = new SessionEngine({ sessionType: 'notice', minutes, now, seed: 3, mode: 'guided', place: { region: 'lower_back', side: 'center' } });
  const states: Array<{ status: string; pausedBy?: string }> = [];
  const runner = new SessionRunner({
    engine,
    brain: new LocalGuideBrain(),
    onState: (s) => states.push({ status: s.status, pausedBy: s.pausedBy }),
    voice: { input: silentInput, output: { id: 'fake', label: 'fake', isAvailable: async () => true, stop() {}, dispose() {}, ...output } },
  });
  return { runner, engine, states, now };
}

/** A line takes as long to say as it would aloud, on the compressed clock. */
const speakLine = (text: string, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, (text.length * 70) / SCALE);
    signal.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true });
  });

test('the runner: a long pause neither ends the practice early nor counts as minutes', async () => {
  const { runner, now } = await guidedRunner({ speak: speakLine });
  const startedWall = now();
  const run = runner.run();
  await wait((3 * 60_000) / SCALE);
  runner.pause();
  const atPause = runner.activeMs;
  await wait((15 * 60_000) / SCALE);
  // Paused time is not session time.
  assert.ok(runner.activeMs - atPause < 5_000, `${runner.activeMs - atPause}ms passed while paused`);
  runner.resume();
  const { session } = await run;
  const practised = session.endedAt - session.startedAt;
  assert.equal(session.outcome, 'completed');
  assert.ok(practised > 10 * 60_000 * 0.85 && practised < 10 * 60_000 * 1.25, `practised ${Math.round(practised / 1000)}s`);
  assert.ok(session.createdAt - startedWall > practised + 14 * 60_000, 'the real end is kept');
});

test('after a voice failure, the person sees why, and resume tries once, quickly', async () => {
  const calls: Array<SpeakOptions | undefined> = [];
  let failures = 2;
  const { runner, states } = await guidedRunner({
    speak: async (text, signal, opts) => {
      calls.push(opts);
      if (failures > 0) {
        failures--;
        throw { code: 'network', message: 'offline' };
      }
      return speakLine(text, signal);
    },
  }, 5);
  const run = runner.run();
  await wait(20);
  assert.ok(runner.isPaused);
  assert.deepEqual(states[states.length - 1], { status: 'paused', pausedBy: 'error' });
  assert.equal(calls[0], undefined, 'the first try uses the full retries');
  // Still offline: one quick try, then paused again with the same reason.
  runner.resume();
  await wait(20);
  assert.deepEqual(calls[1], { quick: true });
  assert.ok(runner.isPaused);
  assert.deepEqual(states[states.length - 1], { status: 'paused', pausedBy: 'error' });
  // Back online: the guide carries on, and later lines are fetched normally again.
  runner.resume();
  await wait(50);
  assert.deepEqual(calls[2], { quick: true });
  assert.ok(!runner.isPaused);
  assert.ok(calls.length > 3);
  assert.equal(calls[3], undefined);
  runner.end();
  await run;
});
