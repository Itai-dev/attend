/**
 * Just listen (21 Oct 2026, brought back from the look-and-sound branch, PR #19): one of the
 * nature recordings on its own, with a sleep timer and no voice, for falling asleep, a loud
 * evening, or a few quiet minutes.
 *
 * It is atmosphere and nothing more. Listening is not practice: it is never recorded and never
 * counts toward the program's days, minutes or milestones (AGENTS.md: reward practice, never
 * pain; nothing is manufactured). No copy calls a sound healing or ties it to pain.
 *
 * Pure data, free of React and Expo, so the rules run in Node tests. The recordings are the
 * same four loops that play under sessions (voice/soundAssets.ts, assets/audio/CREDITS.md).
 */

import type { SessionType } from './types';

export type SoundId = 'stream' | 'waves' | 'rain' | 'pines';

export type Sound = {
  id: SoundId;
  name: string;
  /** About the place it was recorded, never what it does for the body. */
  line: string;
  /** The session type this recording plays under, which names its file. */
  bed: SessionType;
};

export const SOUNDS: readonly Sound[] = [
  { id: 'stream', name: 'Stream', line: 'A mountain stream in Portugal', bed: 'notice' },
  { id: 'waves', name: 'Waves', line: 'Slow waves on a long beach', bed: 'flare' },
  { id: 'rain', name: 'Night rain', line: 'Rain through the night', bed: 'sleep' },
  { id: 'pines', name: 'Pines', line: 'Wind in a pine forest', bed: 'fear' },
];

export const DEFAULT_SOUND: SoundId = 'rain';

/** A stored id from any build, as a sound this build has. */
export function soundFor(id: unknown): Sound {
  return SOUNDS.find((s) => s.id === id) ?? SOUNDS.find((s) => s.id === DEFAULT_SOUND)!;
}

/** Sleep-timer lengths in minutes. `0` plays until stopped. */
export const LISTEN_TIMERS = [10, 20, 30, 60, 0] as const;
export type ListenTimer = (typeof LISTEN_TIMERS)[number];
export const DEFAULT_LISTEN_TIMER: ListenTimer = 20;

export function listenTimerFor(v: unknown): ListenTimer {
  return (LISTEN_TIMERS as readonly unknown[]).includes(v) ? (v as ListenTimer) : DEFAULT_LISTEN_TIMER;
}

/** A slow rise, so the first second is never a jolt; a long fall, so nobody falling asleep is woken by it stopping. */
export const LISTEN_FADE_IN_MS = 4000;
export const LISTEN_FADE_OUT_MS = 45_000;

/**
 * The share (0..1) of the sound's level a listen should be at, `elapsedMs` of playing in,
 * `timerElapsedMs` since the timer was set (the same, unless it was changed mid-listen).
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

/** "18 min left", "fading out", "until you stop". */
export function timerLabel(timerMin: ListenTimer, elapsedMs = 0): string {
  if (!timerMin) return 'until you stop';
  const left = Math.max(0, Math.ceil((timerMin * 60_000 - elapsedMs) / 60_000));
  return left <= 1 ? 'fading out' : `${left} min left`;
}

const ease = (t: number) => t * t * (3 - 2 * t);
