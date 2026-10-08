import { descriptorInfo } from './lexicon';
import { REGIONS, speakPlace } from './regions';
import type { Observation, RegionMention } from './extract';
import type {
  BodyMapState,
  BodySensation,
  Direction,
  MovementType,
  SensationChange,
  SensationChangeType,
  Side,
} from './types';

/**
 * How a session's words become a map, and how the map knows what changed.
 *
 * Two maps are kept side by side:
 *
 *  - the BASELINE is how the person first described each sensation. While
 *    they are still describing it ("describe" mode — the noticing, locating
 *    and exploring part of the session), new detail fills the baseline in.
 *    Saying it is "a small spot" after saying it is "tight" is elaboration,
 *    not change.
 *  - the CURRENT map is where it is now. Once the session turns to watching
 *    ("observe" mode), anything that differs from what was said is a change,
 *    and is recorded as one, with the person's report as its only evidence.
 *
 * Nothing here infers change the person did not report. A recap that says
 * "it softened" can always point at the sentence where they said so.
 */

export type ApplyMode = 'describe' | 'observe';

export type MapState = {
  current: BodyMapState;
  baseline: BodyMapState;
  focusId?: string;
};

export type ApplyResult = MapState & {
  changes: SensationChange[];
  created: string[];
};

const SIDE_ONLY: Array<{ re: RegExp; side: Side }> = [
  { re: /\b(both sides|both|each side)\b/, side: 'bilateral' },
  { re: /\bleft\b/, side: 'left' },
  { re: /\bright\b(?! now| away)/, side: 'right' },
  { re: /\b(middle|center|centre|central|in between)\b/, side: 'center' },
];

function sideOnly(text: string): Side | undefined {
  for (const { re, side } of SIDE_ONLY) if (re.test(text)) return side;
  return undefined;
}

export function cloneMap(map: BodyMapState): BodyMapState {
  return {
    sensations: map.sensations.map((s) => ({
      ...s,
      descriptors: [...s.descriptors],
      userLanguage: [...s.userLanguage],
      movement: s.movement ? { ...s.movement } : undefined,
    })),
  };
}

function find(map: BodyMapState, id?: string): BodySensation | undefined {
  return id ? map.sensations.find((s) => s.id === id) : undefined;
}

function newSensation(id: string, mention: RegionMention, primary: boolean): BodySensation {
  return {
    id,
    region: mention.region,
    side: mention.side,
    descriptors: [],
    userLanguage: [],
    primary,
  };
}

function directionWord(d?: Direction): string {
  switch (d) {
    case 'up':
      return 'upward ';
    case 'down':
      return 'downward ';
    case 'inward':
      return 'inward ';
    case 'outward':
      return 'outward ';
    case 'across':
      return 'across ';
    default:
      return '';
  }
}

export function describeChange(type: SensationChangeType, from: Partial<BodySensation>, to: Partial<BodySensation>): string {
  switch (type) {
    case 'moved': {
      const dest = to.movement?.destinationRegion;
      const dir = directionWord(to.movement?.direction);
      return dest
        ? `Moved ${dir}toward ${speakPlace(dest, to.movement?.destinationSide).replace(/\byour\b/, 'the')}`
        : `Began to move ${dir}`.trim();
    }
    case 'spread':
      return 'Spread out';
    case 'contracted':
      return 'Gathered into a smaller area';
    case 'quality_shift': {
      const now = to.descriptors?.[0];
      const was = from.descriptors?.[0];
      if (now && was) return `Felt more like ${descriptorInfo(now)?.noun ?? now} than ${descriptorInfo(was)?.noun ?? was}`;
      return now ? `Began to feel like ${descriptorInfo(now)?.noun ?? now}` : 'Changed in quality';
    }
    case 'softened':
      return 'Felt softer';
    case 'intensified':
      return 'Felt stronger for a while';
    case 'boundary_softened':
      return 'Became less defined';
    case 'boundary_sharpened':
      return 'Became more defined';
    case 'shape_shift':
      if (to.shape === 'diffuse') return 'Became more spread out';
      if (to.shape === 'focused') return 'Became more focused';
      if (to.shape === 'line') return 'Felt more like a line';
      return 'Changed shape';
    case 'temporal_shift':
      if (to.temporalQuality === 'pulsing') return 'Began to pulse';
      if (to.temporalQuality === 'intermittent') return 'Began to come and go';
      if (to.temporalQuality === 'changing') return 'Kept changing from moment to moment';
      if (to.temporalQuality === 'constant') return 'Settled into something steady';
      return 'Changed over time';
    case 'stable':
      return 'Stayed mostly the same';
  }
}

/** Build a SensationChange with the field names the schema uses. */
function mk(
  s: BodySensation,
  type: SensationChangeType,
  fromState: Partial<BodySensation>,
  toState: Partial<BodySensation>,
  at?: number,
): SensationChange {
  return { sensationId: s.id, type, description: describeChange(type, fromState, toState), fromState, toState, at };
}

