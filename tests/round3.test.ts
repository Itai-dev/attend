import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUIDE_SCRIPT } from '../server/lib/guideScript';
import { violatesGuideLanguage } from '../src/domain/safety';
import * as L from '../src/engine/guide/lines';
import { runSession } from './helpers';

/**
 * Safety review round 3 (18 Oct 2026): the arrival's doctor, emergency and "stop at any time"
 * lines are fixed in the app. A remote script can change every other word of the arrival, and
 * can't remove these or make them heard twice.
 */

const TYPES = ['notice', 'flare', 'sleep', 'fear'] as const;
const FEAR_DOCTOR = 'This practice is for a sensation you know. If this one is new, or different, stop here and contact a doctor.';
const FEAR_EMERGENCY = 'If it is sudden, or severe, call your local emergency number.';
const FLARE_DOCTOR = 'If this flare feels new, or different from your usual, stop here and contact a doctor.';
const FIRST = 'This practice is for pain you already know. If something is new, or different, stop and contact a doctor.';
const STOP = 'You can open your eyes, or stop, at any time.';
const FIXED = [FEAR_DOCTOR, FEAR_EMERGENCY, FLARE_DOCTOR, FIRST, STOP];

/** The arrival as heard: everything before the scan begins. */
async function arrival(type: (typeof TYPES)[number], opts: { firstSession?: boolean; seed?: number; mode?: 'guided' | 'conversation' } = {}) {
  const r = await runSession({}, { mode: opts.mode ?? 'guided', type, minutes: 5, place: { region: 'neck' }, seed: opts.seed, firstSession: opts.firstSession, maxTurns: 300 });
  const scan = r.spoken.findIndex((l) => /^Let's take a slow look/.test(l));
  assert.ok(scan > 0, `${type}: no scan`);
  return { spoken: r.spoken.slice(0, scan), all: r.spoken };
}

const count = (ls: string[], t: string) => ls.filter((l) => l === t).length;

test('the fixed lines are the reviewed words, in the guide’s voice, and not in the editable script', () => {
  assert.deepEqual([...L.ARRIVAL_SAFETY.fear.map(([t]) => t), L.ARRIVAL_SAFETY.flare[0], L.ARRIVAL_SAFETY.first[0], L.ARRIVAL_SAFETY.stop[0]], FIXED);
  for (const t of FIXED) {
    assert.ok(!violatesGuideLanguage(t), t);
    assert.doesNotMatch(t, /\?/, t);
  }
  const script = Object.values(GUIDE_SCRIPT.ARRIVE).flat(2).map(([t]) => t);
  for (const t of FIXED) assert.ok(!script.includes(t), `still in guideScript: ${t}`);
});

test('every arrival says once that you can open your eyes or stop, near its end', async () => {
  for (const type of TYPES) {
    for (const firstSession of [false, true]) {
      for (const mode of ['guided', 'conversation'] as const) {
        const { spoken, all } = await arrival(type, { firstSession, mode });
        const label = `${type}, first ${firstSession}, ${mode}`;
        assert.equal(count(all, STOP), 1, label);
        assert.ok(spoken.indexOf(STOP) >= spoken.length - 2, `${label}: ${spoken.join(' / ')}`);
      }
    }
  }
});

test('worried: the doctor and the emergency line, once each, before the scan', async () => {
  for (const seed of [1, 2, 3]) {
    const { spoken, all } = await arrival('fear', { seed });
    assert.equal(count(all, FEAR_DOCTOR), 1);
    assert.equal(count(all, FEAR_EMERGENCY), 1);
    assert.ok(spoken.indexOf(FEAR_DOCTOR) < spoken.indexOf(FEAR_EMERGENCY));
    // Its own doctor line covers the first session: never two doctor lines.
    assert.equal(count((await arrival('fear', { seed, firstSession: true })).all, FIRST), 0);
  }
});

test('a flare: the doctor line comes second, before anything invites staying with it', async () => {
  const { spoken, all } = await arrival('flare');
  assert.equal(spoken[1], FLARE_DOCTOR);
  assert.ok(spoken.indexOf(FLARE_DOCTOR) < spoken.indexOf("You don't have to make anything go away right now."));
  assert.equal(count(all, FLARE_DOCTOR), 1);
  assert.equal(count((await arrival('flare', { firstSession: true })).all, FIRST), 0);
});

test('the first session ever says what the practice is for, once; later sessions do not', async () => {
  for (const type of ['notice', 'sleep'] as const) {
    const first = await arrival(type, { firstSession: true });
    assert.equal(count(first.all, FIRST), 1, type);
    assert.equal(first.spoken[1], FIRST, type);
    assert.equal(count((await arrival(type)).all, FIRST), 0, type);
  }
});

test('a remote script whose arrival lacks the safety lines still speaks them; one that has them speaks each once', async () => {
  const lacking = JSON.parse(JSON.stringify(GUIDE_SCRIPT));
  for (const t of TYPES) lacking.ARRIVE[t] = [[['Arrive here, slowly.', 4000], ['Let your eyes close.', 4000]]];
  // An older server copy, from before the lines moved into the app: each one is still heard once.
  const stale = JSON.parse(JSON.stringify(GUIDE_SCRIPT));
  for (const t of TYPES) stale.ARRIVE[t] = [[['Arrive here, slowly.', 4000], ...FIXED.map((x) => [x, 4000]), ['Let your eyes close.', 4000]]];
  try {
    for (const script of [lacking, stale]) {
      assert.deepEqual(L.applyScript(script), []);
      for (const type of TYPES) {
        for (const firstSession of [false, true]) {
          const { spoken, all } = await arrival(type, { firstSession });
          const label = `${script === stale ? 'stale' : 'lacking'} ${type}, first ${firstSession}`;
          assert.equal(spoken[0], 'Arrive here, slowly.', label);
          const expected = type === 'fear' ? [FEAR_DOCTOR, FEAR_EMERGENCY, STOP] : type === 'flare' ? [FLARE_DOCTOR, STOP] : firstSession ? [FIRST, STOP] : [STOP];
          for (const t of FIXED) assert.equal(count(all, t), expected.includes(t) ? 1 : 0, `${label}: ${t}`);
        }
      }
    }
  } finally {
    L.resetScript();
  }
});

test('the agent’s first message replaces the opening line, never a safety line', async () => {
  try {
    assert.ok(L.applyOpening('flare', 'Arriving now.'));
    const { spoken } = await arrival('flare');
    assert.equal(spoken[0], 'Arriving now.');
    assert.equal(spoken[1], FLARE_DOCTOR);
  } finally {
    L.resetScript();
  }
});

test('the body scan names no place people check, and offers a way out if attention makes it louder', () => {
  const lines = GUIDE_SCRIPT.SCAN_BODY.flat().map(([t]) => t);
  for (const t of lines) assert.doesNotMatch(t, /breastbone|throat/i, t);
  assert.ok(lines.includes('The ribs, resting.'));
  assert.ok(lines.includes('The back of the neck, the sides.'));
  assert.ok(GUIDE_SCRIPT.SCAN_BODY[6].some(([t]) => t === 'If attention makes anything louder, open your eyes and look around the room.'));
});

test('the fear theme lets the fear be, without sending attention to look for it', () => {
  const fear = GUIDE_SCRIPT.GUIDED_THEMES.fear.flat().map(([t]) => t);
  assert.ok(fear.includes('Let the fear be here too, without looking for it.'));
  for (const t of fear) assert.doesNotMatch(t, /where in the body/i, t);
});

test('the step-back lines move attention out, to the hands or the room', () => {
  const flare = GUIDE_SCRIPT.GUIDED_THEMES.flare.flat().map(([t]) => t);
  assert.ok(flare.includes('If this is too much, let attention move to your hands, or the sounds in the room.'));
  assert.ok(GUIDE_SCRIPT.GUIDED_OBSERVE.flat().some(([t]) => t === 'If a sensation gets too loud, let attention move to your hands, or the sounds in the room.'));
});
