import { sleep, type ListenOptions, type ListenResult, type VoiceError, type VoiceIO } from '../voice/types';
import type { Session, SessionMoment } from '../domain/types';
import type { EngineDraft, SessionEngine } from './SessionEngine';
import type { Phase } from './phases';
import type { GuideBrain, GuideTurn } from './types';

/**
 * The loop that turns an engine, a brain and a voice into a session.
 *
 *   ask the brain → speak each line → hold its silence → listen → hand the
 *   answer to the engine → repeat, until the engine says it is done.
 *
 * Listening and speaking alternate on their own; nothing here waits for a
 * tap. Every step runs under an AbortController so that pause, an audio
 * interruption or End can cut in at any moment — mid-sentence, mid-silence or
 * mid-answer — and the next turn picks up with "Let's continue."
 */

export type RunnerStatus = 'preparing' | 'speaking' | 'holding' | 'listening' | 'paused' | 'complete' | 'error';

export type RunnerState = {
  status: RunnerStatus;
  phase: Phase;
  error?: VoiceError;
  pausedBy?: PauseReason;
};

export type PauseReason = 'button' | 'voice' | 'interrupted' | 'background' | 'error';

export type RunnerDeps = {
  engine: SessionEngine;
  brain: GuideBrain;
  voice: VoiceIO;
  onState: (s: RunnerState) => void;
  onLevel?: (level: number) => void;
  onDraft?: (d: EngineDraft) => void;
  /** Developer-only: every line and answer, for the debug panel. Never shown to the person. */
  onDebug?: (entry: { who: 'guide' | 'user' | 'silence' | 'system'; text: string }) => void;
  contextualStrings?: string[];
};

const END_OF_UTTERANCE_MS = 1700;

function withTimeout<T>(p: Promise<T> | undefined, ms: number): Promise<T | undefined> {
  if (!p) return Promise.resolve(undefined);
  return Promise.race([p, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]);
}
const MAX_UTTERANCE_MS = 45_000;
/**
 * The recogniser can fail to start for a moment ("busy", "audio-capture") while the
 * guide's audio is being released. Paused on the first one, the session stopped by itself
 * mid-practice; a real interruption (a call, Siri) still fails again and pauses.
 */
const LISTEN_RETRIES = 2;
const LISTEN_RETRY_MS = 600;

export class SessionRunner {
  private paused: PauseReason | null = null;
  private resumeWaiters: Array<() => void> = [];
  private step?: AbortController;
  private hardStop = false;
  private pausedAt = 0;
  private pausedTotal = 0;
  private status: RunnerStatus = 'preparing';
  private unsubLevel?: () => void;

  constructor(private readonly d: RunnerDeps) {}

  get engine() {
    return this.d.engine;
  }

  /** Milliseconds of session time, not counting pauses. */
  get activeMs(): number {
    const pausedNow = this.paused ? Date.now() - this.pausedAt : 0;
    return this.d.engine.elapsedMs - this.pausedTotal - pausedNow;
  }

  get isPaused(): boolean {
    return this.paused !== null;
  }

  async run(): Promise<{ session: Session; moments: SessionMoment[] }> {
    const { engine, voice } = this.d;
    this.unsubLevel = voice.input.onLevel?.((l) => this.d.onLevel?.(l));
    // Setup must never hold the session hostage: a voice list or audio mode that
    // never resolves (it happens on some platforms) times out and the session goes on.
    try {
      await withTimeout(voice.output.begin?.(), 2500);
      await withTimeout(voice.input.begin?.(), 2500);
    } catch (e) {
      this.debug('system', `audio setup failed: ${String(e)}`);
    }

    try {
      while (!engine.done && !this.hardStop) {
        await this.waitWhilePaused();
        if (this.hardStop) break;
        const step = (this.step = new AbortController());

        const turn = await this.d.brain.next(engine.context(), step.signal);
        if (this.cutShort(step)) continue;
        if (turn.lines.length === 0 && !turn.expectsResponse) {
          engine.recordGuideTurn(turn);
          engine.afterGuideTurn(turn);
          continue;
        }
        engine.recordGuideTurn(turn);
        await this.speakTurn(turn, step.signal);
        if (this.cutShort(step)) continue;

        engine.afterGuideTurn(turn);
        if (engine.done) break;
        if (!turn.expectsResponse) continue;

        // The cue goes before "listening" so the recogniser never hears it as the person's answer.
        await this.d.voice.output.cue?.(step.signal);
        if (this.cutShort(step)) continue;
        this.set('listening');
        const lastLine = turn.lines[turn.lines.length - 1]?.text;
        const result = await this.listen(
          {
            maxWaitMs: turn.listenWindowMs ?? 14_000,
            endOfUtteranceMs: END_OF_UTTERANCE_MS,
            maxUtteranceMs: MAX_UTTERANCE_MS,
            prompt: lastLine,
            contextualStrings: this.d.contextualStrings,
          },
          step.signal,
        );
        if (this.cutShort(step) || result.kind === 'aborted') {
          if (!this.hardStop) engine.markInterrupted();
          continue;
        }
        if (result.kind === 'error') {
          this.handleListenError(result);
          continue;
        }
        this.debug(result.kind === 'speech' ? 'user' : 'silence', result.kind === 'speech' ? result.text : `${Math.round(result.waitedMs / 1000)}s`);
        const outcome = engine.ingest(
          result.kind === 'speech' ? { kind: 'speech', text: result.text, durationMs: result.durationMs } : { kind: 'silence', waitedMs: result.waitedMs },
        );
        this.d.onDraft?.(engine.toDraft());
        if (outcome.command === 'pause') await this.voicePause();
      }
    } finally {
      this.unsubLevel?.();
      this.d.voice.output.stop();
      await this.d.voice.input.end?.().catch(() => {});
      await this.d.voice.output.end?.().catch(() => {});
    }

    this.set('complete');
    return engine.finalize();
  }

