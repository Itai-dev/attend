/**
 * The sounds Attend can play: under a guided session, or on their own ("Just listen").
 *
 * They are atmosphere and nothing more. No copy calls them healing, says they lower pain,
 * or ties them to the pain record, and listening on its own is not counted as practice —
 * the program's days, minutes and milestones count guided practice only (AGENTS.md:
 * reward practice, never pain; nothing is manufactured).
 *
 * Pure data, free of React and Expo, so the catalogue and its rules run in Node tests.
 * The audio files themselves are mapped in voice/soundscapeAssets.ts.
 */

import type { PracticeTheme } from './program';
import type { SessionType } from './types';

/**
 * Soft tones at six pitches (20 Oct 2026: "for now, replace the nature sounds with soft tones at
 * different frequencies"). Each is named by its number, because that is how people know these
 * pitches. A whole mythology of "healing frequencies" hangs on those numbers; the app repeats
 * none of it (docs/RESEARCH.md, "Frequencies"): a tone's name is its pitch and its line says how
 * it sounds, never what it is for. The nature recordings are paused, not gone
 * (voice/soundscapeAssets.ts says how to bring them back).
 */
export type SoundscapeId = 'hz174' | 'hz285' | 'hz396' | 'hz432' | 'hz528' | 'hz639';
/**
 * The standing choice of what plays under a practice: one of the sounds, only the guide's voice,
 * or a sound matched to each practice (20 Oct 2026, the default).
 */
export type BackgroundPref = SoundscapeId | 'none' | 'matched';
/** What plays under one practice, once 'matched' is resolved for it. */
export type Background = SoundscapeId | 'none';
/** What a practice is, as far as its sound is concerned. */
export type PracticeKind = { type?: SessionType; theme?: PracticeTheme };

export type Soundscape = {
  id: SoundscapeId;
  /**
   * The pitch, "432 Hz". Shown as it is, even where labels are lowercase: "Hz" is a unit, and
   * "432 hz" reads as a typo (AGENTS.md "App copy").
   */
  name: string;
  /** One short line, about the sound itself. Never what it does for the body. */
  line: string;
  /**
   * The file's loudness in LUFS (ffmpeg -af ebur128), the measure ears agree with. Every level
   * below is set in LUFS and turned into a volume here, so a low tone and a bright one sit at
   * the same place under the voice.
   */
  lufs: number;
};

/**
 * Measured on the shipped files: tools/make-tones.py prints each one's integrated loudness
 * (`ffmpeg -nostats -i <file> -af ebur128 -f null -`). Re-measure whenever the script changes.
 */
const LUFS = { hz174: -19.9, hz285: -19.6, hz396: -19.4, hz432: -19.3, hz528: -19.1, hz639: -18.9 } as const;

export const SOUNDSCAPES: readonly Soundscape[] = [
  { id: 'hz174', name: '174 Hz', line: 'The deepest: a low hum', lufs: LUFS.hz174 },
  { id: 'hz285', name: '285 Hz', line: 'Low and warm', lufs: LUFS.hz285 },
  { id: 'hz396', name: '396 Hz', line: 'Low, with a little more body', lufs: LUFS.hz396 },
  { id: 'hz432', name: '432 Hz', line: 'In the middle: soft and round', lufs: LUFS.hz432 },
  { id: 'hz528', name: '528 Hz', line: 'A little brighter', lufs: LUFS.hz528 },
  { id: 'hz639', name: '639 Hz', line: 'The brightest: clear and light', lufs: LUFS.hz639 },
];

/**
 * The fallback sound: for a practice nothing below matches, and for Just listen when the
 * practice's sound is "no sound". The middle of the range.
 */
export const DEFAULT_BACKGROUND: SoundscapeId = 'hz432';

export function soundscape(id: string | undefined): Soundscape | undefined {
  return SOUNDSCAPES.find((s) => s.id === id);
}

/*
 * Sounds stored by earlier builds (20 Oct 2026). Before the tones there were seven nature
 * recordings and one tone, `'tone'`, at 432 Hz. A stored choice must never break a practice or
 * a listen: the old tone is the same pitch as hz432, so it stays chosen; a nature recording has
 * no counterpart, so a practice's sound goes back to matched, and a listen's to the middle tone.
 */
const LEGACY_NATURE = ['rain', 'forest', 'stream', 'waterfall', 'ocean', 'night', 'fire'];

