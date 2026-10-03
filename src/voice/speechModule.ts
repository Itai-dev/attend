/**
 * expo-speech-recognition is a native module: present in development and
 * store builds, absent in Expo Go. Requiring it unguarded would crash Expo Go
 * at launch, so it is loaded once, inside try/catch, and everything that
 * needs it asks `speechModule()` first.
 */
type SpeechRecognitionPackage = typeof import('expo-speech-recognition');

let cached: SpeechRecognitionPackage | null | undefined;

export function speechPackage(): SpeechRecognitionPackage | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('expo-speech-recognition') as SpeechRecognitionPackage;
    // Touch the native module so a missing binary fails here, not mid-session.
    void pkg.ExpoSpeechRecognitionModule.isRecognitionAvailable;
    cached = pkg;
  } catch {
    cached = null;
  }
  return cached;
}

export function speechModule() {
  return speechPackage()?.ExpoSpeechRecognitionModule ?? null;
}
