import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SOUNDS, soundById } from '../src/domain/sounds';

test('nature sounds: one per recording, and none claims to do anything for pain', () => {
  assert.equal(new Set(SOUNDS.map((s) => s.id)).size, SOUNDS.length);
  for (const s of SOUNDS) {
    assert.equal(soundById(s.id), s);
    assert.ok(!/\b(pain|heal\w*|relie\w*|cure\w*|therap\w*|soothes?)\b/i.test(`${s.title} ${s.detail}`), s.title);
  }
});
