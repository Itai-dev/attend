# From here to paying users on the App Store

Written 18 Oct 2026. One founder, an Expo app that already builds, an App Store Connect
record (`ascAppId` 6818860819), an Apple team, an EAS project. What's missing is a way to pay,
the store listing, a beta, and people who know the app exists. This is the shortest path
through all of it, in order, with dates.

**Target: first paying users in the first week of December 2026, and a real push on
1 January 2027.** January is the busiest month of the year for health app installs, and a
28-day program is a natural New Year start. A December soft launch gives four weeks to fix
what real users find before that wave.

---

## 1. What we sell

### The product, in one line

> **Attend — a quiet daily practice for chronic pain.** 28 days, a few minutes a day, eyes
> closed. Plus rain, forest and water sounds for the evenings.

Who it's for: adults living with long-term pain (back, neck, whole-body, recurring headaches)
who have heard that the brain's alarm system plays a part — through *The Way Out*, Curable,
a pain psychologist or a physio — and want a daily practice, not another tracker.

What makes it different, and what the store page leads with:

1. **Eyes closed, voice only.** No reading, no tapping mid-session. Competitors are mostly
   reading-heavy courses.
2. **A 28-day path, not a library.** One lesson and one practice a day; you always know the
   next step.
3. **Honest progress.** Your practice and your own pain record side by side — never a score,
   never a grade.
4. **Private by design.** No account. Everything stays on the phone.
5. **Calm to look at and listen to.** Misty photographs, nature sounds, a sleep timer.

### Pricing (studio round 1, 18 Oct 2026 — needs Itai's OK)

The studio's go-to-market review changed the earlier plan. Competitors: Curable $95.90 first
year ($191.88 list) / $399.99 lifetime; Pathways $59.99–69.99/yr; Calm/Headspace $69.99–79.99/yr.
No one sells a daily, eyes-closed somatic-tracking practice.

- **Free forever:** Week 1 (Days 1–7), the flare, sleep and worry practices (round 3: a practice for a hard moment is never paywalled), the pain record, and **every sound**
  (sounds cost nothing to play and bring people back each evening; a locked sound reads cheap).
- **Attend Plus:** Days 8–28; the body scan and the longer practices any time; voice and length
  options.
- **Founding prices until 10 Jan 2027:** **$39.99/year with 7 days free**, **$7.99/month**,
  **$99 lifetime** (this audience is tired of subscriptions, and a 28-day program reads as a
  one-time purchase). Founding members keep their price. After that: $59.99 / $9.99.
- **Where the paywall appears:** *not* after onboarding — Day 1 starting within a minute is the
  app's best asset. It appears when the person taps "begin day 8" (Today's card reads
  "week 2 · notice — continues with Plus"), and as a row in Settings. Never on a completion
  screen, mid-session, or anywhere near pain.
- **Paywall copy:** "week 2 · notice" / "You've practised {n} days. Notice, Soften and Live
  continue with Attend Plus." Three lines: 21 more days of lessons and practice · can't sleep,
  body scan and worried, any time · Week 1, a flare, your pain record and every sound stay free.
  A trial timeline answers the billing anger in Calm/Headspace reviews: "Today: full access ·
  Day 5: we remind you · Day 7: $39.99/year". Buttons "Start 7 free days" / "Not now"; Restore,
  Terms, Privacy.
