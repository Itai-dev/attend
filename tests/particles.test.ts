import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AGE, ALPHA, DIST, LIFE, makeRing, restState, SX, SY, STRIDE, stepRing } from '../src/viz/particles';

const C = { cx: 200, cy: 400, R: 105 };

function seeded(seed = 3) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function run(seconds: number, voice: (t: number) => number) {
  const rnd = seeded();
  const ring = makeRing(800);
  const st = restState(ring, C.R, rnd);
  let prev = 0;
  const dt = 1 / 60;
  let respawns = 0;
  let t = 0;
  for (; t < seconds; t += dt) {
    const level = voice(t);
    const ages = Array.from({ length: ring.n }, (_, i) => st[i * STRIDE + AGE]);
    stepRing(ring, st, { ...C, dt, t, level, attack: Math.max(0, level - prev), rnd });
    for (let i = 0; i < ring.n; i++) if (st[i * STRIDE + AGE] < ages[i]) respawns++;
    prev = level;
  }
  const field = (k: number) => Array.from({ length: ring.n }, (_, i) => st[i * STRIDE + k]);
  const dist = field(DIST);
  return { st, ring, respawns, mean: dist.reduce((a, b) => a + b, 0) / ring.n, max: Math.max(...dist), sx: field(SX), sy: field(SY), alpha: field(ALPHA) };
}

test('in silence the particles hold a ring, wandering a little, living and dying', () => {
  const r = run(6, () => 0);
  assert.ok(r.mean < 4, `close to home: ${r.mean}`);
  assert.ok(r.mean > 0.3, `never still: ${r.mean}`);
  // Lives of 1.2–5 s: over six seconds most particles have been born again at least once.
  assert.ok(r.respawns > r.ring.n * 0.8, `respawns ${r.respawns}`);
  assert.ok(r.st.every(Number.isFinite));
  // Drawn as a ring round the centre: nothing in the hole's middle, nothing far outside.
  const radii = r.sx.map((x, i) => Math.hypot(x - C.cx, r.sy[i] - C.cy));
  assert.ok(Math.min(...radii) > C.R * 0.25, `min ${Math.min(...radii)}`);
  assert.ok(Math.max(...radii) < C.R * 1.4, `max ${Math.max(...radii)}`);
});

test('a spoken line breaks the ring apart, and the silence after gathers it', () => {
  const speaking = (t: number) => (t < 2 && t % 0.25 < 0.18 ? 0.75 : 0);
  const quiet = run(1.9, () => 0);
  const during = run(1.9, speaking);
  assert.ok(during.mean > quiet.mean * 3, `scattered: ${during.mean} vs ${quiet.mean}`);
  const after = run(4.5, speaking);
  assert.ok(after.mean < quiet.mean * 1.6, `gathered: ${after.mean} vs ${quiet.mean}`);
});

test('the voice speeds up the coming and going', () => {
  const quiet = run(3, () => 0);
  const loud = run(3, () => 0.8);
  assert.ok(loud.respawns > quiet.respawns * 1.3, `${loud.respawns} vs ${quiet.respawns}`);
});

test('it stays bounded, however loud, and every particle fades in and out', () => {
  const r = run(5, () => 1);
  assert.ok(r.st.every(Number.isFinite));
  assert.ok(r.max < C.R, `max ${r.max}`);
  assert.ok(r.alpha.every((a) => a >= 0 && a <= 1));
  const ring = makeRing(10);
  const st = restState(ring, C.R, seeded());
  assert.ok(st.every(Number.isFinite));
  for (let i = 0; i < ring.n; i++) assert.ok(st[i * STRIDE + AGE] <= st[i * STRIDE + LIFE]);
});
