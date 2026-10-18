# Paywall — Day 8 gate, Today, Settings, trial reminder

Final copy for the Attend Plus build (LAUNCH.md §1–2). Prices are the round 1 founding prices
and **need Itai's OK**; they come from RevenueCat/StoreKit at runtime (`{price}`), never
hard-coded, so a change of price or currency needs no copy change.

Where it appears: when the person taps "begin day 8", a locked one-tap practice, or
Settings → Attend Plus. **Never** on a completion screen, mid-session, after a check-in, or on
Progress next to the pain record. The word "pain" doesn't appear on any of these screens.

Case rule: lowercase for what you glance at (heading, buttons, row labels), sentence case for
what you read (body, legal). American English.

---

## 1. The paywall screen

Light/dark like the rest of the app (not `forceDark`); one misty photograph at the top, the
Week 2 one.

**Heading**

> week 2 · notice

**Body**

> You've practiced {n} days. Notice, Soften and Live continue with Attend Plus.

- `{n}` = practice days so far. Singular: "You've practiced 1 day."
- When opened from Settings or a locked practice instead of Day 8:
  "Days 8 to 28, and every practice any time, come with Attend Plus."

**Three lines**

> - 21 more days of lessons and practice
> - can't sleep, body scan and worried, any time
> - Week 1, the flare practice, your check-ins and every sound stay free

**Plans** (yearly selected by default)

| Plan | Label | Detail |
| --- | --- | --- |
| Yearly | `yearly` | `{price}/year · 7 days free · founding price` |
| Monthly | `monthly` | `{price}/month` |
| Lifetime | `once` | `{price}, yours for good` |

**Trial timeline** (yearly only, under the plans)

> **today** — Plus begins, free
> **{date + 5 days}** — we'll remind you
> **{date + 7 days}** — {price} for the year, unless you cancel before

- Dates are written out ("Sunday, November 15"), not "Day 5", so they can't be confused with
  program days.
- If notifications are off, the middle line becomes **{date + 5 days}** — a note on Today, and
  the reminder notification is not promised.
- If the person isn't eligible for the trial (already used it), hide the timeline.

**Buttons**

| Selected | Primary button | Line directly under it (same size as body text) |
| --- | --- | --- |
| Yearly, trial eligible | `start 7 free days →` | `Then {price} a year. Cancel any time.` |
| Yearly, not eligible | `continue →` | `{price} a year. Cancel any time.` |
| Monthly | `continue →` | `{price} a month. Cancel any time.` |
| Lifetime | `buy once →` | `{price}, one time. No subscription.` |

Secondary: `not now` — back to Today, no second ask, no "are you sure".

The billed price under the button must be clearly readable, not smaller or fainter than the
trial wording: Apple rejects paywalls where "free" outshines the price.

**Footer links**

> restore purchases · redeem a code · terms · privacy

**Legal footer** (footnote size)

> The free week applies to the yearly plan for new subscribers. Payment is charged to your
> Apple ID when the free week ends, or when you confirm. Subscriptions renew automatically at
> the same price unless cancelled at least 24 hours before the end of the current period.
> Manage or cancel any time in Settings → [your name] → Subscriptions. Founding members keep
> their price for as long as they stay subscribed. Lifetime is a single purchase.

**States after a tap**

- Purchase succeeds → straight into Day 8's lesson. No celebration screen.
- Cancelled at Apple's sheet → back to the paywall, unchanged, no message.
- Fails → `That didn't go through. Nothing was charged.` + `try again`.
- Restore finds nothing → `No purchase found for this Apple ID.`

---

## 2. Today — the locked Day 8 card

Replaces the day's begin button once Day 7 is done. Same layout as every day, on the photo,
no lock icon.

> **day 8**
> what somatic tracking is
>
> `begin day 8 →`
> `week 2 · notice — continues with Plus`

Under it, one quiet line:

> Week 1 and the flare practice are yours to repeat any time.

**Locked one-tap rows** (can't sleep, body scan, feeling worried): keep the row, change the
detail from `{n} min` to `{n} min · Plus`. Tapping opens the paywall. "In a flare" is never
locked.

**Recommended (needs Itai's OK):** these three stay open through Week 1 and lock only once the
person reaches Day 8 (or 7 days after install, whichever is first). Otherwise someone who can't
sleep on night one meets a paywall in the first hour, which is the onboarding paywall we
ruled out.

If the person tapped "not now", the card stays exactly as above. No badge, no countdown, no
"you were so close", nothing that counts days since.

---

## 3. Settings — Attend Plus

Section label: `attend plus`

| State | Row | Detail | Second row |
| --- | --- | --- | --- |
| Free | `attend plus →` | `Days 8–28 and every practice, any time` | `restore purchases` · `redeem a code` |
| In trial | `attend plus` | `Free until {date}, then {price}/year` | `manage subscription →` |
| Yearly / monthly | `attend plus` | `Yearly · founding price` / `Monthly` | `manage subscription →` |
| Lifetime | `attend plus` | `Yours for good` | — |
| Lapsed | `attend plus →` | `Week 1, the flare practice and every sound stay free` | `restore purchases` |

`manage subscription` opens Apple's subscription sheet. `redeem a code` opens Apple's offer-code
sheet (clinician and tester codes). Below the section, footnote:

> Purchases are handled by Apple and RevenueCat. They receive a record of what you bought, not
> your sessions or check-ins.

(That sentence goes into the Privacy copy and README first, per AGENTS.md, before payments ship.)

---

## 4. Trial-ending reminder notification

Sent two days before the charge, at the person's chosen reminder time. That day it **replaces**
the practice reminder, so it's still one notification a day.

> **Attend Plus**
> Your free week ends on {weekday}. To keep Plus, there's nothing to do. To cancel, go to
> Settings → Subscriptions.

Tapping it opens Settings → Attend Plus. If they cancel, nothing in the app changes until the
week ends; then Day 8 onward locks again, with the record of everything they did kept as it
was. No "we'll miss you".

---

## Copy that must never appear here

"unlock your recovery", "your journey", "don't lose your progress", "you were so close",
"only {n} left", anything about how the pain is or was, a pain number or chart, a timer or
countdown, "limited time" (the founding deadline is stated once, in Settings and the store, not
as pressure on this screen).