const MOVE_TO_CHANGE: Record<Exclude<MovementType, 'static' | 'unknown'>, SensationChangeType> = {
  moving: 'moved',
  spreading: 'spread',
  contracting: 'contracted',
};

/**
 * Apply one spoken answer to the maps. Pure: returns new maps and the
 * changes it found.
 */
export function applyObservation(
  state: MapState,
  obs: Observation,
  mode: ApplyMode,
  opts: { newId: () => string; at?: number; narrowing?: boolean },
): ApplyResult {
  const current = cloneMap(state.current);
  const baseline = cloneMap(state.baseline);
  const changes: SensationChange[] = [];
  const created: string[] = [];
  let focusId = state.focusId;

  const destination = obs.movement?.destination;
  const placeMentions = obs.regions.filter((r) => r !== destination && r !== obs.movement?.origin);

  // 1. Decide which sensation this answer is about.
  let focus = find(current, focusId);
  if (obs.movement?.origin) {
    const fromOrigin = current.sensations.find((s) => s.region === obs.movement!.origin!.region);
    if (fromOrigin) focus = fromOrigin;
  }

  if (!focus && (placeMentions.length > 0 || destination)) {
    const mentions = placeMentions.length > 0 ? placeMentions : [destination!];
    mentions.forEach((m, i) => {
      if (current.sensations.some((s) => s.region === m.region && s.side === m.side)) return;
      const s = newSensation(opts.newId(), m, current.sensations.length === 0 && i === 0);
      // "My shoulder and neck feel tight": every place named shares the words, the first is the focus.
      if (i > 0) s.descriptors = [...obs.descriptors];
      current.sensations.push(s);
      baseline.sensations.push({ ...s, descriptors: [...s.descriptors], userLanguage: [] });
      created.push(s.id);
    });
    focus = current.sensations.find((s) => s.primary) ?? current.sensations[0];
  } else if (focus && placeMentions.length > 0) {
    const first = placeMentions[0];
    const sameRegion = first.region === focus.region;
    const narrows =
      !sameRegion &&
      (opts.narrowing ||
        (obs.relocate && !obs.movement) ||
        (REGIONS[focus.region].broad && isWithin(first.region, focus.region)));
    if (sameRegion) {
      if (first.side && first.side !== focus.side) setBoth(current, baseline, focus.id, { side: first.side }, mode);
    } else if (narrows && mode === 'describe') {
      setBoth(current, baseline, focus.id, { region: first.region, side: first.side ?? focus.side }, mode);
    } else {
      // A second place. Note it; the focus stays where the person started.
      for (const m of placeMentions) {
        if (current.sensations.some((s) => s.region === m.region && (s.side === m.side || !m.side))) continue;
        const s = newSensation(opts.newId(), m, false);
        s.descriptors = [...obs.descriptors];
        s.userLanguage = [obs.raw.trim()];
        current.sensations.push(s);
        baseline.sensations.push({ ...s, descriptors: [...s.descriptors], userLanguage: [] });
        created.push(s.id);
      }
    }
  } else if (focus && obs.regions.length === 0) {
    // "On the left." — an answer to "which side?" with no region named.
    const side = sideOnly(obs.text);
    if (side && obs.wordCount <= 8 && side !== focus.side) setBoth(current, baseline, focus.id, { side }, mode);
  }

  focus = focus ? find(current, focus.id) : undefined;
  if (!focus) return { current, baseline, focusId, changes, created };
  focusId = focusId ?? focus.id;
  const base = find(baseline, focus.id)!;

  // 2. The person's words, kept verbatim.
  const said = obs.raw.trim();
  if (said && !focus.userLanguage.includes(said)) focus.userLanguage.push(said.slice(0, 160));

  // 3. Qualities.
  for (const word of obs.descriptors) {
    if (focus.descriptors.includes(word)) {
      focus.descriptors = [word, ...focus.descriptors.filter((w) => w !== word)];
      continue;
    }
    if (mode === 'observe' && focus.descriptors.length > 0) {
      const from = { descriptors: [...focus.descriptors] };
      focus.descriptors = [word, ...focus.descriptors];
      changes.push(mk(focus, 'quality_shift', from, { descriptors: [...focus.descriptors] }, opts.at));
    } else {
      focus.descriptors = [word, ...focus.descriptors];
      if (!base.descriptors.includes(word)) base.descriptors = [word, ...base.descriptors];
    }
  }
  if (mode === 'observe') {
    for (const word of obs.negatedDescriptors) {
      if (focus.descriptors.includes(word) && focus.descriptors.length > 1) {
        const from = { descriptors: [...focus.descriptors] };
        focus.descriptors = focus.descriptors.filter((w) => w !== word);
        changes.push(mk(focus, 'quality_shift', from, { descriptors: [...focus.descriptors] }, opts.at));
      }
    }
  }

  // 4. Movement.
  const mv = obs.movement;
  if (mv && mv.type !== 'unknown') {
    const next = {
      type: mv.type,
      direction: mv.direction,
      destinationRegion: mv.destination?.region,
      // A destination's side is only what was said: "toward the back of my head" is not "the left side of it".
      destinationSide: mv.destination?.side,
    };
    if (mv.type === 'static') {
      if (!focus.movement || focus.movement.type === 'unknown') focus.movement = { type: 'static' };
      if (!base.movement || base.movement.type === 'unknown') base.movement = { type: 'static' };
    } else if (mode === 'observe' || (base.movement && base.movement.type === 'static')) {
      const from = { movement: focus.movement ? { ...focus.movement } : { type: 'static' as const } };
      focus.movement = next;
      if (!base.movement) base.movement = { type: 'static' };
      changes.push(mk(focus, MOVE_TO_CHANGE[mv.type as keyof typeof MOVE_TO_CHANGE], from, { movement: { ...next } }, opts.at));
    } else {
      focus.movement = next;
      base.movement = { ...next };
    }
  }

  // 5. Shape, edge, rhythm.
  if (obs.shape) {
    if (mode === 'observe' && focus.shape && focus.shape !== 'unknown' && focus.shape !== obs.shape) {
      const from = { shape: focus.shape };
      focus.shape = obs.shape;
      changes.push(mk(focus, 'shape_shift', from, { shape: obs.shape }, opts.at));
    } else {
      focus.shape = obs.shape;
      if (mode === 'describe' || !base.shape) base.shape = obs.shape;
    }
  }
  if (obs.edge) {
    if (mode === 'observe' && focus.edge && focus.edge !== 'unknown' && focus.edge !== obs.edge) {
      const from = { edge: focus.edge };
      focus.edge = obs.edge;
      changes.push(mk(focus, obs.edge === 'soft' ? 'boundary_softened' : 'boundary_sharpened', from, { edge: obs.edge }, opts.at));
    } else if (mode === 'observe' && obs.edge === 'soft' && /less defined|blurr|fuzz|softer/.test(obs.text) && base.edge !== 'soft') {
      // "It's getting blurry" with no prior edge answer still reports a change.
      const from = { edge: focus.edge ?? ('unknown' as const) };
      focus.edge = 'soft';
      changes.push(mk(focus, 'boundary_softened', from, { edge: 'soft' }, opts.at));
    } else {
      focus.edge = obs.edge;
      if (mode === 'describe' || !base.edge) base.edge = obs.edge;
    }
  }
  if (obs.temporal) {
    if (mode === 'observe' && focus.temporalQuality && focus.temporalQuality !== 'unknown' && focus.temporalQuality !== obs.temporal) {
      const from = { temporalQuality: focus.temporalQuality };
      focus.temporalQuality = obs.temporal;
      changes.push(mk(focus, 'temporal_shift', from, { temporalQuality: obs.temporal }, opts.at));
    } else {
      focus.temporalQuality = obs.temporal;
      if (mode === 'describe' || !base.temporalQuality) base.temporalQuality = obs.temporal;
    }
  }

  // 6. Intensity — only ever as reported.
  if (obs.intensity && mode === 'observe') {
    const type: SensationChangeType =
      obs.intensity === 'softer' ? 'softened' : obs.intensity === 'stronger' ? 'intensified' : 'stable';
    changes.push(mk(focus, type, {}, {}, opts.at));
  }

  return { current, baseline, focusId, changes, created };
}

