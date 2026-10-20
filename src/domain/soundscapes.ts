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
   * The file's loudness in LUFS (ffmpeg -af ebur128), the measure ears agree with. Every level
   * below is set in LUFS and turned into a volume here, so a bright rain and a low tone sit at
   * the same place under the voice.
   */
  lufs: number;
};

/**
 * Measured on the shipped files: `ffmpeg -nostats -i <file> -af ebur128 -f null -` (integrated
 * loudness). Re-measure if tools/master-recordings.py changes a file.
 */
const LUFS = { rain: -25.0, forest: -22.9, stream: -20.9, waterfall: -22.1, ocean: -22.0, night: -19.8, fire: -21.6, tone: -16.1 } as const;

export const SOUNDSCAPES: readonly Soundscape[] = [
  { id: 'rain', name: 'Soft rain', line: 'Light rain on broad leaves', lufs: LUFS.rain },
  { id: 'forest', name: 'Forest', line: 'Wind in the trees, birds far off', lufs: LUFS.forest },
  { id: 'stream', name: 'Stream', line: 'Shallow water over stones', lufs: LUFS.stream },
  { id: 'waterfall', name: 'Waterfall', line: 'A long fall of water, heard from the path', lufs: LUFS.waterfall },
  { id: 'ocean', name: 'Ocean', line: 'Slow waves on a wide shore', lufs: LUFS.ocean },
  { id: 'night', name: 'Night', line: 'Crickets and a warm evening', lufs: LUFS.night },
  { id: 'fire', name: 'Fireside', line: 'A small fire, settling', lufs: LUFS.fire },
  { id: 'tone', name: 'Soft tone', line: 'A low, steady drone', lufs: LUFS.tone },
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
