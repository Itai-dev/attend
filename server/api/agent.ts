// GET /api/agent?type=notice  →  the parts of that session type's ElevenLabs agent the app uses:
// { voiceId, speed, stability, similarity, prompt, firstMessage }.
// Only settings are read. No ElevenLabs conversation is ever started, so the person's
// audio stays on the phone; the app's engine still owns the session's structure and safety.
import { AGENTS } from '../lib/agents.js';

const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && v >= min && v <= max ? v : undefined);

export async function GET(request: Request): Promise<Response> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: 'voice not configured' }, { status: 503 });
  const token = process.env.ATTEND_APP_TOKEN;
  if (token && request.headers.get('x-attend-token') !== token) return Response.json({ error: 'unauthorised' }, { status: 401 });

  const type = new URL(request.url).searchParams.get('type') ?? 'notice';
  const id = AGENTS[type];
  if (!id) return Response.json({ error: 'unknown type' }, { status: 400 });

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, { headers: { 'xi-api-key': key } });
  if (!res.ok) {
    // ElevenLabs says why (e.g. which permission the key lacks). Its message names no secrets.
    let detail: unknown;
    try {
      const body = await res.json();
      detail = body?.detail?.message ?? body?.detail?.status ?? body?.detail ?? body;
    } catch {}
    return Response.json({ error: `agent ${res.status}`, detail }, { status: 502 });
  }
  const a = await res.json();
  const tts = a?.conversation_config?.tts ?? {};
  const agent = a?.conversation_config?.agent ?? {};
  return Response.json(
    {
      voiceId: typeof tts.voice_id === 'string' ? tts.voice_id : undefined,
      speed: num(tts.speed, 0.7, 1.2),
      stability: num(tts.stability, 0, 1),
      similarity: num(tts.similarity_boost, 0, 1),
      prompt: typeof agent.prompt?.prompt === 'string' ? agent.prompt.prompt.slice(0, 4000) : undefined,
      firstMessage: typeof agent.first_message === 'string' ? agent.first_message.slice(0, 200) : undefined,
    },
    // An edit in the dashboard reaches phones within a minute.
    { headers: { 'cache-control': 'public, max-age=0', 'cdn-cache-control': 'public, s-maxage=60' } },
  );
}
