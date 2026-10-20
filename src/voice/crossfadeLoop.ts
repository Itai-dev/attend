import type { AudioPlayer } from 'expo-audio';
import { crossfadeDone, crossfadeSeconds, loopGains, loopWaitMs, LOOP_TICK_MS, nextPassAt } from '../domain/seamlessLoop';

/**
 * One sound playing on and on without a seam, made from two players that take turns.
 *
 * The sounds are files minutes long (ten-minute tones since 20 Oct 2026; earlier, field
 * recordings), shipped as AAC (.m4a). A single player with `loop = true` would gap or click
 * each time it came round: AAC's encoder padding puts silence at both ends of the file, and a
 * file's last second never matches its first.
 * (The 30-second WAV loops this replaces were WAV for exactly that reason.) So a few seconds
 * before the playing pass ends, the other player starts the file again from the top and the
 * two cross over on an equal-power curve; the finished one is paused, rewound, and waits for
 * the next seam. The arithmetic is in domain/seamlessLoop.ts.
 *
 * The seam is timed from the playing pass's own position, re-read from the player, not from a
 * wall clock: a pause freezes it (both players stop, the timer stops) and a resume picks the
 * crossfade up where it was. Between seams it sleeps until the next one is due.
 *
 * The caller's volume (`setVolume`, `fadeTo`) is the loop's level; each player plays at that
 * level times its share of the crossfade. Nothing here touches the audio session: whoever
 * creates the players passes `keepAudioSessionActive`, so pausing the finished pass never
 * switches the session off under the other one.
 */

/** What the loop needs from a player, so tests can drive it without a device. */
export type LoopPlayer = Pick<AudioPlayer, 'play' | 'pause' | 'remove' | 'seekTo' | 'volume' | 'loop' | 'currentTime' | 'duration'>;

/** Until the file has loaded its duration is 0; look again this often. */
const POLL_MS = 250;
/**
 * A pass whose position stops moving mid-crossfade has ended short of where its duration
 * said it would: finish the swap rather than wait on it.
 */
const STALL_MS = 1500;

/** Ease in and out, so a fade has no audible corner at either end. */
const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

type Fade = { from: number; to: number; at: number; ms: number; done?: () => void };

export class CrossfadeLoop {
  private current: LoopPlayer;
  /** The other player: rewound and silent between seams, rising during one. */
  private next?: LoopPlayer;
  private level: number;
  private fade?: Fade;
  private running = false;
  private crossing = false;
  private gains = { current: 1, next: 0 };
  private timer?: ReturnType<typeof setTimeout>;
  private releasing = false;
  private released = false;
  private lastPos = -1;
  private lastMoveAt = 0;

  /**
   * Starts playing at `volume` (usually 0, then `fadeTo`). Throws if the first player can't be
   * made; callers treat that as "no sound", which is better than no session.
   */
  constructor(create: () => LoopPlayer, volume = 0) {
    this.level = clamp01(volume);
    this.current = create();
    try {
      this.next = create();
    } catch {
      // One player is still a sound: it loops on its own, seam and all.
      this.next = undefined;
      this.current.loop = true;
    }
    this.apply();
    this.resume();
  }

  /** Whether the loop is meant to be playing (not paused, not released). */
  get playing() {
    return this.running && !this.released;
  }

  /** The loop's level, 0..1, before each player's share of a crossfade. */
  get volume() {
    return this.level;
  }

  /** Set the level now. An explicit level wins over a fade in progress. */
  setVolume(volume: number) {
    if (this.releasing) return;
    this.fade = undefined;
    this.level = clamp01(volume);
    this.apply();
  }

  /**
   * Ease the level to `volume` over `ms`. A later fade replaces this one, and this one's
   * `done` is then dropped: the later caller decided what happens next.
   */
  fadeTo(volume: number, ms: number, done?: () => void) {
    if (this.releasing) return;
    this.fade = { from: this.level, to: clamp01(volume), at: Date.now(), ms: Math.max(0, ms), done };
    this.pump();
  }

  /** Pause both players and the seam's timer. A fade in progress carries on (its level is just set). */
  pause() {
    if (!this.running || this.released) return;
    this.running = false;
    try {
      this.current.pause();
    } catch {}
    if (this.crossing)
      try {
        this.next?.pause();
      } catch {}
    this.pump();
  }

