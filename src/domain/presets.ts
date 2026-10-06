import type { SessionType } from './types';

/**
 * Ready-made sessions for Explore and Today. Each one is a session type, a length and a
 * voice chosen to suit it, so starting one is a single tap and nothing is left to decide
 * once the eyes close. The voice belongs to the preset — there is no separate voice picker.
 *
 * Voice ids are ElevenLabs premade voices (GUIDE_VOICES in src/config.ts), which every plan
 * can speak. Kept free of React and Expo so the list can be checked in Node tests.
 */

export type PresetCategory = 'familiar' | 'flare' | 'sleep' | 'worry';

export type Preset = {
  id: string;
  title: string;
  /** One line under the title. Describes the practice, never promises an effect on pain. */
  blurb: string;
  category: PresetCategory;
  type: SessionType;
  minutes: 3 | 5 | 10;
  voiceId: string;
  voiceName: string;
};

export const PRESET_CATEGORIES: Array<{ id: PresetCategory; title: string; detail: string }> = [
  { id: 'familiar', title: 'Familiar pain', detail: 'Meet what’s here' },
  { id: 'flare', title: 'Flares', detail: 'Slower, steadier' },
  { id: 'sleep', title: 'Sleep', detail: 'Ends in rest' },
  { id: 'worry', title: 'Worry', detail: 'Goes gently' },
];

const RIVER = { voiceId: 'SAz9YHcvj6GT2YYXdXww', voiceName: 'River' };
const SARAH = { voiceId: 'EXAVITQu4vr4xnSDxMaL', voiceName: 'Sarah' };
const LILY = { voiceId: 'pFZP5JQG7iQjIQuC4Bku', voiceName: 'Lily' };
const MATILDA = { voiceId: 'XrExE9yKIg1WjnnlVkGX', voiceName: 'Matilda' };
const ALICE = { voiceId: 'Xb7hH8MSUJpSbSDYk0k2', voiceName: 'Alice' };
const GEORGE = { voiceId: 'JBFqnCBsd6RMkjVDRZzb', voiceName: 'George' };
const BRIAN = { voiceId: 'nPczCjzI2devNBz1zQrb', voiceName: 'Brian' };
const DANIEL = { voiceId: 'onwK4e9ZLuTAKqWW03F9', voiceName: 'Daniel' };

export const PRESETS: Preset[] = [
  { id: 'notice-5', title: 'Meet a familiar sensation', blurb: 'Find it, describe it, watch it for a while.', category: 'familiar', type: 'notice', minutes: 5, ...RIVER },
  { id: 'notice-3', title: 'A short check-in', blurb: 'A few minutes with whatever is asking for attention.', category: 'familiar', type: 'notice', minutes: 3, ...ALICE },
  { id: 'notice-10', title: 'Stay with it longer', blurb: 'More time to watch how it moves and shifts.', category: 'familiar', type: 'notice', minutes: 10, ...GEORGE },
  { id: 'flare-5', title: 'During a flare', blurb: 'Slower lines and more room between them.', category: 'flare', type: 'flare', minutes: 5, ...MATILDA },
  { id: 'flare-3', title: 'A flare, briefly', blurb: 'Something short for when it’s loud.', category: 'flare', type: 'flare', minutes: 3, ...SARAH },
  { id: 'sleep-10', title: 'Settle for sleep', blurb: 'Notices, then ends in rest without a wake-up.', category: 'sleep', type: 'sleep', minutes: 10, ...LILY },
  { id: 'sleep-5', title: 'Lights out', blurb: 'A shorter way down into rest.', category: 'sleep', type: 'sleep', minutes: 5, ...DANIEL },
  { id: 'worry-5', title: 'When it feels worrying', blurb: 'Goes gently around fear about a familiar sensation.', category: 'worry', type: 'fear', minutes: 5, ...BRIAN },
  { id: 'worry-3', title: 'A worried moment', blurb: 'A few steady minutes when the worry is louder than the sensation.', category: 'worry', type: 'fear', minutes: 3, ...SARAH },
];

export function presetById(id: string | undefined): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

const ALL_VOICES = [RIVER, SARAH, LILY, MATILDA, ALICE, GEORGE, BRIAN, DANIEL];

/** The session offered first on Today: the focus and length from the welcome, in the voice chosen there (if any). */
export function recommendedPreset(opts: { focus?: SessionType; minutes?: Preset['minutes']; voiceId?: string }): Preset {
  const ofType = PRESETS.filter((p) => p.type === (opts.focus ?? 'notice'));
  const base = ofType.find((p) => p.minutes === opts.minutes) ?? ofType.find((p) => p.minutes === 5) ?? ofType[0] ?? PRESETS[0];
  const voice = ALL_VOICES.find((v) => v.voiceId === opts.voiceId);
  return { ...base, ...(voice ?? {}), minutes: opts.minutes ?? base.minutes };
}
