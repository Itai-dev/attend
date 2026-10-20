import { createAudioPlayer } from 'expo-audio';
import type { SoundscapeId } from '../domain/soundscapes';
import { CrossfadeLoop } from './crossfadeLoop';

/**
 * The audio behind each sound, as AAC (.m4a): six soft tones built by tools/make-tones.py, ten
 * minutes each, so a practice never reaches the loop's seam. domain/soundscapes.ts sets the
 * final level from each file's measured loudness. The loop is made in the app by two players
 * crossing over (voice/crossfadeLoop.ts), so a file needs no seamless ending of its own, and
 * AAC's encoder padding is never heard.
 *
 * PAUSED, 20 Oct 2026: the nature recordings (rain, forest, stream, waterfall, ocean, night,
 * fire). "For now, replace the nature sounds with soft tones." Their files and credits stay in
 * assets/audio/soundscapes/ (SOURCES.md), out of the bundle because nothing requires them. To
 * bring them back: add their ids to SoundscapeId and SOUNDSCAPES (domain/soundscapes.ts, with
 * the LUFS measured when they were mastered: rain -25.0, forest -22.9, stream -20.9, waterfall
 * -22.1, ocean -22.0, night -19.8, fire -21.6), take them out of LEGACY_NATURE there, add
 * `rain: require('../../assets/audio/soundscapes/rain.m4a')` and the rest here, and their
 * photographs in design/Photo.tsx (the files are still in assets/images/photos/).
 */
export const SOUNDSCAPE_ASSET: Record<SoundscapeId, number> = {
  hz174: require('../../assets/audio/tones/hz174.m4a'),
  hz285: require('../../assets/audio/tones/hz285.m4a'),
  hz396: require('../../assets/audio/tones/hz396.m4a'),
  hz432: require('../../assets/audio/tones/hz432.m4a'),
  hz528: require('../../assets/audio/tones/hz528.m4a'),
  hz639: require('../../assets/audio/tones/hz639.m4a'),
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
