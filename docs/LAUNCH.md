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

### Pricing (decision needed — recommendation below)

| Option | For | Against |
| --- | --- | --- |
| **A. Subscription with free week (recommended)** — Week 1 of the program, the flare session and three sounds free forever; everything else with **Attend Plus**: **$59.99/year** (7-day free trial) or **$9.99/month** | Recurring revenue funds the voice costs; the free week is the honest demo (it's the "Understand" week); annual-with-trial is the standard that converts best in health apps | Subscription fatigue; needs a clear reason to stay after day 28 (more programs, sounds, flare library) |
| B. One-time unlock, $29.99 | Simple, fits "a 28-day program", no churn | Pays once while ElevenLabs bills every session; no money for ads |
| C. Hard paywall after onboarding | Highest conversion per install | Asking for money before someone has felt a single practice; wrong for this audience |

Recommendation: **A**, with a **lifetime option ($129)** added after launch for people who
hate subscriptions. Revisit prices after 200 trials.

The paywall follows the product rules: it appears at the end of onboarding (dismissible:
"Start the free week") and when Week 2 opens ("Week 2 opens with Plus"). Never mid-session,
never with guilt, never tied to pain going up or down.

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
6. **Sounds, by ear.** The seven sounds are ElevenLabs Sound Effects v2 generations, the
   calmer of two takes each, mastered by `tools/master-soundscapes.py` (quiet, soft peaks,
   seamless loop). Listen on headphones, at bedtime volume; replace any that still sound
   synthetic with a field recording under the same file name and re-run the mastering. Rain
   and ocean are the ones people judge hardest.
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
- **Subtitle** (30): "28 days. Eyes closed. Calmer."
- **Keywords** (100 chars): chronic pain, back pain, somatic, mind body, nervous system,
  fibromyalgia, sleep sounds, rain, meditation, PRT — tune after the first month in App Store
  Connect's search data.
- **Screenshots** (6.9" required, 1320×2868): 1) Today with the landscape — "One small
  step a day". 2) The eyes-closed session — "Close your eyes. Just listen." 3) The program
  path — "28 days, four weeks". 4) Progress — "See your practice and your pain, side by side".
  5) Just listen — "Rain, forest, water. With a sleep timer." 6) "No account. Nothing leaves
  your phone." The web build renders every screen at device size for drafts; final captures
  from a device build.
- **App preview video** (15–30 s): a landscape, rain, the guide's first line, the breathing
  form. The landscapes and sounds make this almost free to produce.

## 5. Go to market

### Before launch (now → late November)

1. **Landing page with a waitlist, this week.** One page: the line above, three screenshots,
   an email field, privacy policy and terms. Vercel is already connected. Goal: **300
   sign-ups by launch.**
2. **Free practice as the top of the funnel.** A 5-minute "somatic tracking" practice as a
   free audio on the landing page, YouTube and a podcast feed — the term has steady search
   interest and few good free recordings. Every one ends with "the full 28 days is in Attend".
3. **Communities, as a person, not a brand.** Chronic pain and mind-body subreddits,
   Facebook groups and Discords: answer questions, share the free practice where the rules
   allow, recruit beta testers. Read each community's self-promotion rules first.
4. **Short video, three a week.** Calm landscape + sound + one sentence from a lesson
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
- Ask happy users for a rating with Apple's prompt **after** a completed practice and a
  milestone — never after a check-in, never mid-program day one.
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

## 7. Decisions I need from you

1. Pricing: option A ($59.99/yr with a free week, $9.99/mo)? Lifetime at launch or later?
2. EU at launch (as a declared trader), or US/UK/Canada/Australia first?
3. Store name: "Attend: Chronic Pain Practice" — happy with it?
4. Should I build the landing page with a waitlist next (on Vercel), or payments first?
5. Sounds: keep the generated ones after you've listened, or license field recordings?

Running costs to launch: Apple Developer $99/yr (already paid), a domain (~$15), ElevenLabs
(current plan), Vercel/Supabase free tiers, RevenueCat free tier, optional $500 for the
first month of Search Ads.
