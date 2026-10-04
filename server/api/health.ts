export function GET(): Response {
  return Response.json({ ok: true, voice: !!process.env.ELEVENLABS_API_KEY, guide: !!process.env.ANTHROPIC_API_KEY });
}
