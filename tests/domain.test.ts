import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extract } from '../src/domain/extract';
import { analyzeJourney } from '../src/domain/journey';
import { buildRecap } from '../src/domain/recap';
import { speakPlace, labelPlace } from '../src/domain/regions';
import { screen, violatesGuideLanguage } from '../src/domain/safety';
import { EMPTY_SIGNALS } from '../src/domain/types';
import { buildSampleSessions } from '../src/data/seed';
import * as L from '../src/engine/guide/lines';
import { compositeMap, fieldsFor, MAX_FIELDS, xFor } from '../src/viz/bodyUniforms';

test('extract: place, side and word from a natural sentence', () => {
  const o = extract('My neck feels really tight on the left side.');
  assert.equal(o.regions[0].region, 'neck');
  assert.equal(o.regions[0].side, 'left');
  assert.deepEqual(o.descriptors, ['tight']);
});

test('extract: movement with a direction and a destination', () => {
  const o = extract('It kind of moves upward toward the back of my head.');
  assert.equal(o.movement?.type, 'moving');
  assert.equal(o.movement?.direction, 'up');
  assert.equal(o.movement?.destination?.region, 'head_back');
});

test('extract: "doesn\'t move" is stillness, not movement', () => {
  assert.equal(extract("It doesn't move at all.").movement?.type, 'static');
  assert.equal(extract('It stays in the same place.').movement?.type, 'static');
});

test('extract: negation keeps a word out', () => {
  const o = extract("It's not sharp, more of an ache.");
  assert.ok(o.negatedDescriptors.includes('sharp'));
  assert.ok(o.descriptors.includes('aching'));
  assert.ok(!o.descriptors.includes('sharp'));
});

test('extract: a side belongs to its own clause', () => {
  const o = extract('My neck, and my left knee.');
  const neck = o.regions.find((r) => r.region === 'neck');
  const knee = o.regions.find((r) => r.region === 'knee');
  assert.equal(neck?.side, undefined);
  assert.equal(knee?.side, 'left');
});

test('extract: "right now" is not the right side', () => {
  const o = extract('My shoulder is tight right now.');
  assert.equal(o.regions[0].side, undefined);
});

test('extract: commands are recognised only as short utterances', () => {
  assert.equal(extract('pause').command, 'pause');
  assert.equal(extract('Sorry?').command, 'repeat');
  assert.equal(extract("I'm done for today, I want to stop the session").command, 'stop');
  assert.equal(extract('Wait, it moved up into my head and it feels warm').command, undefined);
});

test('safety: crisis, urgent, check and none', () => {
  assert.equal(screen(extract("Honestly I just want to die")).level, 'crisis');
  assert.equal(screen(extract("I have chest pain and I can't breathe")).level, 'urgent');
  assert.equal(screen(extract("This is a new pain, I've never felt this before")).level, 'check');
  assert.equal(screen(extract('It suddenly softened a little.')).level, 'none');
  assert.equal(screen(extract('My neck is tight, the usual.')).level, 'none');
});

test('guide language: every fixed line passes the guard', () => {
  const texts: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') texts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(L);
  assert.ok(texts.length > 80);
  for (const t of texts) assert.equal(violatesGuideLanguage(t), false, t);
});

test('guide language: the guard catches what the guide must never say', () => {
  for (const bad of ['Nothing is wrong with your neck.', "You're completely safe.", 'Thank you for sharing that.', 'Great job!', 'This is harmless.', 'I hear you.']) {
    assert.equal(violatesGuideLanguage(bad), true, bad);
  }
});

test('regions: how places are said', () => {
  assert.equal(speakPlace('neck', 'left'), 'the left side of your neck');
  assert.equal(speakPlace('shoulder', 'left'), 'your left shoulder');
  assert.equal(speakPlace('knee', 'bilateral'), 'both knees');
  assert.equal(speakPlace('head_back'), 'the back of your head');
  assert.equal(labelPlace('neck', 'left'), 'left side of the neck');
  assert.equal(labelPlace('shoulder', 'right'), 'right shoulder');
});

