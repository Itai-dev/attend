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

export type SoundscapeId = 'rain' | 'forest' | 'stream' | 'waterfall' | 'ocean' | 'night' | 'fire' | 'tone';
/** What plays under a session: one of the sounds, or only the guide's voice. */
export type BackgroundPref = SoundscapeId | 'none';

export type Soundscape = {
  id: SoundscapeId;
  name: string;
  /** One short line, about the sound itself. Never what it does for the body. */
  line: string;
  /**
   * Level relative to the original 432 Hz tone, so the session's quiet/fuller levels
   * (voice/ambience.ts) sound alike whatever plays. Noise reads louder than a pure tone at
   * the same power, hence the 0.75.
   */
  gain: number;
};

/** Every nature sound is mastered to this average level (tools/master-soundscapes.py). */
const MASTERED_DB = -26;
const toneMatch = (rmsDb: number) => Math.round(0.75 * 10 ** ((-14.7 - rmsDb) / 20) * 100) / 100;

export const SOUNDSCAPES: readonly Soundscape[] = [
  { id: 'rain', name: 'Soft rain', line: 'Steady rain on leaves', gain: toneMatch(MASTERED_DB) },
  { id: 'forest', name: 'Forest', line: 'Wind in the trees, birds far off', gain: toneMatch(MASTERED_DB) },
  { id: 'stream', name: 'Stream', line: 'Shallow water over stones', gain: toneMatch(MASTERED_DB) },
  { id: 'waterfall', name: 'Waterfall', line: 'A long fall of water, heard from the path', gain: toneMatch(MASTERED_DB) },
  { id: 'ocean', name: 'Ocean', line: 'Slow waves on a wide shore', gain: toneMatch(MASTERED_DB) },
  { id: 'night', name: 'Night', line: 'Crickets and a warm evening', gain: toneMatch(MASTERED_DB) },
  { id: 'fire', name: 'Fireside', line: 'A small fire, settling', gain: toneMatch(MASTERED_DB) },
  { id: 'tone', name: 'Soft tone', line: 'A low drone, tuned to 432 Hz', gain: 1 },
];

/** Under a session, for someone who has never chosen: rain is the most even of the sounds. */
export const DEFAULT_BACKGROUND: SoundscapeId = 'rain';

export function soundscape(id: string | undefined): Soundscape | undefined {
  return SOUNDSCAPES.find((s) => s.id === id);
}

/**
 * What plays under a session. An explicit choice wins; before soundscapes existed the only
 * setting was the tone on or off, and "off" must stay off.
 */
export function backgroundFor(prefs: { background?: BackgroundPref; ambience?: boolean }): BackgroundPref {
  if (prefs.background === 'none' || soundscape(prefs.background)) return prefs.background!;
  if (prefs.ambience === false) return 'none';
  return DEFAULT_BACKGROUND;
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
  return background === 'none' ? { rest: true } : { rest: true, sound: background };
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

/** "18 min left", "Until you stop": the timer, in words. `elapsedMs` counts from when it was set. */
export function timerLabel(timerMin: ListenTimer, elapsedMs = 0): string {
  if (!timerMin) return 'Until you stop';
  const left = Math.max(0, Math.ceil((timerMin * 60_000 - elapsedMs) / 60_000));
  return left <= 1 ? 'Fading out' : `${left} min left`;
}

/**
 * The level a sound plays at on its own: matched across sounds, and kept low — loud enough
 * to fill the room at a normal phone volume, quiet enough to fall asleep to.
 */
export function listenLevel(s: Soundscape): number {
  return Math.min(1, 0.3 * s.gain);
}

const ease = (t: number) => t * t * (3 - 2 * t);
