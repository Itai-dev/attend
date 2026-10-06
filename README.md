# Attend

A voice-first, eyes-closed, adaptive somatic practice for people with chronic pain.
Headspace, but it listens back — built around Somatic Tracking.

You tap one button, put the phone down, close your eyes, and talk. The guide listens
and adapts each prompt to what you said. Underneath, the app quietly builds a map of
the sensations you described. When you open your eyes, you see how your experience
moved or changed. Over weeks, Journey shows — in words and maps, never numbers —
whether the way you meet those sensations is shifting.

Expo SDK 57 · React Native 0.86 · TypeScript · Expo Router · Skia · local-first SQLite · iOS-first.

---

## Run it

```bash
npm install
npm run verify          # typecheck + 30 engine/domain tests
npm start               # Expo Go: full loop with a simulated participant and the phone's voice
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

**Natural voice + Claude guide**: deploy the proxy (`supabase/README.md`), then copy
`.env.example` to `.env.local` and fill in the URL and anon key. Without it, sessions use the
on-device voice and the local adaptive guide — fully offline.

**Web preview** (design review only): `npm run web:setup && npm run web`.

---

## The loop

```
Welcome (a short chat) ──▶ Today / Explore ──tap──▶ Session (eyes closed, voice only) ──▶ Recap ──▶ Journey
```

Three tabs: **Today** (the session set up in the welcome, its length, a few others),
**Explore** (every ready-made session, by what it's for) and **You** (Body, Journey, the
welcome again, Settings). Each ready-made session (`src/domain/presets.ts`) carries its own
type, length and voice, so one tap begins it. The welcome (`src/domain/welcome.ts`) asks what
brings the person here, how much time they have and which voice feels right — never how bad
anything is — and ends on the safety note. It is spoken (`engine/WelcomeRunner.ts`): the same
screen and loop as a session, answers understood on the device, voices auditioned by ear. A
tap-through version is the fallback when listening isn't available or the person prefers it.

1. **Session** — the guide speaks, holds silence, listens, adapts. No tapping, no transcript.
   Pause / end are there for the eyes-open moments; "pause", "continue", "stop" and "sorry?"
   also work by voice.
2. **Recap** — the body map fades in as the eyes open. A short qualitative reflection built
   only from what was said. "At first / By the end" shows the change on the figure.
3. **Journey** — earliest map beside the latest, then evidence-backed statements
   ("Fixed in 4 of your first 4 sessions. Moving or changing in 3 of your last 3."), then
   every session on a timeline.
4. **Body** — everything attended to, recent places brighter, and the places returned to in
   your own words.

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
  design/      Tokens and a handful of components. System type, Dynamic Type.
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

- **Phases** (never named to the person): ARRIVE → NOTICE → LOCATE → EXPLORE → OBSERVE →
  REAPPRAISE → CLOSE, plus SAFETY_CHECK / SAFETY_CLOSE / CRISIS_CLOSE / OPEN_AWARENESS /
  EARLY_CLOSE. Budgets per session type (`engine/phases.ts`); the session closes gently on time.
- **Adaptive, not a questionnaire**: each answer is read by `domain/extract.ts`; the guide
  reacts to it first, in the person's words, then asks only what is still unknown. Known slots
  are never asked. When nothing is left to ask, it holds silence.
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

- Local-first: SQLite on the device, no account.
- Speech is recognised **on the device** (`requiresOnDeviceRecognition`); audio is never saved.
- Transcripts are not persisted (a developer toggle can keep them for debugging).
- With the proxy configured, the *words* of the session go to Claude to adapt the guide, and
  the guide's own lines go to ElevenLabs. Nothing is stored there.
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
