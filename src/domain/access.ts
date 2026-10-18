import { PROGRAM_DAYS, WEEKS } from './program';
import { presetById } from './presets';

/**
 * What is free and what comes with Attend Plus (LAUNCH.md §1, docs/launch/paywall.md).
 *
 * Free forever: Week 1 (program days 1–7, to repeat any time), every distress practice (in a
 * flare, can't sleep, feeling worried), every sound, and the pain record. Plus: days 8–28, the
 * body scan, and the longer everyday practices any time.
 * During Week 1 every one-tap practice is open too, so someone who can't sleep on the first
 * night never meets a paywall in their first hour — that would be the onboarding paywall the
 * studio ruled out.
 *
 * Nothing here looks at pain. Access depends only on the program day, the purchase, and (when
 * known) how long ago the person started; never on a check-in.
 *
 * Kept free of React and Expo so it runs in Node tests. Every check takes `enabled`, defaulting
 * to PLUS_ENABLED, so tests can evaluate the gated world while the app ships ungated.
 */

/**
 * Off until purchases ship (prices need the founder's OK and RevenueCat isn't wired). While
 * off, everything is allowed and nothing anywhere mentions Plus.
 */
export const PLUS_ENABLED = false;

/** The last free program day. */
export const FREE_DAYS = 7;

/**
 * One-tap practices that are never locked: the ones a person reaches for in distress. A
 * paywall met at 2am, in a flare, unable to sleep or frightened by a sensation, is the worst
 * moment to ask for money and the moment the practice matters most (safety review round 3).
 * sleep-10 is the "can't sleep" tile on Today (presets.NEED_IT), so it is free with sleep-5.
 */
export const ALWAYS_FREE_PRESETS: readonly string[] = ['flare-3', 'flare-5', 'sleep-5', 'sleep-10', 'worry-3', 'worry-5'];

/**
 * Open through Week 1 and locked after (paywall.md §2, "Recommended — needs Itai's OK"): the
 * body scan and the everyday practices. Every one-tap practice not always free is listed here,
 * so a link into any of them during Week 1 behaves the same.
 */
export const WEEK_ONE_PRESETS: readonly string[] = ['scan-10', 'notice-3', 'notice-5', 'notice-10'];

export type PlanId = 'yearly' | 'monthly' | 'lifetime';

/**
 * What the device remembers about a purchase. The App Store (through RevenueCat) is the source
 * of truth; this is the offline copy, so a practice opens on a plane. Not in Prefs yet: the lead
 * adds `plus?: PlusRecord` there when purchases ship.
 */
export type PlusRecord = {
  plan: PlanId;
  /** When the free week ends (yearly with a trial only). */
  trialEndsAt?: number;
  /** When the current period ends. Absent for lifetime. */
  expiresAt?: number;
};

export type Entitlement = { plus: boolean; plan?: PlanId; inTrial?: boolean; trialEndsAt?: number };

export const NO_PLUS: Entitlement = { plus: false };

/**
 * The entitlement from what the device remembers. A lapsed subscription is no Plus; the record
 * of everything done is untouched either way.
 */
export function entitlementFrom(prefs: { plus?: PlusRecord | null } | null | undefined, now = Date.now()): Entitlement {
  const p = prefs?.plus;
  if (!p) return NO_PLUS;
  if (p.plan !== 'lifetime' && p.expiresAt !== undefined && p.expiresAt <= now) return NO_PLUS;
  const inTrial = p.trialEndsAt !== undefined && p.trialEndsAt > now;
  return { plus: true, plan: p.plan, inTrial, trialEndsAt: inTrial ? p.trialEndsAt : undefined };
}

type Options = {
  /** Defaults to PLUS_ENABLED. Tests pass true to evaluate the gated app. */
  enabled?: boolean;
  /**
   * Whole days since the person first opened the app, when known. Week 1's extra openness ends
   * at Day 8 or after 7 days, whichever comes first, so the free week is a week, not a backlog.
   */
  daysSinceStart?: number;
};

