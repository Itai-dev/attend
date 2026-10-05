import { DESCRIPTORS, nounOf } from '../../domain/lexicon';
import { REGIONS, speakPlace } from '../../domain/regions';
import type { BodySensation, SensationChange } from '../../domain/types';
import { isClosing } from '../phases';
import type { AskKind, GuideBrain, GuideContext, GuideLine, GuideTurn } from '../types';
import * as L from './lines';

/**
 * The guide that runs with no network at all.
 *
 * It is not a questionnaire in a voice. It reads what the person just said
 * (through the extractor, via the context), reacts to it first — in their
 * words, briefly — and only then decides whether anything is still worth
 * asking. Slots it already knows are never asked about. When there is
 * nothing to ask, it holds silence instead.
 *
 * The remote brain receives this brain's proposal for every turn, so the two
 * stay in the same shape and the local one is always a sound fallback.
 */
export class LocalGuideBrain implements GuideBrain {
  readonly id = 'local';

  async next(ctx: GuideContext): Promise<GuideTurn> {
    return localTurn(ctx);
  }
}

const QUESTION_WINDOW_MS = 14_000;

/** Already said whether it is warm or cold (burning, hot, icy…)? Then temperature is known. */
function hasTemperature(focus: BodySensation): boolean {
  return focus.descriptors.some((w) => {
    const family = DESCRIPTORS.find((d) => d.word === w)?.family;
    return family === 'warm' || family === 'cold';
  });
}

/** Neighbouring words for the family the person's word belongs to; the open question when there's no menu. */
function deepenMenu(focus: BodySensation): string[] {
  const family = DESCRIPTORS.find((d) => d.word === focus.descriptors[0])?.family;
  const menu = family ? L.DEEPEN_BY_FAMILY[family] : undefined;
  return menu?.length ? menu : L.EXPLORE_DEEPEN;
}

/**
 * The reappraisal the session opens with: for fear, the difference between feeling and
 * reacting; otherwise, not needing to solve it. Later turns pick from the rest.
 */
function firstCore(ctx: GuideContext): number {
  const want = ctx.sessionType === 'fear' ? /difference between feeling/ : /need to solve/;
  const i = L.REAPPRAISE_CORE.findIndex((v) => want.test(v[0][0]));
  return i >= 0 ? i : 0;
}

function fill(text: string, ctx: GuideContext, focus?: BodySensation): string {
  const word = focus?.descriptors[0] ?? ctx.unplacedDescriptors[0];
  const place = focus ? speakPlace(focus.region, focus.side) : 'your body';
  const dest = focus?.movement?.destinationRegion
    ? speakPlace(focus.movement.destinationRegion, focus.movement.destinationSide)
    : '';
  return text
    .replace('{word}', word ?? 'that')
    .replace('{noun}', word ? nounOf(word) : 'sensation')
    .replace('{place}', place)
    .replace('{dest}', dest);
}

/** Pick the first variant not yet spoken this session, starting at a random offset. */
function pick<T>(variants: T[], ctx: GuideContext, key: (v: T) => string): T {
  const start = Math.floor(ctx.random() * variants.length);
  for (let i = 0; i < variants.length; i++) {
    const v = variants[(start + i) % variants.length];
    if (!ctx.usedLines.has(key(v))) return v;
  }
  return variants[start];
}

function pickText(variants: string[], ctx: GuideContext): string {
  return pick(variants, ctx, (v) => v);
}

function pickLines(variants: L.Line[][], ctx: GuideContext): L.Line[] {
  return pick(variants, ctx, (v) => v[0][0]);
}

function scale(ms: number, ctx: GuideContext): number {
  return Math.round(ms * ctx.plan.pauseScale);
}

function lines(ls: L.Line[], ctx: GuideContext, focus?: BodySensation): GuideLine[] {
  return ls.map(([text, ms]) => ({ text: fill(text, ctx, focus), pauseAfterMs: scale(ms, ctx), key: text }));
}

function line(text: string, ms: number, ctx: GuideContext, focus?: BodySensation): GuideLine {
  return { text: fill(text, ctx, focus), pauseAfterMs: scale(ms, ctx), key: text };
}

