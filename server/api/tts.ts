// GET /api/tts?text=&voice=&speed=&stability=&similarity=&v=  →  audio/mpeg from ElevenLabs.
// v is the app's cache version: unused here, but part of the URL, so bumping it re-records every line.
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
  const model = process.env.ATTEND_TTS_MODEL ?? 'eleven_v4';
  // v3/v4 read delivery tags like [softly] [slowly]; older models would speak them aloud.
  const tagged = /^eleven_v[34]/.test(model);
  const spoken = tagged ? text : text.replace(/\[[^\]]*\]\s*/g, '').trim();
  const stability = param(url, 'stability', 0, 1, 1);
  const settings = {
    // The v3 family takes only Creative (0), Natural (0.5) or Robust (1); anything else is
    // refused, and the refusal used to drop every setting, speed included.
    stability: tagged ? (stability >= 0.75 ? 1 : stability >= 0.25 ? 0.5 : 0) : stability,
    similarity_boost: param(url, 'similarity', 0, 1, 0.8),
    style: 0,
    use_speaker_boost: true,
    speed: param(url, 'speed', 0.7, 1.2, 0.85),
  };
  // A fixed seed per voice: the model samples the same way for every line, so a session
  // doesn't drift between takes that sound like different moods.
  const seed = [...voice].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7) % 4_294_967_295;

  const call = (extra: Record<string, unknown>) =>
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text: spoken, model_id: model, ...extra }),
    });
  // Slow and steady. A setting a model doesn't accept (400/422) is dropped, one step at a time,
  // rather than failing the line. The step is decided by the model, not the line, so every
  // line of a session lands on the same one.
  const steps: Record<string, unknown>[] = [
    { voice_settings: settings, seed },
    { voice_settings: { stability: settings.stability, similarity_boost: settings.similarity_boost }, seed },
    { seed },
    {},
  ];
  let res = await call(steps[0]);
  for (const step of steps.slice(1)) {
    if (res.status !== 400 && res.status !== 422) break;
    res = await call(step);
  }
  // No other voice is ever swapped in: a session that changes voice between lines is worse
  // than one that pauses. The app retries, then pauses the session.
  if (!res.ok || !res.body) return Response.json({ error: `voice ${res.status}` }, { status: 502 });
  return new Response(res.body, {
    headers: {
      'content-type': 'audio/mpeg',
      'cache-control': 'public, max-age=2592000, immutable',
      'cdn-cache-control': 'public, s-maxage=31536000, immutable',
    },
  });
}
