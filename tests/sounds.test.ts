import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DEFAULT_LISTEN_TIMER, LISTEN_FADE_OUT_MS, listenTimerFor, listenVolumeAt, SOUNDS, soundFor, timerLabel } from '../src/domain/sounds';

test('every sound plays one of the shipped, credited loops, each once', () => {
  const credits = readFileSync('assets/audio/CREDITS.md', 'utf8');
  for (const s of SOUNDS) {
    const file = `ambience-${s.bed}.wav`;
    assert.ok(existsSync(`assets/audio/${file}`), `${s.id}: ${file} missing`);
    assert.ok(credits.includes(file), `${s.id}: ${file} not credited`);
  }
  assert.equal(new Set(SOUNDS.map((s) => s.bed)).size, SOUNDS.length);
  assert.equal(new Set(SOUNDS.map((s) => s.id)).size, SOUNDS.length);
});

test('a stored sound or timer from any build falls back instead of breaking a listen', () => {
  assert.equal(soundFor('rain').id, 'rain');
  assert.equal(soundFor('hz432').id, 'rain');
  assert.equal(soundFor(undefined).id, 'rain');
  assert.equal(listenTimerFor(30), 30);
  assert.equal(listenTimerFor(0), 0);
  assert.equal(listenTimerFor(45), DEFAULT_LISTEN_TIMER);
  assert.equal(listenTimerFor('20'), DEFAULT_LISTEN_TIMER);
});

test('a listen rises gently, holds, and fades out before its timer ends', () => {
  assert.equal(listenVolumeAt(0, 20), 0);
  assert.ok(listenVolumeAt(1000, 20) > 0 && listenVolumeAt(1000, 20) < 1);
  assert.equal(listenVolumeAt(60_000, 20), 1);
  const end = 20 * 60_000;
  assert.ok(listenVolumeAt(end - LISTEN_FADE_OUT_MS / 2, 20) < 1);
  assert.equal(listenVolumeAt(end, 20), 0);
  // Until stopped: no fall, ever.
  assert.equal(listenVolumeAt(10 * 3_600_000, 0), 1);
  // A timer changed mid-listen counts from when it was set.
  assert.equal(listenVolumeAt(25 * 60_000, 10, 60_000), 1);
});

test('the timer reads plainly', () => {
  assert.equal(timerLabel(0), 'until you stop');
  assert.equal(timerLabel(20), '20 min left');
  assert.equal(timerLabel(20, 2.5 * 60_000), '18 min left');
  assert.equal(timerLabel(20, 19.5 * 60_000), 'fading out');
});

test('sounds are described as places, never as doing anything for pain or the body', () => {
  const claims = /heal|sooth|relie|pain|calm(s|ing) the|nervous system|frequenc|therap|reduce/i;
  for (const s of SOUNDS) assert.ok(!claims.test(`${s.name} ${s.line}`), `${s.id}: ${s.line}`);
});
