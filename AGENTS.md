# Attend

A voice-first, eyes-closed somatic practice for chronic pain. Expo SDK 57 / React Native /
TypeScript, iOS first, one founder. Read `README.md` for the architecture.

**Expo has changed.** Read the versioned docs at https://docs.expo.dev/versions/v57.0.0/
before touching an Expo API, and use `npx expo install` for packages.

## How to verify a change

```bash
npm run verify     # tsc (app + tests) and the full node:test suite
```

If it fails, fix it — do not edit a test to match a regression. A whole session can be
driven in `tests/helpers.ts`; add a scripted session for any change to the guide.

## The one thesis

The MVP exists to test one question: does an adaptive, voice-guided Somatic Tracking
practice feel meaningfully more useful than passive meditation or pain tracking?
Everything serves that. A feature health apps "normally have" is not a reason.

## What this app refuses to do

These are product decisions, not preferences. A change that breaks one is a regression
even when it looks like an improvement.

**Voice is the interface.** Once a session starts it must be completable with the eyes
closed: no tap to continue, no body-part picker, no mic button per answer, no reading.
The session screen shows a breathing form, one quiet status word, pause and end.
Never a transcript, never the questions in text, never chat bubbles.

**No numbers about pain.** No scores, scales, before/after, percentages, streaks, or a
hidden scalar computed to draw a line. Progress is derived from the person's language
and maps, and every Journey statement carries its evidence sentence. With too little
data, Journey says so.

**Nothing is manufactured.** A recap says "it softened" only if the person said so. No
change is a complete, valid session and is described plainly, never as failure.

**The guide never decides a symptom is benign.** No diagnosis, no "nothing is wrong",
no "you're safe", no "it's your brain". Possibly-new symptoms get one neutral familiarity
question and, if new, a gentle end with a suggestion to see a professional. Safety is
screened locally on every utterance and a remote model can only raise the level, never
lower it. `FORBIDDEN_GUIDE_LANGUAGE` guards every line, local or remote.

**The guide's voice.** Calm, sparse, confident. Short sentences, the person's own words,
silence as part of every line. No "thank you for sharing", "I hear you", praise, apologies
for pain, or therapy clichés. Closing moves attention out of the body and into the room —
the app is used, then left. Do not add anything that encourages checking the body more.

**The engine owns structure; models own words.** Phase, whether to ask, what kind of
question, and when to end are decided in `SessionEngine`. A `GuideBrain` only phrases the
turn. Arrival, closing and all safety lines are fixed text and never sent to a model.

**Local-first.** Sessions live in SQLite on the device; no account. Speech is recognised on
the device and audio is never stored. No analytics. Changing what leaves the phone means
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
