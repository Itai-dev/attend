import type { SessionType } from './types';

/**
 * Nature on its own, in Explore (22 Oct 2026): the four field recordings that sit under the
 * sessions, to rest with, sleep to or work beside — no voice, nothing to follow. They are
 * atmosphere, nothing more: nothing here says a sound does anything for pain. Keyed by the
 * session type whose recording it is, so there is one file per sound (assets/audio/CREDITS.md).
 */

export type Sound = { id: SessionType; title: string; detail: string; place: string };

export const SOUNDS: Sound[] = [
  { id: 'notice', title: 'Mountain stream', detail: 'Water over stones', place: 'Pitões das Júnias, Portugal' },
  { id: 'flare', title: 'Slow waves', detail: 'The sea on a long beach', place: 'Cox’s Bazar, Bangladesh' },
  { id: 'sleep', title: 'Night rain', detail: 'Rain through the night', place: 'Serrinha do Alambari, Brazil' },
  { id: 'fear', title: 'Wind in pines', detail: 'A forest moving', place: 'Miren, Slovenia' },
];

/** Minutes; 0 plays until stopped. */
export const SOUND_LENGTHS = [10, 20, 30, 0] as const;
export type SoundLength = (typeof SOUND_LENGTHS)[number];

export function soundById(id: string | undefined): Sound | undefined {
  return SOUNDS.find((s) => s.id === id);
}