function question(text: string, ask: AskKind, ctx: GuideContext, focus?: BodySensation, windowMs = QUESTION_WINDOW_MS) {
  return {
    line: { text: fill(text, ctx, focus), pauseAfterMs: 0, key: text },
    ask,
    listenWindowMs: Math.round(windowMs * Math.max(1, ctx.plan.pauseScale)),
  };
}

function asked(ctx: GuideContext, kind: AskKind): boolean {
  return ctx.asked.includes(kind);
}

/** React to the last answer in a sentence or two, before anything else is asked. */
function reaction(ctx: GuideContext, focus?: BodySensation): GuideLine[] {
  if (ctx.lastResult === 'silence') {
    if (ctx.phase === 'NOTICE') return [];
    return [line(pickText(L.ACK_SILENCE, ctx), 4000, ctx)];
  }
  if (ctx.lastResult !== 'speech' || !ctx.lastObservation) return [];

  // React to a change once. Hearing "notice the edges softening" three times turns guidance into a loop.
  const earlier = new Set(ctx.changes.filter((c) => !ctx.lastChanges.includes(c)).map((c) => c.type));
  const lead = leadingChange(ctx.lastChanges.filter((c) => !earlier.has(c.type)));
  if (lead) {
    const bank =
      lead.type === 'moved'
        ? L.REACT_MOVED
        : lead.type === 'spread'
          ? L.REACT_SPREAD
          : lead.type === 'contracted'
            ? L.REACT_CONTRACT
            : lead.type === 'softened'
              ? L.REACT_SOFTENED
              : lead.type === 'intensified'
                ? L.REACT_INTENSIFIED
                : lead.type === 'boundary_softened'
                  ? L.REACT_BOUNDARY
                  : lead.type === 'quality_shift'
                    ? L.REACT_QUALITY
                    : lead.type === 'stable'
                      ? L.REACT_STABLE
                      : undefined;
    if (bank) return lines(pickLines(bank, ctx), ctx, focus);
  }

  const obs = ctx.lastObservation;
  if (obs.uncertain || obs.nothing) return [line(pickText(L.ACK_UNCERTAIN, ctx), 3500, ctx)];
  if (ctx.lastAsk === 'notice' && focus) {
    const several = ctx.map.sensations.length > 1;
    return [line(several ? L.LOCATE_ACK[0] : pickText(L.LOCATE_ACK, ctx), 4500, ctx, focus)];
  }
  if (obs.descriptors.length > 0 && focus) return [line(pickText(L.ACK_WORD, ctx), 5000, ctx, focus)];
  return [line(pickText(L.ACK_PLAIN, ctx), 4000, ctx, focus)];
}

const CHANGE_ORDER: SensationChange['type'][] = [
  'moved',
  'spread',
  'contracted',
  'boundary_softened',
  'softened',
  'quality_shift',
  'intensified',
  'shape_shift',
  'temporal_shift',
  'boundary_sharpened',
  'stable',
];

function leadingChange(changes: SensationChange[]): SensationChange | undefined {
  for (const t of CHANGE_ORDER) {
    const c = changes.find((x) => x.type === t);
    if (c) return c;
  }
  return undefined;
}

function turn(partial: Omit<GuideTurn, 'source'>): GuideTurn {
  return { ...partial, source: 'local' };
}

