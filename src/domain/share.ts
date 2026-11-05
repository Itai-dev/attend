import { MIN_DAYS_FOR_PICTURE, PAIN_MAX, type CheckIn } from './checkin';
import { practiceSessions } from './engagement';
import { PROGRAM_DAYS, type ProgramState } from './program';
import { buildProgress, PROGRESS_DAYS, progressMeaning, type ProgressDay } from './progress';
import type { Session } from './types';
import { heCount, isHe, tr } from '../i18n';

/**
 * The share page: one sheet a person can hand to whoever treats them (5 Nov 2026).
 *
 * It is the person's own tab on paper, nothing more: how much they practised, the program,
 * and the pain record beside it, drawn and not judged. It exists instead of a therapist
 * dashboard, on purpose. A dashboard needs an account and a server holding pain records, and
 * it turns practice into reporting: someone is watching. This page leaves the phone only when
 * the person makes it and sends it themselves, to whoever they choose, from the share sheet.
 * Nothing is sent otherwise, and the app never knows whether it was sent.
 *
 * The same rules as the tab: counts of what was entered, never a comparison, no trend, no
 * arrow, no colour that carries a verdict; the sentence about what the chart does not mean
 * sits inside the chart's card. Rendered as HTML so expo-print can make a PDF of it on the
 * phone; everything is inline (iOS's printer loads no local files).
 */

export type ShareInput = {
  name?: string;
  goal?: string;
  sessions: Session[];
  checkIns: CheckIn[];
  program: ProgramState;
  now: number;
  tz: number;
};

export type ShareSummary = {
  /** The window, in days, the page covers. */
  days: number;
  practiceDays: number;
  minutes: number;
  programDone: number;
  checkInDays: number;
  progress: ProgressDay[];
  enough: boolean;
};

const DAY = 86_400_000;

export function shareSummary(input: ShareInput): ShareSummary {
  const since = input.now - PROGRESS_DAYS * DAY;
  const own = practiceSessions(input.sessions).filter((s) => s.startedAt >= since);
  const progress = buildProgress(input.checkIns, input.sessions, { now: input.now, tz: input.tz });
  return {
    days: PROGRESS_DAYS,
    practiceDays: progress.practiceDays,
    minutes: Math.round(own.reduce((m, s) => m + (s.endedAt - s.startedAt), 0) / 60_000),
    programDone: Object.keys(input.program.done).length,
    checkInDays: progress.checkInDays,
    progress: progress.days,
    enough: progress.enough,
  };
}

/** Washi by day, always: paper prints on paper. Tokens from design/theme.ts. */
const PAPER = { bg: '#F3EEE5', surface: '#FBF8F2', ink: '#2F2B26', ink2: 'rgba(47,43,38,0.62)', ink3: 'rgba(47,43,38,0.42)', hairline: 'rgba(47,43,38,0.10)', moss: '#6E8B5B' };

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}

function monthDay(day: string): string {
  const [, m, d] = day.split('-').map(Number);
  const en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return isHe() ? `${d}.${m}` : `${d} ${en[m - 1]}`;
}

/**
 * The pain record as inline SVG: the day's peak as a dot, the days practised as ticks under
 * the axis. The same drawing as the tab's PainChart, with no line joining the dots.
 */
