# Attend

A voice-guided, eyes-closed somatic practice for chronic pain, with a simple pain record
to show whether it helps. Expo SDK 57 / React Native / TypeScript, iOS first, one founder.
Read `README.md` for the architecture, `docs/MERGE.md` for why Pattern's pain record
moved in (12 Oct 2026), and `docs/RESEARCH.md` for the evidence the 28-day program and its
engagement rules rest on (13 Oct 2026).

**Expo has changed.** Read the versioned docs at https://docs.expo.dev/versions/v57.0.0/
before touching an Expo API, and use `npx expo install` for packages.

## How to verify a change

```bash
npm run verify     # tsc (app + tests) and the full node:test suite
```

If it fails, fix it — do not edit a test to match a regression. A whole session can be
driven in `tests/helpers.ts`; add a scripted session for any change to the guide.

## The one thesis

The MVP exists to test one question: does a 28-day program — a short lesson and a guided
Somatic Tracking practice a day — change a person's pain over weeks, and can they see
that it does? The practice is the product; the pain record is how it shows whether it
works; engagement exists because more practice means more benefit (RESEARCH.md §3).
Everything serves that. A feature health apps "normally have" is not a reason.

## What this app refuses to do

These are product decisions, not preferences. A change that breaks one is a regression
even when it looks like an improvement.

**Sessions are guided, not a conversation (12 Oct 2026).** The guide speaks and holds
silence; it never asks, and the session never listens. Answering questions mid-practice
pulled people out of it. Once a session starts it must be completable with the eyes
closed: no tap to continue, no body-part picker, no reading. The session screen shows a
breathing form, one quiet status word, pause and end. Never a transcript, never text of
what the guide says. The conversational engine is kept behind `mode: 'conversation'`;
the app runs `mode: 'guided'`.

**The pain number is what the person entered (from Pattern).** Pain is 0–10 with five
words, entered in a check-in that is separate from sessions. Nothing is derived from
it: no composite score, no "ease", no readiness. A day's pain is the peak of its
check-ins. Optional answers are three-state — never asked, asked and skipped,
answered — and a skip is never read as a negative.