  pause(reason: PauseReason = 'button') {
    if (this.paused || this.hardStop || this.d.engine.done) return;
    this.paused = reason;
    this.pausedAt = Date.now();
    this.step?.abort();
    this.d.voice.output.stop();
    this.set('paused');
  }

  resume() {
    if (!this.paused) return;
    this.pausedTotal += Date.now() - this.pausedAt;
    this.paused = null;
    this.d.engine.markInterrupted();
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    waiters.forEach((w) => w());
  }

  /** End now. No closing lines; what was noticed so far is kept. */
  end() {
    this.hardStop = true;
    this.d.engine.abort();
    this.step?.abort();
    this.d.voice.output.stop();
    if (this.paused) {
      this.paused = null;
      this.resumeWaiters.forEach((w) => w());
      this.resumeWaiters = [];
    }
  }

  private async listen(opts: ListenOptions, signal: AbortSignal): Promise<ListenResult> {
    for (let attempt = 0; ; attempt++) {
      const r = await this.d.voice.input.listen(opts, signal);
      if (r.kind !== 'error' || r.error.code !== 'interrupted' || attempt >= LISTEN_RETRIES || signal.aborted) return r;
      this.debug('system', `listen interrupted (${r.error.message}); listening again`);
      await sleep(LISTEN_RETRY_MS, signal);
      if (signal.aborted) return { kind: 'aborted' };
    }
  }

  private async speakTurn(turn: GuideTurn, signal: AbortSignal) {
    const out = this.d.voice.output;
    out.prepare?.(turn.lines.map((l) => l.text));
    for (const line of turn.lines) {
      if (signal.aborted) return;
      this.set('speaking');
      this.debug('guide', line.text);
      try {
        await out.speak(line.text, signal);
      } catch (e) {
        // The guide has one voice. When it can't be reached, the session pauses
        // (resume repeats the turn) rather than carrying on in a different voice.
        this.debug('system', `voice unavailable: ${String((e as { message?: string })?.message ?? e)}`);
        this.pause('error');
        return;
      }
      if (signal.aborted) return;
      if (line.pauseAfterMs > 0) {
        this.set('holding');
        await sleep(line.pauseAfterMs, signal);
      }
    }
  }

  /** A step was aborted by pause or end. Pauses resume with "Let's continue." */
  private cutShort(step: AbortController): boolean {
    if (!step.signal.aborted) return false;
    if (!this.hardStop) this.d.engine.markInterrupted();
    return true;
  }

  private handleListenError(result: Extract<ListenResult, { kind: 'error' }>) {
    this.debug('system', `listen error: ${result.error.code} ${result.error.message}`);
    if (result.error.code === 'interrupted') {
      this.pause('interrupted');
      return;
    }
    if (result.error.code === 'permission' || result.error.code === 'unavailable') {
      this.paused = 'error';
      this.pausedAt = Date.now();
      this.d.onState({ status: 'error', phase: this.d.engine.phase, error: result.error, pausedBy: 'error' });
      return;
    }
    // Anything else: treat as a silence and carry on rather than stall an eyes-closed session.
    this.d.engine.ingest({ kind: 'silence', waitedMs: 0 });
  }

  /** "Pause" said aloud: the guide acknowledges, then listens only for "continue". */
  private async voicePause() {
    this.paused = 'voice';
    this.pausedAt = Date.now();
    this.set('paused');
    const step = (this.step = new AbortController());
    await this.d.voice.output.speak("Pausing. Say 'continue' when you're ready.", step.signal);
    while (this.paused === 'voice' && !this.hardStop) {
      const r = await this.d.voice.input.listen(
        { maxWaitMs: 60_000, endOfUtteranceMs: 1200, maxUtteranceMs: 10_000, prompt: 'paused' },
        step.signal,
      );
      if (step.signal.aborted || this.paused !== 'voice') break;
      if (r.kind === 'speech' && /\b(continue|resume|ready|go on|keep going|i'?m back)\b/i.test(r.text)) {
        this.resume();
        break;
      }
      if (r.kind === 'speech' && /\b(stop|end|done)\b/i.test(r.text)) {
        this.paused = null;
        this.d.engine.requestStop();
        break;
      }
      if (r.kind === 'error') break;
    }
  }

  private async waitWhilePaused() {
    if (!this.paused) return;
    await new Promise<void>((resolve) => this.resumeWaiters.push(resolve));
  }

  private set(status: RunnerStatus) {
    if (this.paused && status !== 'paused' && status !== 'complete') return;
    this.status = status;
    this.d.onState({ status, phase: this.d.engine.phase, pausedBy: this.paused ?? undefined });
  }

  private debug(who: 'guide' | 'user' | 'silence' | 'system', text: string) {
    this.d.onDebug?.({ who, text });
  }
}