- **Build:** `src/domain/access.ts` (what's free, with tests), an entitlement hook, the paywall
  screen, a locked Day 8 state, Settings rows. RevenueCat (`react-native-purchases`) is native:
  guard its import like `voice/speechModule.ts`; real purchases need a dev/TestFlight build and
  the Paid Applications Agreement. Update the privacy copy first (purchase records go to
  RevenueCat).
- **Funnel to measure (App Store Connect, no analytics):** reach Day 8 → start trial 40%;
  trial → paid 50%. About 1,500 installs for the first 100 paying users.

### Unit economics to measure in the beta

- **Voice cost per session.** Every guided line goes through ElevenLabs. The fixed lines
  (arrival, body scan, closing, safety) are most of each session and identical per voice —
  render them once, ship or cache them, and only voice what changes (the place, the theme).
  This cuts cost and makes sessions start instantly and work offline.
- Apple's cut: **15%** under the App Store Small Business Program — enrol before launch.
- RevenueCat is free at this scale. Vercel and Supabase stay on free/hobby tiers until
  usage says otherwise.

---

## 2. The build: what's left in the app

Each item is a pull request. ✅ = done in this branch.

1. ✅ **Look and sound** — Daisy-style design (light by day, dark at night), misty
   photographs, seven nature soundscapes, "Just listen" with a sleep timer, a sound under
   every session.
2. **Payments** (~2 days once pricing is decided) — RevenueCat (`react-native-purchases`) in
   a development build, guarded like the other native modules; an `access.ts` in `domain/`
   that decides what's free (tested in Node); a paywall screen in the app's design; Restore
   Purchases; offer codes for clinicians and beta testers. Privacy copy in Settings and the
   README updated first (AGENTS.md), since purchase records go to RevenueCat.
3. **Pre-rendered guide audio** (~2 days) — fixed lines per voice rendered by a script into
   cached files; the server only voices what's personal. Rate limits and a shared app key on
   the voice server so nobody can run up the ElevenLabs bill.
4. **Store-required screens** — Terms of Use and Privacy Policy links in Settings and on the
   paywall (required for subscriptions), a "Contact" row.
5. **Device QA** — run `docs/ON-DEVICE.md`, plus: sounds loop without a click, Just listen
   keeps playing locked, timer fades out, a session started during Just listen takes over
   cleanly, VoiceOver on the new screens, largest text size on Today.
6. **Sounds, by ear.** Since 20 Oct 2026 the seven sounds are real field recordings, not
   generated ones: public-domain radio aporee recordings, 5 minutes each, crossfaded in the app
   (`assets/audio/soundscapes/SOURCES.md`, `tools/master-recordings.py`). Listen on headphones,
   at bedtime volume. To swap one, change its entry in the script and re-run it.
7. **Over-the-air updates** — EAS Update with `runtimeVersion` following `version`
   (AGENTS.md), so copy and content fixes don't wait for review.

## 3. App Store Connect: the paperwork

Start these **this week**; the agreements and banking can take days to clear.

- [ ] **Paid Applications Agreement** accepted, **bank account** and **tax forms** done
      (Business → Agreements). In-app purchases cannot be tested or sold without it.
- [ ] **Small Business Program** enrolment (15% commission).
- [ ] **Subscription group** "Attend Plus" with `plus_yearly` (7-day free trial
      introductory offer) and `plus_monthly`; display names, descriptions, a paywall
      screenshot for review.
- [ ] **Trader status** (EU Digital Services Act): either declare as a trader (your contact
      address and phone are shown on EU store pages) or launch outside the EU first.
      Decision needed.
- [ ] **App Privacy** labels: "Data Not Collected" except purchases via RevenueCat
      (Purchase History, not linked to identity, not used for tracking).
- [ ] **Age rating** questionnaire, answered honestly about medical/treatment information.
- [ ] **Category**: Health & Fitness (not Medical — fewer obligations, and it's a wellness
      practice, not a treatment).
- [ ] **Privacy Policy URL, Terms of Use URL, Support URL** — on the landing page (§5).

### Claims: what App Review and regulators read

The app is a wellness practice and education. It does not diagnose or treat. So, on the store
page, in ads and in the app:

- Say: "a daily practice", "learn how pain and the nervous system interact", "track how
  you're doing", "based on the methods studied in Pain Reprocessing Therapy research".
- Never say: "cures", "treats", "relieves", "clinically proven", "pain-free in 28 days",
  "reduces pain by X%".
- Keep the welcome's safety note and "see a professional if something is new or changing".
- One hour with a health-app lawyer before launch is cheap insurance (FDA general-wellness
  framing in the US; the equivalents in the EU/UK/Israel if launching there).

## 4. Store page

- **Name**: "Attend: Chronic Pain Practice" (30 characters). Check availability today;
  fall back to "Attend — Pain & Calm".
- **Subtitle** (30): "Somatic tracking, eyes closed" (round 1: "Calmer" was an outcome claim; this
  puts both search terms in the two most-weighted fields).
- **Keywords** (100 chars): prt, back pain, fibromyalgia, mind body, nervous system, flare,
  sleep sounds, rain, neck — tune after the first month in App Store
  Connect's search data.
- **Screenshots** (6.9" required, 1320×2868): 1) The session — "Somatic tracking, guided.
  Just close your eyes." 2) The program path — "28 days. One lesson, one practice." 3) Progress
  — "Your practice and your pain record, side by side." 4) Today.
  5) Just listen — "Rain, forest, water. With a sleep timer." 6) "No account. Nothing leaves
  your phone." The web build renders every screen at device size for drafts; final captures
  from a device build.
