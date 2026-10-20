/**
 * The privacy policy, served by the voice server so it has a stable public URL without a
 * domain (App Review 5.1.1 needs one, in App Store Connect and in the app). The app links
 * here from Settings (PRIVACY_URL in src/domain/access.ts). Keep it in step with
 * docs/launch/privacy-policy.md and the in-app privacy copy in Settings.
 */

const UPDATED = '20 October 2026';

const SECTIONS: Array<[string, string[]]> = [
  ['No account', ['You don’t sign up. We don’t know your name, email or phone number.']],
  [
    'What stays on your iPhone',
    [
      'Your practices, check-ins, pain record, moments, goal and settings are stored in the app on your phone. We have no copy.',
      'Deleting the app deletes them. Settings → “delete all sessions” removes them too.',
    ],
  ],
  [
    'What leaves your iPhone, and why',
    [
      'The guide’s voice. The guide’s lines are turned into speech by our voice server (hosted on Vercel) using ElevenLabs. When a practice rests attention on a part of the body, the line includes that body area, for example “your lower back”. Nothing else about you is sent: no name, no account, no identifier, nothing you said.',
      'Vercel may keep request logs for a short time, and ElevenLabs may keep a history of generated speech under their own policies. Neither receives anything that identifies you.',
      'When you choose to listen to a lesson, its text (the app’s own words) is voiced the same way.',
      'Reminders, if you turn them on, are scheduled by your iPhone. We don’t run a notification service.',
      'There are no purchases in the app yet. Before there are, this policy will say what the purchase service records.',
    ],
  ],
  ['What we don’t do', ['No analytics. No advertising. No tracking across apps or websites. No selling or sharing of data. Guided practices never use the microphone.']],
  [
    'Health',
    [
      'Attend is a wellness practice and education. It is not a medical device and doesn’t diagnose or treat any condition. If a pain is new, different from your usual, or severe, please see a medical professional. If it is sudden or severe, call your local emergency number.',
    ],
  ],
  ['Children', ['Attend is not meant for children under 17.']],
  ['Changes', ['If this policy changes, the new version will be posted here with its date.']],
  ['Contact', ['During the beta, use “Send Beta Feedback” in TestFlight. A support address will be listed here before release.']],
];

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function page(): string {
  const body = SECTIONS.map(([h, ps]) => `<h2>${esc(h)}</h2>${ps.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>attend · privacy</title>
<style>
:root{color-scheme:light dark;--bg:#f6f5f1;--ink:#151515;--muted:#5e5e5a}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b0b;--ink:#ececea;--muted:#a3a39e}}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.55 -apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif}
main{max-width:640px;margin:0 auto;padding:48px 20px 80px}
h1{font-weight:400;font-size:34px;margin:0 0 4px;text-transform:lowercase}
h2{font-weight:500;font-size:18px;margin:32px 0 6px;text-transform:lowercase}
p{margin:0 0 10px}.muted{color:var(--muted);font-size:15px}
</style></head>
<body><main><h1>privacy</h1><p class="muted">Attend, by Itai Agami. Updated ${UPDATED}.</p>${body}</main></body></html>`;
}

export function GET(): Response {
  return new Response(page(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
