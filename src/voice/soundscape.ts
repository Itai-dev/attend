import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { SessionType } from '../domain/types';
import { BEDS } from './ambience';
import { beginSessionAudio, endSessionAudio } from './audioSession';

/**
 * A nature sound on its own (Explore → Sounds). Opens on the gong, fades the recording in,
 * and on stop rings the gong again and fades out — so it begins and ends like a session,
 * without a hard edge. Fuller than under a session (there is no voice to keep clear), still
 * well below full volume.
 */

const LEVEL = 0.55;
const GONG = 0.5;
const FADE_IN_MS = 4000;
const FADE_OUT_MS = 3500;
const STEP_MS = 60;

const ease = (t: number) => t * t * (3 - 2 * t);

export class Soundscape {
  private bed?: AudioPlayer;
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly type: SessionType) {}

  async start() {
    // Plays with the silent switch on and keeps going with the screen locked, like a session.
    await beginSessionAudio(false);
    this.gong();
    try {
      this.bed = createAudioPlayer(BEDS[this.type], { keepAudioSessionActive: true });
      this.bed.loop = true;
      this.bed.volume = 0;
      this.bed.play();
      this.fade(LEVEL, FADE_IN_MS);
    } catch {
      this.bed = undefined;
    }
  }

  pause() {
    this.fade(0, 1200, () => {
      try {
        this.bed?.pause();
      } catch {}
    });
  }

  resume() {
    try {
      this.bed?.play();
    } catch {}
    this.fade(LEVEL, 1500);
  }

  /** Ends with the gong (when `ring`) and a slow fade; resolves once it is quiet. */
  stop(ring = true): Promise<void> {
    if (ring) this.gong();
    return new Promise((resolve) =>
      this.fade(0, FADE_OUT_MS, () => {
        try {
          this.bed?.remove();
        } catch {}
        this.bed = undefined;
        // After the gong's tail, so releasing the audio session doesn't cut it.
        setTimeout(() => endSessionAudio().catch(() => {}), ring ? 5000 : 0);
        resolve();
      }),
    );
  }

  private gong() {
    try {
      const g = createAudioPlayer(require('../../assets/audio/gong.wav'), { keepAudioSessionActive: true });
      g.volume = GONG;
      const sub = g.addListener('playbackStatusUpdate', (st) => {
        if (!st.didJustFinish) return;
        sub.remove();
        try {
          g.remove();
        } catch {}
      });
      g.play();
    } catch {
      // The sound still plays without its gong.
    }
  }

  private fade(target: number, ms: number, done?: () => void) {
    const p = this.bed;
    if (this.timer) clearInterval(this.timer);
    if (!p) return done?.();
    const from = p.volume;
    const steps = Math.max(1, Math.round(ms / STEP_MS));
    let i = 0;
    this.timer = setInterval(() => {
      i++;
      try {
        p.volume = from + (target - from) * ease(i / steps);
      } catch {}
      if (i >= steps) {
        clearInterval(this.timer);
        this.timer = undefined;
        done?.();
      }
    }, STEP_MS);
  }
}
