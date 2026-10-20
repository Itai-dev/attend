import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import { useSyncExternalStore } from 'react';
import {
  DEFAULT_LISTEN_TIMER,
  listenLevel,
  listenVolumeAt,
  migrateListenId,
  soundscape,
  type ListenTimer,
  type SoundscapeId,
} from '../domain/soundscapes';
import type { CrossfadeLoop } from './crossfadeLoop';
import { loopSoundscape } from './soundscapeAssets';

/**
 * Just listen: one sound on its own, with a sleep timer, and nothing to do once it
 * starts. It keeps playing with the screen locked and fades out slowly when the timer ends
 * (domain/soundscapes.ts), so it can be fallen asleep to.
 *
 * One listener for the whole app, outside React, so leaving the screen does not stop the
 * sound. A guided session stops it first (VoiceSessionProvider): two sounds at once would be
 * the loudest thing an eyes-closed person hears.
 *
 * Each sound is a seamless loop of a long file, two players crossing over
 * (voice/crossfadeLoop.ts); switching sounds crosses one loop into the next.
 *
 * Nothing is recorded. Listening is not practice and does not count toward the program.
 */

export type ListenState = {
  id?: SoundscapeId;
  playing: boolean;
  timer: ListenTimer;
  /** Playing time since the listen began; paused time does not count. */
  elapsedMs: number;
  /** Playing time since the timer was set. */
  timerElapsedMs: number;
};

const TICK_MS = 250;
const SWITCH_MS = 1800;
const STOP_MS = 1500;

let state: ListenState = { playing: false, timer: DEFAULT_LISTEN_TIMER, elapsedMs: 0, timerElapsedMs: 0 };
const listeners = new Set<() => void>();
function set(patch: Partial<ListenState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

let player: CrossfadeLoop | undefined;
/** When the current player began, for its own short fade-in on a switch. */
let playerStartedAt = 0;
let ticker: ReturnType<typeof setInterval> | undefined;
let lastTick = 0;

function release(p: CrossfadeLoop | undefined, ms: number, then?: () => void) {
  if (!p) return then?.();
  p.release(ms, then);
}

function tick() {
  const now = Date.now();
  const dt = state.playing ? now - lastTick : 0;
  lastTick = now;
  const elapsedMs = state.elapsedMs + dt;
  const timerElapsedMs = state.timerElapsedMs + dt;
  if (state.timer && timerElapsedMs >= state.timer * 60_000) {
    stopListening(0);
    return;
  }
  const s = soundscape(state.id);
  if (player && s) {
    const own = Math.min(1, (now - playerStartedAt) / SWITCH_MS);
    player.setVolume(listenLevel(s) * listenVolumeAt(elapsedMs, state.timer, timerElapsedMs) * own);
  }
  if (dt) set({ elapsedMs, timerElapsedMs });
}

function newPlayer(id: SoundscapeId): CrossfadeLoop | undefined {
  try {
    // Silent at first: the tick raises it.
    const p = loopSoundscape(id, 0);
    playerStartedAt = Date.now();
    return p;
  } catch {
    return undefined;
  }
}

/** Begin listening to `id`, or switch to it (a short crossfade) if something is playing. */
export async function startListening(id: SoundscapeId, timer: ListenTimer = state.timer) {
  // A sound remembered by an older build (a nature recording, the old 'tone') plays a tone this build has.
  id = migrateListenId(id);
  if (state.id && state.playing) {
    if (id === state.id) return;
    release(player, SWITCH_MS);
    player = newPlayer(id);
    set({ id });
    return;
  }
  try {
    // Plays with the ringer switch on silent and with the screen locked; other audio pauses.
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
    });
  } catch {}
  release(player, 0);
  player = newPlayer(id);
  lastTick = Date.now();
  set({ id, playing: true, timer, elapsedMs: 0, timerElapsedMs: 0 });
  if (!ticker) ticker = setInterval(tick, TICK_MS);
}

export function pauseListening() {
  if (!state.playing) return;
  tick();
  player?.pause();
  set({ playing: false });
}

export function resumeListening() {
  if (state.playing || !state.id) return;
  player?.resume();
  lastTick = Date.now();
  set({ playing: true });
}

/** A new timer counts from now; the sound keeps playing at its level. */
export function setListenTimer(timer: ListenTimer) {
  set({ timer, timerElapsedMs: 0 });
}

/**
 * Fade out and let go of the audio, so other apps' sound can come back. A session that takes
 * over passes `handOver`: it owns the audio session now, and releasing it would silence the guide.
 */
export function stopListening(fadeMs = STOP_MS, handOver = false) {
  if (!state.id) return;
  if (ticker) clearInterval(ticker);
  ticker = undefined;
  const p = player;
  player = undefined;
  set({ id: undefined, playing: false, elapsedMs: 0, timerElapsedMs: 0 });
  release(p, fadeMs, () => {
    if (state.id || handOver) return; // a new listen, or a session, has the audio now
    setIsAudioActiveAsync(false).catch(() => {});
  });
}

export function useListen(): ListenState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
