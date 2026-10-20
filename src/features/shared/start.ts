import { router } from 'expo-router';
import type { Prefs } from '@/data/types';
import { GUIDE_VOICES } from '@/config';
import { currentTz, dayKey, latestPlace, type CheckIn } from '@/domain/checkin';
import { presetTheme, type Preset } from '@/domain/presets';
import { programDay, SHORT_DAY_MINUTES, type PracticeTheme } from '@/domain/program';
import { backgroundFor, type BackgroundPref } from '@/domain/soundscapes';
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
  background: BackgroundPref;
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
  return {
    type: d.practice.sessionType,
    minutes: (today?.minutes ?? d.practice.minutes) as SessionLength,
    voice: k.prefs.voiceId ?? GUIDE_VOICES[0].id,
    theme: d.practice.theme,
    day: d.day,
    // A whole-body day stays whole-body; otherwise a focus chosen today wins over the usual source.
    place: d.practice.theme !== 'open' && today?.place !== undefined ? today.place : placeFor(d.practice.theme, k),
    background: backgroundFor(k.prefs),
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
    background: backgroundFor(k.prefs),
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

/** Open the session for a plan. `replace` when coming from a screen that should not be returned to (a lesson, Before). */
export function startPractice(plan: PracticePlan, how: 'push' | 'replace' = 'push') {
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
