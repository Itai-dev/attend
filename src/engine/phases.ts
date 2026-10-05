import type { SessionType } from '../domain/types';

/**
 * The shape underneath the conversation. The person never hears these names;
 * they hear a guide who seems to know where it is going.
 */
export type Phase =
  | 'ARRIVE'
  | 'NOTICE'
  | 'LOCATE'
  | 'EXPLORE'
  | 'OBSERVE'
  | 'REAPPRAISE'
  | 'CLOSE'
  | 'SAFETY_CHECK'
  | 'SAFETY_CLOSE'
  | 'CRISIS_CLOSE'
  | 'OPEN_AWARENESS'
  | 'EARLY_CLOSE'
  | 'DONE';

export const PHASE_GOALS: Record<Phase, string> = {
  ARRIVE: 'Help attention settle. Short sentences, silence, no questions about pain yet.',
  NOTICE: 'Invite the person to notice what in the body is asking for attention, in their own words.',
  LOCATE: 'Understand where the sensation is most clearly felt. Only ask what is genuinely unclear.',
  EXPLORE: 'Explore the quality of the sensation with curiosity, using their words, without trying to fix it.',
  OBSERVE: 'Explore variability: edges, stillness, movement, shifts while observing. Change is not success; no change is not failure.',
  REAPPRAISE:
    'For a familiar sensation only: gently invite noticing it without treating it as an emergency. Never claim medical certainty or safety.',
  CLOSE: 'Move attention away from the body and back into the room and into life. No more checking.',
  SAFETY_CHECK: 'Ask once, neutrally, whether this is a familiar sensation or something new.',
  SAFETY_CLOSE: 'Pause the practice neutrally and suggest appropriate medical evaluation. No reinterpretation.',
  CRISIS_CLOSE: 'Stop the practice and point toward immediate human support.',
  OPEN_AWARENESS: 'Nothing stands out: rest with the body as a whole and the breath, then close.',
  EARLY_CLOSE: 'The person asked to stop. Close briefly and kindly.',
  DONE: '',
};

export type SessionPlan = {
  /** Target length. The engine closes gracefully around this, never abruptly. */
  targetMs: number;
  /** Multiplier on silent pauses. Sleep sessions breathe slower. */
  pauseScale: number;
  /** How many exploring questions at most before turning to observation. */
  exploreTurns: number;
  observeTurns: number;
  reappraiseTurns: number;
};

/** Each type's shape at its natural length (BASE_MINUTES); planFor scales it to the length chosen on Home. */
export const PLANS: Record<SessionType, SessionPlan> = {
  notice: { targetMs: 7 * 60_000, pauseScale: 1, exploreTurns: 3, observeTurns: 3, reappraiseTurns: 1 },
  flare: { targetMs: 6 * 60_000, pauseScale: 1.1, exploreTurns: 2, observeTurns: 2, reappraiseTurns: 2 },
  sleep: { targetMs: 8 * 60_000, pauseScale: 1.4, exploreTurns: 2, observeTurns: 2, reappraiseTurns: 1 },
  fear: { targetMs: 8 * 60_000, pauseScale: 1.15, exploreTurns: 3, observeTurns: 2, reappraiseTurns: 2 },
};

/** The lengths offered before a session, Headspace-style. Short by default: the app is used, then left. */
export const SESSION_LENGTHS = [3, 5, 10] as const;
export type SessionLength = (typeof SESSION_LENGTHS)[number];
export const DEFAULT_LENGTH: SessionLength = 5;

/**
 * The plan for a chosen length. Time is the hard limit (the engine closes on
 * time whatever phase it is in); the turn counts scale with it so a short
 * session doesn't spend itself on questions. Pauses never shrink — a shorter
 * session says less, it doesn't hurry — and a longer one holds longer silences.
 */
export function planFor(type: SessionType, minutes?: SessionLength): SessionPlan {
  const base = PLANS[type];
  if (!minutes) return base;
  const f = Math.min((minutes * 60_000) / base.targetMs, 1.4);
  const turns = (n: number) => Math.max(1, Math.round(n * f));
  return {
    ...base,
    targetMs: minutes * 60_000,
    // A longer session is filled with more silence, not more questions.
    pauseScale: base.pauseScale * Math.max(1, f),
    exploreTurns: turns(base.exploreTurns),
    // Long sessions spend their extra time watching (holds and silence), not exploring.
    observeTurns: turns(base.observeTurns * (f > 1 ? 1.5 : 1)),
    reappraiseTurns: turns(base.reappraiseTurns),
  };
}

export const SESSION_TYPE_LABELS: Record<SessionType, { title: string; detail: string }> = {
  notice: { title: 'Just notice what’s here', detail: 'Whatever is asking for attention' },
  flare: { title: 'Pain flare', detail: 'Slower' },
  sleep: { title: 'Before sleep', detail: 'Ends in rest' },
  fear: { title: 'Fear around a sensation', detail: 'Goes gently' },
};

/** Phases during which new detail is elaboration, not change. */
export function isDescribing(phase: Phase): boolean {
  return phase === 'NOTICE' || phase === 'LOCATE' || phase === 'EXPLORE' || phase === 'SAFETY_CHECK';
}

export function isClosing(phase: Phase): boolean {
  return (
    phase === 'CLOSE' ||
    phase === 'SAFETY_CLOSE' ||
    phase === 'CRISIS_CLOSE' ||
    phase === 'EARLY_CLOSE' ||
    phase === 'DONE'
  );
}
