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

export const PLANS: Record<SessionType, SessionPlan> = {
  notice: { targetMs: 7 * 60_000, pauseScale: 1, exploreTurns: 3, observeTurns: 3, reappraiseTurns: 1 },
  flare: { targetMs: 6 * 60_000, pauseScale: 1.1, exploreTurns: 2, observeTurns: 2, reappraiseTurns: 2 },
  sleep: { targetMs: 8 * 60_000, pauseScale: 1.4, exploreTurns: 2, observeTurns: 2, reappraiseTurns: 1 },
  fear: { targetMs: 8 * 60_000, pauseScale: 1.15, exploreTurns: 3, observeTurns: 2, reappraiseTurns: 2 },
};

export const SESSION_TYPE_LABELS: Record<SessionType, { title: string; detail: string }> = {
  notice: { title: 'Just notice what’s here', detail: 'About 7 minutes' },
  flare: { title: 'Pain flare', detail: 'About 6 minutes, slower' },
  sleep: { title: 'Before sleep', detail: 'About 8 minutes, ends in rest' },
  fear: { title: 'Fear around a sensation', detail: 'About 8 minutes' },
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
