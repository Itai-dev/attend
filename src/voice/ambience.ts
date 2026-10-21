import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { SessionType } from '../domain/types';
import { BEDS } from './soundAssets';
import type { SessionStatus } from './VoiceSessionProvider';

/**
 * Nature under the session, one recording per session type (assets/audio/ambience-<type>.wav,
 * seamless 40-second loops cut from public-domain field recordings by tools/make-ambience.py,
 * credited in assets/audio/CREDITS.md). Notice: a mountain stream. Flare: slow waves. Sleep:
 * rain at night. Fear: wind in pines. It is atmosphere, nothing more: the app never calls it
 * healing or says it does anything for pain.
 *
 * It sits well under the voice: quieter while the guide speaks and while listening,
 * and fuller in the silences. When the person actually speaks it dips a little more,
 * slowly, so the recogniser hears them rather than the room — a sudden drop would be
 * the loudest thing an eyes-closed person hears. Paused or ended, it fades away.
 */

// The recordings are levelled to -24 dBFS RMS, quieter than the old synthesised beds, so these
// sit a little higher; still well under the voice.
const LEVEL: Partial<Record<SessionStatus, number>> = {
  preparing: 0.24,
  speaking: 0.17,
  holding: 0.3,
  listening: 0.15,
};
const FADE_MS = 1200;
const STEP_MS = 60;
/** While the person speaks: a share of the listening level, eased down and back. */
const DUCK = 0.6;
const DUCK_MS = 1400;
const UNDUCK_MS = 2400;
/** Mic level (0..1) that counts as speaking, and how long quiet lasts before it comes back up. */
const VOICE_LEVEL = 0.3;
const RELEASE_MS = 1200;

/** Ease in and out, so a fade has no audible corner at either end. */
const ease = (t: number) => t * t * (3 - 2 * t);

export class Ambience {
  private player?: AudioPlayer;
  private target = 0;
  private timer?: ReturnType<typeof setInterval>;
  private status: SessionStatus = 'idle';
  private ducked = false;
  private lastVoiceAt = 0;
  private release?: ReturnType<typeof setTimeout>;

  constructor(private readonly type: SessionType = 'notice') {}

  start() {
    if (this.player) return;
    try {
      // Pausing must not switch the audio session off under the recogniser (see ElevenLabsSpeechOutput.play).
      this.player = createAudioPlayer(BEDS[this.type], { keepAudioSessionActive: true });
      this.player.loop = true;
      this.player.volume = 0;
      this.player.play();
    } catch {
      // No tone is better than no session.
      this.player = undefined;
    }
  }

  /** Follow the session: the level for this status, faded rather than jumped. */
  follow(status: SessionStatus) {
    if (status === this.status) return;
    this.status = status;
    this.unduck();
    const level = LEVEL[status] ?? 0;
    // Started on the first audible state, after the runner has set the audio session (silent switch, speaker).
    if (level > 0) this.start();
    this.fadeTo(level, FADE_MS);
  }

  /** The microphone level while listening: dip under the person's voice, come back after they stop. */
  hear(level: number) {
    if (this.status !== 'listening' || level < VOICE_LEVEL) return;
    this.lastVoiceAt = Date.now();
    if (this.ducked) return;
    this.ducked = true;
    this.fadeTo((LEVEL.listening ?? 0) * DUCK, DUCK_MS);
    this.scheduleRelease();
  }

  private scheduleRelease() {
    this.release = setTimeout(() => {
      this.release = undefined;
      if (!this.ducked) return;
      if (Date.now() - this.lastVoiceAt < RELEASE_MS) return this.scheduleRelease();
      this.ducked = false;
      this.fadeTo(LEVEL[this.status] ?? 0, UNDUCK_MS);
    }, RELEASE_MS);
  }

  private unduck() {
    this.ducked = false;
    if (this.release) clearTimeout(this.release);
    this.release = undefined;
  }

  stop() {
    this.status = 'idle';
    this.unduck();
    this.fadeTo(0, FADE_MS, () => {
      try {
        this.player?.remove();
      } catch {}
      this.player = undefined;
    });
  }

  private fadeTo(target: number, ms: number, done?: () => void) {
    const p = this.player;
    if (!p) return done?.();
    this.target = target;
    if (this.timer) clearInterval(this.timer);
    if (target > 0 && !p.playing) p.play();
    const from = p.volume;
    const steps = Math.max(1, Math.round(ms / STEP_MS));
    let i = 0;
    this.timer = setInterval(() => {
      i++;
      try {
        p.volume = from + (this.target - from) * ease(i / steps);
      } catch {}
      if (i >= steps) {
        clearInterval(this.timer);
        this.timer = undefined;
        if (this.target === 0) {
          try {
            p.pause();
          } catch {}
        }
        done?.();
      }
    }, STEP_MS);
  }
}