  /**
   * Play again from where it paused, mid-crossfade included. Asks the players to play even if
   * the loop thinks it is playing: an interruption (a call) can pause them under it.
   */
  resume() {
    if (this.released) return;
    try {
      this.current.play();
    } catch {}
    if (this.crossing)
      try {
        this.next?.play();
      } catch {}
    if (this.running) return;
    this.running = true;
    // Paused time is not a stalled pass.
    this.lastPos = -1;
    this.lastMoveAt = Date.now();
    this.pump();
  }

  /** Fade out over `fadeMs` (0: at once) and free both players. Nothing else applies after this. */
  release(fadeMs = 0, done?: () => void) {
    if (this.releasing) return done?.();
    const end = () => {
      this.released = true;
      if (this.timer) clearTimeout(this.timer);
      this.timer = undefined;
      for (const p of [this.current, this.next]) {
        try {
          p?.remove();
        } catch {}
      }
      this.next = undefined;
      done?.();
    };
    if (fadeMs <= 0) {
      this.releasing = true;
      return end();
    }
    this.fadeTo(0, fadeMs, end);
    this.releasing = true;
  }

  /** Advance the fade and the seam, set the volumes, and decide when to look again. */
  private pump = () => {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.released) return;
    let wait = Infinity;
    let finished: Fade | undefined;
    if (this.fade) {
      const f = this.fade;
      const p = f.ms > 0 ? Math.min(1, (Date.now() - f.at) / f.ms) : 1;
      this.level = f.from + (f.to - f.from) * ease(p);
      if (p >= 1) {
        this.fade = undefined;
        finished = f;
      } else wait = LOOP_TICK_MS;
    }
    if (this.running) wait = Math.min(wait, this.step());
    this.apply();
    if (wait < Infinity) this.timer = setTimeout(this.pump, wait);
    // Last, so a `done` that pauses or releases sees the loop as it now is.
    finished?.done?.();
  };

  /** The seam: start the next pass on time, cross over, swap. Returns ms until the next look. */
  private step(): number {
    const a = this.current;
    const b = this.next;
    if (!b) return Infinity; // a single player, looping on its own
    let duration: number;
    let t: number;
    try {
      duration = a.duration;
      t = a.currentTime;
    } catch {
      return POLL_MS;
    }
    const fade = crossfadeSeconds(duration);
    if (!fade) {
      if (!(duration > 0)) return POLL_MS; // not loaded yet
      // Too short to crossfade (not one of ours): one player, looping on its own.
      a.loop = true;
      this.next = undefined;
      try {
        b.remove();
      } catch {}
      return Infinity;
    }
    if (!this.crossing) {
      if (t < nextPassAt(duration, fade)) {
        this.gains = { current: 1, next: 0 };
        return loopWaitMs(t, duration, fade);
      }
      this.crossing = true;
      this.lastPos = t;
      this.lastMoveAt = Date.now();
      try {
        b.volume = 0;
        b.play();
      } catch {}
    }
    const now = Date.now();
    if (t !== this.lastPos) {
      this.lastPos = t;
      this.lastMoveAt = now;
    }
    if (crossfadeDone(t, duration, fade) || now - this.lastMoveAt > STALL_MS) {
      this.swap();
      return LOOP_TICK_MS;
    }
    this.gains = loopGains(t, duration, fade);
    return LOOP_TICK_MS;
  }

  /** The outgoing pass is silent: pause it, rewind it for the next seam, and let the other lead. */
  private swap() {
    const done = this.current;
    try {
      done.volume = 0;
      done.pause();
    } catch {}
    this.current = this.next!;
    this.next = done;
    this.crossing = false;
    this.gains = { current: 1, next: 0 };
    try {
      // Exactly to the top (zero tolerance): the next pass must start where the file starts.
      done.seekTo(0, 0, 0).catch(() => {});
    } catch {}
  }

  private apply() {
    if (this.released) return;
    try {
      this.current.volume = this.level * this.gains.current;
    } catch {}
    if (this.next)
      try {
        this.next.volume = this.crossing ? this.level * this.gains.next : 0;
      } catch {}
  }
}
