import type { SessionType } from './types';

/**
 * The welcome, as a short conversation: the guide says a line or two, the person answers
 * by tapping one of a few ready answers. It sets up the first session (what it's for, how
 * long, whose voice) and makes sure one thing is understood before anything begins: this is
 * for familiar sensations, not for deciding whether a new one is serious.
 *
 * Nothing here asks how bad anything is. No scales, no ratings, no "how difficult" — the
 * welcome learns what kind of practice to offer, never a number about pain.
 */

export type WelcomeAnswers = {
  focus?: SessionType;
  minutes?: 3 | 5 | 10;
  /** A voice id, or 'later' to let each session use its own. */
  voice?: string;
  understood?: boolean;
};

export type WelcomeStep =
  | { id: 'intro'; say: string[]; choices: Array<{ value: 'go'; label: string }> }
  | { id: 'focus'; say: string[]; choices: Array<{ value: SessionType; label: string }> }
  | { id: 'minutes'; say: string[]; choices: Array<{ value: 3 | 5 | 10; label: string }> }
  | { id: 'voice'; say: string[] }
  | { id: 'safety'; say: string[]; choices: Array<{ value: 'ok'; label: string }> };

export const WELCOME: WelcomeStep[] = [
  {
    id: 'intro',
    say: [
      'Attend is a voice practice for familiar, long-standing pain.',
      'In a session you close your eyes and talk. The guide listens and follows what you notice. No tapping, no reading.',
    ],
    choices: [{ value: 'go', label: 'Set up my first session' }],
  },
  {
    id: 'focus',
    say: ['What brings you here?'],
    choices: [
      { value: 'notice', label: 'A familiar ache I live with' },
      { value: 'flare', label: 'Flares that come and go' },
      { value: 'sleep', label: 'Pain around sleep' },
      { value: 'fear', label: 'Worry about a sensation' },
    ],
  },
  {
    id: 'minutes',
    say: ['How much time do you usually have?'],
    choices: [
      { value: 3, label: '3 minutes' },
      { value: 5, label: '5 minutes' },
      { value: 10, label: '10 minutes' },
    ],
  },
  {
    id: 'voice',
    say: ['Which voice feels right? Tap one to hear it.'],
  },
  {
    id: 'safety',
    say: [
      'One thing before you begin.',
      'Attend is for familiar sensations. It isn’t a medical tool, and it can’t tell whether a symptom is serious.',
      'If something is new, unexplained, getting worse quickly, or feels like an emergency, contact a medical professional instead.',
    ],
    choices: [{ value: 'ok', label: 'I understand' }],
  },
];

/** The step to show next: the first one without an answer. Undefined once everything is answered. */
export function nextStep(a: WelcomeAnswers, started: boolean): WelcomeStep | undefined {
  if (!started) return WELCOME[0];
  if (!a.focus) return WELCOME[1];
  if (!a.minutes) return WELCOME[2];
  if (!a.voice) return WELCOME[3];
  if (!a.understood) return WELCOME[4];
  return undefined;
}
