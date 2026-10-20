# Attend

A voice-guided, eyes-closed somatic practice for people with chronic pain, with a simple
pain record (ported from Pattern) to show whether practice is helping. See `docs/MERGE.md`.

> **13 Oct 2026:** Attend is a 28-day program — a 2-minute lesson and a guided practice a
> day, in four weeks (Understand, Notice, Soften, Live), following Pain Reprocessing
> Therapy's order. Sessions are guided only: the guide speaks and holds silence, and never
> asks or listens. Engagement rewards practice, never pain: practice days per week (no
> streak to lose), milestones, a program path, moments toward the person's own goal, one
> gentle reminder. The pain record (from Pattern) sits beside it on Progress. See
> `docs/RESEARCH.md` and `docs/MERGE.md`. The conversational loop described below is kept
> behind `mode: 'conversation'` (Settings → Developer).

> **18 Oct 2026:** the look follows daisysound.com — off-white and ink by day, black at night
> (follows the iPhone; the session is always dark), lowercase headings, square controls, and
> misty film-style photographs for every sound and time of day (`design/Photo.tsx`,
> `tools/grade-photos.py`) — and sound: seven
> nature soundscapes, real public-domain field recordings (`assets/audio/soundscapes/SOURCES.md`,
> built by `tools/master-recordings.py`; the app loops
> each one seamlessly with two players crossing over, `voice/crossfadeLoop.ts`, so a recording can
> be minutes long), chosen under each session or played on their own from the
> **Sounds** tab with a sleep timer (`voice/listen.ts`). The plan to the App Store and paying
> users is `docs/LAUNCH.md`.
>
> **The flow (18 Oct 2026):** three tabs — **Today** (one button for the day: lesson, then
> straight into the practice; four one-tap moments: a flare, can't sleep, body scan, worried),
> **Sounds** (tap one, it plays) and **Progress** (the 28-day path, practice, the pain record).
> Settings is the gear on Today. The welcome is seven short screens, one question each, and ends
> by starting Day 1. Practices start in one tap from what the app already knows
> (`features/shared/start.ts`); "Adjust" on Today opens the Before screen for length, voice and
> sound.

Expo SDK 57 · React Native 0.86 · TypeScript · Expo Router · Skia · local-first SQLite · iOS-first.

---

## Run it

```bash
npm install
npm run verify          # typecheck + the node:test suite
npm start               # Expo Go: the full app; the guide's voice needs the voice server
```

**Expo Go** has no speech recognition module, so in development the app answers the guide
with a *simulated participant* (Settings → Developer). Everything else is real: the engine,
the guide, the voice, the map, the recap, Journey.

**Real listening** needs a development build (on-device speech recognition is native):

```bash
npx eas-cli@latest init                      # once: creates the EAS project for com.itaiagami.attend
npx eas-cli@latest build -p ios --profile development
npm run start:dev-client
```

The development build installs as **Attend Dev** beside the real app (same pattern as Pattern).

**The guide's voice** comes from the voice server (`server/`, ElevenLabs). There is no
on-device voice fallback. Lines are cached on the phone by voice and words, and the server's
script and voice settings are saved on the device (`voice/savedGuide.ts`), so a practice that
has played once plays again offline. If a line can't load, the session pauses and says why;
resume tries once, quickly.

**Web preview** (design review only): `npm run web:setup && npm run web`.

---

## The flow

```
Welcome (7 short screens) ──▶ Day 1 lesson (read or listen) ──▶ Practice (eyes closed) ──▶ After ──▶ Today
```

Three tabs (18 Oct 2026, `docs/STUDIO.md`):

- **Today** has one button for the day: the lesson, then straight into the guided practice.
  Below it:
  - a 3-minute short version that also completes the day
  - four one-tap practices (in a flare, can't sleep, body scan, feeling worried)
  - the week's practice dots
  - a quiet row to log pain
- **Sounds:** tap one and it plays, with a sleep timer.
- **Progress:** the 28-day path, then practice and milestones, then the pain record. The two
  halves are never mixed.

Settings is the gear on Today.

1. **Practice.** The guide speaks and holds silence. It never asks and never listens
   (`mode: 'guided'`). The screen shows a dim breathing form. Pause and end fade after a few
   seconds and come back on a tap. It keeps playing with the phone locked.
2. **After.** One moment: what was done, the week's dots, and one optional question about
   the practice, never the pain. A sleep practice skips it: the screen stays dark and the
   sound carries on, then fades.
3. **Progress.** Practice and the pain record side by side, never mixed, never graded.

The conversation mode (the guide listens and adapts, with a recap, Journey and Body) is kept
behind Settings → Developer.

---

## Architecture

```
src/
  domain/      Pure TS. Types, regions, sensation lexicon, extraction, body map + change
               detection, safety screen, recap, Journey analysis. No React, no Expo.
  engine/      SessionEngine (state machine: phases, time, safety, record),
               GuideBrain interface + LocalGuideBrain (offline) + RemoteGuideBrain (Claude),
               SessionRunner (speak → hold → listen → ingest loop with pause/abort).
  voice/       SpeechInput / SpeechOutput interfaces and implementations:
               OnDeviceSpeechInput (expo-speech-recognition, on-device only),
               SimulatedParticipantInput, DevTextInput (dev only),
               ElevenLabsSpeechOutput (via proxy; the only voice),
               VoiceSessionProvider (the only thing the UI talks to).
  data/        SessionRepository: SQLite on device, localStorage on web; seed samples.
  viz/         SkSL shaders (body field, breathing field), BodyMapState → uniforms.
  design/      Light and dark palettes, ThemeProvider (useColors/useStyles, forceDark),
               Photo, a handful of components. System type, Dynamic Type.
  features/    Screens. app/ holds routes only.
supabase/functions/attend   The proxy: POST /guide (Claude), GET /tts (ElevenLabs).
server/                     The voice server on Vercel: GET /tts (ElevenLabs v4), GET /script, POST /guide.
server/lib/agents.ts        The ElevenLabs agents (one per session type). Edit voice, pace, tone
                            prompt and first message in the ElevenLabs dashboard; read via GET /agent.
server/lib/guideScript.ts   Everything the guide says. Edit and commit: the next session on every
                            phone uses it, no rebuild. Safety lines stay fixed in the app.
tests/                      node:test, run through tsx.
```

The separations the brief asked for, and where they are enforced:

| Separation | How |
| --- | --- |
| Session logic ↔ UI | `SessionEngine` and `SessionRunner` have no React imports; a whole session runs in a unit test in ms. |
| AI provider ↔ session engine | The engine decides structure (phase, ask kind, end); a `GuideBrain` only picks words. `RemoteGuideBrain` rewrites the local proposal and falls back to it on any failure or forbidden phrase. |
| Voice vendor ↔ everything | `SpeechInput` / `SpeechOutput`. The UI imports `useVoiceSession()` and nothing else. |
| Body-map data ↔ visualisation | `BodyMapState` is plain data; `viz/bodyUniforms.ts` turns it into shader numbers. |
| Demo behaviour ↔ production | Simulated / typed input and the debug panel exist only behind `__DEV__`. Seeded samples are flagged `isSample`, labelled, removable. |

### The guide

- **Phases** (never named to the person): ARRIVE → SCAN → NOTICE → LOCATE → EXPLORE → OBSERVE →
  REAPPRAISE → CLOSE, plus SAFETY_CHECK / SAFETY_CLOSE / CRISIS_CLOSE / OPEN_AWARENESS /
  EARLY_CLOSE. Budgets per session type (`engine/phases.ts`); the session closes gently on time.
- **Adaptive, not a questionnaire**: each answer is read by `domain/extract.ts`; the guide
  reacts to it first, in the person's words, then asks only what is still unknown. Known slots
  are never asked. When nothing is left to ask, it holds silence.
- **Guided, not only asked**: SCAN is a body scan from the feet up (one sweep, three steps or
  seven, by length) with nothing asked. While observing, every answer is followed by a turn of
  guidance (breath around it, widening attention, softening what braces) before the next question.
- **Questions are answered**: "how should I breathe?", "what am I meant to do?" get a short
  answer, then the guide's own question again. "Is this serious?" gets fixed text — the guide
  can't tell, see a doctor if it's new or changing — and the one familiarity question.
- **Memory**: the usual place and words from earlier sessions (`domain/memory.ts`) decide where
  attention goes after the scan, settle a loosely named place ("my back") onto the usual one,
  and offer the word used before — so the same pattern is recorded as the same pattern.
- **Turn cue**: a soft bell (`assets/audio/turn-cue.wav`) before the guide listens.
- **Silence is a feature**: every line carries its own pause; holds of 10–15 s are normal.
- **Describe vs observe**: detail given while describing fills the *baseline*; anything that
  differs once the session turns to watching is recorded as a *change*, with the person's
  sentence as its only evidence. No change is ever inferred.

### Safety

Every utterance is screened locally before anything else (`domain/safety.ts`):
crisis language stops the practice and points to immediate help; urgent symptoms stop it with a
neutral suggestion to seek care; hints that something is new ask once whether it is familiar.
No reinterpretation is ever offered for a possibly-new symptom. A guard rejects any line —
local or from the model — that claims safety, diagnoses, or turns into cheerleading.

### Privacy

- Local-first: SQLite on the device, no account. Sessions and check-ins live there.
- Guided sessions (the default) never use the microphone: nothing said is heard or sent.
- The welcome's speech is recognised **on the device** (`requiresOnDeviceRecognition`); audio is never saved.
- Transcripts are not persisted (a developer toggle can keep them for debugging).
- The place a guided session rests on comes from the latest check-in, or the usual place in
  earlier sessions (`domain/memory.ts`) — both read on the device.
- With the voice server configured, the guide's own lines go to ElevenLabs to be voiced.
  In the developer-only conversational mode, the words of the session also go to Claude.
  Nothing is stored there.
- No analytics.
- Settings → Delete all sessions.

---

## What it deliberately does not have

Pain scores, mood scores, 1–10 scales, before/after numbers, streaks, badges, goals,
charts of symptoms, check-ins, journaling, a chat screen, a transcript, an avatar,
a content library, Apple Health, a paywall. See `AGENTS.md`.

## Status

Built and verified here: typecheck, 30 tests (extraction, safety, recap honesty, Journey
evidence, full scripted sessions, remote-guide fallback), the web build of every screen,
an `expo prebuild` of the iOS project (permissions, background audio, bundle id, team).
Not verifiable from here: an iPhone. First things to check on device are listed in
`docs/ON-DEVICE.md`.
