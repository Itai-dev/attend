import { createAudioPlayer } from 'expo-audio';
import type { SoundscapeId } from '../domain/soundscapes';
import { CrossfadeLoop } from './crossfadeLoop';

/**
 * The audio behind each soundscape, as AAC (.m4a): real, public-domain field recordings
 * (assets/audio/soundscapes/SOURCES.md), five minutes each, built by tools/master-recordings.py.
 * To replace one, add it there and re-run; domain/soundscapes.ts sets the final level from the
 * measured levels. Files can be minutes long: the loop is made in the app by two players crossing
 * over (voice/crossfadeLoop.ts), so a file needs no seamless ending of its own, and AAC's
 * encoder padding is never heard.
 *
 * The tone is a synthesized drone: four seamless 30-second periods in one two-minute file, so
 * its crossfade (where two copies of a steady tone overlap) comes round only every two minutes.
 */
export const SOUNDSCAPE_ASSET: Record<SoundscapeId, number> = {
  rain: require('../../assets/audio/soundscapes/rain.m4a'),
  forest: require('../../assets/audio/soundscapes/forest.m4a'),
  stream: require('../../assets/audio/soundscapes/stream.m4a'),
  waterfall: require('../../assets/audio/soundscapes/waterfall.m4a'),
  ocean: require('../../assets/audio/soundscapes/ocean.m4a'),
  night: require('../../assets/audio/soundscapes/night.m4a'),
  fire: require('../../assets/audio/soundscapes/fire.m4a'),
  tone: require('../../assets/audio/tone-432.m4a'),
};

/**
 * A soundscape playing as a seamless loop, starting at `volume`. Throws if no player can be
 * made; callers carry on without the sound.
 */
export function loopSoundscape(id: SoundscapeId, volume = 0): CrossfadeLoop {
  // keepAudioSessionActive: pausing a finished pass (or the whole loop) must not switch the
  // audio session off under the other pass, the guide or the recogniser (see ElevenLabsSpeechOutput.play).
  return new CrossfadeLoop(() => createAudioPlayer(SOUNDSCAPE_ASSET[id], { keepAudioSessionActive: true }), volume);
}
