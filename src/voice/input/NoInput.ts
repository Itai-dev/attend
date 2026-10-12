import type { ListenResult, SpeechInput } from '../types';

/**
 * The input for a guided session, which never listens.
 *
 * Without it a guided session still asked for the microphone and speech recognition before
 * the first word, and failed on Expo Go and on any phone that refused — for a practice that
 * never uses either. The runner never calls listen() here (no guided turn expects a
 * response); if something ever does, it gets a silence rather than a stalled session.
 */
export class NoInput implements SpeechInput {
  readonly id = 'none';
  readonly label = 'Not listening (guided)';

  async isAvailable() {
    return true;
  }

  async requestPermission() {
    return true;
  }

  async listen(): Promise<ListenResult> {
    return { kind: 'silence', waitedMs: 0 };
  }

  dispose() {}
}
