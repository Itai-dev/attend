import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { apiHeaders, config } from '../config';
import { beginSessionAudio } from './audioSession';

/**
 * A short sample of a guide voice, played in Settings when one is chosen, so the person
 * hears it before closing their eyes with it. One at a time; choosing another stops it.
 */
const SAMPLE = '[softly] [slowly] Take a moment to settle in. There’s nothing you need to fix right now.';
let current: AudioPlayer | undefined;

export async function previewVoice(voiceId: string) {
  stopPreview();
  try {
    await beginSessionAudio(false);
    const base = config.apiUrl.replace(/\/$/, '');
    const player = createAudioPlayer({
      uri: `${base}/tts?voice=${encodeURIComponent(voiceId)}&text=${encodeURIComponent(SAMPLE)}`,
      headers: apiHeaders(),
    });
    current = player;
    player.play();
  } catch {
    // A preview is a courtesy; failing quietly is fine.
  }
}

export function stopPreview() {
  try {
    current?.pause();
    current?.remove();
  } catch {}
  current = undefined;
}
