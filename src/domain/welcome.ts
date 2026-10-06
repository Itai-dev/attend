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

/* ---------------------------------------------------------------------------------------------
 * The spoken welcome: the same questions, asked aloud and answered aloud, with the eyes closed
 * if the person likes — the first taste of a session. Fixed text, never sent to a model.
 * ------------------------------------------------------------------------------------------- */

export const SPOKEN = {
  intro: [
    'Welcome to Attend.',
    'This is a voice practice for familiar, long-standing pain. In a session you close your eyes and talk, and I follow what you notice.',
    'Let’s set up your first one. You can answer out loud.',
  ],
  focus: 'What brings you here? A familiar ache you live with, flares that come and go, pain around sleep, or worry about a sensation.',
  focusHint: 'You can say ache, flares, sleep, or worry.',
  minutes: 'How much time do you usually have? Three, five, or ten minutes.',
  minutesHint: 'Three, five, or ten.',
  voiceOffer: (name: string) => `I’m ${name}. Would you like to hear the other voices, or keep mine?`,
  voiceOfferHint: 'Say keep, or other voices.',
  voiceSample: (name: string) => `This is ${name}. Say this one, or next.`,
  voiceSampleHint: 'This one, or next.',
  voicesDone: 'That’s all of them. Each session will use its own voice. You can change this later, under You.',
  safety: [
    'One thing before you begin.',
    'Attend is for familiar sensations. It isn’t a medical tool, and it can’t tell whether a symptom is serious.',
    'If something is new, unexplained, getting worse quickly, or feels like an emergency, contact a medical professional instead.',
  ],
  safetyAsk: 'Say I understand when you’re ready.',
  ready: (title: string, minutes: number) => `Your first session is ready. ${title}, ${minutes} minutes. It’s on Today whenever you are.`,
} as const;

const norm = (t: string) => t.toLowerCase().replace(/[’']/g, "'").trim();

/** What brings them here, from their own words (or the option's position: "the second one"). */
export function parseFocus(text: string): SessionType | undefined {
  const t = norm(text);
  if (/\b(flare|flares|flaring|comes? and goes|come and go|attacks?|spikes?)\b/.test(t) || /\bsecond\b/.test(t)) return 'flare';
  if (/\b(sleep|sleeping|night|nights|bed|bedtime|insomnia|awake)\b/.test(t) || /\bthird\b/.test(t)) return 'sleep';
  if (/\b(worr\w*|fear\w*|scar\w*|anxious|anxiety|afraid|nervous|panic\w*)\b/.test(t) || /\b(fourth|last)\b/.test(t)) return 'fear';
  if (/\b(ache|aches|aching|familiar|live with|chronic|constant|pain|hurts?|sore|first)\b/.test(t)) return 'notice';
  return undefined;
}

export function parseMinutes(text: string): 3 | 5 | 10 | undefined {
  const t = norm(text);
  if (/\b(ten|10)\b/.test(t)) return 10;
  if (/\b(five|5)\b/.test(t)) return 5;
  if (/\b(three|3)\b/.test(t)) return 3;
  if (/\b(short|shortest|quick|little|not much|few)\b/.test(t)) return 3;
  if (/\b(long|longest|longer|plenty|lots)\b/.test(t)) return 10;
  if (/\b(not sure|don't know|dunno|whatever|any|depends|middle)\b/.test(t)) return 5;
  return undefined;
}

/** "Would you like to hear the other voices, or keep mine?" — and, per sample, "this one, or next?". */
export function parseVoiceReply(text: string): 'keep' | 'next' | undefined {
  const t = norm(text);
  if (/\b(next|another|other|others|different|more|no|nope|not (this|that|really)|skip)\b/.test(t)) return 'next';
  if (/\b(this one|that one|keep|yes|yeah|yep|this|that|good|like|perfect|fine|okay|ok|sure|great|nice|love)\b/.test(t)) return 'keep';
  return undefined;
}

/** "Would you like to hear the other voices?" — here a yes means hearing them. */
export function parseVoiceOffer(text: string): 'keep' | 'hear' | undefined {
  const t = norm(text);
  if (/\b(keep|yours|stay|this one|no|nope|fine|good|that's fine)\b/.test(t) && !/\b(other|others|hear)\b/.test(t)) return 'keep';
  if (/\b(other|others|hear|yes|yeah|sure|ok|okay|different|more|let's|please)\b/.test(t)) return 'hear';
  return undefined;
}

export function parseUnderstood(text: string): boolean {
  return /\b(understand|understood|got it|yes|yeah|yep|okay|ok|sure|alright|all right|agreed|i do|makes sense|ready)\b/.test(norm(text)) && !/\b(don't|do not|not sure|no)\b/.test(norm(text));
}

/** Words that steer the welcome itself rather than answer it. Short utterances only. */
export function parseWelcomeCommand(text: string): 'repeat' | 'skip' | undefined {
  const t = norm(text);
  if (t.split(/\s+/).length > 6) return undefined;
  if (/^(what|sorry|pardon|repeat( that)?|say (that|it) again|again|come again|can you repeat( that)?)\??\.?$/.test(t)) return 'repeat';
  if (/\b(skip|stop|enough|i'd rather tap|let me tap|end)\b/.test(t)) return 'skip';
  return undefined;
}
