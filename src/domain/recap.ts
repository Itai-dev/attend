import { consolidateChanges, primarySensation } from './bodyMap';
import { descriptorInfo } from './lexicon';
import { REGIONS, speakPlace } from './regions';
import type {
  BodyMapState,
  BodySensation,
  SensationChange,
  SessionOutcome,
  SessionSignals,
  SessionType,
} from './types';

/**
 * The words the person sees when they open their eyes.
 *
 * Rules, because this is where a product like this lies most easily:
 *  - Every sentence is built from something they said. No inferred mood,
 *    no inferred relief.
 *  - No improvement is manufactured. "It softened" appears only if they said
 *    it softened. A session where nothing changed is described as exactly
 *    that, and is not framed as a failure.
 *  - No numbers about the sensation.
 */

export type RecapInput = {
  sessionType: SessionType;
  outcome: SessionOutcome;
  bodyMapStart: BodyMapState;
  bodyMapEnd: BodyMapState;
  changes: SensationChange[];
  signals: SessionSignals;
};

export type Recap = {
  title: string;
  summary: string;
  oneLiner: string;
  changeLines: string[];
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function placeWithPreposition(s: BodySensation): string {
  const place = speakPlace(s.region, s.side);
  if (s.region === 'whole_body') return `through ${place}`;
  return /^the .*side/.test(place) ? `on ${place}` : `in ${place}`;
}

function article(word: string): string {
  return /^[aeiou]/.test(word) ? 'an' : 'a';
}

function noun(s: BodySensation | undefined): string {
  const w = s?.descriptors[0];
  return w ? descriptorInfo(w)?.noun ?? w : 'sensation';
}

/** "a fixed, tight spot on the left side of your neck" */
export function describeAsFirstNoticed(s: BodySensation): string {
  const adjs: string[] = [];
  if (s.movement?.type === 'static') adjs.push('fixed');
  // Descriptors are kept most-recent-first; the first two the person used come last.
  for (const d of [...s.descriptors].reverse().slice(0, 2)) adjs.push(d);
  if (s.edge === 'clear') adjs.push('sharply defined');
  const shapeNoun =
    s.shape === 'focused' ? 'spot' : s.shape === 'line' ? 'line' : s.shape === 'diffuse' || s.shape === 'area' ? 'area' : 'sensation';
  if (s.movement?.type === 'moving') adjs.push('moving');
  const head = adjs.length ? `${article(adjs[0])} ${adjs.join(', ')} ${shapeNoun}` : `${article(shapeNoun)} ${shapeNoun}`;
  return `${head} ${placeWithPreposition(s)}`;
}

function changeClause(c: SensationChange): string {
  switch (c.type) {
    case 'moved': {
      const dest = c.toState.movement?.destinationRegion;
      const dir = c.toState.movement?.direction;
      const dirWord = dir === 'up' ? 'upward ' : dir === 'down' ? 'downward ' : dir === 'outward' ? 'outward ' : '';
      return dest
        ? `moving ${dirWord}toward ${speakPlace(dest, c.toState.movement?.destinationSide)}`
        : `beginning to move${dirWord ? ' ' + dirWord.trim() : ''}`;
    }
    case 'spread':
      return 'spreading out';
    case 'contracted':
      return 'gathering into a smaller area';
    case 'quality_shift': {
      const now = c.toState.descriptors?.[0];
      const was = c.fromState.descriptors?.[0];
      if (now && was) return `becoming more like ${descriptorInfo(now)?.noun ?? now} than ${descriptorInfo(was)?.noun ?? was}`;
      return 'changing in quality';
    }
    case 'softened':
      return 'softening';
    case 'intensified':
      return 'growing stronger for a while';
    case 'boundary_softened':
      return 'becoming less defined';
    case 'boundary_sharpened':
      return 'becoming more defined';
    case 'shape_shift':
      return c.toState.shape === 'diffuse' ? 'becoming more spread out' : c.toState.shape === 'focused' ? 'becoming more focused' : 'changing shape';
    case 'temporal_shift':
      return c.toState.temporalQuality === 'pulsing'
        ? 'beginning to pulse'
        : c.toState.temporalQuality === 'intermittent'
          ? 'beginning to come and go'
          : 'changing from moment to moment';
    case 'stable':
      return 'staying the same';
  }
}

function joinClauses(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Order of how much a change says about the practice, for the one-liner. */
const SALIENCE: SensationChange['type'][] = [
  'moved',
  'boundary_softened',
  'quality_shift',
  'spread',
  'softened',
  'contracted',
  'shape_shift',
  'temporal_shift',
  'intensified',
  'boundary_sharpened',
];

function oneLinerFor(c: SensationChange, s: BodySensation): string {
  const n = noun(s);
  const The = n === 'sensation' ? 'The sensation' : `The ${n}`;
  switch (c.type) {
    case 'moved': {
      const dest = c.toState.movement?.destinationRegion;
      return dest
        ? `${The} moved from ${speakPlace(s.region, s.side)} toward ${speakPlace(dest, c.toState.movement?.destinationSide)}.`
        : `${The} began to move as you watched it.`;
    }
    case 'boundary_softened':
      return `${The} became less defined.`;
    case 'quality_shift': {
      const now = c.toState.descriptors?.[0];
      const was = c.fromState.descriptors?.[0];
      return now && was
        ? `The sensation shifted from ${descriptorInfo(was)?.noun ?? was} toward ${descriptorInfo(now)?.noun ?? now}.`
        : `The sensation changed in quality as you watched it.`;
    }
    case 'spread':
      return `${The} spread out as you watched it.`;
    case 'softened':
      return `${The} softened as you stayed with it.`;
    case 'contracted':
      return `${The} gathered into a smaller area.`;
    case 'shape_shift':
      return `${The} changed shape as you watched it.`;
    case 'temporal_shift':
      return `${The} began to ${c.toState.temporalQuality === 'pulsing' ? 'pulse' : 'come and go'}.`;
    case 'intensified':
      return `${The} grew stronger for a while, and you stayed with it.`;
    case 'boundary_sharpened':
      return `${The} became more defined.`;
    case 'stable':
      return 'Today the sensation stayed mostly stable.';
  }
}

export function buildRecap(input: RecapInput): Recap {
  const { outcome, signals } = input;
  const changes = consolidateChanges(input.changes);
  const changeLines = changes.filter((c) => c.type !== 'stable').map((c) => c.description);

  if (outcome === 'crisis_pause') {
    return {
      title: 'We paused the practice.',
      summary:
        'Something you said matters more than this practice. If you are struggling, you do not have to carry it alone. Reach out to someone you trust, or contact a crisis line or your local emergency number.',
      oneLiner: 'The practice paused.',
      changeLines: [],
    };
  }
  if (outcome === 'safety_pause') {
    return {
      title: 'The practice paused today.',
      summary:
        'You described something that might be new or changing, so the guide stopped instead of continuing. This practice is meant for sensations you already know well. Something new deserves a proper look from a doctor or another medical professional.',
      oneLiner: 'Paused to leave room for a medical check.',
      changeLines: [],
    };
  }

  const start = primarySensation(input.bodyMapStart);
  const end = start ? input.bodyMapEnd.sensations.find((s) => s.id === start.id) : primarySensation(input.bodyMapEnd);
  const primary = start ?? end;

  if (!primary) {
    return {
      title: 'You rested with the body as a whole.',
      summary:
        outcome === 'ended_early'
          ? 'The session ended before anything in particular stood out.'
          : 'Nothing in particular stood out today, so you stayed with the body as a whole: where it was supported, and how the breath was moving.',
      oneLiner: 'Nothing in particular stood out; you rested with the whole body.',
      changeLines: [],
    };
  }

  const forPrimary = changes.filter((c) => c.sensationId === primary.id && c.type !== 'stable');
  const firstSeen = describeAsFirstNoticed(start ?? primary);
  const others = input.bodyMapEnd.sensations.filter((s) => s.id !== primary.id && s.region !== 'whole_body');

  let title: string;
  let summary: string;
  let oneLiner: string;

  if (forPrimary.length > 0) {
    const place = REGIONS[primary.region].paired ? speakPlace(primary.region, primary.side) : speakPlace(primary.region);
    title = `${cap(place)} felt different when you stayed with it.`;
    summary = `You first described the sensation as ${firstSeen}. Later, you noticed it ${joinClauses(forPrimary.slice(0, 3).map(changeClause))}.`;
    const lead = SALIENCE.map((t) => forPrimary.find((c) => c.type === t)).find(Boolean)!;
    oneLiner = oneLinerFor(lead, start ?? primary);
  } else {
    title = 'The sensation stayed mostly the same today.';
    const watched =
      signals.observedSeconds >= 120
        ? 'You were able to observe it for several minutes without needing to change it.'
        : 'You stayed with it without needing to change it.';
    summary = `You described ${firstSeen}. ${watched}`;
    oneLiner =
      signals.acceptance || signals.familiarConfirmed
        ? 'You stayed with a familiar sensation without trying to change it.'
        : 'Today the sensation stayed mostly stable.';
  }

  if (signals.urgeToFix && signals.acceptance) {
    summary += ' You noticed the urge to make it stop, and stayed with it anyway.';
  } else if (signals.acceptance && forPrimary.length > 0) {
    summary += ' At times you were able to simply watch it.';
  }
  if (others.length > 0) {
    const o = others[0];
    const n = o.descriptors[0] ? descriptorInfo(o.descriptors[0])?.noun ?? o.descriptors[0] : undefined;
    summary += ` You also noticed ${n ? `${n} ${placeWithPreposition(o)}` : speakPlace(o.region, o.side)}.`;
  }
  if (outcome === 'ended_early') summary += ' The session ended early.';

  return { title, summary, oneLiner, changeLines };
}
