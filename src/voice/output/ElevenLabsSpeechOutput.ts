import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';
import type { SpeechOutput } from '../types';

/**
 * The guide's natural voice: ElevenLabs text-to-speech, fetched through the
 * Attend proxy so the ElevenLabs key never ships in the app.
 *
 * Lines are fetched one or two ahead (`prepare`) while the current one plays,
 * so the silence between lines is the silence the guide intended, not
 * network latency. If a line cannot be fetched in time, it is spoken by the
 * fallback voice instead: an eyes-closed session must never just stop.
 *
 * Only the guide's own lines go to the proxy. A line may echo a single word
 * the person used ("Notice that tightness."), never their sentences.
 */

export type ElevenLabsConfig = {
  apiUrl: string;
  headers?: Record<string, string>;
  voiceId: string;
};

const LOAD_TIMEOUT_MS = 6000;
const PREFETCH = 2;

export class ElevenLabsSpeechOutput implements SpeechOutput {
  readonly id = 'elevenlabs';
  readonly label = 'Natural voice';
  private players = new Map<string, AudioPlayer>();
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
  }

  private source(text: string) {
    const base = this.cfg.apiUrl.replace(/\/$/, '');
    const uri = `${base}/tts?voice=${encodeURIComponent(this.cfg.voiceId)}&text=${encodeURIComponent(text)}`;
    return {
      uri,
      headers: this.cfg.headers && Object.keys(this.cfg.headers).length ? this.cfg.headers : undefined,
    };
  }

  private playerFor(text: string): AudioPlayer {
    const existing = this.players.get(text);
    if (existing) {
      this.players.delete(text);
      return existing;
    }
    return createAudioPlayer(this.source(text), { downloadFirst: true, updateInterval: 100 });
  }

  prepare(texts: string[]) {
    for (const t of texts.slice(0, PREFETCH)) {
      if (this.players.has(t)) continue;
      try {
        this.players.set(t, createAudioPlayer(this.source(t), { downloadFirst: true, updateInterval: 100 }));
      } catch {
        // Prefetch is an optimisation only.
      }
    }
  }

  speak(text: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.resolve();
    // After repeated failures, stop trying for this session and use the fallback voice.
    if (this.failures >= 3) return this.fallback.speak(text, signal);

    let player: AudioPlayer;
    try {
      player = this.playerFor(text);
    } catch {
      this.failures++;
      return this.fallback.speak(text, signal);
    }
    this.current = player;

    return new Promise<void>((resolve) => {
      let settled = false;
      let started = false;
      let nudged = false;
      const startedAt = Date.now();

      const sub = player.addListener('playbackStatusUpdate', (st: AudioStatus) => {
        if (st.error) return fail();
        if (st.playing || st.currentTime > 0) started = true;
        // play() before the download finished may be ignored; ask once more when it is ready.
        if (st.isLoaded && !st.playing && !started && !nudged) {
          nudged = true;
          player.play();
        }
        if (st.didJustFinish) done();
      });

      const watchdog = setInterval(() => {
        if (!started && Date.now() - startedAt > LOAD_TIMEOUT_MS) fail();
        // A line that never reports finishing still ends, eventually.
        if (Date.now() - startedAt > 60_000) done();
      }, 250);

      player.play();

      const onAbort = () => {
        try {
          player.pause();
        } catch {}
        done();
      };
      signal.addEventListener('abort', onAbort, { once: true });

      const cleanup = () => {
        clearInterval(watchdog);
        sub.remove();
        signal.removeEventListener('abort', onAbort);
        try {
          player.remove();
        } catch {}
        if (this.current === player) this.current = undefined;
      };

      const done = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const fail = () => {
        if (settled) return;
        settled = true;
        this.failures++;
        cleanup();
        this.fallback.speak(text, signal).then(resolve);
      };
    });
  }

  stop() {
    try {
      this.current?.pause();
    } catch {}
    this.fallback.stop();
  }

  async end() {
    this.clearPrefetch();
  }

  private clearPrefetch() {
    for (const p of this.players.values()) {
      try {
        p.remove();
      } catch {}
    }
    this.players.clear();
  }

  dispose() {
    this.stop();
    this.clearPrefetch();
  }
}