/** A stored `prefs.background`, from any build, as this build reads it. Unknown values pass through (backgroundFor falls back). */
export function migrateBackground(v: unknown): BackgroundPref | undefined {
  if (v === 'tone') return 'hz432';
  if (typeof v === 'string' && LEGACY_NATURE.includes(v)) return 'matched';
  return v as BackgroundPref | undefined;
}

/** A stored `prefs.listen.id`, from any build: a sound this build has, else the middle tone. */
export function migrateListenId(v: unknown): SoundscapeId {
  return soundscape(typeof v === 'string' ? v : undefined)?.id ?? DEFAULT_BACKGROUND;
}

/** Stored prefs with their sound choices brought up to date. Returns the same object when nothing changes. */
export function migrateSoundPrefs<P extends { background?: BackgroundPref; listen?: { id: SoundscapeId } }>(prefs: P): P {
  const background = migrateBackground(prefs.background);
  const listenId = prefs.listen ? migrateListenId(prefs.listen.id) : undefined;
  if (background === prefs.background && listenId === prefs.listen?.id) return prefs;
  const next = { ...prefs, background };
  if (prefs.listen && listenId) next.listen = { ...prefs.listen, id: listenId };
  if (background === undefined) delete next.background;
  return next;
}

/**
 * The standing choice of what plays under a session. An explicit choice wins; before
 * soundscapes existed the only setting was the tone on or off, and "off" must stay off.
 * Someone who never chose gets a sound matched to each practice.
 */
export function backgroundFor(prefs: { background?: BackgroundPref; ambience?: boolean }): BackgroundPref {
  const b = migrateBackground(prefs.background);
  if (b === 'none' || b === 'matched' || soundscape(b)) return b!;
  if (prefs.ambience === false) return 'none';
  return 'matched';
}

/*
 * Matched sounds (20 Oct 2026). Pairings are by ear, about the room the practice is in, never
 * about what a pitch does for the body: no copy anywhere says a tone settles, eases or heals.
 * The session type speaks first (a flare is a flare whatever its theme); then the theme.
 * 639 Hz, the brightest, is there to choose and is never matched.
 */
const TYPE_SOUND: Partial<Record<SessionType, SoundscapeId>> = {
  // Before sleep: the deepest, with the least in it to follow.
  sleep: 'hz174',
  // A flare: low and warm, under everything else.
  flare: 'hz285',
  // A worried moment: low, with enough body to be there without asking for attention.
  fear: 'hz396',
};

const THEME_SOUND: Record<PracticeTheme, SoundscapeId> = {
  // Arriving, letting a brace go, kindness: low and warm, a quiet room to sit in.
  settle: 'hz285',
  brace: 'hz285',
  kind: 'hz285',
  // An urge, edges, movement, texture: a low tone with a little more body, something steady
  // beneath what changes.
  urge: 'hz396',
  edges: 'hz396',
  moves: 'hz396',
  texture: 'hz396',
  // Looking around — finding the place, curiosity, the body as a whole, the breath: the middle
  // of the range, nothing pulling high or low.
  locate: 'hz432',
  curious: 'hz432',
  open: 'hz432',
  breath: 'hz432',
  // What is pleasant, and practice taken into moving about: a little brighter, eyes-open daytime.
  pleasant: 'hz528',
  activity: 'hz528',
  // The same as their session types.
  fear: 'hz396',
  flare: 'hz285',
};

/** The sound that suits a practice: by its type, then its theme, else the middle tone. */
export function soundForPractice(p: PracticeKind = {}): SoundscapeId {
  return (p.type && TYPE_SOUND[p.type]) || (p.theme && THEME_SOUND[p.theme]) || DEFAULT_BACKGROUND;
}

/** What plays under this practice: the choice, with 'matched' (or anything unknown) resolved for it. */
export function resolveBackground(pref: BackgroundPref | undefined, practice?: PracticeKind): Background {
  pref = migrateBackground(pref);
  if (pref === 'none') return 'none';
  if (pref !== 'matched' && soundscape(pref)) return pref!;
  return soundForPractice(practice);
}

/**
 * The choice as a row's value, glanced at: "matched · 285 Hz", "432 Hz", "no sound". Lowercase
 * words; the pitch keeps its unit as written (see Soundscape.name).
 */
