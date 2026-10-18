import { createAudioPlayer, type AudioPlayer, type AudioSource, type AudioStatus } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { beginSessionAudio } from '../audioSession';
import type { SpeakOptions, SpeechOutput, VoiceError } from '../types';

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
 * Cached lines are keyed on the voice (the folder) and the line's words (the file name) only.
 * Keyed on the whole request — agent speed/stability, delivery tags — a cold start offline
 * missed every line: those settings come from the server and weren't known yet, so the
 * guide was silent even with the whole session on the phone. The cost: an edit to the agent's
 * settings re-records only lines that aren't cached yet (clear the cache to hear it everywhere).
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
  /** Voice settings from the session type's ElevenLabs agent. Sent with a request; not part of the cache key. */
  settings?: { speed?: number; stability?: number; similarity?: number };
};

const PREFETCH = 3;
const FETCH_TIMEOUT_MS = 10_000;
const ATTEMPTS = 3;
/** After a failure, on Resume: one try, and an answer within this long either way. */
const QUICK_TIMEOUT_MS = 6_000;

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
    return Promise.all(texts.map((t) => this.fetchLine(t)));
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

  /** The cached file for a line: the voice is the folder, the words are the name. */
  private fileFor(text: string): File | null {
    return this.dir ? new File(this.dir, `${hash(text)}.mp3`) : null;
  }

  /** The line's local URI if it is already on the phone. */
  private cached(text: string): string | null {
    const file = this.fileFor(text);
    if (!file || !this.dir) return null;
    try {
      if (file.exists && file.size > 1000) return file.uri;
      // Saved by an earlier build under the old whole-request key: adopt it rather than download again.
      const legacy = new File(this.dir, `${hash(this.url(this.say(text)))}.mp3`);
      if (legacy.exists && (legacy.size ?? 0) > 1000) {
        legacy.moveSync(file);
        return file.uri;
      }
    } catch {}
    return null;
  }

  /** Local file URI for a line, downloading it if needed. Null if it can't be had. */
  private fetchLine(text: string, attempts = ATTEMPTS, timeoutMs = FETCH_TIMEOUT_MS): Promise<string | null> {
    const existing = this.inflight.get(text);
    if (existing) return existing;
    const p = (async () => {
      const hit = this.cached(text);
      if (hit) return hit;
      const file = this.fileFor(text);
      if (!file) return null;
      for (let attempt = 0; attempt < attempts; attempt++) {
        const uri = await this.download(text, file, timeoutMs);
        if (uri) return uri;
      }
      return null;
    })();
    this.inflight.set(text, p);
    p.finally(() => setTimeout(() => this.inflight.delete(text), 0));
    return p;
  }

  /**
   * One short try. Races any download already under way (a prefetch with full retries) so a
   * resume after a failure answers within QUICK_TIMEOUT_MS; the download itself carries on and
   * still fills the cache if it lands later.
   */
  private quickLine(text: string): Promise<string | null> {
    const hit = this.cached(text);
    if (hit) return Promise.resolve(hit);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<null>((resolve) => (timer = setTimeout(() => resolve(null), QUICK_TIMEOUT_MS)));
    return Promise.race([this.fetchLine(text, 1, QUICK_TIMEOUT_MS), late]).finally(() => clearTimeout(timer));
  }

  private async download(text: string, file: File, timeoutMs: number): Promise<string | null> {
    try {
      // What is sent carries the delivery direction; the file it lands in is keyed on the words alone.
      const download = File.downloadFileAsync(this.url(this.say(text)), file, {
        headers: this.cfg.headers,
        idempotent: true,
      });
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)));
      const saved = await Promise.race([download, timeout]).finally(() => clearTimeout(timer));
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

  /** What is sent to the voice: the line with its delivery direction (not part of the cache key). */
  private say(text: string) {
    const d = this.cfg.direction?.().trim();
    return d ? `${d} ${text}` : text;
  }

  prepare(texts: string[]) {
    for (const t of texts.slice(0, PREFETCH)) void this.fetchLine(t);
  }

  async speak(text: string, signal: AbortSignal, opts?: SpeakOptions): Promise<void> {
    if (signal.aborted) return;
    const uri = await (opts?.quick ? this.quickLine(text) : this.fetchLine(text));
    if (signal.aborted) return;
    if (!uri) {
      this.failures++;
      throw unavailable('The guide voice could not be reached.');
    }
    return this.play({ uri }, signal);
  }

  /**
   * A soft bell before the guide listens (assets/audio/turn-cue.wav), so an eyes-closed person
   * knows it is their turn without the question ending abruptly into silence. Bundled, so it
   * never waits on the network; if it can't play, listening simply starts.
   */
  async cue(signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;
    await this.play(require('../../../assets/audio/turn-cue.wav'), signal, 0.5).catch(() => {});
  }

  private play(source: AudioSource, signal: AbortSignal, volume?: number): Promise<void> {
    let player: AudioPlayer;
    try {
      // keepAudioSessionActive: by default expo-audio switches the audio session off ~100 ms after a
      // player finishes or pauses. Listening starts right after a line, so that cut the recogniser's
      // microphone mid-start ("audio-capture"/"interrupted") and the session paused after every line.
      player = createAudioPlayer(source, { updateInterval: 100, keepAudioSessionActive: true });
      if (volume !== undefined) player.volume = volume;
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
