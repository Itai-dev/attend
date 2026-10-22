import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SessionEngine } from '../src/engine/SessionEngine';
import { SessionRunner } from '../src/engine/SessionRunner';
import { LocalGuideBrain } from '../src/engine/guide/LocalGuideBrain';
import { NoInput } from '../src/voice/input/NoInput';
import type { SpeechOutput } from '../src/voice/types';

// The runner holds real silences; compress them so a whole session runs in moments (voice/types.ts sleep).
(globalThis as { __DEV__?: boolean }).__DEV__ = true;
(globalThis as { __attendTimeScale?: number }).__attendTimeScale = 1e-6;

function fakeSession() {
  let t = 1_000_000;
  const heard: string[] = [];
  const engine = new SessionEngine({ sessionType: 'notice', minutes: 3, mode: 'guided', seed: 3, now: () => t });
  const output: SpeechOutput = {
    id: 'fake',
    label: 'fake',
    isAvailable: async () => true,
    speak: async (text) => {
      heard.push(text);
      t += text.length * 70 + 8000;
    },
    gong: async (_signal, ringMs) => {
      heard.push(ringMs === undefined ? 'GONG (rings out)' : 'GONG');
    },
    stop() {},
    dispose() {},
  };
  const runner = new SessionRunner({ engine, brain: new LocalGuideBrain(), voice: { input: new NoInput(), output }, onState: () => {} });
  return { runner, heard };
}

test('a gong opens the session before the first word and closes it after the last', async () => {
  const { runner, heard } = fakeSession();
  const { session } = await runner.run();
  assert.equal(session.outcome, 'completed');
  assert.equal(heard[0], 'GONG');
  assert.equal(heard[heard.length - 1], 'GONG (rings out)');
  assert.match(heard[heard.length - 2], /open your eyes/);
  assert.equal(heard.filter((h) => h.startsWith('GONG')).length, 2);
});

test('ending a session with the button has no closing gong', async () => {
  const { runner, heard } = fakeSession();
  const run = runner.run();
  await new Promise((r) => setTimeout(r, 5));
  runner.end();
  await run;
  assert.equal(heard.filter((h) => h.startsWith('GONG')).length, 1);
});
