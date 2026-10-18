import { router } from 'expo-router';
import type { Prefs } from '@/data/types';
import { GUIDE_VOICES } from '@/config';
import { latestPlace, type CheckIn } from '@/domain/checkin';
import { presetTheme, type Preset } from '@/domain/presets';
import { programDay, type PracticeTheme } from '@/domain/program';
import { backgroundFor, type BackgroundPref } from '@/domain/soundscapes';
import type { Place, SessionType } from '@/domain/types';
import type { SessionLength } from '@/engine/phases';

/**
 * Starting a practice in one tap. Everything a session needs is decided from what the app
 * already knows — the day's practice or the preset, the voice chosen before, the sound in
 * Settings, where it hurts from the latest check-in — so nothing is asked once the person
 * has decided to begin. The Before screen stays reachable ("adjust") for anyone who wants
 * to change a detail.
 */

export type PracticePlan = {
  type: SessionType;
  minutes: SessionLength;
  voice: string;
  theme: PracticeTheme;
  day?: number;
  place: Place | null;
  background: BackgroundPref;
};

type Known = { prefs: Prefs; checkIns: CheckIn[] };

function placeFor(theme: PracticeTheme, k: Known): Place | null {
  // Resting on the whole body (body scan, sleep, settling) has no single place.
  if (theme === 'open') return null;
  return latestPlace(k.checkIns) ?? k.prefs.place ?? null;
}

export function dayPlan(day: number, k: Known): PracticePlan {
  const d = programDay(day);
  return {
    type: d.practice.sessionType,
    minutes: d.practice.minutes as SessionLength,
    voice: k.prefs.voiceId ?? GUIDE_VOICES[0].id,
    theme: d.practice.theme,
    day: d.day,
    place: placeFor(d.practice.theme, k),
    background: backgroundFor(k.prefs),
  };
}

export function presetPlan(p: Preset, k: Known): PracticePlan {
  const theme = presetTheme(p);
  return { type: p.type, minutes: p.minutes as SessionLength, voice: p.voiceId, theme, place: placeFor(theme, k), background: backgroundFor(k.prefs) };
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
  };
  if (how === 'replace') router.replace({ pathname: '/session', params });
  else router.push({ pathname: '/session', params });
}
