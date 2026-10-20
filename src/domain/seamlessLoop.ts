/**
 * The arithmetic of a seamless loop made from two players (voice/crossfadeLoop.ts).
 *
 * Why two players: the soundscapes are long field recordings shipped as AAC (.m4a). One
 * player looping such a file leaves a gap or a click at the seam — AAC's encoder padding
 * adds silence at both ends, and a recording's last second never matches its first. So
 * a second player starts the file again from the top a few seconds before the first one
 * ends, and the two cross over.
 *
 * Everything is measured from the outgoing pass's own playback position, never from the
 * wall clock: a pause (both players stop, the position stops) resumes exactly where it was,
 * and a timer that fires late only makes the volume steps coarser, never the seam earlier
 * or later.
 *
 * Pure, free of React and Expo, so it runs in Node tests.
 */

/** How long the two passes overlap, in seconds. Long enough that no edge is heard. */
export const LOOP_CROSSFADE_S = 6;
/**
 * The crossfade finishes this far before the file's end. A player's last reported position
 * can fall just short of its duration; the outgoing pass must already be silent when it
 * stops, or the stop is the click this whole thing exists to avoid.
 */
export const LOOP_END_SLACK_S = 0.15;
/** Below this, a crossfade is too short to hide anything: the player loops on its own. */
export const LOOP_MIN_CROSSFADE_S = 0.5;
/** While a crossfade (or a fade) runs, volumes are set this often. */
export const LOOP_TICK_MS = 60;
/** Between seams, the position is re-read at least this often, so nothing is predicted far ahead. */
export const LOOP_MAX_WAIT_MS = 15_000;

/**
 * The crossfade for a file this long: six seconds, but never more than a quarter of a short
 * file, so most of each pass is heard on its own. 0 when the duration isn't known yet or the
 * file is too short to crossfade.
 */
export function crossfadeSeconds(durationS: number, wantedS = LOOP_CROSSFADE_S): number {
  if (!Number.isFinite(durationS) || durationS <= 0) return 0;
  const fade = Math.min(wantedS, durationS / 4);
  return fade >= LOOP_MIN_CROSSFADE_S ? fade : 0;
}

/** The position in the playing pass at which the next pass starts from the top. */
export function nextPassAt(durationS: number, fadeS: number): number {
  return Math.max(0, durationS - fadeS);
}

/** How far through the crossfade the outgoing pass is, 0..1, from its position. */
export function crossfadeProgress(positionS: number, durationS: number, fadeS: number): number {
  const start = nextPassAt(durationS, fadeS);
  const span = Math.max(1e-3, fadeS - LOOP_END_SLACK_S);
  return clamp01((positionS - start) / span);
}

/**
 * Equal power: the two passes are different moments of rain or water — uncorrelated — so
 * their powers add. cos²+sin² = 1 keeps the loudness level through the crossfade; a linear
 * crossfade would dip about 3 dB in the middle, which is a seam you can hear.
 */
export function equalPower(progress: number): { out: number; in: number } {
  const t = clamp01(progress) * (Math.PI / 2);
  // Exact at the ends, so a finished crossfade leaves the outgoing pass truly silent.
  if (t === 0) return { out: 1, in: 0 };
  if (t === Math.PI / 2) return { out: 0, in: 1 };
  return { out: Math.cos(t), in: Math.sin(t) };
}

/**
 * Each player's share of the loop's volume when the outgoing (current) pass is at
 * `positionS`: the current pass alone until the next one is due, then the crossfade.
 */
export function loopGains(positionS: number, durationS: number, fadeS: number): { current: number; next: number } {
  if (fadeS <= 0 || positionS < nextPassAt(durationS, fadeS)) return { current: 1, next: 0 };
  const g = equalPower(crossfadeProgress(positionS, durationS, fadeS));
  return { current: g.out, next: g.in };
}

/** Whether the crossfade has run its course and the outgoing pass can be stopped and rewound. */
export function crossfadeDone(positionS: number, durationS: number, fadeS: number): boolean {
  return fadeS > 0 && crossfadeProgress(positionS, durationS, fadeS) >= 1;
}

/**
 * How long to wait before looking at the position again: until the next pass is due (never
 * more than LOOP_MAX_WAIT_MS, so drift is corrected from the player rather than assumed), and
 * every tick once the crossfade has begun.
 */
export function loopWaitMs(positionS: number, durationS: number, fadeS: number): number {
  const untilNext = (nextPassAt(durationS, fadeS) - positionS) * 1000;
  if (untilNext <= 0) return LOOP_TICK_MS;
  // Aimed at the moment itself, so the next pass starts on time rather than up to a tick late.
  return Math.max(10, Math.min(LOOP_MAX_WAIT_MS, Math.ceil(untilNext)));
}

function clamp01(x: number) {
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
}
