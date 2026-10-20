import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isNight, NEED_IT, needItOrder, needItSubtitle, todayMoments } from '../src/domain/presets';
import { practiceMinutes, programEndDay, PROGRAM_DAYS, type ProgramState } from '../src/domain/program';
import { whenToLookText } from '../src/domain/progress';
import { REMINDER_TIMES } from '../src/domain/reminderPlan';
import { FORBIDDEN_GUIDE_LANGUAGE } from '../src/domain/safety';
import { HOW_IT_WORKS, WELCOME_SAFETY_LINE, WELCOME_STOP_LINE } from '../src/domain/welcome';

/**
 * Today's "right now" (studio round 5): the moments say what starts and how long, the welcome's
 * focus leads, and at night "can't sleep" leads whatever the focus.
 */

const ids = (focus: Parameters<typeof needItOrder>[0], hour: number) => needItOrder(focus, hour).map((n) => n.id);

test('every moment says it is a voice, and how long', () => {
  assert.deepEqual(NEED_IT.map(needItSubtitle), ['voice-guided · 3 min', 'voice-guided into sleep · 10 min', 'voice-guided · 10 min', 'voice-guided · 5 min']);
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

/* Round 5 retest: by day the program comes back into view. */

const layout = (focus: Parameters<typeof todayMoments>[0], hour: number, practised: boolean) => {
  const m = todayMoments(focus, hour, practised);
  return { first: m.first.map((n) => n.id), more: m.more.map((n) => n.id) };
};

test('by day, before any practice: one moment, then the day, then the rest with "can’t sleep" last', () => {
  assert.deepEqual(layout(undefined, 10, false), { first: ['flare-3'], more: ['scan-10', 'worry-5', 'sleep-10'] });
  assert.deepEqual(layout('flare', 10, false), { first: ['flare-3'], more: ['scan-10', 'worry-5', 'sleep-10'] });
  assert.deepEqual(layout('fear', 14, false), { first: ['worry-5'], more: ['flare-3', 'scan-10', 'sleep-10'] });
  assert.deepEqual(layout('notice', 5, false), { first: ['scan-10'], more: ['flare-3', 'worry-5', 'sleep-10'] });
  // Someone who came about nights still gets their moment first, by day.
  assert.deepEqual(layout('sleep', 20, false), { first: ['sleep-10'], more: ['flare-3', 'scan-10', 'worry-5'] });
});

test('at night, or once anything is practiced today, every moment leads as before', () => {
  assert.deepEqual(layout('flare', 21, false), { first: ['sleep-10', 'flare-3', 'scan-10', 'worry-5'], more: [] });
  assert.deepEqual(layout(undefined, 2, false), { first: ids(undefined, 2), more: [] });
  assert.deepEqual(layout('fear', 10, true), { first: ids('fear', 10), more: [] });
  assert.deepEqual(layout(undefined, 23, true), { first: ids(undefined, 23), more: [] });
});

test('every moment appears exactly once, whatever the hour', () => {
  for (const focus of [undefined, 'flare', 'sleep', 'notice', 'fear'] as const)
    for (const h of [0, 5, 12, 20, 21])
      for (const p of [false, true]) {
        const m = layout(focus, h, p);
        assert.deepEqual([...m.first, ...m.more].sort(), NEED_IT.map((n) => n.id).sort());
      }
});

test('a day’s length: today’s choice, then the standing length, then the program', () => {
  assert.equal(practiceMinutes(7), 7);
  assert.equal(practiceMinutes(7, 5), 5);
  assert.equal(practiceMinutes(7, 5, 3), 3);
  assert.equal(practiceMinutes(7, undefined, 10), 10);
});

test('the end of the 28 days is an estimate from today, and nothing once they’re done', () => {
  const empty: ProgramState = { done: {}, read: [] };
  // Day 1 today: 27 more days after it.
  assert.equal(programEndDay(empty, '2026-10-20'), '2026-11-16');
  const eight: ProgramState = { done: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i + 1, `2026-10-0${i + 1}`])), read: [] };
  assert.equal(programEndDay(eight, '2026-10-20'), '2026-11-08');
  // Day 9 done today: the next opens tomorrow.
  const nineToday = { ...eight, done: { ...eight.done, 9: '2026-10-20' } };
  assert.equal(programEndDay(nineToday, '2026-10-20'), '2026-11-08');
  const all: ProgramState = { done: Object.fromEntries(Array.from({ length: PROGRAM_DAYS }, (_, i) => [i + 1, '2026-10-01'])), read: [] };
  assert.equal(programEndDay(all, '2026-10-20'), undefined);
});

test('"is this helping?" gets a when, never a reading of the record', () => {
  const text = whenToLookText({ done: {}, read: [] }, '2026-10-20');
  assert.equal(text, 'Change, if it comes, shows over weeks. Look again when your 28 days are done, around Nov 16.');
  const done: ProgramState = { done: Object.fromEntries(Array.from({ length: PROGRAM_DAYS }, (_, i) => [i + 1, '2026-10-01'])), read: [] };
  for (const t of [text, whenToLookText(done, '2026-10-20')]) {
    assert.doesNotMatch(t, /better|worse|improv|declin|%|streak|than last|less pain|lower|higher|↑|↓/i);
  }
});

test('the welcome’s note on stopping is plain app copy: nothing the guide may not say, no promised effect', () => {
  for (const line of [...HOW_IT_WORKS, WELCOME_SAFETY_LINE, WELCOME_STOP_LINE]) {
    for (const re of FORBIDDEN_GUIDE_LANGUAGE) assert.doesNotMatch(line, re, line);
    assert.doesNotMatch(line, /calmer|less pain|heal|relax/i, line);
  }
  assert.match(WELCOME_STOP_LINE, /open your eyes and stop/);
});

test('the welcome and Settings offer the same reminder times, night included', () => {
  assert.deepEqual(REMINDER_TIMES.map((t) => t.id), ['morning', 'midday', 'evening', 'night']);
  assert.deepEqual(REMINDER_TIMES.find((t) => t.id === 'night'), { id: 'night', label: 'night', hour: 22, minute: 0 });
});
