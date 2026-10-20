import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isNight, NEED_IT, needItOrder, needItSubtitle } from '../src/domain/presets';

/**
 * Today's "right now" (studio round 5): the moments say what starts and how long, the welcome's
 * focus leads, and at night "can't sleep" leads whatever the focus.
 */

const ids = (focus: Parameters<typeof needItOrder>[0], hour: number) => needItOrder(focus, hour).map((n) => n.id);

test('every moment says it is a voice, and how long', () => {
  assert.deepEqual(NEED_IT.map(needItSubtitle), ['voice-guided · 3 min', 'guided into sleep · 10 min', 'voice-guided · 10 min', 'voice-guided · 5 min']);
});

test('night is 21:00 to 05:00', () => {
  for (const h of [21, 22, 23, 0, 1, 4]) assert.ok(isNight(h), String(h));
  for (const h of [5, 8, 12, 17, 20]) assert.ok(!isNight(h), String(h));
});

test('by day the welcome focus leads, then the usual order', () => {
  assert.deepEqual(ids(undefined, 10), ['flare-3', 'sleep-10', 'scan-10', 'worry-5']);
  assert.deepEqual(ids('fear', 10), ['worry-5', 'flare-3', 'sleep-10', 'scan-10']);
  assert.deepEqual(ids('notice', 10), ['scan-10', 'flare-3', 'sleep-10', 'worry-5']);
});

test('at night "can’t sleep" leads, then the focus', () => {
  assert.deepEqual(ids(undefined, 22), ['sleep-10', 'flare-3', 'scan-10', 'worry-5']);
  assert.deepEqual(ids('fear', 23), ['sleep-10', 'worry-5', 'flare-3', 'scan-10']);
  assert.deepEqual(ids('sleep', 2), ['sleep-10', 'flare-3', 'scan-10', 'worry-5']);
  assert.equal(needItOrder('flare', 1).length, NEED_IT.length);
});
