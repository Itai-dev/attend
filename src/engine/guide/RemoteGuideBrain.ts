import { describeAsFirstNoticed } from '../../domain/recap';
import { speakPlace } from '../../domain/regions';
import { violatesGuideLanguage } from '../../domain/safety';
import { isClosing, PHASE_GOALS } from '../phases';
import type { GuideBrain, GuideContext, GuideLine, GuideTurn, RemoteObservations } from '../types';
import { localTurn } from './LocalGuideBrain';

/**
 * The adaptive guide backed by Claude, through a small proxy that holds the
 * API key (see supabase/functions/attend). The app never holds a model key.
 *
 * The division of labour is strict:
 *  - the local engine decides the STRUCTURE of every turn: the phase, whether
 *    a question is asked and what kind, whether the session ends;
 *  - the model only rewrites the WORDS of that turn so they follow what the
 *    person actually said, and may add structured observations.
 *
 * Arrival, closing and every safety line are never sent to the model. They
 * are fixed text, so they can be reviewed once and trusted always.
 *
 * Any failure — timeout, bad JSON, a forbidden phrase, a line that is too
 * long — falls back to the local turn for that moment only. The person hears
 * a slightly less tailored sentence, not an error.
 */

export type RemoteConfig = {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  model?: string;
};

const MAX_LINE_CHARS = 220;
const MAX_PAUSE_MS = 20_000;
const LOCAL_ONLY_PHASES = new Set(['ARRIVE', 'SAFETY_CHECK', 'OPEN_AWARENESS']);

export class RemoteGuideBrain implements GuideBrain {
  readonly id = 'claude';
  lastError?: string;

  constructor(private readonly config: RemoteConfig) {}

  async next(ctx: GuideContext, signal?: AbortSignal): Promise<GuideTurn> {
    const proposal = localTurn(ctx);
    if (
      proposal.lines.length === 0 ||
      proposal.end ||
      isClosing(ctx.phase) ||
      LOCAL_ONLY_PHASES.has(ctx.phase) ||
      ctx.repeatRequested
    ) {
      return proposal;
    }
    try {
      const remote = await this.request(ctx, proposal, signal);
      const lines = sanitize(remote.lines, proposal);
      if (!lines) return { ...proposal, source: 'fallback' };
      return {
        ...proposal,
        lines,
        observations: sanitizeObservations(remote.observations),
        source: 'remote',
      };
    } catch (e) {
      this.lastError = String(e);
      return { ...proposal, source: 'fallback' };
    }
  }

  private async request(ctx: GuideContext, proposal: GuideTurn, outer?: AbortSignal) {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    outer?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => ctrl.abort(), this.config.timeoutMs ?? 6500);
    try {
      const res = await fetch(`${this.config.url.replace(/\/$/, '')}/guide`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(this.config.headers ?? {}) },
        body: JSON.stringify(buildPayload(ctx, proposal, this.config.model)),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`guide ${res.status}`);
      return (await res.json()) as { lines?: unknown; observations?: unknown };
    } finally {
      clearTimeout(timer);
      outer?.removeEventListener('abort', onAbort);
    }
  }
}

/** The context the model sees. It is the conversation and the map, never anything stored from earlier sessions. */
export function buildPayload(ctx: GuideContext, proposal: GuideTurn, model?: string) {
  const focus = ctx.focus;
  return {
    model,
    sessionType: ctx.sessionType,
    phase: ctx.phase,
    phaseGoal: PHASE_GOALS[ctx.phase],
    elapsedSec: Math.round(ctx.elapsedMs / 1000),
    targetSec: Math.round(ctx.plan.targetMs / 1000),
    ask: proposal.ask ?? null,
    expectsResponse: proposal.expectsResponse,
    focus: focus
      ? {
          place: speakPlace(focus.region, focus.side),
          descriptors: focus.descriptors,
          movement: focus.movement?.type ?? 'unknown',
          shape: focus.shape ?? 'unknown',
          edge: focus.edge ?? 'unknown',
          temporal: focus.temporalQuality ?? 'unknown',
          firstDescribed: describeAsFirstNoticed(ctx.baseline.sensations.find((s) => s.id === focus.id) ?? focus),
          theirWords: focus.userLanguage.slice(-4),
        }
      : null,
    otherPlaces: ctx.map.sensations.filter((s) => s.id !== focus?.id).map((s) => speakPlace(s.region, s.side)),
    signals: {
      acceptance: ctx.signals.acceptance,
      urgeToFix: ctx.signals.urgeToFix,
      fear: ctx.signals.fear,
      familiarConfirmed: ctx.signals.familiarConfirmed,
    },
    lastAnswer: ctx.lastResult === 'speech' ? ctx.lastObservation?.raw ?? null : ctx.lastResult === 'silence' ? '(silence)' : null,
    lastChanges: ctx.lastChanges.map((c) => c.description),
    history: ctx.history.slice(-14).map((h) =>
      h.role === 'silence' ? { role: 'silence', seconds: Math.round(h.ms / 1000) } : { role: h.role, text: h.text },
    ),
    proposal: proposal.lines.map((l) => ({ text: l.text, pauseAfterMs: l.pauseAfterMs })),
  };
}

function sanitize(raw: unknown, proposal: GuideTurn): GuideLine[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 6) return undefined;
  const lines: GuideLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return undefined;
    const text = String((item as { text?: unknown }).text ?? '').trim();
    const pause = Number((item as { pauseAfterMs?: unknown }).pauseAfterMs ?? 0);
    if (!text || text.length > MAX_LINE_CHARS) return undefined;
    if (violatesGuideLanguage(text)) return undefined;
    lines.push({ text, pauseAfterMs: Number.isFinite(pause) ? Math.max(0, Math.min(MAX_PAUSE_MS, Math.round(pause))) : 0 });
  }
  // A question turn must end on something the person can answer, with no silence after it.
  if (proposal.expectsResponse) {
    const last = lines[lines.length - 1];
    if (!/\?\s*$/.test(last.text) && !/^(notice|say|tell)/i.test(last.text)) return undefined;
    last.pauseAfterMs = 0;
  }
  return lines;
}

const OBS_KEYS: Array<keyof RemoteObservations> = [
  'descriptors',
  'region',
  'side',
  'movement',
  'destinationRegion',
  'shape',
  'edge',
  'temporal',
  'intensity',
  'safety',
];

function sanitizeObservations(raw: unknown): RemoteObservations | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  for (const k of OBS_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (v === undefined || v === null) continue;
    if (k === 'descriptors') {
      if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === 'string').slice(0, 4);
    } else if (typeof v === 'string') out[k] = v.slice(0, 40);
  }
  return out as RemoteObservations;
}
