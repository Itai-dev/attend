/**
 * One line to leave on, shown on the closing screen after a guided session (22 Oct 2026).
 *
 * Chosen for practice, patience and attention — never for pain, healing or what a
 * sensation means — so a quote can't do what the guide is not allowed to: promise relief,
 * reassure that something is benign, or grade the session. Only quotes whose source is
 * well established, attributed as their sources give them; a wrong attribution would be a
 * small thing manufactured. tests/quotes.test.ts guards the wording.
 */

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

/** The same session always shows the same quote; consecutive sessions usually differ. */
export function quoteFor(sessionId: string): Quote {
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) h = (Math.imul(h, 31) + sessionId.charCodeAt(i)) >>> 0;
  return QUOTES[h % QUOTES.length]!;
}
