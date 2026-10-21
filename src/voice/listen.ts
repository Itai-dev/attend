import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';
import { useSyncExternalStore } from 'react';
import { DEFAULT_LISTEN_TIMER, listenVolumeAt, soundFor, type ListenTimer, type SoundId } from '../domain/sounds';
import { BEDS } from './soundAssets';

/**
 * Just listen: one nature recording on its own, with a sleep timer, and nothing to do once it
 * starts. It keeps playing with the screen locked (UIBackgroundModes audio) and fades out
 * slowly when the timer ends (domain/sounds.ts), so it can be fallen asleep to.
 *
 * One listener for the whole app, outside React, so closing the screen does not stop the
 * sound. A session or the welcome stops it first (VoiceSessionProvider): two sounds at once
 * would be the loudest thing an eyes-closed person hears.
 *
 * Nothing is recorded. Listening is not practice and does not count toward the program.
 */

export type ListenState = {
  id?: SoundId;
  playing: boolean;
  timer: ListenTimer;
  /** Playing time since the listen began; paused time does not count. */
  elapsedMs: number;
  /** Playing time since the timer was set. */
  timerElapsedMs: number;
};

/**
 * The loops are levelled to about -24 dBFS RMS. Under a session they sit at 0.15–0.3 beneath the
 * voice; on their own, with nothing to sit under, a little fuller, still quiet enough to sleep to.
 */
const LEVEL = 0.55;
const TICK_MS = 250;
const SWITCH_MS = 1800;
const STOP_MS = 1500;
const STEP_MS = 60;

let state: ListenState = { playing: false, timer: DEFAULT_LISTEN_TIMER, elapsedMs: 0, timerElapsedMs: 0 };
const listeners = new Set<() => void>();
function set(patch: Partial<ListenState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

let player: AudioPlayer | undefined;
/** When the current player began, for its own short fade-in when switching sounds. */
let playerStartedAt = 0;
let ticker: ReturnType<typeof setInterval> | undefined;
let lastTick = 0;

/** Fade a player out and let it go. A switch or a stop must never end on a click. */
function release(p: AudioPlayer | undefined, ms: number, then?: () => void) {
  if (!p) return then?.();
  const done = () => {
    try {
      p.remove();
    } catch {}
    then?.();
  };
  let from = 0;
  try {
    from = p.volume;
  } catch {}
  if (ms <= 0 || from <= 0) return done();
  const steps = Math.max(1, Math.round(ms / STEP_MS));
  let i = 0;
  const t = setInterval(() => {
    i++;
    try {
      p.volume = from * (1 - i / steps);
    } catch {}
    if (i >= steps) {
      clearInterval(t);
      done();
    }
  }, STEP_MS);
}

function newPlayer(id: SoundId): AudioPlayer | undefined {
  try {
    // Silent at first: the tick raises it. Kept active so a pause doesn't hand the audio session back mid-listen.
    const p = createAudioPlayer(BEDS[soundFor(id).bed], { keepAudioSessionActive: true });
    p.loop = true;
    p.volume = 0;
    p.play();
    playerStartedAt = Date.now();
    return p;
  } catch {
    // No sound is better than a crash.
    return undefined;
  }
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
  if (player && state.playing) {
    const own = Math.min(1, (now - playerStartedAt) / SWITCH_MS);
    try {
      player.volume = LEVEL * listenVolumeAt(elapsedMs, state.timer, timerElapsedMs) * own;
    } catch {}
  }
  if (dt) set({ elapsedMs, timerElapsedMs });
}

/** Begin listening to `id`, or cross into it if something is already playing. */
export async function startListening(id: SoundId, timer: ListenTimer = state.timer) {
  id = soundFor(id).id;
  if (state.id) {
    if (id === state.id) {
      if (!state.playing) resumeListening();
      return;
    }
    release(player, SWITCH_MS);
    player = newPlayer(id);
    if (!state.playing) {
      lastTick = Date.now();
      set({ playing: true });
    }
    set({ id });
    return;
  }
  try {
    // Plays with the ringer switch on silent and the screen locked; other apps' audio pauses.
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
    });
  } catch {}
  player = newPlayer(id);
  lastTick = Date.now();
  set({ id, playing: true, timer, elapsedMs: 0, timerElapsedMs: 0 });
  if (!ticker) ticker = setInterval(tick, TICK_MS);
}

export function pauseListening() {
  if (!state.playing) return;
  tick();
  try {
    player?.pause();
  } catch {}
  set({ playing: false });
}

export function resumeListening() {
  if (state.playing || !state.id) return;
  try {
    player?.play();
  } catch {}
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
