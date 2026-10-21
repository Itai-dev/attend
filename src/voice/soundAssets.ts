import type { SessionType } from '../domain/types';

/**
 * The four nature loops (tools/make-ambience.py, credited in assets/audio/CREDITS.md), shared by
 * the sound under a session (voice/ambience.ts) and Just listen (voice/listen.ts).
 * Named one by one: Metro bundles only the files it can see required.
 */
export const BEDS: Record<SessionType, number> = {
  notice: require('../../assets/audio/ambience-notice.wav'),
  flare: require('../../assets/audio/ambience-flare.wav'),
  sleep: require('../../assets/audio/ambience-sleep.wav'),
  fear: require('../../assets/audio/ambience-fear.wav'),
};
