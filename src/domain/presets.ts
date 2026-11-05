import type { SessionType } from './types';
import { isHe } from '../i18n';
import { HEBREW_VOICES } from '../config';

/**
 * Ready-made sessions for Explore and Today. Each one is a session type, a length and the
 * voice of that type (SESSION_VOICES), so starting one is a single tap and nothing is left
 * to decide once the eyes close.
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

export type PresetCategoryInfo = { id: PresetCategory; title: string; detail: string };

/** English data; screens read `presetCategories()`, which picks the language at call time. */
export const PRESET_CATEGORIES: PresetCategoryInfo[] = [
  { id: 'familiar', title: 'Familiar pain', detail: 'Meet what’s here' },
  { id: 'flare', title: 'Flares', detail: 'Slower, steadier' },
  { id: 'sleep', title: 'Sleep', detail: 'Ends in rest' },
  { id: 'worry', title: 'Worry', detail: 'Goes gently' },
];

const HE_CATEGORIES: Record<PresetCategory, { title: string; detail: string }> = {
  familiar: { title: 'כאב מוכר', detail: 'לפגוש את מה שיש' },
  flare: { title: 'התלקחויות', detail: 'לאט יותר, יציב יותר' },
  sleep: { title: 'שינה', detail: 'מסתיים במנוחה' },
  worry: { title: 'דאגה', detail: 'בעדינות' },
};

/** The shelves in the app's language. English returns PRESET_CATEGORIES itself. */
export function presetCategories(): PresetCategoryInfo[] {
  return isHe() ? PRESET_CATEGORIES.map((c) => ({ ...c, ...HE_CATEGORIES[c.id] })) : PRESET_CATEGORIES;
}

const RIVER = { voiceId: 'SAz9YHcvj6GT2YYXdXww', voiceName: 'River' };
const SARAH = { voiceId: 'EXAVITQu4vr4xnSDxMaL', voiceName: 'Sarah' };
const LILY = { voiceId: 'pFZP5JQG7iQjIQuC4Bku', voiceName: 'Lily' };
const BRIAN = { voiceId: 'nPczCjzI2devNBz1zQrb', voiceName: 'Brian' };

/**
 * One voice per kind of session (21 Oct 2026). Sessions of one kind always sound the same,
 * and a voice comes to mean a kind of practice:
 *   notice  River: relaxed and neutral, for everyday curious watching.
 *   flare   Brian: deep and slow, something steady to lean on when it's loud.
 *   sleep   Lily:  soft and velvety, for winding down.
 *   fear    Sarah: mature and reassuring in tone, without the words ever reassuring.
 * The person can still pick another voice before a session; that choice is kept for that kind.
 */
export const SESSION_VOICES: Record<SessionType, { voiceId: string; voiceName: string }> = {
  notice: RIVER,
  flare: BRIAN,
  sleep: LILY,
  fear: SARAH,
};

/**
 * Hebrew sessions speak with native Israeli voices (28 Oct 2026). The same idea as above:
 * Danit, natural and calm, for everyday noticing and for sleep; Herzl, calm and measured,
 * to lean on in a flare; Itamar, clear and steady, for worry.
 */
export const SESSION_VOICES_HE: Record<SessionType, { voiceId: string; voiceName: string }> = {
  notice: { voiceId: 's0T0DT6EAPeX57MQpn3I', voiceName: 'דנית' },
  flare: { voiceId: '6Ijsl5024dyMrE00loVE', voiceName: 'הרצל' },
  sleep: { voiceId: 's0T0DT6EAPeX57MQpn3I', voiceName: 'דנית' },
  fear: { voiceId: 'l7Q9rbdCC6j3J5dNlOOg', voiceName: 'איתמר' },
};

/**
 * The voice for a session of this type: the person's choice for that type, else its own.
 * A choice only counts in its own language: a voice picked in English never reads Hebrew
 * with an English accent, and a Hebrew voice never reads English.
 */
export function voiceFor(type: SessionType, chosen?: Partial<Record<SessionType, string>>): string {
  const own = isHe() ? SESSION_VOICES_HE : SESSION_VOICES;
  const pick = chosen?.[type];
  const hebrew = !!pick && HEBREW_VOICES.some((v) => v.id === pick);
  return pick && hebrew === isHe() ? pick : own[type].voiceId;
}

