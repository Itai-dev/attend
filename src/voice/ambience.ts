import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { SessionStatus } from './VoiceSessionProvider';

/**
 * A soft tone under the session: a low drone tuned to 432 Hz (assets/audio/tone-432.wav,
 * a seamless 30-second loop). It is atmosphere, nothing more — the app never calls it
 * healing or says it does anything for pain.
 *
 * It sits well under the voice: quieter while the guide speaks, quietest while
 * listening so the recogniser hears the person rather than the room, and fuller in
 * the silences. Paused or ended, it fades away.
 */

const LEVEL: Partial<Record<SessionStatus, number>> = {
  preparing: 0.14,
  speaking: 0.1,
  holding: 0.18,
  listening: 0.07,
};
const FADE_MS = 1200;
const STEP_MS = 60;

export class Ambience {
  private player?: AudioPlayer;
  private target = 0;
  private timer?: ReturnType<typeof setInterval>;

  start() {
    if (this.player) return;
    try {
      this.player = createAudioPlayer(require('../../assets/audio/tone-432.wav'));
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
    const level = LEVEL[status] ?? 0;
    // Started on the first audible state, after the runner has set the audio session (silent switch, speaker).
    if (level > 0) this.start();
    this.fadeTo(level);
  }

  stop() {
    this.fadeTo(0, () => {
      try {
        this.player?.remove();
      } catch {}
      this.player = undefined;
    });
  }

  private fadeTo(target: number, done?: () => void) {
    const p = this.player;
    if (!p) return done?.();
    this.target = target;
    if (this.timer) clearInterval(this.timer);
    if (target > 0 && !p.playing) p.play();
    const from = p.volume;
    const steps = Math.max(1, Math.round(FADE_MS / STEP_MS));
    let i = 0;
    this.timer = setInterval(() => {
      i++;
      try {
        p.volume = from + (this.target - from) * (i / steps);
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