/** A program day's lesson and practice. Days 1–7 are free forever, to repeat any time. */
export function canStartDay(day: number, entitlement: Entitlement, { enabled = PLUS_ENABLED }: Options = {}): boolean {
  if (!enabled || entitlement.plus) return true;
  return day >= 1 && day <= FREE_DAYS;
}

/** Whether the person is still inside the free week, for the one-tap practices. */
export function inWeekOne(programDay: number, daysSinceStart?: number): boolean {
  return programDay <= FREE_DAYS && (daysSinceStart === undefined || daysSinceStart < FREE_DAYS);
}

/** A one-tap practice. `programDay` is the day Today offers (currentDay().day). */
export function canStartPreset(id: string, entitlement: Entitlement, programDay: number, { enabled = PLUS_ENABLED, daysSinceStart }: Options = {}): boolean {
  if (!enabled || entitlement.plus) return true;
  if (ALWAYS_FREE_PRESETS.includes(id)) return true;
  return inWeekOne(programDay, daysSinceStart);
}

/** Sounds are free forever: they cost nothing to play, and a locked sound reads cheap. */
export function canListen(): true {
  return true;
}

/** The pain record is the person's own. It is never behind a purchase. */
export function canCheckIn(): true {
  return true;
}

// ---- Copy for the lead's wiring (paywall.md §2). Null means "not locked": show the usual. ----

/** The line under a locked day's begin button: "week 2 · notice — continues with Plus". */
export function lockedReason(day: number, entitlement: Entitlement, opts: Options = {}): string | null {
  if (canStartDay(day, entitlement, opts)) return null;
  const week = Math.min(4, Math.max(1, Math.ceil(Math.min(day, PROGRAM_DAYS) / 7))) as 1 | 2 | 3 | 4;
  return `week ${week} · ${WEEKS[week].name.toLowerCase()} — continues with Plus`;
}

/** The quiet line under the locked Day 8 card. */
export const LOCKED_DAY_NOTE = 'Week 1, and the flare, sleep and worry practices, are yours any time.';

/** A one-tap row's detail: "10 min", or "10 min · Plus" when it would open the paywall. */
export function presetDetail(id: string, entitlement: Entitlement, programDay: number, opts: Options = {}): string {
  const minutes = presetById(id)?.minutes;
  const base = minutes ? `${minutes} min` : '';
  if (canStartPreset(id, entitlement, programDay, opts)) return base;
  return base ? `${base} · Plus` : 'Plus';
}

// ---- The paywall (paywall.md §1) ----

/**
 * Where the paywall was opened from. Only Day 8 gets the practiced-days line; Settings and a
 * locked practice get the general one.
 */
export type PaywallFrom = 'day8' | 'settings' | 'practice';

/** The small word above the heading. */
export const PAYWALL_KICKER = 'attend plus';

/** The heading, by where the paywall was opened from (copy review round 3). */
export function paywallHeading(from: PaywallFrom): string {
  if (from === 'day8') return 'week 2 · notice';
  if (from === 'practice') return 'every practice, any time';
  return 'all 28 days';
}

/** Body copy. Counts days practiced, never days missed; with nothing yet, the general line. */
export function paywallBody(from: PaywallFrom, practicedDays: number): string {
  if (from === 'day8' && practicedDays > 0) {
    return `You’ve practiced ${practicedDays} ${practicedDays === 1 ? 'day' : 'days'}. Notice, Soften and Live continue with Attend Plus.`;
  }
  return 'Days 8 to 28, and every practice any time, come with Attend Plus.';
}

export const PAYWALL_LINES: readonly string[] = [
  '21 more days of lessons and practice',
  // Not "the sleep, body scan and worry practices": sleep and worry are always free (above), so
  // listing them as Plus would sell what is already the person's.
  'The body scan and the longer practices, any time',
  'Week 1, the flare, sleep and worry practices, your check-ins and every sound stay free',
];

