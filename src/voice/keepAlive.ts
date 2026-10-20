import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { SOUNDSCAPE_ASSET } from './soundscapeAssets';

/**
 * A silent player under a guided session, so the practice goes on with the phone locked.
 *
 * iOS keeps an app with the audio background mode running only while it is actually playing.
 * A guided session is mostly silence between lines; with no background sound chosen, the
 * first long hold after the screen locked suspended the app, the hold's timer never fired and
 * the guide simply stopped until the person unlocked the phone. A looping player at volume 0
 * counts as playing, so the timers run and the next line comes on time. Nothing is heard.
 *
 * It runs only while the session is going; a pause stops it, so a paused session in the
 * background is left to iOS like any other app.
 */
export class KeepAlive {
  private player?: AudioPlayer;

  start() {
    if (this.player) {
      try {
        if (!this.player.playing) this.player.play();
      } catch {}
      return;
    }
    try {
      // keepAudioSessionActive: pausing this must not switch the audio session off under the guide's next line.
      const p = createAudioPlayer(SOUNDSCAPE_ASSET.hz432, { keepAudioSessionActive: true });
      // One player's own loop is enough here: at volume 0 the seam (AAC padding) is never heard,
      // and it still counts as playing. The audible sounds cross over instead (crossfadeLoop.ts).
      p.loop = true;
      p.volume = 0;
      p.play();
      this.player = p;
    } catch {
      // No keep-alive: the session still runs in the foreground.
      this.player = undefined;
    }
  }

  pause() {
    try {
      this.player?.pause();
    } catch {}
  }

  stop() {
    try {
      this.player?.remove();
    } catch {}
    this.player = undefined;
  }
}