/** English data; screens read `presets()`, `presetById()` and `recommendedPreset()`, which pick the language at call time. */
export const PRESETS: Preset[] = [
  { id: 'notice-5', title: 'Meet a familiar sensation', blurb: 'Find it, describe it, watch it for a while.', category: 'familiar', type: 'notice', minutes: 5, ...SESSION_VOICES.notice },
  { id: 'notice-3', title: 'A short check-in', blurb: 'A few minutes with whatever is asking for attention.', category: 'familiar', type: 'notice', minutes: 3, ...SESSION_VOICES.notice },
  { id: 'notice-10', title: 'Stay with it longer', blurb: 'More time to watch how it moves and shifts.', category: 'familiar', type: 'notice', minutes: 10, ...SESSION_VOICES.notice },
  { id: 'flare-5', title: 'During a flare', blurb: 'Slower lines and more room between them.', category: 'flare', type: 'flare', minutes: 5, ...SESSION_VOICES.flare },
  { id: 'flare-3', title: 'A flare, briefly', blurb: 'Something short for when it’s loud.', category: 'flare', type: 'flare', minutes: 3, ...SESSION_VOICES.flare },
  { id: 'sleep-10', title: 'Settle for sleep', blurb: 'Notices, then ends in rest without a wake-up.', category: 'sleep', type: 'sleep', minutes: 10, ...SESSION_VOICES.sleep },
  { id: 'sleep-5', title: 'Lights out', blurb: 'A shorter way down into rest.', category: 'sleep', type: 'sleep', minutes: 5, ...SESSION_VOICES.sleep },
  { id: 'worry-5', title: 'When it feels worrying', blurb: 'Goes gently around fear about a familiar sensation.', category: 'worry', type: 'fear', minutes: 5, ...SESSION_VOICES.fear },
  { id: 'worry-3', title: 'A worried moment', blurb: 'A few steady minutes when the worry is louder than the sensation.', category: 'worry', type: 'fear', minutes: 3, ...SESSION_VOICES.fear },
];

// Hebrew (27 Oct 2026). Same rule as the English: a blurb describes the practice and never
// promises anything about pain. "צ׳ק־אין" is the pain check-in, so notice-3 is "עצירה קצרה".
const HE_PRESETS: Record<string, { title: string; blurb: string }> = {
  'notice-5': { title: 'לפגוש תחושה מוכרת', blurb: 'למצוא אותה, לתאר אותה, להתבונן בה קצת.' },
  'notice-3': { title: 'עצירה קצרה', blurb: 'כמה דקות עם מה שמבקש תשומת לב.' },
  'notice-10': { title: 'להישאר איתה עוד', blurb: 'יותר זמן לראות איך היא נעה ומשתנה.' },
  'flare-5': { title: 'בזמן התלקחות', blurb: 'משפטים איטיים יותר, ויותר מקום ביניהם.' },
  'flare-3': { title: 'התלקחות, בקצרה', blurb: 'משהו קצר לרגעים שזה חזק.' },
  'sleep-10': { title: 'לקראת שינה', blurb: 'קצת התבוננות, ואז מנוחה. בלי השכמה בסוף.' },
  'sleep-5': { title: 'כיבוי אורות', blurb: 'דרך קצרה יותר אל המנוחה.' },
  'worry-5': { title: 'כשזה מדאיג', blurb: 'בעדינות, סביב הפחד מתחושה מוכרת.' },
  'worry-3': { title: 'רגע של דאגה', blurb: 'כמה דקות יציבות, כשהדאגה חזקה יותר מהתחושה.' },
};

function local(p: Preset): Preset {
  const he = isHe() ? HE_PRESETS[p.id] : undefined;
  return he ? { ...p, ...he } : p;
}

/** The presets in the app's language. English returns PRESETS itself. */
export function presets(): Preset[] {
  return isHe() ? PRESETS.map(local) : PRESETS;
}

export function presetById(id: string | undefined): Preset | undefined {
  const p = PRESETS.find((x) => x.id === id);
  return p && local(p);
}

/** The session offered first on Today: the focus and length from the welcome, in the voice chosen there (if any). */
export function recommendedPreset(opts: { focus?: SessionType; minutes?: Preset['minutes']; voiceId?: string }): Preset {
  const ofType = PRESETS.filter((p) => p.type === (opts.focus ?? 'notice'));
  const base = ofType.find((p) => p.minutes === opts.minutes) ?? ofType.find((p) => p.minutes === 5) ?? ofType[0] ?? PRESETS[0];
  const voice = Object.values(VOICE_NAMES).find((v) => v.voiceId === opts.voiceId);
  return { ...local(base), ...(voice ?? {}), minutes: opts.minutes ?? base.minutes };
}

const VOICE_NAMES = {
  River: RIVER,
  Sarah: SARAH,
  Lily: LILY,
  Matilda: { voiceId: 'XrExE9yKIg1WjnnlVkGX', voiceName: 'Matilda' },
  Alice: { voiceId: 'Xb7hH8MSUJpSbSDYk0k2', voiceName: 'Alice' },
  George: { voiceId: 'JBFqnCBsd6RMkjVDRZzb', voiceName: 'George' },
  Brian: BRIAN,
  Daniel: { voiceId: 'onwK4e9ZLuTAKqWW03F9', voiceName: 'Daniel' },
};
