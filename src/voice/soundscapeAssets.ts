import type { SoundscapeId } from '../domain/soundscapes';

/**
 * The audio behind each soundscape: generated recordings mastered by
 * tools/master-soundscapes.py into quiet, seamless loops. A field recording can replace any
 * file under the same name (master it the same way so the levels match).
 */
export const SOUNDSCAPE_ASSET: Record<SoundscapeId, number> = {
  rain: require('../../assets/audio/soundscapes/rain.wav'),
  forest: require('../../assets/audio/soundscapes/forest.wav'),
  stream: require('../../assets/audio/soundscapes/stream.wav'),
  waterfall: require('../../assets/audio/soundscapes/waterfall.wav'),
  ocean: require('../../assets/audio/soundscapes/ocean.wav'),
  night: require('../../assets/audio/soundscapes/night.wav'),
  fire: require('../../assets/audio/soundscapes/fire.wav'),
  tone: require('../../assets/audio/tone-432.wav'),
};
