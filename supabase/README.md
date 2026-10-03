# The guide proxy

One Supabase Edge Function, `attend`, with two routes:

| Route | What it does |
| --- | --- |
| `POST /attend/guide` | Sends the session context to Claude and returns the guide's next lines + structured observations. |
| `GET /attend/tts?text=&voice=` | Returns the line as speech from ElevenLabs (`audio/mpeg`). |

The Anthropic and ElevenLabs keys live here as function secrets and never in the app.
Nothing is stored: the function has no tables and writes no request bodies to logs.

You can reuse the Supabase project from Pattern, or create a new one (EU region, as Pattern's
`supabase/README.md` recommends).

## Deploy

```bash
npx supabase@latest login
npx supabase@latest link --project-ref <ref>

npx supabase@latest secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase@latest secrets set ELEVENLABS_API_KEY=...
# optional
npx supabase@latest secrets set ATTEND_GUIDE_MODEL=claude-haiku-4-5     # fastest; claude-sonnet-5-5 for richer wording
npx supabase@latest secrets set ATTEND_TTS_MODEL=eleven_multilingual_v2 # or eleven_flash_v2_5 for lower latency
npx supabase@latest secrets set ATTEND_APP_TOKEN=<any random string>    # then set EXPO_PUBLIC_ATTEND_APP_TOKEN too

npx supabase@latest functions deploy attend --no-verify-jwt
```

`--no-verify-jwt` because new Supabase publishable keys are not JWTs; set `ATTEND_APP_TOKEN`
if you want a shared token check instead.

## Point the app at it

`.env.local` in the project root:

```
EXPO_PUBLIC_ATTEND_API_URL=https://<ref>.supabase.co/functions/v1/attend
EXPO_PUBLIC_ATTEND_API_KEY=<anon or publishable key>
```

Restart `expo start`. Settings will now offer the natural voices, and the guide adapts its
wording with Claude. If the proxy is slow or down, each turn silently falls back to the local
guide and the on-device voice.

## Voices

Default: **River** (`SAz9YHcvj6GT2YYXdXww`) — ElevenLabs premade, calm and neutral, usable
by any account. Aaron and Lulu are library voices; add them to "My Voices" in ElevenLabs
before selecting them. The allow-list is in `functions/attend/index.ts`.

## Smoke test

```bash
curl -s -X POST "$URL/guide" -H "content-type: application/json" -H "authorization: Bearer $KEY" \
  -d '{"phase":"EXPLORE","ask":"quality_deepen","expectsResponse":true,"lastAnswer":"My neck feels really tight on the left side.","proposal":[{"text":"Notice that tightness.","pauseAfterMs":5000},{"text":"What does tight feel like right now?","pauseAfterMs":0}]}'

curl -s "$URL/tts?text=Take%20a%20moment%20to%20settle%20in." -H "authorization: Bearer $KEY" -o settle.mp3
```
