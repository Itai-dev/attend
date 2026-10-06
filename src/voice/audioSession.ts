import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import { Platform } from 'react-native';
import { speechModule } from './speechModule';

/**
 * One audio session for the whole practice.
 *
 * Switching categories between speaking and listening makes iOS flip the
 * route (speaker → earpiece, headphones dropping to call quality and back),
 * which an eyes-closed person hears as glitches. So the session is set once,
 * to play-and-record with the speaker as default and Bluetooth allowed, and
 * left alone until the practice ends.
 */
const SESSION_CATEGORY = {
  category: 'playAndRecord',
  categoryOptions: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP'],
  mode: 'default',
} as const;

export function sessionCategoryIOS() {
  return SESSION_CATEGORY;
}

export async function beginSessionAudio(recording: boolean): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: recording,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
    });
  } catch {
    // Web and older binaries: carry on with the defaults.
  }
  if (Platform.OS === 'ios' && recording) {
    try {
      speechModule()?.setCategoryIOS({
        category: SESSION_CATEGORY.category,
        categoryOptions: [...SESSION_CATEGORY.categoryOptions],
        mode: SESSION_CATEGORY.mode,
      });
    } catch {
      // The recogniser will set its own category when it starts.
    }
  }
}

export async function endSessionAudio(): Promise<void> {
  // The session's players keep the audio session active on purpose; release it here, once,
  // so other apps' audio can come back.
  try {
    await setIsAudioActiveAsync(false);
  } catch {}
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
  } catch {
    // Nothing to release on web.
  }
}
