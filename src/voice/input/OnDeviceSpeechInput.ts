import { Platform } from 'react-native';
import { beginSessionAudio, sessionCategoryIOS } from '../audioSession';
import { speechModule } from '../speechModule';
import type { ListenOptions, ListenResult, SpeechInput } from '../types';

/**
 * Listening with Apple's speech recogniser, on the device.
 *
 * `requiresOnDeviceRecognition` keeps raw audio on the phone; only the words
 * leave this class. Audio is never persisted (`recordingOptions.persist` is
 * left off).
 *
 * iOS does not report "the person stopped talking", so end-of-utterance is
 * decided here: once words have arrived, a pause of `endOfUtteranceMs` with
 * no new words ends the answer — longer if the last word suggests they are
 * still going ("and", "but", "um", "like"). Silence before any words is
 * not an answer, it is time spent noticing, and is reported as such.
 *
 * iOS ends recognition by itself after a few seconds without speech ("no
 * speech detected"). Reported as silence, that cut a 14-second window to a few
 * seconds, and a run of those short "silences" walked the engine through its
 * phases and closed the session while the person was still noticing. So until
 * the window is used up, the recogniser is simply started again.
 */

const TRAILING = /\b(and|but|or|so|um+|uh+|er+|like|because|it's|its|the|a|kind of|sort of|maybe|then)\s*$/i;
const VOLUME_SPEAKING = 1.5; // volumechange runs -2..10; above this, someone is making sound.
const RESTART_DELAY_MS = 300;

export class OnDeviceSpeechInput implements SpeechInput {
  readonly id = 'on-device';
  readonly label = 'On-device speech';
  private levelListeners = new Set<(l: number) => void>();
  private onDeviceOnly: boolean;

  constructor(opts: { onDeviceOnly?: boolean } = {}) {
    this.onDeviceOnly = opts.onDeviceOnly ?? true;
  }

  async isAvailable(): Promise<boolean> {
    const m = speechModule();
    if (!m) return false;
    try {
      if (!m.isRecognitionAvailable()) return false;
      if (this.onDeviceOnly && Platform.OS === 'ios' && !m.supportsOnDeviceRecognition()) return false;
      return true;
    } catch {
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    const m = speechModule();
    if (!m) return false;
    try {
      const res = await m.requestPermissionsAsync();
      return res.granted;
    } catch {
      return false;
    }
  }

  async begin() {
    await beginSessionAudio(true);
  }

  onLevel(cb: (level: number) => void) {
    this.levelListeners.add(cb);
    return () => this.levelListeners.delete(cb);
  }

  listen(opts: ListenOptions, signal: AbortSignal): Promise<ListenResult> {
    const m = speechModule();
    if (!m) return Promise.resolve({ kind: 'error', error: { code: 'unavailable', message: 'Speech recognition is not in this build.' } });
    if (signal.aborted) return Promise.resolve({ kind: 'aborted' });

    const onDeviceOnly = this.onDeviceOnly;
    return new Promise<ListenResult>((resolve) => {
      const startedAt = Date.now();
      let transcript = '';
      let lastChange = 0;
      let firstWordAt = 0;
      let soundAt = 0;
      let settled = false;
      let stopping = false;
      let restartTimer: ReturnType<typeof setTimeout> | undefined;

      const subs = [
        m.addListener('result', (e) => {
          const t = e.results?.[0]?.transcript?.trim() ?? '';
          if (t && t !== transcript) {
            transcript = t;
            lastChange = Date.now();
            if (!firstWordAt) firstWordAt = lastChange;
          }
          if (stopping && e.isFinal) finish();
        }),
        m.addListener('volumechange', (e) => {
          const v = typeof e.value === 'number' ? e.value : -2;
          if (v > VOLUME_SPEAKING) soundAt = Date.now();
          const level = Math.max(0, Math.min(1, (v + 2) / 12));
          this.levelListeners.forEach((l) => l(level));
        }),
        m.addListener('error', (e) => {
          if (settled) return;
          if (e.error === 'no-speech' || e.error === 'speech-timeout') return recogniserEnded();
          if (e.error === 'aborted') return; // our own abort
          if (e.error === 'not-allowed') return finish('error', { code: 'permission', message: e.message });
          if (e.error === 'audio-capture' || e.error === 'interrupted' || e.error === 'busy')
            return finish('error', { code: 'interrupted', message: e.message });
          if (e.error === 'language-not-supported' || e.error === 'service-not-allowed')
            return finish('error', { code: 'unavailable', message: e.message });
          finish('error', { code: 'unknown', message: e.message });
        }),
        m.addListener('end', () => {
          if (!settled) recogniserEnded();
        }),
      ];

      const tick = setInterval(() => {
        const now = Date.now();
        if (!firstWordAt) {
          // Sound but no words yet: someone is starting to speak, give them a moment longer.
          const grace = soundAt && now - soundAt < 2500 ? 4000 : 0;
          if (now - startedAt > opts.maxWaitMs + grace) finish('silence');
          return;
        }
        const pause = TRAILING.test(transcript) ? opts.endOfUtteranceMs * 1.8 : opts.endOfUtteranceMs;
        if (now - lastChange > pause || now - firstWordAt > opts.maxUtteranceMs) requestStop();
      }, 100);

      const onAbort = () => {
        settled = true;
        cleanup();
        try {
          m.abort();
        } catch {}
        resolve({ kind: 'aborted' });
      };
      signal.addEventListener('abort', onAbort, { once: true });

      // The recogniser stopped on its own. With words, that is the answer; without, listen again
      // until the window is used up (an 'error' and an 'end' both arrive; one restart covers them).
      function recogniserEnded() {
        if (settled) return;
        if (stopping || transcript) return finish();
        if (restartTimer) return;
        if (Date.now() - startedAt >= opts.maxWaitMs) return finish('silence');
        restartTimer = setTimeout(() => {
          restartTimer = undefined;
          if (!settled) startRecogniser();
        }, RESTART_DELAY_MS);
      }

      function requestStop() {
        if (stopping) return;
        stopping = true;
        try {
          m!.stop();
        } catch {}
        // If no final result arrives promptly, use what we have.
        setTimeout(() => finish(), 700);
      }

      function cleanup() {
        clearInterval(tick);
        if (restartTimer) clearTimeout(restartTimer);
        subs.forEach((s) => s.remove());
        signal.removeEventListener('abort', onAbort);
      }

      function finish(kind?: 'silence' | 'error', error?: { code: 'permission' | 'unavailable' | 'interrupted' | 'unknown'; message: string }) {
        if (settled) return;
        settled = true;
        cleanup();
        try {
          if (!stopping) m!.abort();
        } catch {}
        if (kind === 'error' && error) return resolve({ kind: 'error', error });
        if (kind === 'silence' || !transcript) return resolve({ kind: 'silence', waitedMs: Date.now() - startedAt });
        resolve({ kind: 'speech', text: transcript, durationMs: Date.now() - (firstWordAt || startedAt) });
      }

      function startRecogniser() {
        try {
          m!.start({
            lang: 'en-US',
            interimResults: true,
            continuous: true,
            maxAlternatives: 1,
            requiresOnDeviceRecognition: onDeviceOnly,
            addsPunctuation: true,
            contextualStrings: opts.contextualStrings?.slice(0, 100),
            iosTaskHint: 'dictation',
            iosCategory: {
              category: sessionCategoryIOS().category,
              categoryOptions: [...sessionCategoryIOS().categoryOptions],
              mode: sessionCategoryIOS().mode,
            },
            volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
            recordingOptions: { persist: false },
          });
        } catch (e) {
          finish('error', { code: 'unavailable', message: String(e) });
        }
      }
      startRecogniser();
    });
  }

  dispose() {
    this.levelListeners.clear();
    try {
      speechModule()?.abort();
    } catch {}
  }
}