export function localTurn(ctx: GuideContext): GuideTurn {
  const focus = ctx.focus;

  const ack = ctx.extended ? lines(pickLines(L.LONGER_ACK, ctx), ctx) : [];
  if (ctx.repeatRequested && ctx.lastQuestion && !isClosing(ctx.phase)) {
    const again = { ...ctx.lastQuestion, pauseAfterMs: 0 };
    const lead = [...(ctx.resumed ? [line(L.RESUME[0], L.RESUME[1], ctx)] : []), ...ack];
    return turn({ lines: [...lead, again], expectsResponse: true, ask: ctx.lastAsk, listenWindowMs: QUESTION_WINDOW_MS });
  }

  const prefix: GuideLine[] = [...(ctx.resumed ? [line(L.RESUME[0], L.RESUME[1], ctx)] : []), ...ack];

  switch (ctx.phase) {
    case 'ARRIVE':
      return turn({ lines: lines(pickLines(L.ARRIVE[ctx.sessionType], ctx), ctx), expectsResponse: false, advance: true });

    case 'NOTICE': {
      if (ctx.lastResult === 'silence' && ctx.silenceStreak > 0) {
        const ls = lines(pickLines(L.NOTICE_SILENCE, ctx), ctx);
        const last = ls.pop()!;
        return turn({ lines: [...prefix, ...ls, last], expectsResponse: true, ask: 'notice', listenWindowMs: 18_000 });
      }
      if (ctx.nothingStreak > 0) {
        const [text] = pick(L.NOTICE_RETRY, ctx, (v) => v[0]);
        return turn({ lines: [...prefix, line(text, 0, ctx)], expectsResponse: true, ask: 'notice', listenWindowMs: 16_000 });
      }
      const q = question(pickText(L.NOTICE_ASK[ctx.sessionType], ctx), 'notice', ctx, undefined, 16_000);
      return turn({ lines: [...prefix, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
    }

    case 'LOCATE': {
      const react = reaction(ctx, focus);
      if (!focus) {
        const q = question(pickText(L.LOCATE_WHERE, ctx), 'locate_where', ctx);
        return turn({ lines: [...prefix, ...react, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
      }
      const info = REGIONS[focus.region];
      if (info.broad && !asked(ctx, 'locate_narrow')) {
        const q = question(pickText(L.LOCATE_NARROW, ctx), 'locate_narrow', ctx, focus);
        return turn({ lines: [...prefix, ...react, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
      }
      if ((info.paired || info.sided) && !focus.side && !asked(ctx, 'locate_side')) {
        const q = question(pickText(info.paired ? L.LOCATE_SIDE_PAIRED : L.LOCATE_SIDE_SIDED, ctx), 'locate_side', ctx, focus);
        return turn({ lines: [...prefix, ...react, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
      }
      return turn({ lines: [], expectsResponse: false, advance: true });
    }

    case 'EXPLORE': {
      if (!focus) return turn({ lines: [], expectsResponse: false, advance: true });
      const react = reaction(ctx, focus);
      const generic = focus.descriptors.length === 0;
      let q: ReturnType<typeof question> | undefined;
      if (generic && !asked(ctx, 'quality')) q = question(pickText(L.EXPLORE_QUALITY, ctx), 'quality', ctx, focus);
      else if (generic && !asked(ctx, 'quality_hint')) {
        // Still no describing word: offer a few to choose from, once, then move on either way.
        const hint = lines(pickLines(L.QUALITY_HINT, ctx), ctx, focus);
        const last = hint.pop()!;
        return turn({ lines: [...prefix, ...react, ...hint, last], expectsResponse: true, ask: 'quality_hint', listenWindowMs: QUESTION_WINDOW_MS });
      } else if (!generic && focus.descriptors.length < 3 && !asked(ctx, 'quality_deepen'))
        q = question(pickText(deepenMenu(focus), ctx), 'quality_deepen', ctx, focus);
      else if (!focus.shape && !asked(ctx, 'shape')) q = question(pickText(L.EXPLORE_SHAPE, ctx), 'shape', ctx, focus);
      else if (!focus.edge && !asked(ctx, 'edge')) q = question(pickText(L.EXPLORE_EDGE, ctx), 'edge', ctx, focus);
      else if (!hasTemperature(focus) && !asked(ctx, 'temperature')) q = question(pickText(L.EXPLORE_TEMPERATURE, ctx), 'temperature', ctx, focus);
      else if (!focus.temporalQuality && !asked(ctx, 'temporal')) q = question(pickText(L.EXPLORE_TEMPORAL, ctx), 'temporal', ctx, focus);

      if (q) {
        return turn({ lines: [...prefix, ...react, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
      }
      // Everything is known. Hold silence rather than invent a question.
      const hold = lines(pickLines(L.HOLD, ctx), ctx, focus);
      const last = hold.pop()!;
      return turn({ lines: [...prefix, ...react, ...hold, last], expectsResponse: true, ask: 'change', listenWindowMs: QUESTION_WINDOW_MS, advance: true });
    }

    case 'OBSERVE': {
      if (!focus) return turn({ lines: [], expectsResponse: false, advance: true });
      // Watching begins with lightness, once: curiosity rather than vigilance, and no outcome to wait for.
      const react = [...reaction(ctx, focus), ...(ctx.phaseTurn === 0 ? lines(pickLines(L.LIGHTNESS, ctx), ctx, focus) : [])];
      if (!asked(ctx, 'movement')) {
        const isStatic = focus.movement?.type === 'static';
        const q = question(pickText(isStatic ? L.OBSERVE_MOVEMENT_STATIC : L.OBSERVE_MOVEMENT, ctx), 'movement', ctx, focus);
        const settle = react.length === 0 ? [line(pickText(L.ACK_PLAIN, ctx), 6000, ctx, focus)] : [];
        return turn({ lines: [...prefix, ...react, ...settle, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
      }
      if (!asked(ctx, 'change')) {
        const ls = lines(pickLines(L.OBSERVE_CHANGE, ctx), ctx, focus);
        const last = ls.pop()!;
        return turn({ lines: [...prefix, ...react, ...ls, last], expectsResponse: true, ask: 'change', listenWindowMs: QUESTION_WINDOW_MS });
      }
      // A clearly-edged sensation is worth one more look at its edges; it is often where change shows first.
      if (focus.edge === 'clear' && ctx.asked.filter((a) => a === 'edge').length < 2) {
        const q = question(pickText(L.OBSERVE_EDGE_AGAIN, ctx), 'edge', ctx, focus);
        return turn({ lines: [...prefix, ...react, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
      }
      const hold = lines(pickLines(L.HOLD, ctx), ctx, focus);
      const last = hold.pop()!;
      return turn({ lines: [...prefix, ...react, ...hold, last], expectsResponse: true, ask: 'change', listenWindowMs: QUESTION_WINDOW_MS });
    }

    case 'REAPPRAISE': {
      const react = reaction(ctx, focus);
      const parts: GuideLine[] = [...prefix, ...react];
      if (ctx.phaseTurn === 0) {
        if (ctx.signals.urgeToFix) parts.push(...lines(L.REAPPRAISE_URGE, ctx, focus));
        if (ctx.signals.familiarConfirmed) parts.push(...lines(L.REAPPRAISE_FAMILIAR, ctx, focus));
        parts.push(...lines(L.REAPPRAISE_CORE[firstCore(ctx)], ctx, focus));
        const q = question(pickText(L.REAPPRAISE_REFLECT, ctx), 'reflect', ctx, focus, 12_000);
        return turn({ lines: [...parts, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
      }
      const first = firstCore(ctx);
      parts.push(...lines(pickLines(L.REAPPRAISE_CORE.filter((_, i) => i !== first), ctx), ctx, focus));
      return turn({ lines: parts, expectsResponse: false, advance: true });
    }

    case 'OPEN_AWARENESS':
      return turn({ lines: [...prefix, ...lines(L.OPEN_AWARENESS, ctx)], expectsResponse: false, advance: true });

    case 'SAFETY_CHECK': {
      const q = question(pickText(L.SAFETY_ASK, ctx), 'familiar', ctx, focus, 15_000);
      return turn({ lines: [q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
    }

    case 'CLOSE': {
      // Asked to finish: a short yes, then the close. Otherwise announce the end before it comes:
      // never straight from a question into "open your eyes".
      const react = ctx.closeRequested
        ? lines(pickLines(L.WRAP_ACK, ctx), ctx)
        : ctx.lastResult === 'speech'
          ? [line('Notice that.', 3500, ctx)]
          : [];
      const prepare = ctx.closeRequested ? [] : lines(pickLines(L.CLOSE_PREPARE[ctx.sessionType], ctx), ctx, focus);
      return turn({ lines: [...react, ...prepare, ...lines(L.CLOSE[ctx.sessionType], ctx, focus)], expectsResponse: false, end: true });
    }
    case 'SAFETY_CLOSE':
      return turn({ lines: lines(L.SAFETY_CLOSE, ctx), expectsResponse: false, end: true });
    case 'CRISIS_CLOSE':
      return turn({ lines: lines(L.CRISIS_CLOSE, ctx), expectsResponse: false, end: true });
    case 'EARLY_CLOSE':
      return turn({ lines: lines(L.EARLY_CLOSE, ctx), expectsResponse: false, end: true });
    case 'DONE':
      return turn({ lines: [], expectsResponse: false, end: true });
  }
}
