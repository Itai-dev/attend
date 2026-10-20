import type { PracticeTheme } from './program';
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
  /** What the guide works with. Defaults from the type (presetTheme). */
  theme?: PracticeTheme;
  /** The body scan's own sixteen-step scan (SCAN_BODY). Only the body scan has it; see SessionEngine's `scan`. */
  scan?: 'body';
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
  { id: 'scan-10', title: 'Body scan', blurb: 'A slow sweep from the feet up, resting on the body as a whole.', category: 'familiar', type: 'notice', minutes: 10, theme: 'open', scan: 'body', ...RIVER },
  { id: 'notice-10', title: 'Stay with it longer', blurb: 'More time to watch how it moves and shifts.', category: 'familiar', type: 'notice', minutes: 10, ...GEORGE },
  { id: 'flare-5', title: 'During a flare', blurb: 'Slower lines and more room between them.', category: 'flare', type: 'flare', minutes: 5, ...MATILDA },
  { id: 'flare-3', title: 'A flare, briefly', blurb: 'Something short for when it’s loud.', category: 'flare', type: 'flare', minutes: 3, ...SARAH },
  { id: 'sleep-10', title: 'Settle for sleep', blurb: 'Notices, then ends in rest without a wake-up.', category: 'sleep', type: 'sleep', minutes: 10, ...LILY },
  { id: 'sleep-5', title: 'Lights out', blurb: 'A shorter way down into rest.', category: 'sleep', type: 'sleep', minutes: 5, ...DANIEL },
  { id: 'worry-5', title: 'When it feels worrying', blurb: 'Goes gently around fear about a familiar sensation.', category: 'worry', type: 'fear', minutes: 5, ...BRIAN },
  { id: 'worry-3', title: 'A worried moment', blurb: 'A few steady minutes when the worry is louder than the sensation.', category: 'worry', type: 'fear', minutes: 3, ...SARAH },
];

/** What a preset's guide works with: its own theme, or the one that suits its type. */
export function presetTheme(p: Preset): PracticeTheme {
  if (p.theme) return p.theme;
  return p.type === 'flare' ? 'flare' : p.type === 'fear' ? 'fear' : p.type === 'sleep' ? 'open' : 'curious';
}

/**
 * Today's "right now": the four moments people open the app for outside the daily practice.
 * One tap each, nothing to choose. `detail` is the length (access.presetDetail adds "Plus" to
 * it where a practice is locked); `kind` says what starts, because Tom tapped "can't sleep"
 * wanting rain and got a voice (studio round 5). Every one of these is a voice.
 */
export const NEED_IT: Array<{ id: string; label: string; detail: string; kind: string }> = [
  { id: 'flare-3', label: 'in a flare', detail: '3 min', kind: 'voice-guided' },
  { id: 'sleep-10', label: 'can’t sleep', detail: '10 min', kind: 'guided into sleep' },
  { id: 'scan-10', label: 'body scan', detail: '10 min', kind: 'voice-guided' },
  { id: 'worry-5', label: 'feeling worried', detail: '5 min', kind: 'voice-guided' },
];

/** The line under a moment on Today: what starts, and how long. */
export function needItSubtitle(n: (typeof NEED_IT)[number]): string {
  return `${n.kind} · ${n.detail}`;
}

/** 21:00 to 05:00, local: when "can't sleep" is the moment someone most likely opened the app for. */
export function isNight(hour: number): boolean {
  return hour >= 21 || hour < 5;
}

/** What the welcome's "what brings you here" puts first among the moments. */
export const FOCUS_NEED: Record<SessionType, string> = { flare: 'flare-3', sleep: 'sleep-10', notice: 'scan-10', fear: 'worry-5' };

/**
 * The moments in Today's order: at night "can't sleep" leads whatever brought the person here
 * (Tom, 23:40, round 5); then the welcome's focus; then the rest in their usual order.
 */
export function needItOrder(focus: SessionType | undefined, hour: number): typeof NEED_IT {
  const lead = [isNight(hour) ? 'sleep-10' : undefined, focus ? FOCUS_NEED[focus] : undefined].filter((x): x is string => !!x);
  const rank = (id: string) => (lead.includes(id) ? lead.indexOf(id) : lead.length + NEED_IT.findIndex((n) => n.id === id));
  return [...NEED_IT].sort((a, b) => rank(a.id) - rank(b.id));
}

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
