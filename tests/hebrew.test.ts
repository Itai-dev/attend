import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUIDE_SCRIPT } from '../server/lib/guideScript';
import { GUIDE_SCRIPT_HE } from '../server/lib/guideScript.he';
import { hePlace } from '../src/domain/regions';
import { violatesGuideLanguage } from '../src/domain/safety';
import { applyScript, resetScript } from '../src/engine/guide/lines';
import { setLang } from '../src/i18n';
import { runSession } from './helpers';

const LOWER_BACK = { region: 'lower_back', side: 'center' } as const;
const LEFT_SHOULDER = { region: 'shoulder', side: 'left' } as const;

async function inHebrew<T>(run: () => Promise<T> | T): Promise<T> {
  setLang('he');
  resetScript();
  try {
    return await run();
  } finally {
    setLang('en');
    resetScript();
  }
}

function texts(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap((x) => (Array.isArray(x) && typeof x[1] === 'number' ? [String(x[0])] : texts(x)));
  if (v && typeof v === 'object') return Object.values(v).flatMap(texts);
  return [];
}

test('the Hebrew script has every section the English one has, in the same shape', () => {
  const shape = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(shape) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v;
  // Same keys, same nesting; variant counts may differ only inside a bank.
  assert.deepEqual(Object.keys(GUIDE_SCRIPT_HE).sort(), Object.keys(GUIDE_SCRIPT).sort());
  assert.deepEqual(Object.keys(GUIDE_SCRIPT_HE.GUIDED_THEMES).sort(), Object.keys(GUIDE_SCRIPT.GUIDED_THEMES).sort());
  assert.deepEqual(shape(GUIDE_SCRIPT_HE.CLOSE), shape(GUIDE_SCRIPT.CLOSE));
  // A remote copy of the Hebrew script is accepted whole by the Hebrew app.
  assert.deepEqual(
    (() => {
      setLang('he');
      try {
        return applyScript(JSON.parse(JSON.stringify(GUIDE_SCRIPT_HE)));
      } finally {
        setLang('en');
        resetScript();
      }
    })(),
    [],
  );
});

test('every Hebrew line is Hebrew, spoken-ready, and in the guide’s voice', () => {
  for (const t of texts(GUIDE_SCRIPT_HE)) {
    if (!t) continue;
    assert.ok(/[א-ת]/.test(t), t);
    const unquoted = t.replace(/\{\w+\}/g, '').replace(/"[^"]*"/g, '');
    assert.doesNotMatch(unquoted, /[A-Za-z]/, `English inside a Hebrew line: ${t}`);
    assert.doesNotMatch(t, /\d/, `digits are read badly aloud: ${t}`);
    assert.doesNotMatch(t, /[א-ת]\/[א-ת]/, `slash gender form: ${t}`);
    assert.doesNotMatch(t, /(^|\s)[בלמ]\{(place|usual|dest)\}/, `a prefix would swallow the place's article: ${t}`);
    assert.doesNotMatch(t, /(^|\s)(אני|אנוכי) /, `the guide has no first person: ${t}`);
    assert.ok(!violatesGuideLanguage(t), t);
  }
});

test('the Hebrew guard catches what the English one does', () => {
  for (const bad of ['אתם בטוחים לגמרי.', 'אין שום דבר לא בסדר.', 'זה רק במוח.', 'זה לא מסוכן.', 'כל הכבוד.', 'תודה ששיתפתם.', 'אני שומע אתכם.'])
    assert.ok(violatesGuideLanguage(bad), bad);
  for (const fine of ['תנו לנשימה להיות קלה.', 'שימו לב לחדר שסביבכם.', 'כשתרצו, פקחו את העיניים.']) assert.ok(!violatesGuideLanguage(fine), fine);
});

test('Hebrew places are definite, agree in gender, and never possessive', () => {
  assert.equal(hePlace('shoulder', 'left'), 'הכתף השמאלית');
  assert.equal(hePlace('elbow', 'right'), 'המרפק הימני');
  assert.equal(hePlace('hand', 'left'), 'כף היד השמאלית');
  assert.equal(hePlace('wrist', 'left'), 'פרק היד השמאלי');
  assert.equal(hePlace('knee', 'bilateral'), 'שתי הברכיים');
  assert.equal(hePlace('neck', 'right'), 'הצד הימני של הצוואר');
  assert.equal(hePlace('lower_back', 'center'), 'מרכז הגב התחתון');
  assert.equal(hePlace('whole_body'), 'כל הגוף');
});

test('a Hebrew guided session is spoken in Hebrew from the gong to the end', async () => {
  for (const type of ['notice', 'flare', 'sleep', 'fear'] as const) {
    for (const place of [LOWER_BACK, LEFT_SHOULDER, undefined]) {
      const r = await inHebrew(() => runSession({}, { mode: 'guided', type, place, minutes: 10, maxTurns: 200 }));
      assert.equal(r.asks.length, 0);
      assert.equal(r.session.outcome, 'completed');
      for (const l of r.spoken) {
        assert.ok(/[א-ת]/.test(l), `${type}: not Hebrew: ${l}`);
        assert.doesNotMatch(l, /[A-Za-z{}]/, `${type}: English or an unfilled slot: ${l}`);
        assert.ok(!violatesGuideLanguage(l), l);
      }
      if (place === LEFT_SHOULDER) assert.match(r.spoken.join(' '), /הכתף השמאלית/);
      assert.match(r.spoken[r.spoken.length - 1], /פקחו את העיניים|רק לנוח/);
    }
  }
});

test('switching back to English restores the English words', async () => {
  await inHebrew(() => undefined);
  const r = await runSession({}, { mode: 'guided', place: LOWER_BACK, minutes: 3, maxTurns: 200 });
  assert.match(r.spoken[0], /[A-Za-z]/);
});

test('a Hebrew app keeps its own words when a server sends the English script', async () => {
  const r = await inHebrew(async () => {
    const rejected = applyScript(JSON.parse(JSON.stringify(GUIDE_SCRIPT)));
    const s = await runSession({}, { mode: 'guided', place: LOWER_BACK, minutes: 3, maxTurns: 200 });
    return { rejected, spoken: s.spoken };
  });
  assert.ok(r.rejected.includes('ARRIVE') && r.rejected.includes('CLOSE'), r.rejected.join());
  for (const l of r.spoken) assert.doesNotMatch(l, /[A-Za-z]/, l);
});
