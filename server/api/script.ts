// GET /api/script[?lang=he]  →  the guide's script (server/lib/guideScript.ts, or
// guideScript.he.ts in Hebrew) as JSON. The app applies it at the start of each session,
// so editing those files and letting Vercel redeploy changes the guide's words without an
// app release. Builds before Hebrew ask without lang and get English, as before.
import { GUIDE_SCRIPT } from '../lib/guideScript.js';
import { GUIDE_SCRIPT_HE } from '../lib/guideScript.he.js';

export function GET(request: Request): Response {
  const he = new URL(request.url).searchParams.get('lang') === 'he';
  return Response.json(he ? GUIDE_SCRIPT_HE : GUIDE_SCRIPT, {
    // Short edge cache: an edit reaches phones within a minute or two.
    headers: { 'cache-control': 'public, max-age=0', 'cdn-cache-control': 'public, s-maxage=60' },
  });
}
