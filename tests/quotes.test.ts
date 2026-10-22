import assert from 'node:assert/strict';
import test from 'node:test';
import { QUOTES, quoteFor } from '../src/domain/quotes';
import { violatesGuideLanguage } from '../src/domain/safety';

test('closing quotes say nothing about pain, healing or safety, and nothing the guide may not say', () => {
  for (const q of QUOTES) {
    assert.ok(!violatesGuideLanguage(q.text), q.text);
    assert.ok(!/\b(pain|hurt|heal\w*|cure\w*|safe|relief|better|worse|symptom\w*)\b/i.test(q.text), q.text);
    assert.ok(q.by.trim().length > 0, `no attribution: ${q.text}`);
  }
});

test('a session keeps its quote', () => {
  assert.deepEqual(quoteFor('se_abc'), quoteFor('se_abc'));
  const seen = new Set(Array.from({ length: 40 }, (_, i) => quoteFor(`se_${i}`).text));
  assert.ok(seen.size > 3);
});