export function chartSvg(days: ProgressDay[], width = 515, height = 150): string {
  const padL = 18;
  const padR = 6;
  const top = 8;
  const axisY = top + height;
  const tickY = axisY + 10;
  const n = days.length;
  const step = n > 1 ? (width - padL - padR) / (n - 1) : 0;
  const x = (i: number) => padL + i * step;
  const y = (v: number) => axisY - (v / PAIN_MAX) * height;
  const parts: string[] = [];
  for (const v of [0, 5, 10]) {
    parts.push(`<line x1="${padL}" y1="${y(v)}" x2="${width - padR}" y2="${y(v)}" stroke="${PAPER.hairline}" stroke-width="1"/>`);
    parts.push(`<text x="${padL - 6}" y="${y(v) + 3.5}" text-anchor="end" font-size="9" fill="${PAPER.ink3}">${v}</text>`);
  }
  days.forEach((d, i) => {
    if (d.peak !== undefined) parts.push(`<circle cx="${x(i).toFixed(1)}" cy="${y(d.peak).toFixed(1)}" r="3.2" fill="${PAPER.ink}"/>`);
    if (d.practised) parts.push(`<rect x="${(x(i) - 1.2).toFixed(1)}" y="${tickY}" width="2.4" height="7" rx="1.2" fill="${PAPER.moss}"/>`);
  });
  // Date labels at the ends and the middle, so the sheet says which weeks it covers.
  const label = (i: number, anchor: string) =>
    `<text x="${x(i).toFixed(1)}" y="${tickY + 22}" text-anchor="${anchor}" font-size="9" fill="${PAPER.ink3}">${esc(monthDay(days[i].day))}</text>`;
  if (n > 0) parts.push(label(0, 'start'), label(Math.floor((n - 1) / 2), 'middle'), label(n - 1, 'end'));
  // Left to right, even in Hebrew: time runs the same way on the tab and in the pain record.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${tickY + 28}" width="100%" direction="ltr" style="display:block;direction:ltr">${parts.join('')}</svg>`;
}

/** The whole sheet as HTML: A4, the app's paper, the person's language and direction. */
export function sharePageHtml(input: ShareInput): string {
  const s = shareSummary(input);
  const he = isHe();
  const name = input.name?.trim();
  const weeks = Math.round(s.days / 7);
  const title = name ? esc(name) : tr('Attend', 'Attend');
  const sub = he ? `תרגול ויומן כאב, ${heCount(weeks, 'השבוע האחרון', 'השבועות האחרונים').replace(/^(\d+) /, '$1 ')}` : `Practice and pain record, the last ${weeks} weeks`;
  const made = he
    ? 'הדף הזה נעשה בטלפון של מי שמתרגל, ונשלח רק כשבחרו לשלוח אותו. Attend לא שולחת כלום בעצמה.'
    : 'Made on the practising person’s phone and sent only because they chose to. Attend sends nothing on its own.';

  const tiles = [
    [s.practiceDays, he ? heCount(s.practiceDays, 'יום תרגול', 'ימי תרגול', 'ימי תרגול').replace(/^\d+ /, '') : s.practiceDays === 1 ? 'practice day' : 'practice days'],
    [s.minutes, he ? (s.minutes === 1 ? 'דקה' : 'דקות') : 'minutes'],
    [`${s.programDone}/${PROGRAM_DAYS}`, he ? 'ימים בתוכנית' : 'program days'],
  ]
    .map(([n, label]) => `<div class="tile"><div class="n">${n}</div><div class="l">${esc(String(label))}</div></div>`)
    .join('');

  const chart = s.enough
    ? chartSvg(s.progress)
    : `<p class="quiet">${esc(
        he
          ? `עוד אין תמונה: יומן הכאב מצויר אחרי צ׳ק־אין ב־${MIN_DAYS_FOR_PICTURE} ימים שונים.`
          : `Not a picture yet: the pain record is drawn after check-ins on ${MIN_DAYS_FOR_PICTURE} different days.`,
      )}</p>`;
  const counts = he
    ? `ב־${weeks} השבועות האחרונים: ${s.checkInDays ? `צ׳ק־אין ב־${heCount(s.checkInDays, 'יום אחד', 'ימים', 'יומיים')}` : 'בלי צ׳ק־אין'}, ${s.practiceDays ? `תרגול ב־${heCount(s.practiceDays, 'יום אחד', 'ימים', 'יומיים')}` : 'בלי תרגול'}.`
    : `In the last ${weeks} weeks: checked in on ${s.checkInDays} day${s.checkInDays === 1 ? '' : 's'}, practised on ${s.practiceDays} day${s.practiceDays === 1 ? '' : 's'}.`;
  const legend = he ? ['הכאב הגבוה ביותר באותו יום', 'תרגול'] : ['Highest pain that day', 'Practised'];
  const goal = input.goal?.trim() ? `<p class="goal">${esc(he ? `המטרה: ${input.goal.trim()}` : `Toward ${input.goal.trim()}`)}</p>` : '';

  return `<!DOCTYPE html>
<html lang="${he ? 'he' : 'en'}" dir="${he ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<style>
  @page { margin: 0; }
  html, body { margin: 0; padding: 0; background: ${PAPER.bg}; }
  body { font-family: -apple-system, system-ui, sans-serif; color: ${PAPER.ink}; font-size: 12pt; line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { padding: 48pt 44pt 40pt; min-height: 100vh; box-sizing: border-box; }
  .brand { font-size: 9pt; letter-spacing: 0.18em; color: ${PAPER.moss}; text-transform: uppercase; margin-bottom: 6pt; }
  h1 { font-family: ui-rounded, -apple-system, system-ui, sans-serif; font-weight: 500; font-size: 26pt; line-height: 1.2; margin: 0 0 4pt; }
  .sub { color: ${PAPER.ink2}; font-size: 13pt; margin: 0; }
  .goal { color: #94714C; margin: 6pt 0 0; }
  .tiles { display: flex; gap: 10pt; margin: 24pt 0 22pt; }
  .tile { flex: 1; background: ${PAPER.surface}; border-radius: 12pt; padding: 14pt 14pt 12pt; }
  .tile .n { font-family: ui-rounded, -apple-system, system-ui, sans-serif; font-size: 24pt; font-weight: 500; line-height: 1.1; }
  .tile .l { color: ${PAPER.ink2}; font-size: 10.5pt; margin-top: 2pt; }
  h2 { font-weight: 500; font-size: 15pt; margin: 0 0 8pt; }
  .card { background: ${PAPER.surface}; border-radius: 14pt; padding: 18pt 20pt 16pt; }
  .legend { display: flex; gap: 18pt; color: ${PAPER.ink3}; font-size: 10pt; margin-top: 6pt; }
  .legend span::before { content: ''; display: inline-block; width: 7pt; height: 7pt; border-radius: 50%; background: ${PAPER.ink}; margin-inline-end: 5pt; vertical-align: middle; }
  .legend span.tick::before { width: 2.5pt; height: 8pt; border-radius: 1pt; background: ${PAPER.moss}; }
  .counts { margin: 12pt 0 0; }
  .meaning, .quiet { color: ${PAPER.ink3}; font-size: 10pt; line-height: 1.5; margin: 8pt 0 0; }
  .made { color: ${PAPER.ink3}; font-size: 9.5pt; margin-top: 28pt; padding-top: 10pt; border-top: 1px solid ${PAPER.hairline}; }
</style>
</head>
<body>
<div class="page">
  <div class="brand">Attend</div>
  <h1>${title}</h1>
  <p class="sub">${esc(sub)}</p>
  ${goal}
  <div class="tiles">${tiles}</div>
  <h2>${esc(tr('Pain record', 'יומן הכאב'))}</h2>
  <div class="card">
    ${chart}
    ${s.enough ? `<div class="legend"><span>${esc(legend[0])}</span><span class="tick">${esc(legend[1])}</span></div>` : ''}
    <p class="counts">${esc(counts)}</p>
    <p class="meaning">${esc(progressMeaning())}</p>
  </div>
  <p class="made">${esc(made)}</p>
</div>
</body>
</html>`;
}

