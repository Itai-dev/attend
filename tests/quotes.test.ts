import assert from 'node:assert/strict';
import test from 'node:test';
import { QUOTES, quoteFor, quotes } from '../src/domain/quotes';
import { violatesGuideLanguage } from '../src/domain/safety';
import { setLang } from '../src/i18n';

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

test('the Hebrew quotes are the same quotes, in Hebrew, and keep the same rules', () => {
  setLang('he');
  try {
    const he = quotes();
    assert.equal(he.length, QUOTES.length);
    for (const q of he) {
      assert.ok(/[א-ת]/.test(q.text) && /[א-ת]/.test(q.by), q.text);
      assert.doesNotMatch(q.text, /[A-Za-z]/, q.text);
      assert.doesNotMatch(q.text, /[א-ת]\/[א-ת]/, `slash gender form: ${q.text}`);
      assert.ok(!violatesGuideLanguage(q.text), q.text);
      assert.ok(!/(כאב|כואב|ריפוי|מרפא|להחלים|החלמה|בטוח|הקלה|טוב יותר|גרוע|תסמין|סימפטום)/.test(q.text), q.text);
    }
    // A session shows the same quote in either language.
    const i = he.indexOf(quoteFor('se_abc'));
    setLang('en');
    assert.equal(QUOTES.indexOf(quoteFor('se_abc')), i);
  } finally {
    setLang('en');
  }
});