**Reward practice, never pain (13 Oct 2026; replaces "nothing rewards looking at your
pain").** Engagement is allowed when it counts showing up: practice days per week, minutes,
lessons, the program path, milestones (`domain/engagement.ts`), moments saved toward the
person's goal. Practice is counted per week, not as consecutive days: nothing resets, a
missed day is just a day without a dot, a return is "welcome back", and no copy anywhere
guilts, counts missed days, or says a streak was lost. Reminders: one a day at a time the
person chose, weekly after four quiet days. What stays out: anything that grades the
pain — no check-in before or after a session, no per-session before/after, no
week-over-week deltas or arrows on pain, no milestone for pain going down, no verdict on
today. Progress shows practice and the pain record side by side, never mixed; the pain
chart carries the sentence about what it does not mean, inside its card.

**Nothing is manufactured.** A recap says "it softened" only if the person said so; a
guided session, where nothing is said, ends on a completion moment that says what was
done (minutes, days, the program) and never how the sensation was. Its one optional tap
("how did that feel?") is about the practice, never the pain. No change is a complete, valid session and is described plainly, never as failure.

**The guide never decides a symptom is benign.** No diagnosis, no "nothing is wrong",
no "you're safe", no "it's your brain". In conversation mode, possibly-new
symptoms get one neutral familiarity question and, if new, a gentle end with a suggestion
to see a professional; safety is screened locally on every utterance and a remote model
can only raise the level, never lower it. Guided sessions speak no warnings (21 Oct 2026): no "if it's an emergency", no "you can stop at any time" — a warning mid-practice undoes the settling the practice is for. The safety note is written, in onboarding and Settings (tests/guided.test.ts guards this). Lessons explain the alarm model and invite
the person to weigh their own signs; they never conclude for them that their pain is safe
(tests/program.test.ts guards the wording).
`FORBIDDEN_GUIDE_LANGUAGE` guards every line, local or remote.

**The guide's voice.** Calm, sparse, confident. Short sentences, silence as part of every
line. No "thank you for sharing", "I hear you", praise, apologies
for pain, or therapy clichés. Closing moves attention out of the body and into the room —
the app is used, then left. Do not add anything that encourages checking the body more.

**The engine owns structure; models own words.** Phase, whether to ask, what kind of
question, and when to end are decided in `SessionEngine`. A `GuideBrain` only phrases the
turn. Arrival, closing and all safety lines are fixed text and never sent to a model.

**Local-first.** Sessions and check-ins live in SQLite on the device; no account. Guided
sessions use no microphone. Speech, where it is used (the welcome), is recognised on the
device and audio is never stored. No analytics. Changing what leaves the phone means
updating the privacy copy in Settings and the README first.

**Design: a quiet Japanese clinic (21 Oct 2026).** Washi by day (warm paper, sumi ink)
and Sumi at night (warm charcoal, rice-paper text), following the phone's appearance so a
session opened at night never starts bright. Ma — room around everything, soft corners,
soft shadows, few boxes. San Francisco only (22 Oct 2026): SF Pro Rounded for titles, regular SF for the rest; no serif.
One leading colour, moss, for the one next step and practice done, chosen for calm (green,
never red; see `design/theme.ts`). The ensō (`viz/Enso.tsx`) marks the app's other screens;
the session itself shows the moving orb (`viz/BreathingField.tsx`, 22 Oct 2026: the still ensō
read as static mid-practice), light on charcoal at night and an ink wash on paper by day. A gong
opens and closes every session (`tools/make-gong.py`); under it, real nature recordings kept
quiet, well under the voice (`tools/make-ambience.py`, `voice/ambience.ts`). After the
completion moment, a closing screen with one quote (`domain/quotes.ts`): about practice and
attention, never pain or healing.

**Three tabs, kept simple (22 Oct 2026).** Today (the day's lesson and practice, the week's
dots, check in), Explore (after Headspace: sessions as colour-tile shelves by what they're for,
and the four nature sounds on their own, `domain/sounds.ts`), and the person's own tab, named
for them (practice, milestones, the pain record). Settings are the gear at the top right of
each tab. Removed on purpose: the body map screen, Journey, the list of past sessions, sample
sessions, separate Program and Progress tabs. Don't bring them back as "normal" features.
Explore's tiles use muted Japanese dye colours (`design/art.ts`); still no red.

**Colour is never a verdict.** Calm, no red anywhere, including the body visualisation. The body map
is labelled as an interpretation of what was said, never a scan or a measurement.

**Hebrew (27 Oct 2026).** The app speaks English or Hebrew, following the language iOS
gives it (the phone's, or Attend's own under Settings → Attend → Language), and lays out right
to left in Hebrew. Every user-facing string goes through `tr(en, he)` from `src/i18n`, chosen
at call time; the guide's Hebrew words are `server/lib/guideScript.he.ts`. Hebrew copy
follows `docs/HEBREW.md`: never gender the person (plural address, infinitive buttons), no
translationese. Hebrew sessions use the local guide only (the model rephrases in English).
A change to English copy needs its Hebrew too; `tests/hebrew.test.ts` guards the spoken script.

## Structure rules

- `domain/` and `engine/` stay free of React and Expo, so they run in Node tests.
- Vendors live behind `voice/types.ts`. The UI only uses `useVoiceSession()`.
- Native modules that Expo Go or older builds lack (`expo-speech-recognition`,
  `expo-notifications`) are required inside try/catch (`voice/speechModule.ts`,
  `voice/reminders.ts`). An unguarded import crashes those builds at launch.
- Developer tools (simulated participant, typed answers, debug panel) render only under
  `__DEV__`.
- Comments explain why — the decision and the failure it prevents.

## Shipping

- Development build: `npx eas-cli@latest build -p ios --profile development` (installs as "Attend Dev").
- Over-the-air updates are not configured yet. When they are, copy Pattern's rules:
  `runtimeVersion` follows `version`, so bumping `version` in `app.json` strands installed builds.
- Windows note (from Pattern): if `expo export` fails with `spawn UNKNOWN`, Windows Application
  Control blocked `hermesc.exe`; build on EAS's servers instead.
