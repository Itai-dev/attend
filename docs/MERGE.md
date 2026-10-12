# Attend + Pattern: the merge plan

Decided 12 Oct 2026. Attend is the base; Pattern's pain record moves in. Pattern's repo
(`pattern-native`) stays as the archive for everything not ported.

## Why

- The product is the practice. People come to change their pain, not to log it.
- Practice alone can't show progress, and the in-session questions were the part that
  didn't work. Pattern's check-in is the outcome record that shows whether practice helps.
- Pattern had no testers, so moving it costs nobody anything.
- Pattern's model, pain scale and trend logic are pure TypeScript with tests: cheap to port.
  Its widgets, watch target, calendar, report and sync are native-heavy: left behind.

## What changes

### 1. Sessions become guided only

- The guide speaks and holds silence. It never asks, so the session never listens.
- No microphone, no speech recognition, no transcript. Nothing said in a session leaves the
  phone, because nothing is said.
- Shape: ARRIVE → SCAN → attention rests on one place (OBSERVE) → REAPPRAISE → CLOSE.
  With no place known: ARRIVE → SCAN → whole-body attention (OPEN_AWARENESS) → CLOSE.
- Time fills with guidance and silence; the engine still closes on time.
- The place comes from the latest check-in's "where", else the usual place from earlier
  sessions, else the whole body.
- The conversational engine stays in the code (and its tests) behind `mode: 'conversation'`,
  so it can return if the guided version proves weaker. The app uses `mode: 'guided'`.
- Safety: with no speech, there is nothing to screen during a session. The safety note
  stays in the welcome, and the guide's fixed lines still pass `violatesGuideLanguage`.

### 2. Pain check-in (from Pattern)

- Pain 0–10 with Pattern's five words (No pain · Mild · Moderate · Severe · Most intense).
  The number is what the person entered; nothing is derived from it.
- Where: chips from Attend's own regions, so a check-in place and a session place are the
  same vocabulary.
- Optional, three-state, as in Pattern: never asked, asked and skipped, answered.
- Check-ins are separate from sessions. There is no check-in before or after a session.

### 3. Progress

- Pain over weeks: each day's peak (Pattern's rule), drawn as a quiet line.
- Practice beside it: which days had a session.
- No week-over-week deltas, arrows, streaks, or verdicts. Every chart carries the sentence
  about what it does not mean.
- Journey and Body keep working for older conversation sessions.

## Order of work

1. Plan and rules (this file, AGENTS.md).
2. Guided-only sessions: engine mode, guided lines, no listening, recap, storage.
3. Pain check-in: model and scale from Pattern, storage, screen.
4. Progress: pain by week with practice days.

## Left in Pattern, for later

Widgets, Apple Watch, Apple Health (HRV, sleep, workouts), calendar, experiments, activity
pacing, clinician report, accounts and encrypted sync, analytics.
