import { SessionEngine } from '../src/engine/SessionEngine';
import { LocalGuideBrain } from '../src/engine/guide/LocalGuideBrain';
import type { AskKind, GuideBrain } from '../src/engine/types';
import type { SessionType } from '../src/domain/types';
import type { SessionLength } from '../src/engine/phases';

export type Script = Partial<Record<AskKind | 'default', string | string[] | null>>;

/**
 * Drive a whole session in memory: the brain speaks, the clock advances by a
 * plausible speaking time plus the guide's silences, and the script answers
 * each question by its kind. `null` answers with silence.
 */
export async function runSession(
  script: Script,
  opts: { type?: SessionType; minutes?: SessionLength; brain?: GuideBrain; seed?: number; maxTurns?: number } = {},
) {
  let t = 1_000_000;
  const engine = new SessionEngine({ sessionType: opts.type ?? 'notice', minutes: opts.minutes, now: () => t, seed: opts.seed ?? 3 });
  const brain = opts.brain ?? new LocalGuideBrain();
  const spoken: string[] = [];
  const asks: Array<AskKind | undefined> = [];
  const used = new Map<string, number>();
  let turns = 0;
  while (!engine.done && turns++ < (opts.maxTurns ?? 80)) {
    const turn = await brain.next(engine.context());
    engine.recordGuideTurn(turn);
    for (const l of turn.lines) {
      spoken.push(l.text);
      t += l.text.length * 70 + l.pauseAfterMs;
    }
    engine.afterGuideTurn(turn);
    if (engine.done || !turn.expectsResponse) continue;
    asks.push(turn.ask);
    const entry = script[turn.ask ?? 'default'] ?? script.default;
    let answer: string | null | undefined = Array.isArray(entry) ? entry[Math.min(used.get(turn.ask ?? '') ?? 0, entry.length - 1)] : entry;
    used.set(turn.ask ?? '', (used.get(turn.ask ?? '') ?? 0) + 1);
    t += 2000;
    if (answer === undefined) answer = null;
    if (answer === null) {
      t += 12_000;
      engine.ingest({ kind: 'silence', waitedMs: 12_000 });
    } else {
      t += answer.length * 60;
      engine.ingest({ kind: 'speech', text: answer });
    }
  }
  const { session, moments } = engine.finalize();
  return { session, moments, spoken, asks, durationMs: t - 1_000_000, engine };
}

export const NECK_SCRIPT: Script = {
  notice: 'My neck feels really tight on the left side.',
  locate_side: 'The left side.',
  quality_deepen: 'Almost like someone is pulling it upward.',
  quality: 'More like pulling.',
  shape: "It's a small spot. Very focused.",
  edge: ['Yes, it has a clear edge.', "The edges feel softer now. It's harder to tell where it ends."],
  temporal: "It's pretty constant.",
  movement: 'No. It kind of moves upward toward the back of my head.',
  change: ["It's less defined now.", "It's a bit softer.", 'About the same.'],
  reflect: "I can let it be there. It's okay.",
  familiar: "It's familiar. I've had it for years.",
};

export const BACK_SCRIPT: Script = {
  notice: 'My lower back.',
  locate_side: 'More in the middle.',
  quality: 'Heavy. Like an ache.',
  quality_deepen: 'Dull and heavy, like a weight.',
  shape: "It's spread out across the whole area.",
  edge: 'Not really. It fades out.',
  temporal: 'Steady.',
  movement: 'It stays in the same place.',
  change: ['About the same.', 'Nothing has changed.'],
  reflect: 'I keep wanting it to stop. But I can watch it.',
  familiar: 'I know it well.',
};
