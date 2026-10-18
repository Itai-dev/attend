# Studio loop — 18 Oct 2026, 21:04–23:04 UTC

Five roles worked in rounds: each did concentrated work alone, then the studio met, decided,
and the founder built the decisions the same round (verified with `npm run verify`, pushed).
Roles: **Founder** (product lead, chairs), **Go-to-market**, **UX/UI**, **Copywriter**,
**Researcher** (people with chronic pain and heavy stress).

Starting point: three tabs (Today, Sounds, Progress), a 7-screen welcome ending in Day 1,
real nature sounds. Screens: `docs/studio/r0-*.png`.

## Round 1 — audit (21:04–21:16), meeting (21:16)

**What each role found**
- **Founder:** the practice depends on a live speech server and fails silently. If a line can't
  load, the session pauses with no reason given. The offline cache misses after a relaunch.
  Locking the phone pauses the session. Pauses eat session time, and the paused minutes get
  counted as "quiet minutes". One-tap practices switch to other voices. Some guide lines point
  to "there" or "the sensation" when no place was named. Programme days slip at midnight.
  Reminders never step down. Sample sessions appear on real installs. The microphone and
  privacy wording is out of date.
- **Researcher:** three personas: Dana (back pain, 9 yrs, "tried everything"), Priya
  (fibromyalgia and migraine), Tom (stress, neck and jaw tension, can't sleep). The biggest
  risks are feeling told it's "in your head", copy that leaves out pain with no injury
  ("long after an injury"), a safety note that reads "not for you" when pain is severe every
  day, no way to step back when attention makes it louder, reading-heavy lessons at night,
  and "Hard today" answered with silence.
- **UX/UI:** the session's running clock and flickering status word distract a person whose
  eyes are closed. The end hard-cuts to a dashboard. Today's card overlaps the photo, and
  the dashed rings on past days look like missed days (against our own rule). Practice tiles
  look exactly like sound tiles. Progress on day 0 is a wall of zeros. Capitalisation
  follows three different systems.
- **Copywriter:** the welcome promised outcomes ("and it can change"). Seven guided lines were
  questions, though the guide never asks. "Ten minutes" when Day 1 is five. One case rule
  needed: lowercase for what you glance at, sentence case for what you read. A voice guide
  (below).
- **Go-to-market:** no rival offers a daily, eyes-closed somatic-tracking practice; Curable is
  a reading-and-chat course at $96–192 a year. The beachhead is people who already accept
  the mind-body idea (PRT, *The Way Out*, Sarno, r/TMSmindbody, physios). Name "Attend:
  Chronic Pain Practice", subtitle "Somatic tracking, eyes closed". Gate at Day 8, not at
  onboarding: Week 1, the flare practice, the pain record and all sounds stay free. Founding
  price $39.99/yr with 7 days free, $7.99/mo, $99 lifetime. Review prompt after the 3-day or
  full-week milestone.

**Decisions**
1. *The voice never goes silent* comes first: say on screen why a session paused, fail fast
   on resume, key the cache on voice + text, keep playing when the phone locks, run the clock
   on active time and count active minutes only, one voice for every practice.
2. *Safety and belonging copy:* the welcome promises the practice, not the outcome; pain with
   no injury is included; the doctor note sits beside care instead of gating it; Worried and
   A flare open with a fixed "if this is new or different, stop and contact a doctor" line;
   the guide gets a way to step back ("let attention move to your hands, or the sounds in
   the room").
3. *The guide never asks:* every guided line is an invitation. A test now fails on any
   question mark in a guided bank.
4. *Eyes-closed screen:* no running clock; the status word only when it means something;
   controls fade after a few seconds and come back on a tap (the first tap only reveals);
   one soft haptic at the end. This refines the AGENTS.md rule: pause and end are always
   one tap away, just not lit up.
5. *Today and After calmer:* the day sits on the photo with no card; practices are rows
   (photos mean sounds); no dashed rings anywhere; After is one moment (week dots, not
   score tiles); "Hard today" gets a line about the practice.
6. *One case rule* across the app; *American English* for the US launch.
7. *Business:* adopt the go-to-market positioning, the Day 8 gate and the founding prices as
   the plan in LAUNCH.md. **Prices need the founder's (Itai's) OK.** The paywall is built
   behind a flag in a later round.

**Voice guide**
1. Describe the practice, never its effect.
2. One idea per line, about 15 words at most.
3. Lowercase for what you glance at; sentence case for what you read; never all caps.
4. The guide invites; it never asks.
5. Count showing up, plainly: no "still counts", no "new milestone!", never "missed".
6. Use their words ("flare", "can't sleep", "worried"), not the clinic's.

**Built in round 1** (all pushed, 85/85 tests):
- **Copy:** safety and belonging; the guide never asks; a way to step back; worry and flare
  arrivals with a fixed doctor line; place-free guide lines; one voice for all practices.
- **Screens:**
  - Today has the day on the photo and practices as rows.
  - After is one moment instead of a dashboard.
  - Progress shows only what exists.
  - There are no dashed "missed" marks anywhere.
- **Other fixes:**
  - Sample sessions in development builds only.
  - Honest privacy line.
  - Moments are steps, not "quieter pain".
  - American English.
  - The launch plan has the new pricing and positioning.
- **Session voice and screen** (by a separate builder): silent failures explained on screen,
  the cache, locking the phone, active-time clock, a session screen that fades for eyes closed.

## Round 2: concentrated work (21:12–21:20), meeting (21:21)

**What each role brought**
- **Copywriter:**
  - A full 16-step body scan (`SCAN_BODY`), for the body scan only. Program days keep
    `SCAN_FULL`.
  - Spoken framing for listening to the lesson.
  - Days 1–7 lessons rewritten for the ear: no dashes, no questions in the guide's voice.
  - The Day 7 card, reminder copy, and the short-day line. All of it is in
    `docs/studio/r2-copy.md`.
- **Researcher:**
  - **Short day:** 3 active minutes of the day's practice completes the day. Length matters
    less than frequency (Strohmaier 2020), and the current rule is a looser 90 s.
  - **Listening:** listening and reading are equal ways to take in a lesson (Rogowsky 2016).
    Listen comes first after 21:00 or for Nights.
  - **Sleep:** the sound carries on for 30 minutes after the voice ends, and the screen stays
    dark.
  - **Day 7 card:** one optional, three-state question about the person's own signs.
  - **Reminders:** dated one-offs, so the step-down works without opening the app.
  - **Who might be harmed:** trauma and health anxiety. Say plainly that stopping is part of
    the practice.
- **Go-to-market:** `docs/launch/` has the store listing, landing page, outreach (community
  posts as Itai, a clinician one-pager, a 5-email sequence) and the paywall copy. It flagged
  that the microphone permission text and the old spoken-welcome copy contradicted guided
  sessions, and that "nothing leaves your phone" isn't true.

**Decisions**
1. **Build now:**
   - the body scan
   - the 3-active-minute short day, with a short-version row on Today
   - listen to the lesson, then flow into the practice
   - the sleep tail and dark screen
   - dated reminders that skip a practiced day and step down on their own
   - the Day 7 card with the optional signs question
   - Today refreshes when the app comes back to the foreground
   - the program day counts by the session's start date
2. **Done in this meeting:**
   - the microphone permission and welcome wording
   - "who might be harmed" in the welcome and Settings
   - Days 1–7 lessons for the ear
3. **Next round:** the paywall, behind a flag (`src/domain/access.ts`, the paywall screen in
   the Daisy look, the locked Day 8 state). No purchase SDK until Itai confirms prices.
4. **Itai's call:**
   - founding prices
   - a beta thank-you (a free year?)
   - how long a clinic code lasts (3 months?)
   - the domain and support email
   - whether to stop weekly reminders after 4 unanswered (researcher's proposal; this changes
     AGENTS.md)

**Built in round 2** (pushed, 131/131 tests):
- **Body scan:** a full 16-step body scan for the body scan practice only. All steps are always
  heard, and the session runs about 10.5 minutes.
- **A shorter day:** 3 active minutes of the day's practice completes the day, and Today offers
  "short on energy? 3 minutes completes the day." Paused time doesn't count, and a safety
  pause never completes a day.
- **Day boundary:** a practice counts on the day it *started*, so one begun before midnight
  counts for that day.
- **Listen to the lesson:** listen and read are equal options. Listen comes first, on a dark
  screen, from 21:00 to 05:00 or when the welcome answer was Nights, but it never starts by
  itself. Heard to the end, the lesson counts as read and flows into the practice.
- **Sleep:** when a sleep practice runs to its end, the sound crosses into a 30-minute listen.
  The screen stays near-black with "resting"; there's no After screen and no keep-awake.
- **Reminders:** dated one-offs: daily for four days, skipping a day already practiced, then
  weekly for about three months. The step-down happens even if the app is never opened.
- **Day 7 card:** "your first week": practice, minutes, lessons, and how it felt in the
  person's own taps, plus one optional, three-state question about their signs.
- **Today:** refreshes when the app comes back to the foreground, and at midnight.
- **Recorded time:** `Session.activeMs` is stored (database migration 4).

**Built in round 3, first part:** the paywall at `/plus`, switched off
(`PLUS_ENABLED = false`). It has the free-forever rules, the Day 8 gate, plans and a trial
timeline with real dates, and a purchase stub where RevenueCat plugs in.

## Round 3: review (21:36 onward)

Copywriter, researcher and go-to-market review everything built so far, focusing on safety,
copy and readiness for App Review. UX screenshots the whole product as one and polishes it.

**Meeting (21:45)**

**What each role found**
- **Researcher (safety review):**
  - Guided sessions could still ask one question, and it implied "not a problem". The
    question-mark test only checked the theme banks.
  - The doctor lines lived in the remotely editable script, so a remote edit could delete them.
  - Someone with new chest pain at 2am had no path to emergency care.
  - "Worry: not knowing what the pain means" invites exactly that person.
  - Stopping took three taps with the controls faded.
  - The paywall could lock "can't sleep" and "worried".
  - Lesson titles showed on the lock screen.
  - The signs question leaned one way.
  - People with health anxiety got no warning in the welcome.
  - There was no crisis line.
- **Copywriter:**
  - The lock-screen titles (agreed).
  - "Missed" in Settings.
  - "Hard ones count the same" sounds like "still counts".
  - 432 Hz is a "healing frequency" trope.
  - One heading per paywall entry point.
  - American spellings left over.
  - Glanceable labels not yet lowercase: chips, milestones, status words, onboarding lists,
    Settings rows.
- **Go-to-market (beta readiness):**
  - Two rejections waiting: microphone and speech strings for a feature guided mode never
    uses, and no privacy policy anywhere.
  - Two risks: the body area goes to a third-party voice service without consent, and the
    backend must stay live during review.
  - Drafted the App Privacy answers, the beta's What to Test, review notes, and a checklist
    from tonight to an external TestFlight.

**Decisions**
1. **Safety comes before the beta, and is built now:**
   - every line the guide can speak is checked for questions across 30 seeds
   - safety lines are fixed in the app
   - emergency wording in the welcome, the worry arrival and Settings
   - a crisis line in Settings
   - every arrival says "you can open your eyes, or stop, at any time"
   - the first session ever speaks the doctor line
   - "nothing to fix" is scoped to the practice
   - the body scan is gentler for heart- and throat-focused worry
   - distress practices are never paywalled
   - reminder titles say only "day N"
   - the signs question is balanced and says "not a diagnosis"
2. **Copy** follows the copywriter's list, and lowercase applies to everything glanced at.
3. **Ending a practice:** a tap on the faded end button reveals the controls and arms the
   confirm in one go, the confirm window widens to 6 s, and ending while paused takes one tap.
   Lock-screen and AirPods pause is next on the list. It needs the expo-audio now-playing API,
   which is still to be checked against the v57 docs.
4. **Review readiness, built now:**
   - honest permission strings and Health in the privacy manifest (done)
   - a privacy-policy draft (`docs/launch/privacy-policy.md`)
   - Settings rows for privacy, terms and contact
   - a voice-service disclosure on the welcome's "where" step

**Itai's calls**
- Host the privacy policy and give the URL and a support email.
- Set the app token on Vercel and EAS, and check the ElevenLabs credits.
- Start the Paid Applications Agreement.
- Decide whether the body area may be sent at all. The real fix is a downloaded voice pack, so
  nothing personal leaves the phone.

