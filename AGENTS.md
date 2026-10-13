# Attend

A voice-guided, eyes-closed somatic practice for chronic pain, with a simple pain record
to show whether it helps. Expo SDK 57 / React Native / TypeScript, iOS first, one founder.
Read `README.md` for the architecture and `docs/MERGE.md` for why Pattern's pain record
moved in (12 Oct 2026).

**Expo has changed.** Read the versioned docs at https://docs.expo.dev/versions/v57.0.0/
before touching an Expo API, and use `npx expo install` for packages.

## How to verify a change

```bash
npm run verify     # tsc (app + tests) and the full node:test suite
```

If it fails, fix it — do not edit a test to match a regression. A whole session can be
driven in `tests/helpers.ts`; add a scripted session for any change to the guide.

## The one thesis

The MVP exists to test one question: does a guided Somatic Tracking practice, done
regularly, change a person's pain over weeks — and can they see that it does? The
practice is the product; the pain record is how it shows whether it works. Everything
serves that. A feature health apps "normally have" is not a reason.

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

**Nothing rewards looking at your pain (from Pattern).** No check-in before or after a
session, no per-session before/after, no week-over-week deltas, arrows, streaks, rings,
completion percentages, or verdict on today. Progress is pain over weeks beside the
days practised, and every chart carries the sentence about what it does not mean,
inside the card it qualifies. Journey's language statements still carry their evidence
sentence, and with too little data any progress view says so.

**Nothing is manufactured.** A recap says "it softened" only if the person said so; a
guided session, where nothing is said, says only where attention rested and for how
long. No change is a complete, valid session and is described plainly, never as failure.

**The guide never decides a symptom is benign.** No diagnosis, no "nothing is wrong",
no "you're safe", no "it's your brain". In conversation mode, possibly-new
symptoms get one neutral familiarity question and, if new, a gentle end with a suggestion
to see a professional; safety is screened locally on every utterance and a remote model
can only raise the level, never lower it. The welcome's safety note covers guided mode.
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

**Colour is never a verdict.** Dark, calm, no red in the body visualisation. The body map
is labelled as an interpretation of what was said, never a scan or a measurement.

## Structure rules

- `domain/` and `engine/` stay free of React and Expo, so they run in Node tests.
- Vendors live behind `voice/types.ts`. The UI only uses `useVoiceSession()`.
- Native modules that Expo Go lacks (`expo-speech-recognition`) are required inside
  try/catch (`voice/speechModule.ts`). An unguarded import crashes Expo Go at launch.
- Developer tools (simulated participant, typed answers, debug panel) render only under
  `__DEV__`.
- Comments explain why — the decision and the failure it prevents.

## Shipping

- Development build: `npx eas-cli@latest build -p ios --profile development` (installs as "Attend Dev").
- Over-the-air updates are not configured yet. When they are, copy Pattern's rules:
  `runtimeVersion` follows `version`, so bumping `version` in `app.json` strands installed builds.
- Windows note (from Pattern): if `expo export` fails with `spawn UNKNOWN`, Windows Application
  Control blocked `hermesc.exe`; build on EAS's servers instead.
