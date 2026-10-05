// GET /api/script  →  the guide's script (server/lib/guideScript.ts) as JSON.
// The app applies it at the start of each session, so editing that file and
// letting Vercel redeploy changes the guide's words without an app release.
import { GUIDE_SCRIPT } from '../lib/guideScript.js';

export function GET(): Response {
  return Response.json(GUIDE_SCRIPT, {
    // Short edge cache: an edit reaches phones within a minute or two.
    headers: { 'cache-control': 'public, max-age=0', 'cdn-cache-control': 'public, s-maxage=60' },
  });
}
