import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { beginSessionAudio } from '../audioSession';
import type { SpeechOutput, VoiceError } from '../types';

/**
 * The guide's voice: ElevenLabs, fetched through the Attend voice server so
 * the ElevenLabs key never ships in the app.
 *
 * Every line is saved to the phone's cache the first time it is fetched, so
 * the guide's recurring lines ("Take a moment to settle in.") play instantly
 * and work offline after the first session. Upcoming lines are downloaded
 * while the current one plays, so the silence between lines is the silence
 * the guide intended, not network latency.
 *
 * There is no second voice. A line that can't be fetched is retried; if it
 * still can't be had, speak() rejects and the session pauses, so the person
 * never hears the guide turn into a different, robotic voice mid-practice.
 *
 * Only the guide's own lines go to the server. A line may echo a single word
 * the person used ("Notice that tightness."), never their sentences.
 */

export type ElevenLabsConfig = {
  apiUrl: string;
  headers?: Record<string, string>;
  voiceId: string;
  /** ElevenLabs v4 delivery tags spoken before every line, e.g. "[softly] [slowly]". From the guide script. */
  direction?: () => string;
  /** Voice settings from the session type's ElevenLabs agent. Part of the cache key, so a change re-records. */
  settings?: { speed?: number; stability?: number; similarity?: number };
};

const PREFETCH = 3;
const FETCH_TIMEOUT_MS = 10_000;
const ATTEMPTS = 3;

function unavailable(message: string): VoiceError {
  return { code: 'network', message };
}

function hash(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = (Math.imul(h2, 31) + c) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}${s.length.toString(36)}`;
}

export class ElevenLabsSpeechOutput implements SpeechOutput {
  readonly id = 'elevenlabs';
  readonly label = 'ElevenLabs voice';
  private dir: Directory | null = null;
  private inflight = new Map<string, Promise<string | null>>();
  private current?: AudioPlayer;
  failures = 0;

  constructor(private readonly cfg: ElevenLabsConfig) {}

  async isAvailable() {
    return !!this.cfg.apiUrl;
  }

  async begin() {
    // Without this the silent switch mutes the guide whenever nothing else set the audio mode (Expo Go).
    await beginSessionAudio(false);
    this.ensureDir();
  }

  private ensureDir() {
    if (this.dir) return;
    try {
      const d = new Directory(Paths.cache, 'guide-voice', this.cfg.voiceId);
      d.create({ intermediates: true, idempotent: true });
      this.dir = d;
    } catch {
      this.dir = null;
    }
  }

  /**
   * Download lines ahead of a session (from Home), without touching the audio session.
   * The session's opening lines are then already on the phone when it starts.
   */
  warm(texts: string[]): Promise<unknown> {
    this.ensureDir();
    return Promise.all(texts.map((t) => this.fetchLine(this.say(t))));
  }

  private url(text: string) {
    const base = this.cfg.apiUrl.replace(/\/$/, '');
    const s = this.cfg.settings ?? {};
    const extra = (['speed', 'stability', 'similarity'] as const)
      .filter((k) => typeof s[k] === 'number')
      .map((k) => `&${k}=${s[k]}`)
      .join('');
    return `${base}/tts?voice=${encodeURIComponent(this.cfg.voiceId)}${extra}&text=${encodeURIComponent(text)}`;
  }

  /** Local file URI for a line, downloading it if needed. Null if it can't be had. */
  private fetchLine(text: string): Promise<string | null> {
    const existing = this.inflight.get(text);
    if (existing) return existing;
    const p = (async () => {
      if (!this.dir) return null;
      // Keyed on the whole request (voice, settings, direction, text), so an edit in the agent re-records.
      const file = new File(this.dir, `${hash(this.url(text))}.mp3`);
      try {
        if (file.exists && file.size > 1000) return file.uri;
      } catch {}
      for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        const uri = await this.download(text, file);
        if (uri) return uri;
      }
      return null;
    })();
    this.inflight.set(text, p);
    p.finally(() => setTimeout(() => this.inflight.delete(text), 0));
    return p;
  }

  private async download(text: string, file: File): Promise<string | null> {
    try {
      const download = File.downloadFileAsync(this.url(text), file, {
        headers: this.cfg.headers,
        idempotent: true,
      });
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), FETCH_TIMEOUT_MS));
      const saved = await Promise.race([download, timeout]);
      if (saved.size < 1000) {
        // An error body (JSON), not audio.
        try {
          saved.delete();
        } catch {}
        return null;
      }
      return saved.uri;
    } catch {
      try {
        if (file.exists) file.delete();
      } catch {}
      return null;
    }
  }

  /** What is sent to the voice: the line with its delivery direction. Part of the cache key, so a new direction re-records. */
  private say(text: string) {
    const d = this.cfg.direction?.().trim();
    return d ? `${d} ${text}` : text;
  }

  prepare(texts: string[]) {
    for (const t of texts.slice(0, PREFETCH)) void this.fetchLine(this.say(t));
  }

  async speak(text: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;
    const uri = await this.fetchLine(this.say(text));
    if (signal.aborted) return;
    if (!uri) {
      this.failures++;
      throw unavailable('The guide voice could not be reached.');
    }
    return this.play(uri, signal);
  }

  private play(uri: string, signal: AbortSignal): Promise<void> {
    let player: AudioPlayer;
    try {
      // keepAudioSessionActive: by default expo-audio switches the audio session off ~100 ms after a
      // player finishes or pauses. Listening starts right after a line, so that cut the recogniser's
      // microphone mid-start ("audio-capture"/"interrupted") and the session paused after every line.
      player = createAudioPlayer({ uri }, { updateInterval: 100, keepAudioSessionActive: true });
    } catch {
      return Promise.reject(unavailable('The guide voice could not be played.'));
    }
    this.current = player;
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const startedAt = Date.now();
      const sub = player.addListener('playbackStatusUpdate', (st: AudioStatus) => {
        if (st.error) return finish(true);
        if (st.didJustFinish) finish(false);
      });
      // A line that never reports finishing still ends, eventually.
      const watchdog = setInterval(() => {
        if (Date.now() - startedAt > 60_000) finish(false);
      }, 500);
      const onAbort = () => {
        try {
          player.pause();
        } catch {}
        finish(false);
      };
      signal.addEventListener('abort', onAbort, { once: true });
      const finish = (failed: boolean) => {
        if (settled) return;
        settled = true;
        clearInterval(watchdog);
        sub.remove();
        signal.removeEventListener('abort', onAbort);
        try {
          player.remove();
        } catch {}
        if (this.current === player) this.current = undefined;
        if (failed && !signal.aborted) reject(unavailable('The guide voice could not be played.'));
        else resolve();
      };
      player.play();
    });
  }

  stop() {
    try {
      this.current?.pause();
    } catch {}
  }

  dispose() {
    this.stop();
  }
}