- **App preview video** (15–30 s): a landscape, rain, the guide's first line, the breathing
  form. The landscapes and sounds make this almost free to produce.

## 5. Go to market

### Before launch (now → late November)

0. **Beachhead (round 1):** people who already accept the mind-body idea — readers of *The Way
   Out* or Sarno, lapsed Curable users, r/TMSmindbody, r/ChronicPain, PRT and "neuroplastic
   pain" Facebook groups, viewers of Pain Free You. The line that wins them: "You know the
   somatic tracking practice. Attend guides you through it every day for 28 days, eyes closed."
   Name the book only in community posts, never in store metadata. One offer code per clinician
   and creator shows which channel works, without analytics.
1. **Landing page with a waitlist, this week.** One page: the line above, three screenshots,
   an email field, privacy policy and terms. Vercel is already connected. Goal: **300
   sign-ups by launch.**
2. **Free practice as the top of the funnel.** A 5-minute "somatic tracking" practice as a
   free audio on the landing page, YouTube and a podcast feed — the term has steady search
   interest and few good free recordings. Every one ends with "the full 28 days is in Attend".
3. **Communities, as a person, not a brand.** Chronic pain and mind-body subreddits,
   Facebook groups and Discords: answer questions, share the free practice where the rules
   allow, recruit beta testers. Read each community's self-promotion rules first.
4. **Short video, one a week** (round 1: cut from three, and the podcast feed is cut). Calm landscape + sound + one sentence from a lesson
   ("Pain is real. And the alarm can stay on after the danger has passed."). Chronic illness
   creators on TikTok and Instagram are a large, engaged audience; a few gifted Plus codes go
   further than ads at this stage.
5. **Clinicians.** Physios and pain psychologists already tell patients to "practise
   somatic tracking" and have nothing to hand them. Offer each one free codes for their
   patients and a one-page PDF. Ten engaged clinicians can be a steady source of users.

### Beta (mid-November, ~3 weeks)

- TestFlight, 30–50 people with chronic pain from the waitlist and communities. Plus free.
- What to learn: do people finish Week 1? Day 28? What do they say on the completion moment?
  Would they be disappointed if the app disappeared? Is the voice right? Which sounds do they
  use?
- Measure without analytics (AGENTS.md: no analytics): TestFlight feedback, a short
  in-person/video call with ten testers, App Store Connect's opt-in App Analytics and
  RevenueCat's dashboard after launch. That is enough to steer by at this scale.
- **Go/no-go for launch**: at least half of testers finish Week 1, nobody hits a crash or a
  silent session, and testers can say in their own words what the app is for.

### Launch (first week of December) and the January push

- Email the waitlist: "The 28 days start today." Testers get a thank-you code.
- Apple's rating prompt on Today, right after the completion screen that earned "3 days" or
  "A full week", and again at "Halfway" — never after a check-in, never on Day 1, never
  depending on how they answered "how did that feel?" (that would be review gating).
