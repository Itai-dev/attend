import type { ListenOptions, ListenResult, SpeechInput } from '../types';

/**
 * Developer-only: answers typed into the debug panel stand in for speech.
 * Never reachable from the product UI; the panel that feeds it only renders
 * in __DEV__ with the developer setting on.
 */
export class DevTextInput implements SpeechInput {
  readonly id = 'dev-text';
  readonly label = 'Typed answers (developer)';
  private pending: ((text: string) => void) | null = null;
  private queue: string[] = [];

  async isAvailable() {
    return true;
  }

  async requestPermission() {
    return true;
  }

  /** Called by the dev panel. */
  inject(text: string) {
    const t = text.trim();
    if (!t) return;
    if (this.pending) {
      const p = this.pending;
      this.pending = null;
      p(t);
    } else {
      this.queue.push(t);
    }
  }

  get waiting() {
    return this.pending !== null;
  }

  listen(opts: ListenOptions, signal: AbortSignal): Promise<ListenResult> {
    if (signal.aborted) return Promise.resolve({ kind: 'aborted' });
    const queued = this.queue.shift();
    if (queued) return Promise.resolve({ kind: 'speech', text: queued, durationMs: 0 });
    return new Promise((resolve) => {
      const startedAt = Date.now();
      // Typing is slower than talking; give it more room before calling it silence.
      const timer = setTimeout(() => done({ kind: 'silence', waitedMs: Date.now() - startedAt }), Math.max(opts.maxWaitMs * 3, 45_000));
      const onAbort = () => done({ kind: 'aborted' });
      signal.addEventListener('abort', onAbort, { once: true });
      this.pending = (text) => done({ kind: 'speech', text, durationMs: 0 });
      const self = this;
      function done(r: ListenResult) {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        self.pending = null;
        resolve(r);
      }
    });
  }

  dispose() {
    this.pending = null;
    this.queue = [];
  }
}