/** The same facts as plain text, for a share sheet without PDF support. */
export function sharePageText(input: ShareInput): string {
  const s = shareSummary(input);
  const weeks = Math.round(s.days / 7);
  const head = input.name?.trim() ? `${input.name.trim()} · Attend` : 'Attend';
  if (isHe()) {
    return [
      head,
      `${weeks} השבועות האחרונים: ${heCount(s.practiceDays, 'יום תרגול אחד', 'ימי תרגול', 'יומיים של תרגול')}, ${heCount(s.minutes, 'דקה אחת', 'דקות', 'שתי דקות')}, ${s.programDone}/${PROGRAM_DAYS} ימים בתוכנית.`,
      `צ׳ק־אין ב־${heCount(s.checkInDays, 'יום אחד', 'ימים', 'יומיים')}.`,
      progressMeaning(),
    ].join('\n');
  }
  return [
    head,
    `Last ${weeks} weeks: ${s.practiceDays} practice day${s.practiceDays === 1 ? '' : 's'}, ${s.minutes} minute${s.minutes === 1 ? '' : 's'}, ${s.programDone}/${PROGRAM_DAYS} program days.`,
    `Checked in on ${s.checkInDays} day${s.checkInDays === 1 ? '' : 's'}.`,
    progressMeaning(),
  ].join('\n');
}
