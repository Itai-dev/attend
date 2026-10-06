import { recommendedPreset } from '../domain/presets';
import {
  parseFocus,
  parseMinutes,
  parseUnderstood,
  parseVoiceOffer,
  parseVoiceReply,
  parseWelcomeCommand,
  SPOKEN,
  type WelcomeAnswers,
} from '../domain/welcome';
import { sleep, type ListenResult, type SpeechInput, type SpeechOutput, type VoiceError } from '../voice/types';
import type { PauseReason, RunnerStatus } from './SessionRunner';

/**
 * The spoken welcome: the guide asks, the person answers aloud, the same loop as a session
 * (speak → listen → act) with the same pause, resume and end. It decides nothing clinical;
 * it only learns what kind of session to set up, then says the safety note and waits for
 * "I understand".
 *
 * Answers are understood on the device by plain word matching (domain/welcome.ts). Nothing
 * the person says leaves the phone; only the guide's own fixed lines are voiced. An answer
 * that isn't understood is asked once more with a hint, then a gentle default is taken
 * rather than looping — except for the safety note, which is never assumed: without a clear
 * "I understand" the screen asks for a tap instead.
 */

export type WelcomeStep = 'intro' | 'focus' | 'minutes' | 'voice' | 'safety' | 'ready';
const STEPS: WelcomeStep[] = ['intro', 'focus', 'minutes', 'voice', 'safety', 'ready'];

export type WelcomeResult = {
  answers: WelcomeAnswers;
  /** True when the person asked to stop, or listening became unavailable: show the tap-through welcome. */
  ended: boolean;
  error?: VoiceError;
};

export type WelcomeDeps = {
  input: SpeechInput;
  /** One output per voice: the welcome speaks in its own voice, and each sample in that voice. */
  outputFor: (voiceId: string) => SpeechOutput;
  welcomeVoice: { id: string; name: string };
  voices: ReadonlyArray<{ id: string; name: string }>;
  onState: (s: { status: RunnerStatus; step: WelcomeStep; pausedBy?: PauseReason; error?: VoiceError }) => void;
  onLevel?: (level: number) => void;
  onDebug?: (entry: { who: 'guide' | 'user' | 'silence' | 'system'; text: string }) => void;
};

const LISTEN = { maxWaitMs: 12_000, endOfUtteranceMs: 1500, maxUtteranceMs: 20_000 };
const LISTEN_RETRIES = 2;

export class WelcomeRunner {
  private stepIndex = 0;
  private tries = 0;
  /** Which voice sample is playing (index into the other voices), while auditioning. */
  private sample = -1;
  private answers: WelcomeAnswers = {};
  private paused: PauseReason | null = null;
  private resumeWaiters: Array<() => void> = [];
  private ctl?: AbortController;
  private stopped = false;
  private skipped = false;
  private error?: VoiceError;
  private outputs = new Map<string, SpeechOutput>();
  private startedAt = Date.now();

  constructor(private readonly d: WelcomeDeps) {}

  get activeMs() {
    return Date.now() - this.startedAt;
  }

  get step(): WelcomeStep {
    return STEPS[Math.min(this.stepIndex, STEPS.length - 1)];
  }

  async run(): Promise<WelcomeResult> {
    const unsub = this.d.input.onLevel?.((l) => this.d.onLevel?.(l));
    await withTimeout(this.out(this.d.welcomeVoice.id).begin?.(), 2500);
    await withTimeout(this.d.input.begin?.(), 2500);
    try {
      while (this.stepIndex < STEPS.length && !this.stopped) {
        await this.waitWhilePaused();
        if (this.stopped) break;
        const ctl = (this.ctl = new AbortController());
        let done = false;
        try {
          done = await this.runStep(this.step, ctl.signal);
        } catch (e) {
          // The guide's voice couldn't be reached: pause, as a session does; resume repeats the step.
          this.debug('system', `voice unavailable: ${String((e as { message?: string })?.message ?? e)}`);
          this.pause('error');
          continue;
        }
        if (ctl.signal.aborted) continue;
        if (done) {
          this.stepIndex++;
          this.tries = 0;
        }
      }
    } finally {
      unsub?.();
      this.outputs.forEach((o) => o.stop());
      await this.d.input.end?.().catch(() => {});
      this.outputs.forEach((o) => o.dispose());
    }
    this.set('complete');
    return { answers: this.answers, ended: this.skipped || !!this.error, error: this.error };
  }

