import { router } from 'expo-router';
import type { Prefs } from '@/data/types';
import { GUIDE_VOICES } from '@/config';
import { currentTz, dayKey, latestPlace, type CheckIn } from '@/domain/checkin';
import { presetTheme, type Preset } from '@/domain/presets';
import { currentDay, EMPTY_PROGRAM, practiceMinutes, programDay, SHORT_DAY_MINUTES, type PracticeTheme } from '@/domain/program';
import {
  backgroundFor,
  DEFAULT_BACKGROUND,
  DEFAULT_LISTEN_TIMER,
  resolveBackground,
  soundscape,
  type Background,
  type PracticeKind,
  type SoundscapeId,
} from '@/domain/soundscapes';
import { startListening } from '@/voice/listen';
import { noteStart } from '../finish/started';
import type { Place, SessionType } from '@/domain/types';
import type { SessionLength } from '@/engine/phases';

/**
 * Starting a practice in one tap. Everything a session needs is decided from what the app
 * already knows — the day's practice or the preset, the voice chosen before, the sound in
 * Settings, where it hurts from the latest check-in — so nothing is asked once the person
 * has decided to begin. Practice settings (/before) is where a detail is changed; it saves and
 * returns, and dayPlan() reads what it saved.
 */

export type PracticePlan = {
  type: SessionType;
  minutes: SessionLength;
  voice: string;
  theme: PracticeTheme;
  day?: number;
  place: Place | null;
  /**
   * The sound under this practice, already resolved: a choice of "matched" becomes the sound
   * that suits this practice (domain/soundscapes.ts soundForPractice), so /session's params
   * carry a real sound or 'none'.
   */
  background: Background;
  /** The body scan preset's own scan. Never set for a program day, whatever its theme. */
  scan?: 'body';
};

type Known = { prefs: Prefs; checkIns: CheckIn[] };

function placeFor(theme: PracticeTheme, k: Known): Place | null {
  // Resting on the whole body (body scan, sleep, settling) has no single place.
  if (theme === 'open') return null;
  return latestPlace(k.checkIns) ?? k.prefs.place ?? null;
}

/**
 * Today's choices from practice settings (prefs.practiceToday), or nothing if they were made on
 * another day: a length picked in a flare shouldn't follow the person into next week.
 */
export function todaysChoices(prefs: Prefs, now = Date.now()): NonNullable<Prefs['practiceToday']> | undefined {
  const t = prefs.practiceToday;
  return t && t.date === dayKey(now, currentTz(new Date(now))) ? t : undefined;
}

export function dayPlan(day: number, k: Known): PracticePlan {
  const d = programDay(day);
  const today = todaysChoices(k.prefs);
  const kind = { type: d.practice.sessionType, theme: d.practice.theme };
  return {
    type: d.practice.sessionType,
    // Today's choice, then the standing length, then the program's (practiceMinutes).
    minutes: practiceMinutes(d.practice.minutes, k.prefs.practiceLength, today?.minutes) as SessionLength,
    voice: k.prefs.voiceId ?? GUIDE_VOICES[0].id,
    theme: d.practice.theme,
    day: d.day,
    // A whole-body day stays whole-body; otherwise a focus chosen today wins over the usual source.
    place: d.practice.theme !== 'open' && today?.place !== undefined ? today.place : placeFor(d.practice.theme, k),
    background: resolveBackground(backgroundFor(k.prefs), kind),
  };
}

export function presetPlan(p: Preset, k: Known): PracticePlan {
  const theme = presetTheme(p);
  // One voice for every practice: a flare at 2am should sound like the guide they know, and is
  // more likely already cached (studio round 1). Presets' own voices are only a fallback.
  return {
    type: p.type,
    minutes: p.minutes as SessionLength,
    voice: k.prefs.voiceId ?? GUIDE_VOICES[0].id,
    theme,
    place: placeFor(theme, k),
    background: resolveBackground(backgroundFor(k.prefs), { type: p.type, theme }),
    ...(p.scan ? { scan: p.scan } : {}),
  };
}

/**
 * "Short on energy? 3 minutes completes the day": the day's own practice, its theme and voice,
 * at three minutes. A scripted short version (the brief scan, the theme's lines) rather than a
 * long practice cut off, and it completes the day by running to its end (dayCompleted).
 */
export function shortDayPlan(day: number, k: Known): PracticePlan {
  return { ...dayPlan(day, k), minutes: SHORT_DAY_MINUTES };
}

/**
 * Today's program practice, as far as its sound goes: what "matched" means today where no plan
 * is at hand (Settings' "Today: 285 Hz", the Sounds tab's footer).
 */
export function todaysPractice(prefs: Prefs, now = Date.now()): PracticeKind {
  const { day } = currentDay(prefs.program ?? EMPTY_PROGRAM, dayKey(now, currentTz(new Date(now))));
  const d = programDay(day);
  return { type: d.practice.sessionType, theme: d.practice.theme };
}

/** Open the session for a plan. `replace` when coming from a screen that should not be returned to (a lesson, Before). */
export function startPractice(plan: PracticePlan, how: 'push' | 'replace' = 'push') {
  // The finish names the body scan, which the saved session can't say (finish/started.ts).
  noteStart(plan);
  const params = {
    type: plan.type,
    minutes: String(plan.minutes),
    voice: plan.voice,
    theme: plan.theme,
    ...(plan.day ? { day: String(plan.day) } : {}),
    place: plan.place ? JSON.stringify(plan.place) : 'none',
    background: plan.background,
    ...(plan.scan ? { scan: plan.scan } : {}),
  };
  if (how === 'replace') router.replace({ pathname: '/session', params });
  else router.push({ pathname: '/session', params });
}

/**
 * "or just 174 Hz, no voice →": the sound under practice on its own, for someone at night who
 * wanted a sound and not a guide (Tom, round 5). Plays the sound chosen for practice; when that
 * is "matched", what a sleepless night is matched to (the deepest tone; a listen is not a
 * practice); when it is "no sound", the middle tone. With the last listen's timer, and opens
 * the player. Listening is not practice: nothing is recorded or counted (voice/listen.ts).
 */
export function justListenSound(prefs: Prefs): SoundscapeId {
  const bg = resolveBackground(backgroundFor(prefs), { type: 'sleep' });
  return bg === 'none' ? DEFAULT_BACKGROUND : bg;
}

/** The link's words: "or just 174 Hz, no voice". The pitch keeps its unit (Soundscape.name). */
export function justListenLabel(prefs: Prefs): string {
  return `or just ${soundscape(justListenSound(prefs))?.name ?? 'a tone'}, no voice`;
}

export function startJustListen(prefs: Prefs, setPrefs: (p: Partial<Prefs>) => unknown, how: 'push' | 'replace' = 'push') {
  const id = justListenSound(prefs);
  const timer = prefs.listen?.timer ?? DEFAULT_LISTEN_TIMER;
  startListening(id, timer);
  setPrefs({ listen: { id, timer } });
  if (how === 'replace') router.replace('/listen');
  else router.push('/listen');
}
