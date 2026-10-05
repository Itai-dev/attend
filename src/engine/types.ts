import type { Observation } from '../domain/extract';
import type { BodyMapState, BodySensation, SensationChange, SessionSignals, SessionType } from '../domain/types';
import type { Phase, SessionPlan } from './phases';

/** One thing the guide says, followed by the silence that belongs to it. */
export type GuideLine = {
  text: string;
  pauseAfterMs: number;
  /** The template the line came from, so a variant is not reused within a session. */
  key?: string;
};

/**
 * What kind of question was asked. The engine uses it to read the answer
 * ("the left" means something after "which side?"), and to avoid asking the
 * same kind of thing twice.
 */
export type AskKind =
  | 'notice'
  | 'locate_where'
  | 'locate_side'
  | 'locate_narrow'
  | 'quality'
  | 'quality_deepen'
  | 'quality_hint'
  | 'shape'
  | 'edge'
  | 'temporal'
  | 'temperature'
  | 'movement'
  | 'change'
  | 'reflect'
  | 'familiar'
  | 'resume';

/** Structured observations a remote model may return alongside its lines. */
export type RemoteObservations = {
  descriptors?: string[];
  region?: string;
  side?: string;
  movement?: string;
  destinationRegion?: string;
  shape?: string;
  edge?: string;
  temporal?: string;
  intensity?: 'softer' | 'stronger' | 'same';
  safety?: 'none' | 'check' | 'urgent' | 'crisis';
};

export type GuideTurn = {
  lines: GuideLine[];
  /** Whether the guide now waits for the person to speak. */
  expectsResponse: boolean;
  ask?: AskKind;
  listenWindowMs?: number;
  /** The session ends once these lines have been spoken. */
  end?: boolean;
  /** The brain has nothing more to do in this phase. */
  advance?: boolean;
  observations?: RemoteObservations;
  source: 'local' | 'remote' | 'fallback';
};

export type HistoryItem =
  | { role: 'guide'; text: string; ask?: AskKind }
  | { role: 'user'; text: string }
  | { role: 'silence'; ms: number };

export type UserTurn =
  | { kind: 'speech'; text: string; durationMs?: number }
  | { kind: 'silence'; waitedMs: number };

/** Everything a guide brain may look at to decide what to say next. Read-only. */
export type GuideContext = {
  sessionType: SessionType;
  plan: SessionPlan;
  phase: Phase;
  /** Questions already asked in this phase. */
  phaseTurn: number;
  elapsedMs: number;
  map: BodyMapState;
  baseline: BodyMapState;
  focus?: BodySensation;
  /** Descriptors heard before any place was named. */
  unplacedDescriptors: string[];
  lastObservation?: Observation;
  lastResult: 'speech' | 'silence' | 'none';
  lastAsk?: AskKind;
  asked: AskKind[];
  usedLines: ReadonlySet<string>;
  silenceStreak: number;
  nothingStreak: number;
  signals: SessionSignals;
  changes: SensationChange[];
  /** Changes found in the most recent answer only. */
  lastChanges: SensationChange[];
  resumed: boolean;
  repeatRequested: boolean;
  /** The person just asked for a little longer: acknowledge it before going on. */
  extended: boolean;
  /** The person said it's enough for today: close gently, without the "coming to an end" announcement. */
  closeRequested: boolean;
  lastQuestion?: GuideLine;
  history: HistoryItem[];
  /** Deterministic randomness, so sessions vary but tests do not. */
  random: () => number;
};

export interface GuideBrain {
  readonly id: string;
  next(ctx: GuideContext, signal?: AbortSignal): Promise<GuideTurn>;
}
