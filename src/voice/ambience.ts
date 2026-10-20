import { soundscape, UNDER_VOICE, volumeFor, type Soundscape, type SoundscapeId } from '../domain/soundscapes';
import type { CrossfadeLoop } from './crossfadeLoop';
import { loopSoundscape } from './soundscapeAssets';
import type { SessionStatus } from './VoiceSessionProvider';

/**
 * A sound under the session: rain, forest, water, the 432 Hz tone (domain/soundscapes.ts),
 * each a seamless loop (two players crossing over: voice/crossfadeLoop.ts). It is atmosphere,
 * nothing more — the app never calls it healing or says it does anything for pain.
 *
 * It sits well under the voice: quieter while the guide speaks and while listening,
 * and fuller in the silences. When the person actually speaks it dips a little more,
 * slowly, so the recogniser hears them rather than the room — a sudden drop would be
 * the loudest thing an eyes-closed person hears. Paused or ended, it fades away.
 */

/** Target loudness per state, in LUFS (domain/soundscapes.ts UNDER_VOICE). */
const LEVEL: Partial<Record<SessionStatus, number>> = UNDER_VOICE;
const FADE_MS = 1200;
/** While the person speaks: a share of the listening level, eased down and back. */
const DUCK = 0.6;
const DUCK_MS = 1400;
const UNDUCK_MS = 2400;
/** Mic level (0..1) that counts as speaking, and how long quiet lasts before it comes back up. */
const VOICE_LEVEL = 0.3;
const RELEASE_MS = 1200;

export class Ambience {
  private loop?: CrossfadeLoop;
  private status: SessionStatus = 'idle';
  private ducked = false;
  private lastVoiceAt = 0;
  private release?: ReturnType<typeof setTimeout>;
  /** The sound's own loudness, so a quiet forest and a full waterfall sit alike under the voice. */
  private readonly sound: Soundscape;

  constructor(private readonly source: SoundscapeId = 'tone') {
    this.sound = soundscape(source) ?? soundscape('tone')!;
  }

  start() {
    if (this.loop) return;
    try {
      // Silent at first; follow() fades it in. Its players keep the audio session active when
      // paused, so a pause never switches the session off under the recogniser (loopSoundscape).
      this.loop = loopSoundscape(this.source, 0);
    } catch {
      // No sound is better than no session.
      this.loop = undefined;
    }
  }

  /** Follow the session: the level for this status, faded rather than jumped. */
  follow(status: SessionStatus) {
    if (status === this.status) return;
    this.status = status;
    this.unduck();
    const level = this.level(status);
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
    this.fadeTo(this.level('listening') * DUCK, DUCK_MS);
    this.scheduleRelease();
  }

  private scheduleRelease() {
    this.release = setTimeout(() => {
      this.release = undefined;
      if (!this.ducked) return;
      if (Date.now() - this.lastVoiceAt < RELEASE_MS) return this.scheduleRelease();
      this.ducked = false;
      this.fadeTo(this.level(this.status), UNDUCK_MS);
    }, RELEASE_MS);
  }

  private level(status: SessionStatus) {
    const target = LEVEL[status];
    return target === undefined ? 0 : volumeFor(this.sound, target);
  }

  private unduck() {
    this.ducked = false;
    if (this.release) clearTimeout(this.release);
    this.release = undefined;
  }

  /** Fade out and let go. A longer fade crosses into whatever plays next (sleep hands its sound to Just listen). */
  stop(fadeMs = FADE_MS) {
    this.status = 'idle';
    this.unduck();
    const l = this.loop;
    // A fade, then release: a follow() during the fade still finds the sound and brings it back.
    this.fadeTo(0, fadeMs, () => {
      l?.release();
      if (this.loop === l) this.loop = undefined;
    });
  }

  /** Eased by the loop; at nothing it pauses, so a paused session's sound costs nothing. */
  private fadeTo(target: number, ms: number, done?: () => void) {
    const l = this.loop;
    if (!l) return done?.();
    if (target > 0) l.resume();
    l.fadeTo(target, ms, () => {
      if (target === 0) l.pause();
      done?.();
    });
  }
}
