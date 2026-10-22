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
Welcome ──▶ Today / Explore ──▶ Before ──▶ Session (eyes closed, gong to gong) ──▶ Practice complete ──▶ A quote ──▶ Done
```

> **22 Oct 2026:** simplified to three tabs. The body map screen, Journey, the session list,
> sample sessions, and the separate Program and Progress tabs are gone.

Three tabs: **Today** (the program day's lesson and practice, this week's practice dots, check
in), **Explore** (after Headspace: ready-made sessions as colour-tile shelves by what they're
for, and **Sounds**, the four nature recordings on their own, `src/domain/sounds.ts`) and the
person's own tab, **named for them** (practice stats, milestones, moments toward the goal, the
pain record). Settings are a gear at the top right of every tab. Each ready-made session
(`src/domain/presets.ts`) carries its own type, length and voice.

1. **Session** — a gong, then the guide speaks and holds silence. No tapping, no transcript.
   Pause / end are there for the eyes-open moments. A second gong when it closes.
2. **Practice complete** — minutes, days this week, the program; one optional tap about how
   the practice felt; then a closing screen with one quote (`src/domain/quotes.ts`).
3. **Sounds** — the gong, a nature recording for 10, 20, 30 minutes or until stopped, the
   gong again. Not counted as practice.

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
server/lib/agents.ts        The ElevenLabs agents (one per session type). Edit pace, tone prompt and
                            first message in the ElevenLabs dashboard; read via GET /agent. The voice
                            itself is one per session type, in code (SESSION_VOICES, domain/presets.ts),
                            spoken at "Robust" stability with a fixed seed so a session keeps one voice.
tools/make-ambience.py      Nature under each session type: public-domain field recordings cut into
                            seamless loops (assets/audio/ambience-*.wav, credited in CREDITS.md).
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
