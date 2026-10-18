import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ALWAYS_FREE_PRESETS,
  canCheckIn,
  canListen,
  canStartDay,
  canStartPreset,
  DEFAULT_PLAN,
  entitlementFrom,
  lockedReason,
  longDate,
  NO_PLUS,
  PAYWALL_HEADING,
  PAYWALL_LEGAL,
  PAYWALL_LINES,
  paywallBody,
  PLANS,
  PLUS_ENABLED,
  presetDetail,
  PURCHASE_COPY,
  trialTimeline,
  WEEK_ONE_PRESETS,
  type Entitlement,
} from '../src/domain/access';
import { PROGRAM_DAYS } from '../src/domain/program';
import { NEED_IT, PRESETS } from '../src/domain/presets';
import { violatesGuideLanguage } from '../src/domain/safety';
import { purchase, redeemCode, restore } from '../src/voice/purchases';

const ON = { enabled: true };
const PLUS: Entitlement = { plus: true, plan: 'yearly' };
const DAYS = Array.from({ length: PROGRAM_DAYS }, (_, i) => i + 1);

test('the app ships with Plus off, and with it off everything is allowed', () => {
  assert.equal(PLUS_ENABLED, false);
  for (const d of DAYS) assert.ok(canStartDay(d, NO_PLUS), `day ${d}`);
  for (const p of PRESETS) for (const day of [1, 8, 28]) assert.ok(canStartPreset(p.id, NO_PLUS, day, { daysSinceStart: 40 }), `${p.id} on day ${day}`);
  assert.equal(lockedReason(8, NO_PLUS), null);
  assert.equal(presetDetail('sleep-10', NO_PLUS, 20), '10 min');
});

test('with Plus on, days 1–7 are free forever and days 8–28 need Plus', () => {
  for (const d of DAYS) assert.equal(canStartDay(d, NO_PLUS, ON), d <= 7, `day ${d}`);
  for (const d of DAYS) assert.ok(canStartDay(d, PLUS, ON), `day ${d} with Plus`);
});

test('the flare practice is never locked', () => {
  for (const id of ['flare-3', 'flare-5']) {
    assert.ok(ALWAYS_FREE_PRESETS.includes(id));
    for (const day of [1, 7, 8, 28]) assert.ok(canStartPreset(id, NO_PLUS, day, { ...ON, daysSinceStart: 90 }), `${id} on day ${day}`);
  }
  const flare = NEED_IT.find((n) => n.label === 'in a flare')!;
  assert.equal(presetDetail(flare.id, NO_PLUS, 20, ON), '3 min');
});

test('nobody meets a paywall in Week 1: every one-tap practice is open until Day 8', () => {
  for (const id of ['sleep-10', 'scan-10', 'worry-5']) {
    assert.ok(WEEK_ONE_PRESETS.includes(id), id);
    for (const day of [1, 4, 7]) assert.ok(canStartPreset(id, NO_PLUS, day, ON), `${id} on day ${day}`);
    assert.equal(canStartPreset(id, NO_PLUS, 8, ON), false, `${id} on day 8`);
    assert.ok(canStartPreset(id, PLUS, 20, ON), `${id} with Plus`);
  }
  // Every preset is either always free or open in Week 1: none is locked from the first hour.
  for (const p of PRESETS) assert.ok(ALWAYS_FREE_PRESETS.includes(p.id) || WEEK_ONE_PRESETS.includes(p.id), p.id);
  for (const p of PRESETS) assert.ok(canStartPreset(p.id, NO_PLUS, 1, { ...ON, daysSinceStart: 0 }), p.id);
});

test('the free week also ends seven days after starting, whichever comes first', () => {
  assert.ok(canStartPreset('sleep-10', NO_PLUS, 3, { ...ON, daysSinceStart: 6 }));
  assert.equal(canStartPreset('sleep-10', NO_PLUS, 3, { ...ON, daysSinceStart: 7 }), false);
  // The program days themselves stay free whenever they're done.
  assert.ok(canStartDay(3, NO_PLUS, { ...ON, daysSinceStart: 30 }));
});

test('sounds and the pain record are never behind a purchase', () => {
  assert.equal(canListen(), true);
  assert.equal(canCheckIn(), true);
});

test('the locked copy for Today and its rows', () => {
  assert.equal(lockedReason(7, NO_PLUS, ON), null);
  assert.equal(lockedReason(8, NO_PLUS, ON), 'week 2 · notice — continues with Plus');
  assert.equal(lockedReason(15, NO_PLUS, ON), 'week 3 · soften — continues with Plus');
  assert.equal(lockedReason(28, NO_PLUS, ON), 'week 4 · live — continues with Plus');
  assert.equal(lockedReason(8, PLUS, ON), null);
  assert.equal(presetDetail('sleep-10', NO_PLUS, 8, ON), '10 min · Plus');
  assert.equal(presetDetail('sleep-10', NO_PLUS, 3, ON), '10 min');
});

