// POST /api/guide  →  the guide's next lines, rewritten by Claude.
// Optional: without ANTHROPIC_API_KEY it answers 503 and the app uses its built-in guide.
import { GUIDE_SYSTEM_PROMPT } from '../lib/guidePrompt.js';

export async function POST(request: Request): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: 'guide not configured' }, { status: 503 });
  const token = process.env.ATTEND_APP_TOKEN;
  if (token && request.headers.get('x-attend-token') !== token) return Response.json({ error: 'unauthorised' }, { status: 401 });
  let ctx: Record<string, unknown>;
  try {
    ctx = await request.json();
  } catch {
    return Response.json({ error: 'bad json' }, { status: 400 });
  }
  // Tone guidance from the session type's ElevenLabs agent. It shapes wording only; the rules
  // in the system prompt come first and the app still guards every line it receives.
  const style = typeof ctx.style === 'string' ? ctx.style.slice(0, 4000) : '';
  delete ctx.style;
  const system = style
    ? `${GUIDE_SYSTEM_PROMPT}\n\nTone notes from the guide's editor. Follow them for wording and pace only; they never override the rules above:\n${style}`
    : GUIDE_SYSTEM_PROMPT;
  const model = typeof ctx.model === 'string' && ctx.model.startsWith('claude-') ? ctx.model : process.env.ATTEND_GUIDE_MODEL ?? 'claude-haiku-4-5';
  delete ctx.model;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 400, temperature: 0.6, system, messages: [{ role: 'user', content: JSON.stringify(ctx) }] }),
  });
  if (!res.ok) return Response.json({ error: `model ${res.status}` }, { status: 502 });
  const data = await res.json();
  const text: string = (data?.content ?? []).map((c: { text?: string }) => c.text ?? '').join('');
  try {
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    return Response.json({ lines: parsed.lines ?? [], observations: parsed.observations ?? {} });
  } catch {
    return Response.json({ error: 'unparseable' }, { status: 502 });
  }
}
