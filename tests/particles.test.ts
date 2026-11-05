import assert from 'node:assert/strict';
import { test } from 'node:test';
import { away, makeRing, restState, stepRing } from '../src/viz/particles';

const C = { cx: 200, cy: 400, R: 105 };

function run(seconds: number, voice: (t: number) => number, start?: number[]) {
  const ring = makeRing(600);
  const st = start ?? restState(ring, C.cx, C.cy, C.R);
  let prev = 0;
  const dt = 1 / 60;
  let t = 0;
  for (; t < seconds; t += dt) {
    const level = voice(t);
    stepRing(ring, st, { ...C, dt, t, level, attack: Math.max(0, level - prev) });
    prev = level;
  }
  const dists = Array.from({ length: ring.n }, (_, i) => away(ring, st, i, { ...C, t }));
  return { ring, st, mean: dists.reduce((a, b) => a + b, 0) / ring.n, max: Math.max(...dists) };
}

test('in silence the particles stay together as a ring, gently moving', () => {
  const r = run(6, () => 0);
  assert.ok(r.mean < 1.5, `mean ${r.mean}`);
  assert.ok(r.mean > 0.05, `not frozen: ${r.mean}`);
  assert.ok(r.st.every(Number.isFinite));
});

test('a spoken line breaks the ring apart, and the silence after rebuilds it', () => {
  // Syllables: 0.18 s at a time, loud, with short gaps, for 2 seconds.
  const speaking = (t: number) => (t < 2 && t % 0.25 < 0.18 ? 0.75 : 0);
  const during = run(1.9, speaking);
  assert.ok(during.mean > 6, `scattered while speaking: ${during.mean}`);
  const after = run(4, speaking);
  assert.ok(after.mean < 1.5, `rebuilt after: ${after.mean}`);
});

test('it stays bounded, however loud', () => {
  const r = run(5, () => 1);
  assert.ok(r.st.every(Number.isFinite));
  assert.ok(r.max < C.R * 1.5, `max ${r.max}`);
});