export function backgroundLabel(pref: BackgroundPref, practice?: PracticeKind): string {
  pref = migrateBackground(pref) ?? 'matched';
  if (pref === 'none') return 'no sound';
  const name = soundscape(resolveBackground(pref, practice))?.name ?? '';
  return pref === 'matched' ? `matched · ${name}` : name;
}

/** Sleep-timer lengths for Just listen, in minutes. `0` plays until stopped. */
export const LISTEN_TIMERS = [10, 20, 30, 60, 0] as const;
export type ListenTimer = (typeof LISTEN_TIMERS)[number];
export const DEFAULT_LISTEN_TIMER: ListenTimer = 20;

/** After a sleep practice the sound plays on as a listen this long, then fades (studio round 2). */
export const SLEEP_TAIL_MINUTES = 30 as const satisfies ListenTimer;

/**
 * What follows a practice's last word. Before sleep, a practice that ran to its end goes to rest:
 * the screen stays dark and the sound under it carries on as a listen on a timer, so nobody
 * drifting off is woken by it stopping. Ended by the person, they are awake: the usual After.
 * The tail is a listen like any other, so it is never practice: the session it follows is
 * already recorded, with its guided minutes only.
 */
export function afterPractice(type: string, outcome: string, background: BackgroundPref): { rest: boolean; sound?: SoundscapeId } {
  if (type !== 'sleep' || outcome !== 'completed') return { rest: false };
  const sound = resolveBackground(background, { type: 'sleep' });
  return sound === 'none' ? { rest: true } : { rest: true, sound };
}

/** How long the sound takes to fade in, and to fade out at the end of a timer. */
export const LISTEN_FADE_IN_MS = 4000;
export const LISTEN_FADE_OUT_MS = 45_000;

/**
 * The volume a listen should be at: a slow rise from the start (`elapsedMs` of playing) and a
 * long fall before the timer ends (`timerElapsedMs` since the timer was set, which is the
 * same unless it was changed mid-listen), so nobody drifting off is woken by a sound
 * stopping. 0..1, times the sound's own level.
 */
export function listenVolumeAt(elapsedMs: number, timerMin: ListenTimer, timerElapsedMs = elapsedMs): number {
  const rise = Math.min(1, Math.max(0, elapsedMs / LISTEN_FADE_IN_MS));
  if (!timerMin) return ease(rise);
  const total = timerMin * 60_000;
  const left = total - timerElapsedMs;
  if (left <= 0) return 0;
  const fall = Math.min(1, left / Math.min(LISTEN_FADE_OUT_MS, total / 2));
  return ease(Math.min(rise, fall));
}

/** "18 min left", "until you stop": the timer, in words, lowercase like everything glanced at. `elapsedMs` counts from when it was set. */
export function timerLabel(timerMin: ListenTimer, elapsedMs = 0): string {
  if (!timerMin) return 'until you stop';
  const left = Math.max(0, Math.ceil((timerMin * 60_000 - elapsedMs) / 60_000));
  return left <= 1 ? 'fading out' : `${left} min left`;
}

/**
 * The level a sound plays at on its own: matched across sounds, and kept low — loud enough
 * to fill the room at a normal phone volume, quiet enough to fall asleep to.
 */
export function listenLevel(s: Soundscape): number {
  return volumeFor(s, LISTEN_LUFS);
}

/** On its own (Just listen, the Sounds tab), with nothing to sit under. */
export const LISTEN_LUFS = -24;

/**
 * The guide's voice as it arrives from the voice server (ElevenLabs, measured on spoken lines:
 * about -24.5 LUFS) and the sound's place under it (20 Oct 2026: "the sound is too loud compared
 * to the narration"). While the guide speaks the sound sits about 18 dB under the voice, so
 * every word is clear; in the silences between lines it comes up to about 12 dB under, enough
 * to be the room the person is in, never so much that the next line has to climb over it.
 */
export const VOICE_LUFS = -24.5;
export const UNDER_VOICE = { speaking: -43, listening: -44, preparing: -40, holding: -37 } as const;

/** The volume (0..1) that puts a sound at a target loudness. */
export function volumeFor(s: Soundscape, targetLufs: number): number {
  return Math.min(1, Math.round(10 ** ((targetLufs - s.lufs) / 20) * 1000) / 1000);
}

const ease = (t: number) => t * t * (3 - 2 * t);
