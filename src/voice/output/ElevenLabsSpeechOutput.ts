import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import type { SpeechOutput } from '../types';

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
 * Only if a line cannot be fetched at all does the phone's own voice speak
 * it, so an eyes-closed session never simply stops.
 *
 * Only the guide's own lines go to the server. A line may echo a single word
 * the person used ("Notice that tightness."), never their sentences.
 */

export type ElevenLabsConfig = {
  apiUrl: string;
  headers?: Record<string, string>;
  voiceId: string;
};

const PREFETCH = 3;
const FETCH_TIMEOUT_MS = 9000;

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

  constructor(
    private readonly cfg: ElevenLabsConfig,
    private readonly fallback: SpeechOutput,
  ) {}

  async isAvailable() {
    return !!this.cfg.apiUrl;
  }

  async begin() {
    await this.fallback.begin?.();
    try {
      const d = new Directory(Paths.cache, 'guide-voice', this.cfg.voiceId);
      d.create({ intermediates: true, idempotent: true });
      this.dir = d;
    } catch {
      this.dir = null;
    }
  }

  private url(text: string) {
    const base = this.cfg.apiUrl.replace(/\/$/, '');
    return `${base}/tts?voice=${encodeURIComponent(this.cfg.voiceId)}&text=${encodeURIComponent(text)}`;
  }

  /** Local file URI for a line, downloading it if needed. Null if it can't be had. */
  private fetchLine(text: string): Promise<string | null> {
    const existing = this.inflight.get(text);
    if (existing) return existing;
    const p = (async () => {
      if (!this.dir) return null;
      const file = new File(this.dir, `${hash(text)}.mp3`);
      try {
        if (file.exists && file.size > 1000) return file.uri;
      } catch {}
      try {
        const download = File.downloadFileAsync(this.url(text), file, { headers: this.cfg.headers, idempotent: true });
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
    })();
    this.inflight.set(text, p);
    p.finally(() => setTimeout(() => this.inflight.delete(text), 0));
    return p;
  }

  prepare(texts: string[]) {
    for (const t of texts.slice(0, PREFETCH)) void this.fetchLine(t);
  }

  async speak(text: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;
    const uri = await this.fetchLine(text);
    if (signal.aborted) return;
    if (!uri) {
      this.failures++;
      return this.fallback.speak(text, signal);
    }
    return this.play(uri, text, signal);
  }

  private play(uri: string, text: string, signal: AbortSignal): Promise<void> {
    let player: AudioPlayer;
    try {
      player = createAudioPlayer({ uri }, { updateInterval: 100 });
    } catch {
      return this.fallback.speak(text, signal);
    }
    this.current = player;
    return new Promise<void>((resolve) => {
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
        if (failed && !signal.aborted) this.fallback.speak(text, signal).then(resolve);
        else resolve();
      };
      player.play();
    });
  }

  stop() {
    try {
      this.current?.pause();
    } catch {}
    this.fallback.stop();
  }

  dispose() {
    this.stop();
  }
}
