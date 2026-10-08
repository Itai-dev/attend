// GET /api/tts?text=&voice=&speed=&stability=&similarity=  →  audio/mpeg from ElevenLabs.
// voice and the settings come from the session type's ElevenLabs agent (see api/agent.ts).
// The ElevenLabs key lives only in this project's environment (ELEVENLABS_API_KEY).
// Responses are cached at Vercel's edge: the same line in the same voice is fetched
// from ElevenLabs once, then served from cache to every phone.

const DEFAULT_VOICE = 'SAz9YHcvj6GT2YYXdXww'; // River
// Any voice chosen in the agents; just a well-formed id.
const VOICE_ID = /^[A-Za-z0-9]{16,32}$/;
const param = (url: URL, name: string, min: number, max: number, fallback: number) => {
  const v = Number(url.searchParams.get(name));
  return url.searchParams.has(name) && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
};
const MAX_CHARS = 320; // a line plus its delivery tags

export async function GET(request: Request): Promise<Response> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: 'voice not configured' }, { status: 503 });
  const url = new URL(request.url);
  const token = process.env.ATTEND_APP_TOKEN;
  if (token && request.headers.get('x-attend-token') !== token) return Response.json({ error: 'unauthorised' }, { status: 401 });

  const text = (url.searchParams.get('text') ?? '').slice(0, MAX_CHARS).trim();
  if (!text) return Response.json({ error: 'no text' }, { status: 400 });
  const requested = url.searchParams.get('voice') ?? DEFAULT_VOICE;
  const voice = VOICE_ID.test(requested) ? requested : DEFAULT_VOICE;
  const settings = {
    stability: param(url, 'stability', 0, 1, 0.5),
    similarity_boost: param(url, 'similarity', 0, 1, 0.8),
    style: 0,
    use_speaker_boost: true,
    speed: param(url, 'speed', 0.7, 1.2, 0.85),
  };
  const model = process.env.ATTEND_TTS_MODEL ?? 'eleven_v4';
  // v3/v4 read delivery tags like [softly] [slowly]; older models would speak them aloud.
  const tagged = /^eleven_v[34]/.test(model);
  const spoken = tagged ? text : text.replace(/\[[^\]]*\]\s*/g, '').trim();

  const speak = async (v: string) => {
    const call = (voice_settings?: Record<string, unknown>) =>
      fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
        body: JSON.stringify({ text: spoken, model_id: model, ...(voice_settings ? { voice_settings } : {}) }),
      });
    // Slow and steady: a little under normal speed, high stability. Settings a model
    // doesn't accept (400/422) fall back to the voice's own defaults rather than failing.
    const r = await call(settings);
    return r.status === 400 || r.status === 422 ? call() : r;
  };

  let res = await speak(voice);
  // Library voices need a paid ElevenLabs plan (402). The app has no other voice to fall back
  // on, so a refused voice is spoken as River instead of failing the session.
  const substituted = !res.ok && voice !== DEFAULT_VOICE;
  if (substituted) res = await speak(DEFAULT_VOICE);
  if (!res.ok || !res.body) {
    // Pass ElevenLabs' reason through (as api/agent.ts does): a 401 alone can mean credits used
    // up (quota_exceeded), a key without the Text to Speech permission, or a free-tier block.
    let detail: unknown;
    try {
      const body = (await res.json()) as { detail?: { status?: string; message?: string } | string };
      detail = typeof body?.detail === 'object' ? { status: body.detail.status, message: body.detail.message } : (body?.detail ?? body);
    } catch {}
    return Response.json({ error: `voice ${res.status}`, detail }, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
  return new Response(res.body, {
    headers: substituted
      ? // Not cached: once the plan covers the chosen voice, the next request should get it.
        { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' }
      : {
          'content-type': 'audio/mpeg',
          'cache-control': 'public, max-age=2592000, immutable',
          'cdn-cache-control': 'public, s-maxage=31536000, immutable',
        },
  });
}