test('the entitlement comes from the stored record, and a lapse is simply no Plus', () => {
  const now = Date.UTC(2026, 9, 18);
  assert.deepEqual(entitlementFrom(undefined, now), NO_PLUS);
  assert.deepEqual(entitlementFrom({}, now), NO_PLUS);
  assert.equal(entitlementFrom({ plus: { plan: 'lifetime' } }, now).plus, true);
  assert.equal(entitlementFrom({ plus: { plan: 'monthly', expiresAt: now + 1 } }, now).plus, true);
  assert.equal(entitlementFrom({ plus: { plan: 'monthly', expiresAt: now } }, now).plus, false);
  const trial = entitlementFrom({ plus: { plan: 'yearly', trialEndsAt: now + 3 * 86_400_000, expiresAt: now + 3 * 86_400_000 } }, now);
  assert.equal(trial.plus, true);
  assert.equal(trial.inTrial, true);
});

test('the paywall body counts days practiced, singular and plural, never days missed', () => {
  assert.equal(paywallBody('day8', 1), 'You’ve practiced 1 day. Notice, Soften and Live continue with Attend Plus.');
  assert.equal(paywallBody('day8', 7), 'You’ve practiced 7 days. Notice, Soften and Live continue with Attend Plus.');
  const general = 'Days 8 to 28, and every practice any time, come with Attend Plus.';
  assert.equal(paywallBody('settings', 7), general);
  assert.equal(paywallBody('practice', 3), general);
  assert.equal(paywallBody('day8', 0), general);
});

test('plans: yearly first and selected, the billed price spelled out under every button', () => {
  assert.deepEqual(PLANS.map((p) => p.id), ['yearly', 'monthly', 'lifetime']);
  assert.equal(DEFAULT_PLAN, 'yearly');
  const [yearly, monthly, lifetime] = PLANS;
  // paywall.md's "{price}/year · 7 days free · founding price", with the note set beside the label.
  assert.equal(yearly.detail('$39.99', true), '$39.99/year · 7 days free');
  assert.equal(yearly.note, 'founding price');
  assert.equal(yearly.detail('$39.99', false), '$39.99/year');
  assert.equal(yearly.button(true), 'start 7 free days');
  assert.equal(yearly.billing('$39.99', true), 'Then $39.99 a year. Cancel any time.');
  assert.equal(yearly.button(false), 'continue');
  assert.equal(yearly.billing('$39.99', false), '$39.99 a year. Cancel any time.');
  assert.equal(monthly.billing('$7.99', true), '$7.99 a month. Cancel any time.');
  assert.equal(lifetime.label, 'once');
  assert.equal(lifetime.button(true), 'buy once');
  assert.equal(lifetime.billing('$99', true), '$99, one time. No subscription.');
  for (const p of PLANS) {
    assert.match(p.fallbackPrice, /^\$\d/);
    assert.ok(p.billing(p.fallbackPrice, true).includes(p.fallbackPrice), `${p.id}: the price is under the button`);
  }
});

test('the trial timeline gives real dates, written out, not program days', () => {
  // Sunday 18 Oct 2026, 09:00 in New York (−04:00).
  const now = Date.UTC(2026, 9, 18, 13, 0);
  const steps = trialTimeline(now, -240, '$39.99');
  assert.deepEqual(steps, [
    { when: 'today', what: 'Plus begins, free' },
    { when: 'Friday, October 23', what: 'we’ll remind you' },
    { when: 'Sunday, October 25', what: '$39.99 for the year, unless you cancel before' },
  ]);
  assert.equal(trialTimeline(now, -240, '$39.99', { reminders: false })[1].what, 'a note on Today');
  // Late evening local time is still that local day.
  assert.equal(longDate(Date.UTC(2026, 9, 19, 2, 0), -240), 'Sunday, October 18');
});

test('nothing on the paywall pressures, grades, or mentions pain', () => {
  const copy = [PAYWALL_HEADING, paywallBody('day8', 5), paywallBody('settings', 0), ...PAYWALL_LINES, PAYWALL_LEGAL, ...Object.values(PURCHASE_COPY)];
  for (const p of PLANS) copy.push(p.label, p.note ?? '', p.detail('$1', true), p.button(true), p.billing('$1', true), p.button(false), p.billing('$1', false));
  for (const s of trialTimeline(Date.UTC(2026, 9, 18), 0, '$1')) copy.push(s.when, s.what);
  for (let d = 1; d <= PROGRAM_DAYS; d++) copy.push(lockedReason(d, NO_PLUS, ON) ?? '');
  const banned = /\bpain\b|recovery|journey|don.t lose|so close|only \d+ left|limited time|hurry|last chance|unlock|streak|missed/i;
  for (const line of copy) {
    assert.doesNotMatch(line, banned, line);
    assert.equal(violatesGuideLanguage(line), false, line);
  }
});

test('with no purchase SDK, every purchase call answers "unavailable"', async () => {
  for (const id of ['yearly', 'monthly', 'lifetime'] as const) assert.deepEqual(await purchase(id), { ok: false, reason: 'unavailable' });
  assert.deepEqual(await restore(), { ok: false, reason: 'unavailable' });
  assert.deepEqual(await redeemCode(), { ok: false, reason: 'unavailable' });
  assert.equal(PURCHASE_COPY.unavailable, 'Purchases open with the App Store release.');
});
