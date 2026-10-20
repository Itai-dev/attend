import type { PlanId, PlusRecord } from '../domain/access';

/**
 * Purchases, behind one small interface so the paywall never touches a vendor.
 *
 * There is no purchase SDK yet: prices await the founder's OK, and real purchases need a
 * development or TestFlight build plus Apple's Paid Applications Agreement. Until then every
 * call answers `unavailable`, and the paywall says so in one calm line.
 *
 * WHERE REVENUECAT PLUGS IN (LAUNCH.md §1):
 *   `npx expo install react-native-purchases`, then load it here exactly as
 *   voice/speechModule.ts loads expo-speech-recognition — `require` inside try/catch, cached —
 *   because it is a native module that Expo Go and older builds lack, and an unguarded import
 *   crashes them at launch. Then:
 *     - configure once with the public iOS key (`Purchases.configure({ apiKey })`), no user id:
 *       there is no account, RevenueCat's anonymous id is enough;
 *     - prices(): `getOfferings()`, mapping each package's `product.priceString` by
 *       PLANS[].productId — the paywall must show these, not PLANS' fallback prices;
 *     - trialEligible(): `checkTrialOrIntroductoryPriceEligibility([yearly productId])`;
 *     - purchase(): `purchasePackage(pkg)`; `userCancelled` → { reason: 'cancelled' };
 *     - restore(): `restorePurchases()`; no active "plus" entitlement → 'nothing';
 *     - redeemCode(): `presentCodeRedemptionSheet()` (iOS offer codes for clinicians, testers).
 *   Before shipping: the privacy copy in Settings and the README must say purchase records go
 *   to Apple and RevenueCat (AGENTS.md, "Local-first"; paywall.md §3).
 */

export type PurchaseResult =
  | { ok: true; record: PlusRecord }
  | { ok: false; reason: 'unavailable' | 'cancelled' | 'failed' | 'nothing' };

/** Localized prices by plan, from the store. Empty until an SDK provides them. */
export async function prices(): Promise<Partial<Record<PlanId, string>>> {
  return {};
}

/** Whether the free week can be offered. Assumed yes until the store says otherwise. */
export async function trialEligible(): Promise<boolean> {
  return true;
}

export async function purchase(_plan: PlanId): Promise<PurchaseResult> {
  return { ok: false, reason: 'unavailable' };
}

export async function restore(): Promise<PurchaseResult> {
  return { ok: false, reason: 'unavailable' };
}

export async function redeemCode(): Promise<PurchaseResult> {
  return { ok: false, reason: 'unavailable' };
}
