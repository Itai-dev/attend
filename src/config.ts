import { isHe } from './i18n';
/**
 * Build-time configuration. EXPO_PUBLIC_* values are inlined into the bundle,
 * so nothing here may be a secret: the API key below is a public gateway key
 * (a Supabase anon/publishable key), and the model and voice keys live on the
 * proxy, never in the app.
 */
export const config = {
  /** Base URL of the voice/guide server (server/ in this repo, deployed on Vercel). */
  // The voice server is public by design (it holds the keys; the app holds only its address).
  apiUrl: (process.env.EXPO_PUBLIC_ATTEND_API_URL || 'https://attend-server-ochre.vercel.app/api').trim(),
  apiKey: (process.env.EXPO_PUBLIC_ATTEND_API_KEY ?? '').trim(),
  /** Optional shared token the proxy can require (ATTEND_APP_TOKEN). Deters casual use; not a secret. */
  appToken: (process.env.EXPO_PUBLIC_ATTEND_APP_TOKEN ?? '').trim(),
  /** ElevenLabs "River": the fallback voice when the session type's agent can't be read. The agents choose the real one. */
  voiceId: (process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID ?? 'SAz9YHcvj6GT2YYXdXww').trim(),
  /** Optional override; the proxy chooses a fast model by default. */
  guideModel: process.env.EXPO_PUBLIC_GUIDE_MODEL?.trim() || undefined,
};

export const hasRemote = config.apiUrl.length > 0;

/**
 * The guide voices: built into the presets (src/domain/presets.ts) and offered in the welcome.
 * ElevenLabs premade voices, which every plan can speak (library voices return 402 without a
 * paid plan). Picked for a calm, unhurried read. Unset, each session type uses its agent's voice.
 */
export const GUIDE_VOICES = [
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', detail: 'Calm, neutral' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', detail: 'Soft, reassuring' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', detail: 'Warm, British' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', detail: 'Gentle, friendly' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', detail: 'Clear, British' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', detail: 'Warm, British' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', detail: 'Deep, steady' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', detail: 'Low, measured' },
] as const;

/**
 * The Hebrew guide voices (28 Oct 2026): native Israeli speakers from the ElevenLabs voice
 * library. The premade voices above read Hebrew with an English accent; these were compared
 * on the guide's own lines (clarity, steadiness of pitch) and Zina, the most dramatic, left
 * out. Library voices need a paid ElevenLabs plan, which this account has.
 */
export const HEBREW_VOICES = [
  { id: 's0T0DT6EAPeX57MQpn3I', name: 'דנית', detail: 'טבעית, רגועה' },
  { id: 'l7Q9rbdCC6j3J5dNlOOg', name: 'איתמר', detail: 'ברור, מדוד' },
  { id: '6Ijsl5024dyMrE00loVE', name: 'הרצל', detail: 'רגוע, חם' },
  { id: '8sZ9Z3Jy28CGLLCmKEHn', name: 'ויקטור', detail: 'חם, יציב' },
  { id: 'ZiofZHcEBTn5sRySe5h8', name: 'נמרוד', detail: 'חם, בטוח' },
] as const;

export type GuideVoice = { id: string; name: string; detail: string };

/** The voices offered in the app's language. A Hebrew session never speaks with an English voice. */
export function guideVoices(): readonly GuideVoice[] {
  return isHe() ? HEBREW_VOICES : GUIDE_VOICES;
}

/** Headers every request to the proxy carries. */
export function apiHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (config.apiKey) {
    h.authorization = `Bearer ${config.apiKey}`;
    h.apikey = config.apiKey;
  }
  if (config.appToken) h['x-attend-token'] = config.appToken;
  return h;
}