- Settings → "Give someone the free week": the share sheet with the App Store link. Week 1 is
  free, so no referral system is needed.
- **Apple Search Ads**, from mid-December: $20–30/day on exact-match keywords (chronic pain
  app, back pain app, somatic tracking), only once trial-to-paid is measured.
- **New Year**: "Start 2027 with 28 days" across video, communities, clinicians and the
  waitlist, 26 Dec → 10 Jan. Pitch Apple's App Store editorial team (the "Nominate your app"
  form) for January wellness features in November — they plan weeks ahead.

### Numbers to watch, weekly

| Stage | First target |
| --- | --- |
| Store page → install | 30% |
| Install → finished onboarding | 70% |
| Onboarding → trial started | 15% |
| Trial → paid | 35% |
| Paid → still subscribed after month 2 | 70% |
| Program: Week 1 completed (of those who start) | 50% |

These are starting targets to compare against, not predictions. The program numbers matter
most: people who practise are the ones who benefit, stay and recommend it.

---

## 6. The calendar

| Week | Product | Store & business | Marketing |
| --- | --- | --- | --- |
| **19–25 Oct** | Merge look & sound; device QA on a dev build | Paid Apps Agreement, banking, tax, Small Business Program; decide pricing and EU trader status; check name | Landing page + waitlist; record the free practice |
| **26 Oct–1 Nov** | Payments + paywall; pre-rendered guide audio; server rate limits | Create subscription products; privacy policy & terms live | Start posting (video, communities); contact 20 clinicians |
| **2–8 Nov** | Replace any weak sounds; Terms/Privacy links in app; TestFlight internal | App Privacy labels, age rating | Recruit 50 testers from the waitlist |
| **9–29 Nov** | External TestFlight beta; fix what it finds; EAS Update | Screenshots, preview video, store copy; nominate for January editorial | Weekly content; grow waitlist to 300 |
| **30 Nov–6 Dec** | Production build; **submit for review** (allow 1–3 days and one rejection) | Release when approved | **Launch**: waitlist email, testers' codes, communities |
| **7–24 Dec** | Fix, ship over the air | Start Search Ads once trial→paid is known | Reviews, clinician codes |
| **26 Dec–10 Jan** | Stable; nothing risky | — | **"Start 2027 with 28 days"** |

## 7. Decisions (made 20 Oct 2026; Itai: "decide as you see fit")

1. **Pricing:** founding prices of $39.99/yr with 7 days free, $7.99/mo and $99 lifetime,
   until 10 Jan 2027, then $59.99 / $9.99. The paywall stays off (`PLUS_ENABLED = false`)
   through the beta, so testers get everything.
2. **Markets:** US, UK, Canada and Australia first. The EU waits until the trader question
   is settled.
3. **Store name:** "Attend: Chronic Pain Practice", subtitle "Somatic tracking, eyes closed".
4. **Next build:** the external TestFlight beta (`docs/launch/testflight.md`). Payments come
   after the beta; the landing page goes up alongside the beta, for the waitlist.
5. **Sounds:** keep the generated ones for the beta. Replace any that testers call fake.
6. **App token:** off for the beta (turning it on silences existing builds); on before the
   public release.
7. **Privacy page:** served by the voice server at `/api/privacy`, with no domain needed.
8. **Support email:** none in the app during the beta; feedback goes through TestFlight. A
   dedicated address before release, never a personal one.
9. **Body area sent to the voice service:** allowed for the beta. It is disclosed in the
   welcome, the privacy page and Settings, and declared in the privacy manifest. It carries no
   name or account. Before the public release, build a downloaded voice pack so nothing
   personal leaves the phone.
10. **Weekly reminders:** they stop after 12, about three months (`WEEKLY_COUNT`). They do not
    stop earlier after four unanswered.

Running costs to launch: Apple Developer $99/yr (already paid), a domain (~$15), ElevenLabs
(current plan), Vercel/Supabase free tiers, RevenueCat free tier, optional $500 for the
first month of Search Ads.
