/**
 * The seam between the session and any speech vendor.
 *
 * The UI and the engine only ever see these interfaces. On-device speech
 * recognition, a simulated participant, a developer's typed lines, the system
 * voice and ElevenLabs are all implementations behind them, and swapping one
 * changes nothing upstream.
 */

export type ListenOptions = {
  /** How long to wait for speech to begin before calling it silence. */
  maxWaitMs: number;
  /** How long a pause ends an utterance. Extended when the person trails off ("and…", "um…"). */
  endOfUtteranceMs: number;
  /** A hard ceiling on one answer. */
  maxUtteranceMs: number;
  /** The guide's last line — simulated participants answer it; recognisers may use it as context. */
  prompt?: string;
  /** Words the recogniser should expect (body regions, sensation words). */
  contextualStrings?: string[];
};

export type ListenResult =
  | { kind: 'speech'; text: string; durationMs: number }
  | { kind: 'silence'; waitedMs: number }
  | { kind: 'aborted' }
  | { kind: 'error'; error: VoiceError };

export type VoiceError = {
  code: 'permission' | 'unavailable' | 'interrupted' | 'network' | 'unknown';
  message: string;
};

export interface SpeechInput {
  readonly id: string;
  readonly label: string;
  /** Can this input work here at all (module present, recogniser available)? */
  isAvailable(): Promise<boolean>;
  /** Ask for whatever permission it needs. Resolves false if refused. */
  requestPermission(): Promise<boolean>;
  listen(opts: ListenOptions, signal: AbortSignal): Promise<ListenResult>;
  /** Microphone level 0..1, for the session visual. Optional. */
  onLevel?(cb: (level: number) => void): () => void;
  /** Called once when a session begins and ends, to set up and release audio. */
  begin?(): Promise<void>;
  end?(): Promise<void>;
  dispose(): void;
}

export interface SpeechOutput {
  readonly id: string;
  readonly label: string;
  isAvailable(): Promise<boolean>;
  /** Hint the lines coming next so they can be fetched while this one plays. */
  prepare?(texts: string[]): void;
  /** Resolves when the line has finished, or immediately when aborted. */
  speak(text: string, signal: AbortSignal): Promise<void>;
  stop(): void;
  begin?(): Promise<void>;
  end?(): Promise<void>;
  dispose(): void;
}

export type VoiceIO = {
  input: SpeechInput;
  output: SpeechOutput;
};

/**
 * Development only: end-to-end runs of a whole session (web preview, automated checks)
 * can compress the guide's silences by setting `globalThis.__attendTimeScale`.
 */
function timeScale(): number {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return 1;
  const s = (globalThis as { __attendTimeScale?: number }).__attendTimeScale;
  return typeof s === 'number' && s > 0 ? s : 1;
}

/** Resolve after `ms`, or resolve immediately if aborted. Never rejects. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted || ms <= 0) return resolve();
    const t = setTimeout(done, ms * timeScale());
    function done() {
      clearTimeout(t);
      signal?.removeEventListener('abort', done);
      resolve();
    }
    signal?.addEventListener('abort', done, { once: true });
  });
}