test('recap: nothing changed is said plainly, with no improvement', () => {
  const s = { id: 'a', region: 'lower_back' as const, side: 'center' as const, descriptors: ['heavy'], userLanguage: [], primary: true, movement: { type: 'static' as const } };
  const r = buildRecap({
    sessionType: 'notice',
    outcome: 'completed',
    bodyMapStart: { sensations: [s] },
    bodyMapEnd: { sensations: [s] },
    changes: [{ sensationId: 'a', type: 'stable', description: '', fromState: {}, toState: {} }],
    signals: { ...EMPTY_SIGNALS, observedSeconds: 200 },
  });
  assert.equal(r.title, 'The sensation stayed mostly the same today.');
  assert.match(r.summary, /several minutes without needing to change it/);
  assert.doesNotMatch(r.summary + r.title + r.oneLiner, /soft|less|better|improv|eas/i);
});

test('recap: a safety pause never describes or reinterprets the sensation', () => {
  const r = buildRecap({ sessionType: 'notice', outcome: 'safety_pause', bodyMapStart: { sensations: [] }, bodyMapEnd: { sensations: [] }, changes: [], signals: EMPTY_SIGNALS });
  assert.match(r.summary, /doctor|medical/);
  assert.doesNotMatch(r.summary, /safe\b|harmless|nothing to worry/);
});

test('journey: the sample story produces evidence-backed insights, and none from too little', () => {
  const samples = buildSampleSessions(Date.UTC(2026, 9, 3));
  const a = analyzeJourney(samples, Date.UTC(2026, 9, 3));
  const ids = a.insights.map((i) => i.id);
  assert.ok(ids.includes('variability'), ids.join());
  assert.ok(ids.includes('acceptance'), ids.join());
  for (const i of a.insights) assert.match(i.evidence, /\d/);
  const few = analyzeJourney(samples.slice(0, 2));
  assert.equal(few.insights.length, 0);
  assert.ok(few.placeholder);
});

test('journey: no score is ever produced', () => {
  const a = analyzeJourney(buildSampleSessions());
  for (const i of a.insights) assert.doesNotMatch(i.text, /%|score|\/10|out of/);
});

test('body map: front and back mirror the sides', () => {
  assert.ok(xFor('shoulder', 'left', 'front')[0] > 0);
  assert.ok(xFor('shoulder', 'left', 'back')[0] < 0);
  assert.equal(xFor('shoulder', 'bilateral', 'front').length, 2);
  assert.deepEqual(xFor('neck', undefined, 'back'), [0]);
});

test('body map: never more fields than the shader holds', () => {
  const comp = compositeMap(buildSampleSessions());
  const sensations = Array.from({ length: 9 }, (_, i) => ({ id: String(i), region: 'knee' as const, side: 'bilateral' as const, descriptors: [], userLanguage: [] }));
  assert.ok(fieldsFor({ sensations }, 'front').length <= MAX_FIELDS);
  assert.ok(comp.map.sensations.length <= MAX_FIELDS);
});

test('3D figure: sensations sit inside the body at their depth, every side in sight', async () => {
  const { fieldsFor3d, bodyUniforms, zFor } = await import('../src/viz/bodyUniforms');
  // Felt on the front → toward the front; in the back → toward the back; all through → the centre.
  assert.ok(zFor('throat') > 0);
  assert.ok(zFor('lower_back') < 0);
  assert.equal(zFor('shoulder'), 0);
  assert.equal(zFor('whole_body'), 0);
  // Never on or past the skin: within the shallowest depth of the figure.
  for (const r of ['throat', 'lower_back', 'eye', 'forehead', 'upper_back', 'neck'] as const) assert.ok(Math.abs(zFor(r)) <= 0.034, r);

  const back = { id: 'a', region: 'lower_back', side: 'left', descriptors: ['tight'], primary: true } as never;
  const front = { id: 'b', region: 'throat', descriptors: ['tight'] } as never;
  const fields = fieldsFor3d({ sensations: [back, front] });
  // Both drawn at full strength: the figure turns, so the back is not "the other side".
  assert.ok(fields.every((f) => f.a[3] > 0.5), JSON.stringify(fields.map((f) => f.a[3])));
  assert.ok(fields[0].z![0] < 0 && fields[1].z![0] > 0);
  // Only the 3D shader gets depth uniforms; the flat one would reject them.
  assert.ok('uZ0' in bodyUniforms(fields, { depth: true }));
  assert.ok(!('uZ0' in bodyUniforms(fields)));
});
