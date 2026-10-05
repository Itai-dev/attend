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
  /** ElevenLabs "River" — calm, neutral, conversational; a premade voice every account can use. */
  voiceId: (process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID ?? 'SAz9YHcvj6GT2YYXdXww').trim(),
  /** Optional override; the proxy chooses a fast model by default. */
  guideModel: process.env.EXPO_PUBLIC_GUIDE_MODEL?.trim() || undefined,
};

export const hasRemote = config.apiUrl.length > 0;

export const GUIDE_VOICES = [
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', detail: 'Calm, neutral' },
  { id: 'ESDuPqgyZIDDVZTlIrH7', name: 'Aaron', detail: 'Warm, British' },
  { id: 'Lt0VPfndF8W0Iwvl0bDe', name: 'Lulu', detail: 'Soft, velvety' },
] as const;

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