export type Plan = {
  id: PlanId;
  /** App Store product id, for RevenueCat's offering. Placeholders until App Store Connect has them. */
  productId: string;
  label: string;
  /**
   * The founding price, shown only until the store's localized price arrives. The real build
   * must show StoreKit's `priceString` (paywall.md: never hard-coded, so price and currency
   * changes need no copy change). Needs Itai's OK.
   */
  fallbackPrice: string;
  trialDays: number;
  /** A quiet word beside the label ("founding price"), so the detail fits on one line. */
  note?: string;
  /** The line under the label. */
  detail(price: string, trialEligible: boolean): string;
  /** The primary button. */
  button(trialEligible: boolean): string;
  /** The billed price, directly under the button and at body size (App Store review rule). */
  billing(price: string, trialEligible: boolean): string;
};

export const PLANS: readonly Plan[] = [
  {
    id: 'yearly',
    productId: 'attend.plus.yearly',
    label: 'yearly',
    fallbackPrice: '$39.99',
    trialDays: 7,
    note: 'founding price',
    detail: (price, eligible) => (eligible ? `${price}/year · 7 days free` : `${price}/year`),
    button: (eligible) => (eligible ? 'start 7 free days' : 'continue'),
    billing: (price, eligible) => (eligible ? `Then ${price} a year. Cancel any time.` : `${price} a year. Cancel any time.`),
  },
  {
    id: 'monthly',
    productId: 'attend.plus.monthly',
    label: 'monthly',
    fallbackPrice: '$7.99',
    trialDays: 0,
    detail: (price) => `${price}/month`,
    button: () => 'continue',
    billing: (price) => `${price} a month. Cancel any time.`,
  },
  {
    id: 'lifetime',
    productId: 'attend.plus.lifetime',
    label: 'once',
    fallbackPrice: '$99',
    trialDays: 0,
    detail: (price) => `${price}, yours for good`,
    button: () => 'buy once',
    billing: (price) => `${price}, one time. No subscription.`,
  },
];

/** Yearly is selected when the paywall opens. */
export const DEFAULT_PLAN: PlanId = 'yearly';

export function plan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id)!;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = 86_400_000;

/**
 * "Sunday, November 15": written out, so a trial date can't be mistaken for a program day.
 * By hand rather than Intl, which Hermes builds don't all carry in full.
 */
export function longDate(at: number, tzMinutes: number): string {
  const d = new Date(at + tzMinutes * 60_000);
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export type TimelineStep = { when: string; what: string };

/**
 * The free week, step by step, with real dates (paywall.md §1). It answers the billing anger in
 * Calm and Headspace reviews: the day of the reminder and the day of the charge, in advance.
 * When reminders are off, the reminder isn't promised; a note on Today is.
 */
export function trialTimeline(now: number, tzMinutes: number, price: string, { reminders = true }: { reminders?: boolean } = {}): TimelineStep[] {
  return [
    { when: 'today', what: 'Plus begins, free' },
    { when: longDate(now + 5 * DAY, tzMinutes), what: reminders ? 'we’ll remind you' : 'a note on Today' },
    { when: longDate(now + 7 * DAY, tzMinutes), what: `${price} for the year, unless you cancel before` },
  ];
}

export const PAYWALL_LEGAL =
  'The free week applies to the yearly plan for new subscribers. Payment is charged to your Apple ID when the free week ends, or when you confirm. Subscriptions renew automatically at the same price unless canceled at least 24 hours before the end of the current period. Manage or cancel any time in Settings → [your name] → Subscriptions. Founding members keep their price for as long as they stay subscribed. Lifetime is a single purchase.';

/** Placeholders until the landing page's domain is chosen (docs/launch/store-listing.md). */
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_URL = 'https://attend.example/privacy';
/** Settings → About → contact. Placeholder until Itai sets the support address. */
export const SUPPORT_EMAIL = 'support@attend.example';

/** One calm line per outcome. Nothing urgent, nothing that blames. */
export const PURCHASE_COPY = {
  unavailable: 'Purchases open with the App Store release.',
  failed: 'That didn’t go through. Nothing was charged.',
  nothingToRestore: 'No purchase found for this Apple ID.',
} as const;