function setBoth(
  current: BodyMapState,
  baseline: BodyMapState,
  id: string,
  patch: Partial<BodySensation>,
  mode: ApplyMode,
) {
  const c = find(current, id);
  if (c) Object.assign(c, patch);
  if (mode === 'describe') {
    const b = find(baseline, id);
    if (b) Object.assign(b, patch);
  }
}

/** Is `inner` a narrower way of naming somewhere inside `outer`? */
export function isWithin(inner: string, outer: string): boolean {
  const groups: Record<string, string[]> = {
    head: ['head_back', 'forehead', 'temple', 'eye', 'jaw', 'face'],
    mid_back: ['upper_back', 'lower_back', 'sacrum', 'spine'],
    spine: ['upper_back', 'mid_back', 'lower_back', 'sacrum', 'neck'],
    arm: ['upper_arm', 'elbow', 'forearm', 'wrist', 'hand', 'shoulder'],
    leg: ['thigh', 'knee', 'calf', 'shin', 'ankle', 'foot', 'hip'],
  };
  return groups[outer]?.includes(inner) ?? false;
}

/**
 * Collapse a session's changes into the ones worth saying. A "stable" report
 * is dropped when the same sensation also reported a real change; repeated
 * reports of the same kind keep the latest.
 */
export function consolidateChanges(changes: SensationChange[]): SensationChange[] {
  const latest = new Map<string, SensationChange>();
  for (const c of changes) latest.set(`${c.sensationId}:${c.type}`, c);
  const out = [...latest.values()];
  const changedIds = new Set(out.filter((c) => c.type !== 'stable').map((c) => c.sensationId));
  return out
    .filter((c) => c.type !== 'stable' || !changedIds.has(c.sensationId))
    .sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
}

export function primarySensation(map: BodyMapState): BodySensation | undefined {
  return map.sensations.find((s) => s.primary) ?? map.sensations[0];
}

