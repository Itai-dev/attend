import type { SessionType } from './types';
import { isHe } from '../i18n';

/**
 * Nature on its own, in Explore (22 Oct 2026): the four field recordings that sit under the
 * sessions, to rest with, sleep to or work beside — no voice, nothing to follow. They are
 * atmosphere, nothing more: nothing here says a sound does anything for pain. Keyed by the
 * session type whose recording it is, so there is one file per sound (assets/audio/CREDITS.md).
 */

export type Sound = { id: SessionType; title: string; detail: string; place: string };

/** English data; screens read `sounds()` / `soundById()`, which pick the language at call time. */
export const SOUNDS: Sound[] = [
  { id: 'notice', title: 'Mountain stream', detail: 'Water over stones', place: 'Pitões das Júnias, Portugal' },
  { id: 'flare', title: 'Slow waves', detail: 'The sea on a long beach', place: 'Cox’s Bazar, Bangladesh' },
  { id: 'sleep', title: 'Night rain', detail: 'Rain through the night', place: 'Serrinha do Alambari, Brazil' },
  { id: 'fear', title: 'Wind in pines', detail: 'A forest moving', place: 'Miren, Slovenia' },
];

// Hebrew (27 Oct 2026): the same recordings in plain words; places spelled as Hebrew speakers say them.
const HE_SOUNDS: Record<SessionType, Omit<Sound, 'id'>> = {
  notice: { title: 'נחל בהרים', detail: 'מים זורמים על אבנים', place: 'פיטואש דאש ז׳וניאש, פורטוגל' },
  flare: { title: 'גלים איטיים', detail: 'הים על חוף ארוך', place: 'קוקס בזאר, בנגלדש' },
  sleep: { title: 'גשם בלילה', detail: 'גשם שיורד כל הלילה', place: 'סריניה דו אלמבארי, ברזיל' },
  fear: { title: 'רוח באורנים', detail: 'יער בתנועה', place: 'מירן, סלובניה' },
};

/** The sounds in the app's language. English returns SOUNDS itself. */
export function sounds(): Sound[] {
  return isHe() ? SOUNDS.map((s) => ({ ...s, ...HE_SOUNDS[s.id] })) : SOUNDS;
}

/** Minutes; 0 plays until stopped. */
export const SOUND_LENGTHS = [10, 20, 30, 0] as const;
export type SoundLength = (typeof SOUND_LENGTHS)[number];

export function soundById(id: string | undefined): Sound | undefined {
  return sounds().find((s) => s.id === id);
}
