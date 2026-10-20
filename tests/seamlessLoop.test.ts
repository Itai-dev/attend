import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import {
  crossfadeDone,
  crossfadeSeconds,
  equalPower,
  loopGains,
  loopWaitMs,
  LOOP_CROSSFADE_S,
  LOOP_END_SLACK_S,
  LOOP_MAX_WAIT_MS,
  nextPassAt,
} from '../src/domain/seamlessLoop';
import { CrossfadeLoop, type LoopPlayer } from '../src/voice/crossfadeLoop';

const D = 300; // a five-minute field recording

test('a long file crossfades for six seconds; a short one for a quarter of itself; an unknown one not at all', () => {
  assert.equal(crossfadeSeconds(D), LOOP_CROSSFADE_S);
  assert.equal(crossfadeSeconds(12), 3);
  assert.equal(crossfadeSeconds(0), 0);
  assert.equal(crossfadeSeconds(NaN), 0);
  assert.equal(crossfadeSeconds(1), 0, 'too short to hide a seam');
  assert.equal(nextPassAt(D, 6), 294);
});

test('equal power: the loudness holds through the crossfade, and the ends are exact', () => {
  for (let p = 0; p <= 1; p += 0.05) {
    const g = equalPower(p);
    assert.ok(Math.abs(g.out ** 2 + g.in ** 2 - 1) < 1e-9, `power at ${p}`);
  }
  assert.deepEqual(equalPower(0), { out: 1, in: 0 });
  assert.deepEqual(equalPower(1), { out: 0, in: 1 });
  assert.deepEqual(equalPower(-3), { out: 1, in: 0 });
});

test('the gains follow the outgoing pass: alone, then crossing, silent before the file ends', () => {
  assert.deepEqual(loopGains(100, D, 6), { current: 1, next: 0 });
  assert.deepEqual(loopGains(293.9, D, 6), { current: 1, next: 0 });
  const mid = loopGains(294 + (6 - LOOP_END_SLACK_S) / 2, D, 6);
  assert.ok(Math.abs(mid.current - Math.SQRT1_2) < 1e-9 && Math.abs(mid.next - Math.SQRT1_2) < 1e-9);
  assert.deepEqual(loopGains(D - LOOP_END_SLACK_S, D, 6), { current: 0, next: 1 });
  assert.ok(!crossfadeDone(299, D, 6));
  assert.ok(crossfadeDone(D - LOOP_END_SLACK_S, D, 6));
  assert.ok(crossfadeDone(D, D, 6));
});

test('between seams it sleeps toward the next one, re-reading the position at least every few seconds', () => {
  assert.equal(loopWaitMs(0, D, 6), LOOP_MAX_WAIT_MS);
  assert.equal(loopWaitMs(290, D, 6), 4000);
  assert.ok(loopWaitMs(293.999, D, 6) >= 1);
  assert.ok(loopWaitMs(295, D, 6) <= 100, 'every tick while crossing');
});

/** A player whose position advances with the (mocked) clock while it plays, and stops at its end. */
class FakePlayer implements LoopPlayer {
  static all: FakePlayer[] = [];
  volume = 0;
  loop = false;
  removed = false;
  pos = 0;
  since?: number;
  loadedAt: number;
  constructor(
    readonly length: number,
    loadMs = 0,
  ) {
    this.loadedAt = Date.now() + loadMs;
    FakePlayer.all.push(this);
  }
  get duration() {
    return Date.now() >= this.loadedAt ? this.length : 0;
  }
  get currentTime() {
    if (this.since === undefined) return this.pos;
    const t = this.pos + (Date.now() - this.since) / 1000;
    return this.loop ? t % this.length : Math.min(this.length, t);
  }
  get playing() {
    return this.since !== undefined;
  }
  play() {
    if (this.since === undefined) this.since = Date.now();
  }
  pause() {
    this.pos = this.currentTime;
    this.since = undefined;
  }
  async seekTo(s: number) {
    this.pos = s;
    if (this.since !== undefined) this.since = Date.now();
  }
  remove() {
    this.removed = true;
    this.since = undefined;
  }
}

