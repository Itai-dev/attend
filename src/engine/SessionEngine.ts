import { applyObservation, cloneMap, consolidateChanges, type MapState } from '../domain/bodyMap';
import { extract, hasBodyContent, type Command, type Observation } from '../domain/extract';
import { newId as defaultNewId } from '../domain/ids';
import { DESCRIPTORS } from '../domain/lexicon';
import { buildRecap } from '../domain/recap';
import { REGIONS } from '../domain/regions';
import { screen } from '../domain/safety';
import {
  EMPTY_SIGNALS,
  type BodyRegion,
  type BodySensation,
  type SensationChange,
  type Session,
  type SessionMoment,
  type SessionOutcome,
  type SessionSignals,
  type SessionType,
} from '../domain/types';
import { isClosing, isDescribing, PLANS, type Phase, type SessionPlan } from './phases';
import type { AskKind, GuideContext, GuideLine, GuideTurn, HistoryItem, RemoteObservations, UserTurn } from './types';

/**
 * The session's state machine. Pure TypeScript: no audio, no React, no timers.
 *
 * The engine decides WHERE the session is (phase, time, safety) and keeps the
 * record (maps, changes, signals, moments). It does not decide what to say —
 * a GuideBrain does that from the context the engine hands it — and it does
 * not speak or listen — the SessionRunner does that through a VoiceIO.
 *
 * Everything time-based reads `now()`, so a whole session can be driven in a
 * unit test in milliseconds.
 */

export type EngineOptions = {
  sessionType: SessionType;
  now?: () => number;
  newId?: (prefix?: string) => string;
  seed?: number;
  keepTranscript?: boolean;
};

export type IngestOutcome = { command?: Command };

