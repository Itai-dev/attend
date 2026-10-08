import { nounOf } from '../../domain/lexicon';
import { isWithin } from '../../domain/bodyMap';
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

function fill(text: string, ctx: GuideContext, focus?: BodySensation): string {
  const word = focus?.descriptors[0] ?? ctx.unplacedDescriptors[0];
  const place = focus ? speakPlace(focus.region, focus.side) : 'your body';
  const dest = focus?.movement?.destinationRegion
    ? speakPlace(focus.movement.destinationRegion, focus.movement.destinationSide)
    : '';
  const usual = ctx.memory.usual;
  return text
    .replace('{usual}', usual ? speakPlace(usual.region, usual.side) : 'that place')
    .replace('{usualWord}', usual?.words[0] ?? 'it')
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
  // Already reacted to, in the guidance spoken since that answer.
  if (ctx.guided) return [];
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
  if ((ctx.lastAsk === 'notice' || ctx.lastAsk === 'usual_place') && focus) {
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

/** Phases where nothing but the fixed lines may be said, not even an answer. */
const NO_ANSWER = new Set(['SAFETY_CLOSE', 'CRISIS_CLOSE', 'EARLY_CLOSE', 'DONE']);

/**
 * The person asked something. It is answered first, in a line or two, then the turn goes on:
 * usually the guide's own question again. Medical questions get the fixed answer.
 */
function answerLines(ctx: GuideContext): GuideLine[] {
  const q = ctx.userQuestion;
  if (!q || NO_ANSWER.has(ctx.phase)) return [];
  return lines(q === 'cause' ? L.ANSWER_CAUSE : L.ANSWER[q], ctx, ctx.focus);
}

/** The scan's steps for this session's depth, spoken in order. */
function scanSteps(ctx: GuideContext): L.Line[][] {
  if (ctx.plan.scan === 'brief') return [pickLines(L.SCAN_BRIEF, ctx)];
  return ctx.plan.scan === 'full' ? L.SCAN_FULL : L.SCAN_SHORT;
}

/** Earlier sessions knew this place more exactly than the person has said it today. */
function usualRefines(ctx: GuideContext, focus: BodySensation): boolean {
  const u = ctx.memory.usual;
  if (!u || asked(ctx, 'usual_place')) return false;
  if (u.region === focus.region) return !focus.side && !!u.side;
  return isWithin(u.region, focus.region);
}

export function localTurn(ctx: GuideContext): GuideTurn {
  const t = phaseTurn(ctx);
  const answer = answerLines(ctx);
  return answer.length ? { ...t, lines: [...answer, ...t.lines] } : t;
}

function phaseTurn(ctx: GuideContext): GuideTurn {
  const focus = ctx.focus;

  if (ctx.repeatRequested && ctx.lastQuestion && !isClosing(ctx.phase)) {
    const again = { ...ctx.lastQuestion, pauseAfterMs: 0 };
    const lead = ctx.resumed ? [line(L.RESUME[0], L.RESUME[1], ctx)] : [];
    return turn({ lines: [...lead, again], expectsResponse: true, ask: ctx.lastAsk, listenWindowMs: QUESTION_WINDOW_MS });
  }

  const prefix: GuideLine[] = ctx.resumed ? [line(L.RESUME[0], L.RESUME[1], ctx)] : [];

  switch (ctx.phase) {
    case 'ARRIVE':
      return turn({ lines: lines(pickLines(L.ARRIVE[ctx.sessionType], ctx), ctx), expectsResponse: false, advance: true });

    case 'SCAN': {
      // One region per turn, so a pause cuts in between regions and resumes at the next.
      const steps = scanSteps(ctx);
      const step = steps[Math.min(ctx.phaseStep, steps.length - 1)];
      const last = ctx.phaseStep >= steps.length - 1;
      return turn({ lines: [...prefix, ...lines(step, ctx)], expectsResponse: false, stay: !last, advance: last });
    }

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
      // Straight after the scan: start where earlier sessions usually started, if they did.
      const first = !asked(ctx, 'notice') && !asked(ctx, 'usual_place') && ctx.sessionType !== 'fear';
      const usual = first && !!ctx.memory.usual;
      const bank = usual ? L.SCAN_USUAL : first ? L.SCAN_NOTICE : L.NOTICE_ASK[ctx.sessionType];
      const q = question(pickText(bank, ctx), usual ? 'usual_place' : 'notice', ctx, undefined, 16_000);
      return turn({ lines: [...prefix, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
    }

    case 'LOCATE': {
      const react = reaction(ctx, focus);
      if (!focus) {
        const q = question(pickText(L.LOCATE_WHERE, ctx), 'locate_where', ctx);
        return turn({ lines: [...prefix, ...react, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
      }
      const info = REGIONS[focus.region];
      if (usualRefines(ctx, focus)) {
        const q = question(pickText(L.LOCATE_USUAL, ctx), 'usual_place', ctx, focus);
        return turn({ lines: [...prefix, ...react, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
      }
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
      const usualWord = ctx.memory.usual?.region === focus.region ? ctx.memory.usual.words[0] : undefined;
      // The same pattern in the same words: offer the word from before before offering a list.
      if (generic && usualWord && !asked(ctx, 'usual_word') && !asked(ctx, 'quality'))
        q = question(pickText(L.EXPLORE_USUAL_WORD, ctx), 'usual_word', ctx, focus);
      else if (generic && !asked(ctx, 'quality')) q = question(pickText(L.EXPLORE_QUALITY, ctx), 'quality', ctx, focus);
      else if (!generic && focus.descriptors.length < 3 && !asked(ctx, 'quality_deepen'))
        q = question(pickText(L.EXPLORE_DEEPEN, ctx), 'quality_deepen', ctx, focus);
      else if (!focus.shape && !asked(ctx, 'shape')) q = question(pickText(L.EXPLORE_SHAPE, ctx), 'shape', ctx, focus);
      else if (!focus.edge && !asked(ctx, 'edge')) q = question(pickText(L.EXPLORE_EDGE, ctx), 'edge', ctx, focus);
      else if (!focus.temporalQuality && !asked(ctx, 'temporal')) q = question(pickText(L.EXPLORE_TEMPORAL, ctx), 'temporal', ctx, focus);

      // A longer exploration pauses once to guide, so it doesn't become a run of questions.
      if (q && ctx.phaseTurn >= 2 && ctx.phaseStep === 0 && !ctx.guided)
        return turn({ lines: [...prefix, ...react, ...lines(pickLines(L.GUIDE_OBSERVE, ctx), ctx, focus)], expectsResponse: false, stay: true });
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
      // Guide, then ask. After every answer the guide gives attention something to do and
      // leaves silence for it, rather than asking "what do you notice now?" again.
      if (!ctx.guided) {
        const react = reaction(ctx, focus);
        return turn({ lines: [...prefix, ...react, ...lines(pickLines(L.GUIDE_OBSERVE, ctx), ctx, focus)], expectsResponse: false, stay: true });
      }
      const react: GuideLine[] = [];
      if (!asked(ctx, 'movement')) {
        const isStatic = focus.movement?.type === 'static';
        const q = question(pickText(isStatic ? L.OBSERVE_MOVEMENT_STATIC : L.OBSERVE_MOVEMENT, ctx), 'movement', ctx, focus);
        return turn({ lines: [...prefix, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
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
        const core = ctx.sessionType === 'fear' ? L.REAPPRAISE_CORE[2] : L.REAPPRAISE_CORE[0];
        parts.push(...lines(core, ctx, focus));
        const q = question(pickText(L.REAPPRAISE_REFLECT, ctx), 'reflect', ctx, focus, 12_000);
        return turn({ lines: [...parts, q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
      }
      parts.push(...lines(pickLines(L.REAPPRAISE_CORE.slice(1), ctx), ctx, focus));
      return turn({ lines: parts, expectsResponse: false, advance: true });
    }

    case 'OPEN_AWARENESS':
      return turn({ lines: [...prefix, ...lines(L.OPEN_AWARENESS, ctx)], expectsResponse: false, advance: true });

    case 'SAFETY_CHECK': {
      const q = question(pickText(L.SAFETY_ASK, ctx), 'familiar', ctx, focus, 15_000);
      return turn({ lines: [q.line], expectsResponse: true, ask: q.ask, listenWindowMs: q.listenWindowMs });
    }

    case 'CLOSE': {
      const react = ctx.lastResult === 'speech' ? [line('Notice that.', 3500, ctx)] : [];
      // Announce the end before it comes, then close: never straight from a question into "open your eyes".
      const prepare = lines(pickLines(L.CLOSE_PREPARE[ctx.sessionType], ctx), ctx, focus);
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