function withClock(fn: () => void) {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  FakePlayer.all = [];
  try {
    fn();
  } finally {
    mock.timers.reset();
  }
}
/** Advance the clock in steps, as a real run loop would. */
function run(ms: number, step = 20) {
  for (let t = 0; t < ms; t += step) mock.timers.tick(step);
}

test('the loop: one pass alone, the next starts six seconds before the end, cross at constant power, swap', () => {
  withClock(() => {
    const loop = new CrossfadeLoop(() => new FakePlayer(D), 0.5);
    const [a, b] = FakePlayer.all;
    assert.ok(a.playing && !b.playing);
    run(293_000, 1000);
    assert.equal(a.volume, 0.5);
    assert.ok(!b.playing, 'the second pass has not started');
    run(1_500);
    assert.ok(b.playing, 'the second pass starts at 294 s');
    assert.ok(b.currentTime < 1);
    run(1_500);
    const power = (a.volume / 0.5) ** 2 + (b.volume / 0.5) ** 2;
    assert.ok(Math.abs(power - 1) < 0.05, `power ${power}`);
    run(4_000);
    // Crossed: the first pass is silent, paused and rewound; the second leads at full level.
    assert.ok(!a.playing);
    assert.equal(a.volume, 0);
    assert.equal(a.currentTime, 0);
    assert.equal(b.volume, 0.5);
    // And round again: the first pass starts from the top six seconds before the second ends.
    run(D * 1000 - 6_000 - 6_000 - 1_000, 1000);
    assert.ok(!a.playing);
    run(2_000);
    assert.ok(a.playing, 'second seam');
    assert.equal(FakePlayer.all.length, 2, 'the same two players take turns');
    loop.release();
    assert.ok(a.removed && b.removed);
  });
});

test('paused mid-crossfade, both players stop and the crossfade resumes where it was', () => {
  withClock(() => {
    const loop = new CrossfadeLoop(() => new FakePlayer(D), 1);
    const [a, b] = FakePlayer.all;
    run(297_000, 500);
    assert.ok(a.playing && b.playing);
    loop.pause();
    const held = { a: a.volume, b: b.volume, at: a.currentTime };
    assert.ok(!a.playing && !b.playing, 'both paused');
    run(60_000, 1000);
    assert.equal(a.currentTime, held.at, 'the position waits');
    assert.deepEqual({ a: a.volume, b: b.volume }, { a: held.a, b: held.b });
    assert.ok(!loop.playing);
    loop.resume();
    assert.ok(a.playing && b.playing, 'both resume');
    run(4_000);
    assert.ok(!a.playing && b.playing, 'and the swap completes');
    assert.equal(b.volume, 1);
    loop.release();
  });
});

test('fades ease the level; a fade to nothing then pause is silent; release fades out and frees both players', () => {
  withClock(() => {
    const loop = new CrossfadeLoop(() => new FakePlayer(D));
    const [a, b] = FakePlayer.all;
    assert.equal(a.volume, 0);
    loop.fadeTo(0.4, 1200);
    run(600);
    assert.ok(a.volume > 0 && a.volume < 0.4);
    run(700);
    assert.equal(a.volume, 0.4);
    let paused = false;
    loop.fadeTo(0, 1200, () => {
      loop.pause();
      paused = true;
    });
    run(1300);
    assert.ok(paused && !a.playing && a.volume === 0);
    loop.resume();
    loop.setVolume(0.3);
    let freed = false;
    loop.release(1500, () => (freed = true));
    loop.setVolume(1); // ignored once releasing
    run(700);
    assert.ok(a.volume < 0.3 && !a.removed);
    run(900);
    assert.ok(freed && a.removed && b.removed);
  });
});

test('a file that has not loaded yet is waited for; a file too short to crossfade loops on one player', () => {
  withClock(() => {
    const loop = new CrossfadeLoop(() => new FakePlayer(D, 2_000), 1);
    const [a, b] = FakePlayer.all;
    run(D * 1000 - 5_000, 1000);
    assert.ok(b.playing, 'the seam is still found once the duration is known');
    loop.release();
  });
  withClock(() => {
    const loop = new CrossfadeLoop(() => new FakePlayer(1), 1);
    const [a, b] = FakePlayer.all;
    run(500);
    assert.ok(a.loop && b.removed);
    run(5_000);
    assert.ok(a.playing);
    loop.release();
  });
});
