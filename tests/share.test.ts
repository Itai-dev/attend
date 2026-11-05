import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CheckIn } from '../src/domain/checkin';
import { completeDay, EMPTY_PROGRAM } from '../src/domain/program';
import { chartSvg, sharePageHtml, sharePageText, shareSummary } from '../src/domain/share';
import type { Session } from '../src/domain/types';
import { setLang } from '../src/i18n';

const DAY = 86_400_000;
// Saturday 17 Oct 2026, 18:00 in Tel Aviv (+03:00).
const NOW = Date.UTC(2026, 9, 17, 15, 0);
const TZ = 180;

const s = (daysAgo: number, minutes = 7): Session =>
  ({ id: `s${daysAgo}`, startedAt: NOW - daysAgo * DAY, endedAt: NOW - daysAgo * DAY + minutes * 60_000, sessionType: 'notice', outcome: 'completed' }) as Session;
const c = (daysAgo: number, pain: number): CheckIn => ({ id: `c${daysAgo}-${pain}`, at: NOW - daysAgo * DAY, tz: TZ, pain }) as CheckIn;

const input = () => ({
  name: 'Noa',
  goal: 'Walk to the sea',
  sessions: [s(0), s(1), s(3), s(10, 5), s(70)],
  checkIns: [c(0, 4), c(0, 6), c(1, 3), c(2, 5), c(4, 7), c(9, 2)],
  program: completeDay(completeDay(EMPTY_PROGRAM, 1, '2026-10-16'), 2, '2026-10-17'),
  now: NOW,
  tz: TZ,
});

/** Words that would turn the sheet into a verdict. The page states counts and nothing else. */
const VERDICTS = /\b(better|worse|improv|trend|progress(ed|ing)|decreas|increas|down by|up by|%|score)\b/i;
const HE_VERDICTS = /השתפר|החמיר|מגמה|ירד ב|עלה ב|ציון|אחוז/;

test('the summary counts only what is inside the window, as entered', () => {
  const sum = shareSummary(input());
  assert.equal(sum.practiceDays, 4); // the session 70 days ago is outside the eight weeks
  assert.equal(sum.minutes, 7 * 3 + 5);
  assert.equal(sum.programDone, 2);
  assert.equal(sum.checkInDays, 5);
  assert.equal(sum.enough, true);
  // A day's pain is the peak of its check-ins.
  assert.equal(sum.progress[sum.progress.length - 1].peak, 6);
});

test('the English page carries the counts, the meaning sentence, and no verdict', () => {
  setLang('en');
  const html = sharePageHtml(input());
  assert.match(html, /<html lang="en" dir="ltr">/);
  assert.match(html, /Noa/);
  assert.match(html, /Toward Walk to the sea/);
  assert.match(html, /4<\/div><div class="l">practice days/);
  assert.match(html, /26<\/div><div class="l">minutes/);
  assert.match(html, /2\/28<\/div><div class="l">program days/);
  assert.match(html, /checked in on 5 days, practised on 4 days/);
  assert.match(html, /not a verdict on you or on the practice/);
  assert.match(html, /Attend sends nothing on its own/);
  assert.doesNotMatch(html.replace(/<style>[\s\S]*<\/style>/, ''), VERDICTS);
  // Nothing from the phone's files: iOS's printer can't load them.
  assert.doesNotMatch(html, /src="(file|\.\/|\/)/);
});

test('the Hebrew page is right to left, in Hebrew, with the same facts', () => {
  setLang('he');
  try {
    // The name and goal are the person's own words, shown as typed.
    const html = sharePageHtml({ ...input(), name: 'נועה', goal: 'ללכת עד הים' });
    assert.match(html, /<html lang="he" dir="rtl">/);
    assert.match(html, /המטרה: ללכת עד הים/);
    assert.match(html, /ימי תרגול/);
    assert.match(html, /ימים בתוכנית/);
    assert.match(html, /צ׳ק־אין ב־5 ימים, תרגול ב־4 ימים/);
    assert.match(html, /לא פסק דין עליכם או על התרגול/);
    assert.doesNotMatch(html, HE_VERDICTS);
    const text = html.replace(/<style>[\s\S]*<\/style>/, '').replace(/<[^>]+>/g, ' ');
    // No English words in the Hebrew sheet, other than the brand and numbers.
    assert.doesNotMatch(text.replace(/Attend/g, ''), /[A-Za-z]{3,}/);
    assert.match(sharePageText(input()), /4 ימי תרגול, 26 דקות, 2\/28 ימים בתוכנית/);
  } finally {
    setLang('en');
  }
});

test('the chart is dots and ticks, never a line between days', () => {
  const svg = chartSvg(shareSummary(input()).progress);
  assert.equal((svg.match(/<circle/g) ?? []).length, 5);
  assert.equal((svg.match(/<rect/g) ?? []).length, 4);
  assert.doesNotMatch(svg, /<polyline|<path/);
  // Time runs left to right even on a right-to-left page.
  assert.match(svg, /direction="ltr"/);
});

test('too few check-ins: no chart, a plain sentence, still a complete page', () => {
  const html = sharePageHtml({ ...input(), checkIns: [c(0, 4), c(1, 3)] });
  assert.doesNotMatch(html, /<circle/);
  assert.match(html, /Not a picture yet/);
  assert.match(html, /checked in on 2 days/);
});