export type EngineDraft = {
  sessionId: string;
  sessionType: SessionType;
  startedAt: number;
  updatedAt: number;
  map: MapState;
  changes: SensationChange[];
  signals: SessionSignals;
  moments: SessionMoment[];
  outcome: SessionOutcome;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NARROWING_ASKS: AskKind[] = ['locate_where', 'locate_narrow', 'locate_side'];
/** Do not let observation run past this share of the session if there is still time to fill with silence. */
const OBSERVE_EXTRA_TURNS = 2;

export class SessionEngine {
  readonly sessionId: string;
  readonly sessionType: SessionType;
  readonly plan: SessionPlan;
  readonly startedAt: number;

  private readonly now: () => number;
  private readonly newId: (prefix?: string) => string;
  private readonly random: () => number;
  private readonly keepTranscript: boolean;

  private _phase: Phase = 'ARRIVE';
  private phaseTurn = 0;
  private observeSince?: number;
  private observedMs = 0;
  private map: MapState = { current: { sensations: [] }, baseline: { sensations: [] } };
  private unplaced: Observation[] = [];
  private asked: AskKind[] = [];
  private usedLines = new Set<string>();
  private history: HistoryItem[] = [];
  private moments: SessionMoment[] = [];
  private changes: SensationChange[] = [];
  private lastChanges: SensationChange[] = [];
  private lastObservation?: Observation;
  private lastResult: 'speech' | 'silence' | 'none' = 'none';
  private lastAsk?: AskKind;
  private lastQuestion?: GuideLine;
  private silenceStreak = 0;
  private nothingStreak = 0;
  private signals: SessionSignals = { ...EMPTY_SIGNALS };
  private safetyChecked = false;
  private phaseBeforeCheck?: Phase;
  private resumed = false;
  private repeatRequested = false;
  private advanceAfterAnswer = false;
  private outcome: SessionOutcome = 'completed';

  constructor(opts: EngineOptions) {
    this.sessionType = opts.sessionType;
    this.plan = PLANS[opts.sessionType];
    this.now = opts.now ?? Date.now;
    this.newId = opts.newId ?? defaultNewId;
    this.random = mulberry32(opts.seed ?? Math.floor(Math.random() * 2 ** 31));
    this.keepTranscript = opts.keepTranscript ?? false;
    this.startedAt = this.now();
    this.sessionId = this.newId('s_');
  }

  get phase(): Phase {
    return this._phase;
  }

  get done(): boolean {
    return this._phase === 'DONE';
  }

  get elapsedMs(): number {
    return this.now() - this.startedAt;
  }

  get currentMap() {
    return this.map.current;
  }

  get focus(): BodySensation | undefined {
    return this.map.focusId ? this.map.current.sensations.find((s) => s.id === this.map.focusId) : undefined;
  }

  context(): GuideContext {
    return {
      sessionType: this.sessionType,
      plan: this.plan,
      phase: this._phase,
      phaseTurn: this.phaseTurn,
      elapsedMs: this.elapsedMs,
      map: this.map.current,
      baseline: this.map.baseline,
      focus: this.focus,
      unplacedDescriptors: this.unplaced.flatMap((o) => o.descriptors),
      lastObservation: this.lastObservation,
      lastResult: this.lastResult,
      lastAsk: this.lastAsk,
      asked: [...this.asked],
      usedLines: this.usedLines,
      silenceStreak: this.silenceStreak,
      nothingStreak: this.nothingStreak,
      signals: { ...this.signals },
      changes: [...this.changes],
      lastChanges: [...this.lastChanges],
      resumed: this.resumed,
      repeatRequested: this.repeatRequested,
      lastQuestion: this.lastQuestion,
      history: [...this.history],
      random: this.random,
    };
  }

  /** The guide has decided what to say; remember it before it is spoken. */
  recordGuideTurn(turn: GuideTurn): void {
    for (const l of turn.lines) {
      this.usedLines.add(l.key ?? l.text);
      this.history.push({ role: 'guide', text: l.text });
    }
    if (turn.expectsResponse) {
      this.lastQuestion = turn.lines[turn.lines.length - 1];
      this.lastAsk = turn.ask;
      if (turn.ask && !this.repeatRequested) this.asked.push(turn.ask);
      const last = this.history[this.history.length - 1];
      if (last && last.role === 'guide') last.ask = turn.ask;
    }
    if (turn.observations) this.applyRemoteObservations(turn.observations);
  }

  /** The guide has finished speaking a turn. */
  afterGuideTurn(turn: GuideTurn): void {
    this.resumed = false;
    this.repeatRequested = false;
    if (turn.end || isClosing(this._phase)) {
      if (turn.end || this._phase === 'DONE') this.setPhase('DONE');
      return;
    }
    if (turn.expectsResponse) {
      if (turn.advance) this.advanceAfterAnswer = true;
      return;
    }
    // A turn with nothing to wait for: the brain spoke (or had nothing to say) and is done with this phase.
    if (turn.advance || this._phase === 'ARRIVE' || this._phase === 'OPEN_AWARENESS') this.advancePhase();
    this.timeGuard();
  }

  /** Something the person said, or the silence where they said nothing. */
  ingest(user: UserTurn): IngestOutcome {
    if (isClosing(this._phase)) return {};
    this.lastChanges = [];

    if (user.kind === 'silence') {
      this.history.push({ role: 'silence', ms: user.waitedMs });
      this.lastResult = 'silence';
      this.lastObservation = undefined;
      this.silenceStreak++;
      this.phaseTurn++;
      this.pushMoment('silence');
      this.policy();
      return {};
    }

    const obs = extract(user.text);
    this.history.push({ role: 'user', text: user.text });
    this.lastResult = 'speech';
    this.lastObservation = obs;
    this.silenceStreak = 0;
    this.signals.utterances++;

    // Commands come first: "stop" always works, wherever the session is.
    if (obs.command === 'stop') {
      this.outcome = 'ended_early';
      this.setPhase('EARLY_CLOSE');
      this.pushMoment('user', user.text);
      return { command: 'stop' };
    }
    if (obs.command === 'repeat') {
      this.repeatRequested = true;
      return { command: 'repeat' };
    }
    if (obs.command === 'pause' || obs.command === 'resume') return { command: obs.command };

    // Safety comes before any reinterpretation, and is never overridden by a model.
    const safety = screen(obs);
    if (safety.level === 'crisis') {
      this.outcome = 'crisis_pause';
      this.setPhase('CRISIS_CLOSE');
      this.pushMoment('user', user.text);
      return {};
    }
    if (safety.level === 'urgent') {
      this.outcome = 'safety_pause';
      this.setPhase('SAFETY_CLOSE');
      this.pushMoment('user', user.text);
      return {};
    }
    if (this._phase === 'SAFETY_CHECK') {
      const familiar = obs.familiarity === 'familiar' || (obs.answer === 'yes' && obs.familiarity !== 'new' && !/\bnew\b/.test(obs.text));
      this.applyToMap(obs);
      if (familiar) {
        this.signals.familiarConfirmed = true;
        this.setPhase(this.phaseBeforeCheck ?? 'EXPLORE');
      } else {
        this.outcome = 'safety_pause';
        this.setPhase('SAFETY_CLOSE');
      }
      this.pushMoment('user', user.text);
      return {};
    }
    if (safety.level === 'check' && !this.signals.familiarConfirmed) {
      this.applyToMap(obs);
      this.pushMoment('user', user.text);
      if (obs.familiarity === 'new') {
        this.outcome = 'safety_pause';
        this.setPhase('SAFETY_CLOSE');
      } else if (!this.safetyChecked) {
        this.safetyChecked = true;
        this.phaseBeforeCheck = this.nextPhaseAfter(this._phase);
        this.setPhase('SAFETY_CHECK');
      }
      return {};
    }
    if (obs.familiarity === 'familiar') this.signals.familiarConfirmed = true;

    if (obs.acceptance) this.signals.acceptance = true;
    if (obs.urgeToFix) this.signals.urgeToFix = true;
    if (obs.fear) this.signals.fear = true;

    this.nothingStreak = obs.nothing || (obs.uncertain && !hasBodyContent(obs)) ? this.nothingStreak + 1 : 0;
    this.applyToMap(obs);
    this.phaseTurn++;
    this.pushMoment('user', user.text);
    this.policy();
    return {};
  }

  /** Paused mid-turn: the next turn starts with "Let's continue." and asks again. */
  markInterrupted(): void {
    this.resumed = true;
    // If the guide's question was cut off or never answered, it is asked again.
    const last = this.history[this.history.length - 1];
    if (last && last.role === 'guide' && last.ask) this.repeatRequested = true;
  }

  /** The end button, or "stop" heard anywhere. */
  requestStop(): void {
    if (isClosing(this._phase)) return;
    this.outcome = 'ended_early';
    this.setPhase('EARLY_CLOSE');
  }

  /** End immediately with no closing lines (the person tapped End twice, or the app is going away). */
  abort(): void {
    if (this._phase !== 'DONE') {
      if (!isClosing(this._phase)) this.outcome = 'ended_early';
      this.setPhase('DONE');
    }
  }

  finalize(): { session: Session; moments: SessionMoment[] } {
    this.closeObserveWindow();
    const endedAt = this.now();
    return SessionEngine.build(
      {
        sessionId: this.sessionId,
        sessionType: this.sessionType,
        startedAt: this.startedAt,
        updatedAt: endedAt,
        map: this.map,
        changes: this.changes,
        signals: { ...this.signals, observedSeconds: Math.round(this.observedMs / 1000) },
        moments: this.moments,
        outcome: this.outcome,
      },
      endedAt,
      this.keepTranscript,
    );
  }

  /** Enough to save what was noticed if the app is killed mid-session. */
  toDraft(): EngineDraft {
    return {
      sessionId: this.sessionId,
      sessionType: this.sessionType,
      startedAt: this.startedAt,
      updatedAt: this.now(),
      map: { current: cloneMap(this.map.current), baseline: cloneMap(this.map.baseline), focusId: this.map.focusId },
      changes: [...this.changes],
      signals: { ...this.signals, observedSeconds: Math.round(this.observedMs / 1000) },
      moments: this.moments.map((m) => ({ ...m, internalTranscript: undefined })),
      outcome: this.outcome,
    };
  }

  static build(draft: EngineDraft, endedAt: number, keepTranscript = false): { session: Session; moments: SessionMoment[] } {
    const changes = consolidateChanges(draft.changes);
    const recap = buildRecap({
      sessionType: draft.sessionType,
      outcome: draft.outcome,
      bodyMapStart: draft.map.baseline,
      bodyMapEnd: draft.map.current,
      changes,
      signals: draft.signals,
    });
    const session: Session = {
      id: draft.sessionId,
      startedAt: draft.startedAt,
      endedAt,
      sessionType: draft.sessionType,
      title: recap.title,
      summary: recap.summary,
      oneLiner: recap.oneLiner,
      bodyMapStart: cloneMap(draft.map.baseline),
      bodyMapEnd: cloneMap(draft.map.current),
      changes,
      outcome: draft.outcome,
      signals: draft.signals,
      createdAt: endedAt,
    };
    const moments = draft.moments.map((m) => (keepTranscript ? m : { ...m, internalTranscript: undefined }));
    return { session, moments };
  }

  // ——— internals ———

  private pushMoment(speaker: 'user' | 'silence', text?: string) {
    this.moments.push({
      id: this.newId('m_'),
      sessionId: this.sessionId,
      timestamp: this.now(),
      phase: this._phase,
      speaker,
      bodySensations: cloneMap(this.map.current).sensations,
      internalTranscript: text,
    });
  }

  private applyToMap(obs: Observation) {
    const mode = isDescribing(this._phase) ? 'describe' : 'observe';
    const narrowing = this.lastAsk ? NARROWING_ASKS.includes(this.lastAsk) : false;
    const hadFocus = !!this.map.focusId;

    if (!hadFocus && obs.regions.length === 0 && obs.descriptors.length > 0) {
      this.unplaced.push(obs);
      return;
    }
    const res = applyObservation(this.map, obs, mode, { newId: () => this.newId('x_'), at: this.elapsedMs, narrowing });
    this.map = { current: res.current, baseline: res.baseline, focusId: res.focusId };
    this.changes.push(...res.changes);
    this.lastChanges = res.changes;

    if (!hadFocus && this.map.focusId && this.unplaced.length > 0) {
      for (const u of this.unplaced) {
        const r = applyObservation(this.map, u, 'describe', { newId: () => this.newId('x_'), at: this.elapsedMs });
        this.map = { current: r.current, baseline: r.baseline, focusId: r.focusId };
      }
      this.unplaced = [];
    }
  }

  /** Remote observations add to the local reading; they never remove from it or lower a safety level. */
  private applyRemoteObservations(o: RemoteObservations) {
    if (o.safety === 'crisis' && !isClosing(this._phase)) {
      this.outcome = 'crisis_pause';
      this.setPhase('CRISIS_CLOSE');
      return;
    }
    if (o.safety === 'urgent' && !isClosing(this._phase)) {
      this.outcome = 'safety_pause';
      this.setPhase('SAFETY_CLOSE');
      return;
    }
    const focus = this.focus;
    if (!focus) return;
    const known = new Set(DESCRIPTORS.map((d) => d.word));
    const words = (o.descriptors ?? []).map((w) => w.toLowerCase().trim()).filter((w) => known.has(w));
    const synthetic: Observation = {
      raw: '',
      text: '',
      regions: [],
      descriptors: words.filter((w) => !focus.descriptors.includes(w)),
      negatedDescriptors: [],
      genericPain: false,
      movement:
        o.movement === 'moving' || o.movement === 'spreading' || o.movement === 'contracting' || o.movement === 'static'
          ? {
              type: o.movement,
              destination:
                o.destinationRegion && o.destinationRegion in REGIONS
                  ? { region: o.destinationRegion as BodyRegion, index: 0, phrase: o.destinationRegion }
                  : undefined,
            }
          : undefined,
      shape: undefined,
      edge: undefined,
      temporal: undefined,
      intensity: undefined,
      relocate: false,
      uncertain: false,
      nothing: false,
      acceptance: false,
      urgeToFix: false,
      fear: false,
      wordCount: 0,
    };
    // Only fill what the local reading of the same answer missed.
    if (focus.movement && synthetic.movement && focus.movement.type === synthetic.movement.type) synthetic.movement = undefined;
    if (synthetic.descriptors.length === 0 && !synthetic.movement) return;
    const mode = isDescribing(this._phase) ? 'describe' : 'observe';
    const res = applyObservation(this.map, synthetic, mode, { newId: () => this.newId('x_'), at: this.elapsedMs });
    // The utterance text is already recorded; the synthetic one must not add an empty phrase.
    this.map = { current: res.current, baseline: res.baseline, focusId: res.focusId };
    this.changes.push(...res.changes);
  }

  private needsLocate(f: BodySensation): boolean {
    const info = REGIONS[f.region];
    if (info.broad && !this.asked.includes('locate_narrow')) return true;
    if ((info.paired || info.sided) && !f.side && !this.asked.includes('locate_side')) return true;
    return false;
  }

  private reappraiseAllowed(): boolean {
    return !this.safetyChecked || this.signals.familiarConfirmed;
  }

  private nextPhaseAfter(p: Phase): Phase {
    switch (p) {
      case 'ARRIVE':
        return 'NOTICE';
      case 'NOTICE': {
        const f = this.focus;
        if (f) return this.needsLocate(f) ? 'LOCATE' : 'EXPLORE';
        return this.unplaced.length ? 'LOCATE' : 'OPEN_AWARENESS';
      }
      case 'LOCATE':
        return this.focus ? 'EXPLORE' : 'OPEN_AWARENESS';
      case 'EXPLORE':
        return 'OBSERVE';
      case 'OBSERVE':
        return this.reappraiseAllowed() ? 'REAPPRAISE' : 'CLOSE';
      case 'REAPPRAISE':
      case 'OPEN_AWARENESS':
        return 'CLOSE';
      case 'SAFETY_CHECK':
        return this.phaseBeforeCheck ?? 'EXPLORE';
      default:
        return 'DONE';
    }
  }

  private advancePhase() {
    this.setPhase(this.nextPhaseAfter(this._phase));
  }

  private setPhase(p: Phase) {
    if (p === this._phase) return;
    const observing = (x: Phase) => x === 'OBSERVE' || x === 'REAPPRAISE';
    if (observing(this._phase) && !observing(p)) this.closeObserveWindow();
    if (!observing(this._phase) && observing(p)) this.observeSince = this.now();
    this._phase = p;
    this.phaseTurn = 0;
    this.advanceAfterAnswer = false;
  }

  private closeObserveWindow() {
    if (this.observeSince !== undefined) {
      this.observedMs += this.now() - this.observeSince;
      this.observeSince = undefined;
    }
  }

  private policy() {
    if (isClosing(this._phase)) return;
    if (this.advanceAfterAnswer) {
      this.advanceAfterAnswer = false;
      this.advancePhase();
      this.timeGuard();
      return;
    }
    const f = this.focus;
    const elapsed = this.elapsedMs;
    switch (this._phase) {
      case 'NOTICE':
        if (f) this.setPhase(this.needsLocate(f) ? 'LOCATE' : 'EXPLORE');
        else if (this.unplaced.length) this.setPhase('LOCATE');
        else if (this.nothingStreak >= 2 || this.silenceStreak >= 3) this.setPhase('OPEN_AWARENESS');
        break;
      case 'LOCATE':
        if (f && (!this.needsLocate(f) || this.phaseTurn >= 2)) this.setPhase('EXPLORE');
        else if (!f && this.phaseTurn >= 2) this.setPhase('OPEN_AWARENESS');
        break;
      case 'EXPLORE':
        if (this.phaseTurn >= this.plan.exploreTurns) this.setPhase('OBSERVE');
        break;
      case 'OBSERVE': {
        const roomLeft = elapsed < this.plan.targetMs * 0.62 && this.phaseTurn < this.plan.observeTurns + OBSERVE_EXTRA_TURNS;
        if (this.phaseTurn >= this.plan.observeTurns && !roomLeft) this.advancePhase();
        break;
      }
      case 'REAPPRAISE':
        if (this.phaseTurn >= this.plan.reappraiseTurns) this.setPhase('CLOSE');
        break;
      case 'SAFETY_CHECK':
        // No answer to "is this familiar?" is not a yes.
        if (this.silenceStreak >= 2) {
          this.outcome = 'safety_pause';
          this.setPhase('SAFETY_CLOSE');
        }
        break;
    }
    this.timeGuard();
  }

  /** The session closes on time, gently, whatever phase it is in. */
  private timeGuard() {
    if (isClosing(this._phase) || this._phase === 'ARRIVE' || this._phase === 'SAFETY_CHECK') return;
    const elapsed = this.elapsedMs;
    const target = this.plan.targetMs;
    const early: Phase[] = ['NOTICE', 'LOCATE', 'EXPLORE', 'OBSERVE'];
    if (elapsed > target * 0.95) this.setPhase('CLOSE');
    else if (elapsed > target * 0.75 && early.includes(this._phase) && this.focus)
      this.setPhase(this.reappraiseAllowed() ? 'REAPPRAISE' : 'CLOSE');
    else if (elapsed > target * 0.5 && (this._phase === 'LOCATE' || this._phase === 'EXPLORE') && this.focus) this.setPhase('OBSERVE');
  }
}
