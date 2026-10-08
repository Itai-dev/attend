import { primarySensation } from './bodyMap';
import type { BodyRegion, Session, Side } from './types';

/**
 * What the guide remembers from earlier sessions: where the person's attention
 * has usually gone and the words they used for it. Built on the device from the
 * saved sessions each time a session starts; it is never stored on its own.
 *
 * It exists so that the same pattern is met as the same pattern. Without it each
 * session started from nothing, and a lower back named "my back" one day and
 * "the left side, low down" the next was drawn as two different things.
 *
 * It holds places and words, never a measure of how bad anything was.
 */
export type SessionMemory = {
  /** Sessions of the person's own (samples excluded) that noticed something. */
  sessions: number;
  /** The place most often at the centre of a session, and how it was described there. */
  usual?: {
    region: BodyRegion;
    side?: Side;
    /** Most used first. */
    words: string[];
    /** In how many sessions it was the main place. */
    times: number;
  };
};

/** Only the recent past shapes the guide: a pattern from a year ago may no longer be the person's. */
const RECENT = 12;

export function buildMemory(all: Session[]): SessionMemory {
  const own = all
    .filter((s) => !s.isSample)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, RECENT);
  const mains = own.map((s) => primarySensation(s.bodyMapStart) ?? primarySensation(s.bodyMapEnd)).filter((x) => !!x);
  if (mains.length === 0) return { sessions: 0 };

  const byRegion = new Map<BodyRegion, typeof mains>();
  for (const m of mains) byRegion.set(m.region, [...(byRegion.get(m.region) ?? []), m]);
  // Most sessions first; on a tie, the most recent wins (mains is newest first).
  const [region, here] = [...byRegion.entries()].sort((a, b) => b[1].length - a[1].length)[0];

  return {
    sessions: mains.length,
    usual: { region, side: mostCommon(here.map((m) => m.side)), words: ranked(here.flatMap((m) => m.descriptors)).slice(0, 3), times: here.length },
  };
}

function ranked<T>(xs: T[]): T[] {
  const n = new Map<T, number>();
  xs.forEach((x) => n.set(x, (n.get(x) ?? 0) + 1));
  // Stable sort keeps first-seen (most recent) order among equals.
  return [...n.keys()].sort((a, b) => n.get(b)! - n.get(a)!);
}

function mostCommon<T>(xs: Array<T | undefined>): T | undefined {
  return ranked(xs.filter((x): x is T => x !== undefined))[0];
}
