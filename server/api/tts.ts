// GET /api/tts?text=&voice=  →  audio/mpeg from ElevenLabs.
// The ElevenLabs key lives only in this project's environment (ELEVENLABS_API_KEY).
// Responses are cached at Vercel's edge: the same line in the same voice is fetched
// from ElevenLabs once, then served from cache to every phone.

const DEFAULT_VOICE = 'SAz9YHcvj6GT2YYXdXww'; // River
const ALLOWED = new Set([DEFAULT_VOICE, 'ESDuPqgyZIDDVZTlIrH7', 'Lt0VPfndF8W0Iwvl0bDe']);
const MAX_CHARS = 260;

export async function GET(request: Request): Promise<Response> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: 'voice not configured' }, { status: 503 });
  const url = new URL(request.url);
  const token = process.env.ATTEND_APP_TOKEN;
  if (token && request.headers.get('x-attend-token') !== token) return Response.json({ error: 'unauthorised' }, { status: 401 });

  const text = (url.searchParams.get('text') ?? '').slice(0, MAX_CHARS).trim();
  if (!text) return Response.json({ error: 'no text' }, { status: 400 });
  const requested = url.searchParams.get('voice') ?? DEFAULT_VOICE;
  const voice = ALLOWED.has(requested) ? requested : DEFAULT_VOICE;
  const model = process.env.ATTEND_TTS_MODEL ?? 'eleven_multilingual_v2';

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: { stability: 0.62, similarity_boost: 0.8, style: 0.08, use_speaker_boost: true, speed: 0.9 },
    }),
  });
  if (!res.ok || !res.body) return Response.json({ error: `voice ${res.status}` }, { status: 502 });
  return new Response(res.body, {
    headers: {
      'content-type': 'audio/mpeg',
      'cache-control': 'public, max-age=2592000, immutable',
      'cdn-cache-control': 'public, s-maxage=31536000, immutable',
    },
  });
}
