import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { FORBIDDEN_GUIDE_LANGUAGE } from '../src/domain/safety';
import {
  backgroundFor,
  DEFAULT_BACKGROUND,
  listenLevel,
  listenVolumeAt,
  LISTEN_FADE_IN_MS,
  SOUNDSCAPES,
  timerLabel,
} from '../src/domain/soundscapes';

const MIN = 60_000;

test('every soundscape has its audio file (AAC: the app makes the loop, voice/crossfadeLoop.ts)', () => {
  for (const s of SOUNDSCAPES) {
    const file = s.id === 'tone' ? 'assets/audio/tone-432.m4a' : `assets/audio/soundscapes/${s.id}.m4a`;
    assert.ok(existsSync(join(__dirname, '..', file)), `${s.id}: ${file}`);
  }
});

test('the sound under sessions: an explicit choice wins, and a tone turned off stays off', () => {
  assert.equal(backgroundFor({}), DEFAULT_BACKGROUND);
  assert.equal(backgroundFor({ ambience: true }), DEFAULT_BACKGROUND);
  assert.equal(backgroundFor({ ambience: false }), 'none');
  assert.equal(backgroundFor({ ambience: false, background: 'forest' }), 'forest');
  assert.equal(backgroundFor({ background: 'none' }), 'none');
  // Something stored by a later build that this one doesn't know falls back, not to silence-by-accident.
  assert.equal(backgroundFor({ background: 'birdsong' as never }), DEFAULT_BACKGROUND);
});

test('a timed listen rises slowly, holds, and fades to nothing by the end', () => {
  assert.equal(listenVolumeAt(0, 20), 0);
  assert.ok(listenVolumeAt(LISTEN_FADE_IN_MS / 2, 20) < 1);
  assert.equal(listenVolumeAt(10 * MIN, 20), 1);
  const late = [19 * MIN + 20_000, 19 * MIN + 40_000, 19 * MIN + 55_000].map((t) => listenVolumeAt(t, 20));
  assert.ok(late[0] > late[1] && late[1] > late[2], 'falls steadily');
  assert.equal(listenVolumeAt(20 * MIN, 20), 0);
  // No timer: plays on.
  assert.equal(listenVolumeAt(300 * MIN, 0), 1);
});

test('a timer changed mid-listen counts from when it was set, without a second fade-in', () => {
  assert.equal(listenVolumeAt(15 * MIN, 10, 1 * MIN), 1);
  assert.equal(listenVolumeAt(25 * MIN, 10, 10 * MIN), 0);
});

test('the timer reads plainly', () => {
  assert.equal(timerLabel(20, 2 * MIN), '18 min left');
  assert.equal(timerLabel(20, 19.5 * MIN), 'fading out');
  assert.equal(timerLabel(0, 99 * MIN), 'until you stop');
});

test('levels stay within range, and the copy makes no claim about the body', () => {
  for (const s of SOUNDSCAPES) {
    assert.ok(s.gain > 0 && s.gain * 0.18 <= 1, `${s.id} gain`);
    assert.ok(listenLevel(s) > 0 && listenLevel(s) <= 1);
    const copy = `${s.name}. ${s.line}`;
    assert.doesNotMatch(copy, /heal|pain|relie|therap|cure|calms? the nerv|reduc/i, s.id);
    for (const re of FORBIDDEN_GUIDE_LANGUAGE) assert.doesNotMatch(copy, re, s.id);
  }
});