  pause(reason: PauseReason = 'button') {
    if (this.paused || this.stopped) return;
    this.paused = reason;
    this.ctl?.abort();
    this.outputs.forEach((o) => o.stop());
    this.set('paused');
  }

  resume() {
    if (!this.paused) return;
    this.paused = null;
    const w = this.resumeWaiters;
    this.resumeWaiters = [];
    w.forEach((f) => f());
  }

  /** Stop now and fall back to tapping through. */
  end() {
    this.stopped = true;
    this.skipped = true;
    this.ctl?.abort();
    this.outputs.forEach((o) => o.stop());
    if (this.paused) {
      this.paused = null;
      this.resumeWaiters.forEach((f) => f());
      this.resumeWaiters = [];
    }
  }

  /** One step. Resolves true when it is finished; false to run it again (unclear answer, "sorry?"). */
  private async runStep(step: WelcomeStep, signal: AbortSignal): Promise<boolean> {
    const hint = this.tries > 0;
    switch (step) {
      case 'intro':
        await this.say(SPOKEN.intro, signal);
        return true;

      case 'focus': {
        const r = await this.ask(hint ? [SPOKEN.focusHint] : [SPOKEN.focus], signal);
        if (r === undefined) return false;
        const focus = r === null ? undefined : parseFocus(r);
        if (focus || this.tries >= 1) {
          this.answers.focus = focus ?? 'notice';
          return true;
        }
        this.tries++;
        return false;
      }

      case 'minutes': {
        const r = await this.ask(hint ? [SPOKEN.minutesHint] : [SPOKEN.minutes], signal);
        if (r === undefined) return false;
        const minutes = r === null ? undefined : parseMinutes(r);
        if (minutes || this.tries >= 1) {
          this.answers.minutes = minutes ?? 5;
          return true;
        }
        this.tries++;
        return false;
      }

      case 'voice':
        return this.voiceStep(hint, signal);

      case 'safety': {
        const r = await this.ask(hint ? [SPOKEN.safetyAsk] : [...SPOKEN.safety, SPOKEN.safetyAsk], signal);
        if (r === undefined) return false;
        if (r !== null && parseUnderstood(r)) {
          this.answers.understood = true;
          return true;
        }
        // Never assumed: after a second unclear answer the screen asks for a tap.
        if (this.tries >= 1) return true;
        this.tries++;
        return false;
      }

      case 'ready': {
        const p = recommendedPreset({ focus: this.answers.focus, minutes: this.answers.minutes, voiceId: this.answers.voice });
        const voice = this.answers.voice && this.answers.voice !== 'later' ? this.answers.voice : this.d.welcomeVoice.id;
        await this.say([SPOKEN.ready(p.title, p.minutes)], signal, voice);
        return true;
      }
    }
  }

