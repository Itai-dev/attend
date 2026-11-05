import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SOUNDS, soundById, sounds } from '../src/domain/sounds';
import { setLang } from '../src/i18n';

test('nature sounds: one per recording, and none claims to do anything for pain', () => {
  assert.equal(new Set(SOUNDS.map((s) => s.id)).size, SOUNDS.length);
  for (const s of SOUNDS) {
    assert.equal(soundById(s.id), s);
    assert.ok(!/\b(pain|heal\w*|relie\w*|cure\w*|therap\w*|soothes?)\b/i.test(`${s.title} ${s.detail}`), s.title);
  }
});

test('in Hebrew the sounds are named in Hebrew, and still claim nothing', () => {
  setLang('he');
  try {
    const he = sounds();
    assert.deepEqual(he.map((s) => s.id), SOUNDS.map((s) => s.id));
    for (const s of he) {
      assert.deepEqual(soundById(s.id), s);
      for (const t of [s.title, s.detail, s.place]) assert.match(t, /[א-ת]/, t);
      assert.ok(!/(כאב|ריפוי|מרפא|הקלה|טיפול|תרפי|מרגיע)/.test(`${s.title} ${s.detail}`), s.title);
    }
  } finally {
    setLang('en');
  }
  assert.equal(soundById('notice')?.title, 'Mountain stream');
});
