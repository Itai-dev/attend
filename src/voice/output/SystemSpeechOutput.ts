import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { SpeechOutput } from '../types';

/**
 * The phone's own voice. Always available, works offline and in Expo Go,
 * and is the fallback whenever the natural voice cannot be reached.
 *
 * The best installed English voice is chosen once: an Enhanced or Premium
 * voice if the person has downloaded one, otherwise a calm default.
 */

const PREFERRED = ['Ava', 'Zoe', 'Evan', 'Nathan', 'Serena', 'Jamie', 'Daniel', 'Samantha'];
const RATE = Platform.OS === 'ios' ? 0.9 : 0.92;

export class SystemSpeechOutput implements SpeechOutput {
  readonly id = 'system';
  readonly label = 'On-device voice';
  private voice?: string;
  private chosen = false;

  async isAvailable() {
    return true;
  }

  async begin() {
    if (this.chosen) return;
    this.chosen = true;
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const english = voices.filter((v) => v.language?.toLowerCase().startsWith('en'));
      const enhanced = english.filter((v) => String(v.quality).toLowerCase() !== 'default');
      const pool = enhanced.length ? enhanced : english;
      const byName = PREFERRED.map((n) => pool.find((v) => v.name?.startsWith(n))).find(Boolean);
      this.voice = (byName ?? pool[0])?.identifier;
    } catch {
      this.voice = undefined;
    }
  }

  speak(text: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      // A safety net: if the engine never calls back, do not hang an eyes-closed session.
      const guard = setTimeout(finish, 4000 + text.length * 120);
      const onAbort = () => {
        Speech.stop();
        finish();
      };
      signal.addEventListener('abort', onAbort, { once: true });
      function finish() {
        if (settled) return;
        settled = true;
        clearTimeout(guard);
        signal.removeEventListener('abort', onAbort);
        resolve();
      }
      Speech.speak(text, {
        language: 'en-US',
        voice: this.voice,
        rate: RATE,
        pitch: 0.97,
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    });
  }

  stop() {
    Speech.stop();
  }

  dispose() {
    Speech.stop();
  }
}
