/**
 * One line to leave on, shown on the closing screen after a guided session (22 Oct 2026).
 *
 * Chosen for practice, patience and attention — never for pain, healing or what a
 * sensation means — so a quote can't do what the guide is not allowed to: promise relief,
 * reassure that something is benign, or grade the session. Only quotes whose source is
 * well established, attributed as their sources give them; a wrong attribution would be a
 * small thing manufactured. tests/quotes.test.ts guards the wording.
 */

import { isHe } from '../i18n';

export type Quote = { text: string; by: string };

export const QUOTES: Quote[] = [
  { text: 'Sitting quietly, doing nothing,\nspring comes, and the grass grows by itself.', by: 'Zenrin Kushū' },
  { text: 'O snail,\nclimb Mount Fuji,\nbut slowly, slowly.', by: 'Kobayashi Issa' },
  { text: 'The old pond —\na frog jumps in,\nthe sound of water.', by: 'Matsuo Bashō' },
  { text: 'In the beginner’s mind there are many possibilities, but in the expert’s there are few.', by: 'Shunryu Suzuki' },
  { text: 'Attention is the rarest and purest form of generosity.', by: 'Simone Weil' },
  { text: 'Attention is the beginning of devotion.', by: 'Mary Oliver' },
  { text: 'Be patient toward all that is unsolved in your heart, and try to love the questions themselves.', by: 'Rainer Maria Rilke' },
  { text: 'A journey of a thousand miles begins with a single step.', by: 'Laozi' },
  { text: 'Little by little, one travels far.', by: 'Spanish proverb' },
];

/**
 * Hebrew (27 Oct 2026): the same quotes, in the same order (a session shows the same quote in
 * either language), rendered for the ear rather than word for word. Rilke wrote to one young
 * poet; here he speaks in the plural, so the line never picks a gender for the reader. The
 * snail keeps its singular: Issa is talking to the snail.
 */
const HE_QUOTES: Quote[] = [
  { text: 'יושבים בשקט, לא עושים דבר,\nהאביב בא, והעשב צומח מעצמו.', by: 'זנרין קושו' },
  { text: 'חילזון קטן,\nטפס על הר פוג׳י,\nאבל לאט, לאט.', by: 'קובאיאשי איסה' },
  { text: 'בריכה עתיקה –\nצפרדע קופצת,\nקול מים.', by: 'מאצואו באשו' },
  { text: 'בתודעת המתחיל יש אפשרויות רבות, בתודעת המומחה – מעטות.', by: 'שונריו סוזוקי' },
  { text: 'תשומת לב היא הצורה הנדירה והטהורה ביותר של נדיבות.', by: 'סימון וייל' },
  { text: 'תשומת לב היא ראשיתה של מסירות.', by: 'מרי אוליבר' },
  { text: 'היו סבלניים כלפי כל מה שעוד לא נפתר בלבכם, ונסו לאהוב את השאלות עצמן.', by: 'ריינר מריה רילקה' },
  { text: 'מסע של אלף מילין מתחיל בצעד אחד.', by: 'לאו דזה' },
  { text: 'לאט לאט, מגיעים רחוק.', by: 'פתגם ספרדי' },
];

/** The quotes in the app's language. English returns QUOTES itself. */
export function quotes(): Quote[] {
  return isHe() ? HE_QUOTES : QUOTES;
}

/** The same session always shows the same quote; consecutive sessions usually differ. */
export function quoteFor(sessionId: string): Quote {
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) h = (Math.imul(h, 31) + sessionId.charCodeAt(i)) >>> 0;
  const list = quotes();
  return list[h % list.length]!;
}
