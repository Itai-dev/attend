import assert from 'node:assert/strict';
import { test } from 'node:test';
import { goals, localGoal } from '../src/domain/goals';
import { setLang } from '../src/i18n';

test('a goal chip reads in the app’s language, and own words stay as typed', () => {
  setLang('he');
  try {
    assert.equal(localGoal('Working without breaks'), 'יום עבודה מלא');
    assert.equal(localGoal('יום עבודה מלא'), 'יום עבודה מלא');
    assert.equal(localGoal('לשחק טניס עם אבא'), 'לשחק טניס עם אבא');
    assert.equal(goals().length, 6);
  } finally {
    setLang('en');
  }
  assert.equal(localGoal('יום עבודה מלא'), 'Working without breaks');
  assert.equal(localGoal(undefined), undefined);
});
