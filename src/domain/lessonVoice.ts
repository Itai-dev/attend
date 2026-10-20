import type { ProgramDay } from './program';

/**
 * A lesson read aloud by the guide (studio round 2): listening and reading are equal ways to
 * take a lesson in, and at night, or for someone who came for sleep, listening with the eyes
 * closed is the easier one. The words are the lesson's own, fixed text: they go to the voice
 * and nowhere else, never to a model.
 *
 * Pure data, so the spoken lesson is checked in Node tests (tests/lessonVoice.test.ts).
 */

export type SpokenLine = [text: string, pauseMs: number];

/** Between paragraphs of one card: a breath, shorter than the gap between cards. */
const PARAGRAPH_MS = 1500;
/** Between cards nothing is spoken; the silence is the turn of the page (r2-copy §2). */
const CARD_MS = 2500;
/** A little longer before a "notice" line, so it lands as an invitation of its own. */
const BEFORE_NOTICE_MS = 4000;

/** Where the lesson hands over to the practice. Then the practice's own arrival, unchanged. */
export const INTO_PRACTICE: SpokenLine[] = [
  ["That's today's lesson.", 2500],
  ['Now, the practice.', 3500],
];

export function lessonLines(day: ProgramDay): SpokenLine[] {
  const title = day.lesson.title.trim().replace(/[.]+$/, '');
  // Day 28's lesson is called "Day 28": "Day 28. Day 28." would sound like a stutter.
  const heading = title.toLowerCase() === `day ${day.day}` ? `Day ${day.day}.` : `Day ${day.day}. ${title}.`;
  const out: SpokenLine[] = [
    [heading, 2500],
    ['You can close your eyes, and just listen.', 3500],
  ];
  for (const card of day.lesson.cards) {
    card.text.forEach((p, i) => {
      const lastOfCard = i === card.text.length - 1;
      out.push([p, !lastOfCard ? PARAGRAPH_MS : card.notice ? BEFORE_NOTICE_MS : CARD_MS]);
    });
    if (card.notice) out.push([card.notice, CARD_MS]);
  }
  return [...out, ...INTO_PRACTICE];
}

/**
 * Whether a lesson opens with listening first, on a dark screen: from 21:00 local through the
 * small hours (a 2am lesson is still a night one), or for someone whose welcome focus was
 * Nights. Both options are always there; this only orders them and darkens the screen.
 */
export function listenFirst(hour: number, focus?: string): boolean {
  return hour >= 21 || hour < 5 || focus === 'sleep';
}
