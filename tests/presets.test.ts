import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUIDE_VOICES } from '../src/config';
import { PRESET_CATEGORIES, PRESETS, presetById, presetCategories, presets, recommendedPreset, SESSION_VOICES, voiceFor } from '../src/domain/presets';
import { violatesGuideLanguage } from '../src/domain/safety';
import { SESSION_LENGTHS } from '../src/engine/phases';
import { nextStep, WELCOME } from '../src/domain/welcome';
import { setLang } from '../src/i18n';

test('every preset speaks in a voice the app offers, at a length the engine plans for', () => {
  const voices = new Map<string, string>(GUIDE_VOICES.map((v) => [v.id, v.name]));
  for (const p of PRESETS) {
    assert.equal(voices.get(p.voiceId), p.voiceName, `${p.id}: voice`);
    assert.ok((SESSION_LENGTHS as readonly number[]).includes(p.minutes), `${p.id}: length`);
  }
  assert.equal(new Set(PRESETS.map((p) => p.id)).size, PRESETS.length);
});

test('every session of one type speaks in that type’s voice', () => {
  for (const p of PRESETS) assert.equal(p.voiceId, SESSION_VOICES[p.type].voiceId, p.id);
  assert.equal(new Set(Object.values(SESSION_VOICES).map((v) => v.voiceId)).size, 4);
  assert.equal(voiceFor('sleep'), SESSION_VOICES.sleep.voiceId);
  assert.equal(voiceFor('sleep', { flare: 'x' }), SESSION_VOICES.sleep.voiceId);
  assert.equal(voiceFor('flare', { flare: 'x' }), 'x');
});

test('every category has sessions, and every session type is offered', () => {
  for (const c of PRESET_CATEGORIES) assert.ok(PRESETS.some((p) => p.category === c.id), c.id);
  for (const t of ['notice', 'flare', 'sleep', 'fear'] as const) assert.ok(PRESETS.some((p) => p.type === t), t);
});

test('Today offers the welcome’s focus and length, in the voice chosen there', () => {
  const p = recommendedPreset({ focus: 'sleep', minutes: 3, voiceId: 'nPczCjzI2devNBz1zQrb' });
  assert.equal(p.type, 'sleep');
  assert.equal(p.minutes, 3);
  assert.equal(p.voiceName, 'Brian');
  // "Let each session choose": the preset's own voice.
  assert.equal(recommendedPreset({ focus: 'flare', minutes: 5, voiceId: 'later' }).voiceName, 'Brian');
  assert.equal(recommendedPreset({}).type, 'notice');
});

test('preset and welcome copy keeps the guide’s rules: no cheerleading, no certainty, no scales', () => {
  const lines = [
    ...PRESETS.flatMap((p) => [p.title, p.blurb]),
    ...WELCOME.flatMap((s) => [...s.say, ...('choices' in s ? s.choices.map((c) => c.label) : [])]),
  ];
  for (const l of lines) {
    assert.ok(!violatesGuideLanguage(l), l);
    assert.ok(!/\b(score|rate|rating|scale|difficult|streak|\d+ ?%)\b/i.test(l), l);
  }
});

test('the welcome asks each thing once, in order, and always ends on the safety note', () => {
  const seen: string[] = [];
  let a = {};
  const fills = [{ focus: 'notice' }, { minutes: 5 }, { voice: 'later' }, { understood: true }];
  seen.push(nextStep(a, false)!.id);
  for (const f of fills) {
    seen.push(nextStep(a, true)!.id);
    a = { ...a, ...f };
  }
  assert.deepEqual(seen, ['intro', 'focus', 'minutes', 'voice', 'safety']);
  assert.equal(nextStep(a, true), undefined);
});

test('in Hebrew every session and shelf has Hebrew words, under the same rules', () => {
  setLang('he');
  try {
    const he = presets();
    assert.deepEqual(he.map((p) => [p.id, p.type, p.minutes, p.voiceId]), PRESETS.map((p) => [p.id, p.type, p.minutes, p.voiceId]));
    const lines = [...he.flatMap((p) => [p.title, p.blurb]), ...presetCategories().flatMap((c) => [c.title, c.detail])];
    for (const l of lines) {
      assert.match(l, /[א-ת]/, l);
      assert.doesNotMatch(l, /[A-Za-z]/, l);
      assert.doesNotMatch(l, /[א-ת]\/[א-ת]/, `slash gender form: ${l}`);
      assert.ok(!violatesGuideLanguage(l), l);
      assert.ok(!/(ציון|דירוג|סולם|רצף|קשה|\d+ ?%)/.test(l), l);
    }
    assert.equal(presetById('sleep-5')?.title, he.find((p) => p.id === 'sleep-5')?.title);
    assert.match(recommendedPreset({ focus: 'flare', minutes: 3 }).title, /[א-ת]/);
  } finally {
    setLang('en');
  }
  assert.equal(presetById('sleep-5')?.title, 'Lights out');
});