  private async voiceStep(hint: boolean, signal: AbortSignal): Promise<boolean> {
    const others = this.d.voices.filter((v) => v.id !== this.d.welcomeVoice.id);
    if (this.sample < 0) {
      const r = await this.ask([hint ? SPOKEN.voiceOfferHint : SPOKEN.voiceOffer(this.d.welcomeVoice.name)], signal);
      if (r === undefined) return false;
      const choice = r === null ? undefined : parseVoiceOffer(r);
      if (choice === 'keep' || (!choice && this.tries >= 1)) {
        this.answers.voice = this.d.welcomeVoice.id;
        return true;
      }
      if (!choice) {
        this.tries++;
        return false;
      }
      this.sample = 0;
      this.tries = 0;
    }
    while (this.sample < others.length) {
      const v = others[this.sample];
      const r = await this.ask([this.tries > 0 ? SPOKEN.voiceSampleHint : SPOKEN.voiceSample(v.name)], signal, v.id);
      if (r === undefined) return false;
      const reply = r === null ? undefined : parseVoiceReply(r);
      if (reply === 'keep') {
        this.answers.voice = v.id;
        return true;
      }
      if (!reply && this.tries < 1) {
        this.tries++;
        continue;
      }
      this.sample++;
      this.tries = 0;
    }
    this.answers.voice = 'later';
    await this.say([SPOKEN.voicesDone], signal);
    return !signal.aborted;
  }

  /**
   * Speak, then listen. Resolves the words heard, null for silence, or undefined when the step
   * should run again unchanged ("sorry?", or cut short by pause/end).
   */
  private async ask(lines: string[], signal: AbortSignal, voiceId?: string): Promise<string | null | undefined> {
    await this.say(lines, signal, voiceId);
    if (signal.aborted) return undefined;
    this.set('listening');
    const r = await this.listen(signal);
    if (signal.aborted || r.kind === 'aborted') return undefined;
    if (r.kind === 'error') {
      this.debug('system', `listen error: ${r.error.code} ${r.error.message}`);
      if (r.error.code === 'permission' || r.error.code === 'unavailable') {
        this.error = r.error;
        this.stopped = true;
        return undefined;
      }
      if (r.error.code === 'interrupted') {
        this.pause('interrupted');
        return undefined;
      }
      return null;
    }
    if (r.kind === 'silence') {
      this.debug('silence', `${Math.round(r.waitedMs / 1000)}s`);
      return null;
    }
    this.debug('user', r.text);
    const command = parseWelcomeCommand(r.text);
    if (command === 'skip') {
      this.end();
      return undefined;
    }
    if (command === 'repeat') return undefined;
    return r.text;
  }

  private async listen(signal: AbortSignal): Promise<ListenResult> {
    for (let attempt = 0; ; attempt++) {
      const r = await this.d.input.listen(LISTEN, signal);
      if (r.kind !== 'error' || r.error.code !== 'interrupted' || attempt >= LISTEN_RETRIES || signal.aborted) return r;
      await sleep(600, signal);
      if (signal.aborted) return { kind: 'aborted' };
    }
  }

  private async say(lines: readonly string[], signal: AbortSignal, voiceId = this.d.welcomeVoice.id) {
    const out = this.out(voiceId);
    out.prepare?.([...lines]);
    for (const line of lines) {
      if (signal.aborted) return;
      this.set('speaking');
      this.debug('guide', line);
      await out.speak(line, signal);
      if (signal.aborted) return;
      this.set('holding');
      await sleep(500, signal);
    }
  }

  private out(voiceId: string): SpeechOutput {
    let o = this.outputs.get(voiceId);
    if (!o) {
      o = this.d.outputFor(voiceId);
      this.outputs.set(voiceId, o);
    }
    return o;
  }

  private async waitWhilePaused() {
    if (!this.paused) return;
    await new Promise<void>((resolve) => this.resumeWaiters.push(resolve));
  }

  private set(status: RunnerStatus) {
    if (this.paused && status !== 'paused' && status !== 'complete') return;
    this.d.onState({ status, step: this.step, pausedBy: this.paused ?? undefined, error: this.error });
  }

  private debug(who: 'guide' | 'user' | 'silence' | 'system', text: string) {
    this.d.onDebug?.({ who, text });
  }
}

function withTimeout<T>(p: Promise<T> | undefined, ms: number): Promise<T | undefined> {
  if (!p) return Promise.resolve(undefined);
  return Promise.race([p.catch(() => undefined), new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);
}
