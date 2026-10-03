// Attend guide proxy — a Supabase Edge Function (Deno).
//
//   POST /attend/guide   conversation context → the guide's next lines (Claude)
//   GET  /attend/tts     ?text=&voice=        → the line as speech (ElevenLabs, audio/mpeg)
//
// Why a proxy at all: the app ships to phones, and anything in a phone's
// bundle is public. The Anthropic and ElevenLabs keys live here, as function
// secrets, and nowhere else.
//
// Privacy: nothing is stored. Requests are not logged beyond Supabase's
// default request metadata; this code never writes a body to a log or a table.
//
// Secrets (supabase secrets set ...):
//   ANTHROPIC_API_KEY       required for /guide
//   ELEVENLABS_API_KEY      required for /tts
//   ATTEND_GUIDE_MODEL      optional, default claude-haiku-4-5 (fast enough for a voice turn)
//   ATTEND_TTS_MODEL        optional, default eleven_multilingual_v2
//   ATTEND_APP_TOKEN        optional; if set, requests must send it as `x-attend-token`

import { GUIDE_SYSTEM_PROMPT } from '../_shared/guidePrompt.ts';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = Deno.env.get('ATTEND_GUIDE_MODEL') ?? 'claude-haiku-4-5';
const TTS_MODEL = Deno.env.get('ATTEND_TTS_MODEL') ?? 'eleven_multilingual_v2';
const DEFAULT_VOICE = 'SAz9YHcvj6GT2YYXdXww'; // River
const ALLOWED_VOICES = new Set([DEFAULT_VOICE, 'ESDuPqgyZIDDVZTlIrH7', 'Lt0VPfndF8W0Iwvl0bDe']);
const MAX_TTS_CHARS = 260;

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-attend-token',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
}

function authorised(req: Request): boolean {
  const token = Deno.env.get('ATTEND_APP_TOKEN');
  return !token || req.headers.get('x-attend-token') === token;
}

async function guide(req: Request): Promise<Response> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ error: 'guide not configured' }, 503);
  let ctx: Record<string, unknown>;
  try {
    ctx = await req.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  const model = typeof ctx.model === 'string' && ctx.model.startsWith('claude-') ? ctx.model : DEFAULT_MODEL;
  delete ctx.model;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      temperature: 0.6,
      system: GUIDE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(ctx) }],
    }),
  });
  if (!res.ok) return json({ error: `model ${res.status}` }, 502);
  const data = await res.json();
  const text: string = (data?.content ?? []).map((c: { text?: string }) => c.text ?? '').join('');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return json({ lines: parsed.lines ?? [], observations: parsed.observations ?? {} });
  } catch {
    return json({ error: 'unparseable' }, 502);
  }
}

async function tts(req: Request, url: URL): Promise<Response> {
  const key = Deno.env.get('ELEVENLABS_API_KEY');
  if (!key) return json({ error: 'voice not configured' }, 503);
  const text = (url.searchParams.get('text') ?? '').slice(0, MAX_TTS_CHARS).trim();
  if (!text) return json({ error: 'no text' }, 400);
  const requested = url.searchParams.get('voice') ?? DEFAULT_VOICE;
  const voice = ALLOWED_VOICES.has(requested) ? requested : DEFAULT_VOICE;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: TTS_MODEL,
      // Calm and steady: high stability, a little slower than conversational.
      voice_settings: { stability: 0.62, similarity_boost: 0.8, style: 0.08, use_speaker_boost: true, speed: 0.9 },
    }),
  });
  if (!res.ok || !res.body) return json({ error: `voice ${res.status}` }, 502);
  return new Response(res.body, {
    headers: {
      ...cors,
      'content-type': 'audio/mpeg',
      // The same line in the same voice is the same audio; let the phone keep it.
      'cache-control': 'public, max-age=2592000, immutable',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (!authorised(req)) return json({ error: 'unauthorised' }, 401);
  const url = new URL(req.url);
  const route = url.pathname.split('/').filter(Boolean).pop();
  try {
    if (route === 'guide' && req.method === 'POST') return await guide(req);
    if (route === 'tts' && req.method === 'GET') return await tts(req, url);
    return json({ error: 'not found' }, 404);
  } catch (e) {
    return json({ error: String(e).slice(0, 120) }, 500);
  }
});
