import { DESCRIPTORS, GENERIC_PAIN } from './lexicon';
import { REGION_LEXICON } from './regions';
import type { BodyRegion, Direction, Edge, MovementType, Shape, Side, TemporalQuality } from './types';

/**
 * One spoken answer, read into structure.
 *
 * This is the silent half of the conversation: the guide talks about the
 * sensation in the person's words, and underneath, this turns those words
 * into something the body map can draw. It never asks for anything itself;
 * whatever it cannot read stays unknown, and unknown is a fine answer.
 *
 * Deliberately deterministic and local. When a remote model is connected it
 * may add observations on top, but this runs on every utterance regardless,
 * so the map and the safety screen never depend on the network.
 */

export type RegionMention = {
  region: BodyRegion;
  side?: Side;
  index: number;
  phrase: string;
};

export type IntensityShift = 'softer' | 'stronger' | 'same';
export type Command = 'pause' | 'resume' | 'stop' | 'repeat';
/** What a question the person asks the guide is about. 'cause' is anything medical: what it is, whether it is serious. */
export type QuestionTopic = 'how' | 'cause' | 'breath' | 'move' | 'time' | 'other';

export type Observation = {
  raw: string;
  text: string;
  regions: RegionMention[];
  descriptors: string[];
  negatedDescriptors: string[];
  genericPain: boolean;
  movement?: {
    type: MovementType;
    direction?: Direction;
    destination?: RegionMention;
    origin?: RegionMention;
  };
  shape?: Shape;
  edge?: Edge;
  temporal?: TemporalQuality;
  intensity?: IntensityShift;
  /** "Actually it's more in my shoulder" — the same sensation, placed better. */
  relocate: boolean;
  uncertain: boolean;
  nothing: boolean;
  answer?: 'yes' | 'no';
  familiarity?: 'familiar' | 'new';
  command?: Command;
  /** The person asked the guide something rather than answering it. */
  question?: QuestionTopic;
  acceptance: boolean;
  urgeToFix: boolean;
  fear: boolean;
  wordCount: number;
};

export function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const NEGATORS = /\b(not|no|isn't|isnt|doesn't|doesnt|don't|dont|never|without|wasn't|aren't|nothing)\b/;

function isNegated(text: string, index: number): boolean {
  // Look back over the three words before the match, within the clause.
  const before = text.slice(Math.max(0, index - 32), index);
  const clause = before.split(/[.,;!?]| but /).pop() ?? '';
  const words = clause.trim().split(' ').slice(-3).join(' ');
  return NEGATORS.test(words);
}

function findRegions(text: string): RegionMention[] {
  const found: RegionMention[] = [];
  const taken: Array<[number, number]> = [];
  for (const entry of REGION_LEXICON) {
    const re = new RegExp(entry.re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const start = m.index;
      const end = start + m[0].length;
      if (taken.some(([a, b]) => start < b && end > a)) continue;
      taken.push([start, end]);
      found.push({
        region: entry.region,
        index: start,
        phrase: m[0],
        side: entry.plural ? 'bilateral' : undefined,
      });
    }
  }
  found.sort((a, b) => a.index - b.index);
  for (const r of found) {
    if (r.side) continue;
    r.side = sideNear(text, r.index, r.phrase.length);
  }
  return found;
}

const SIDE_WORDS: Array<{ re: RegExp; side: Side }> = [
  { re: /\bboth sides\b|\bboth\b|\bon each side\b/g, side: 'bilateral' },
  { re: /\bleft\b/g, side: 'left' },
  { re: /\bright\b(?! now| away| there| here| at| in the middle)/g, side: 'right' },
  { re: /\b(middle|center|centre|central|midline)\b/g, side: 'center' },
];

function sideNear(text: string, index: number, length: number): Side | undefined {
  // The side must be in the same clause as the region: "my neck, and my left knee"
  // does not make the neck left.
  const clauseStart = Math.max(
    text.lastIndexOf(',', index),
    text.lastIndexOf('.', index),
    text.lastIndexOf(' and ', index),
    text.lastIndexOf(' but ', index),
  );
  const nextBoundaries = [',', '.', ' and ', ' but ']
    .map((b) => text.indexOf(b, index + length))
    .filter((i) => i >= 0);
  const clauseEnd = nextBoundaries.length ? Math.min(...nextBoundaries) : text.length;
  const clause = text.slice(clauseStart < 0 ? 0 : clauseStart, clauseEnd);
  const offset = clauseStart < 0 ? 0 : clauseStart;
  let best: { side: Side; dist: number } | undefined;
  for (const { re, side } of SIDE_WORDS) {
    const r = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = r.exec(clause))) {
      const dist = Math.abs(offset + m.index - index);
      if (!best || dist < best.dist) best = { side, dist };
    }
  }
  return best?.side;
}

const MOVE_VERB =
  /\b(mov(e|es|ing|ed)|travel(s|ing|ling|led)?|radiat(e|es|ing)|shoot(s|ing)? (up|down|into|through)|go(es|ing)? (up|down|into|toward|towards|to)|creep(s|ing)?|flow(s|ing)?|shift(s|ing|ed)? (up|down|to|toward|towards|into|over)|wander(s|ing)?|drift(s|ing)?|run(s|ning)? (up|down|along|into)|reach(es|ing)? (up|down|into)|extend(s|ing)? (up|down|into|to)|crawl(s|ing)?|climb(s|ing)?)\b/;
const SPREAD = /\b(spread(s|ing)?|expand(s|ing)?|widen(s|ing)?|gett?ing (bigger|wider)|radiat(e|es|ing)|fan(s|ning)? out|grow(s|ing)?)\b/;
const CONTRACT = /\b(shrink(s|ing)?|gett?ing smaller|smaller|narrow(s|ing)?|concentrat(es|ing)|gather(s|ing)?|condens(es|ing)|pulling in|drawing in|closing in)\b/;
const STATIC =
  /\b((stays?|staying|sits?|sitting) (completely |pretty |fairly |very |quite |just )?(still|put|in (one|the same) (place|spot))|(doesn'?t|does not|not|isn'?t|is not|it'?s not) (really )?(move|moving|shift|shifting|going anywhere)|same (place|spot)|fixed|stuck|locked|completely still|perfectly still|very still|stationary)\b/;
const UP = /\b(up|upward|upwards|higher|rising|climb\w*)\b/;
const DOWN = /\b(down|downward|downwards|lower|sinking)\b/;
const OUT = /\b(out|outward|outwards)\b/;
const IN = /\b(inward|inwards|in towards the middle)\b/;
const ACROSS = /\b(across|sideways)\b/;

function findMovement(text: string, regions: RegionMention[]): Observation['movement'] {
  const staticMatch = STATIC.exec(text);
  const moveMatch = MOVE_VERB.exec(text);
  const spreadMatch = SPREAD.exec(text);
  const contractMatch = CONTRACT.exec(text);

  let type: MovementType | undefined;
  let at = -1;
  const spreads = !!spreadMatch && !isNegated(text, spreadMatch.index);
  if (moveMatch && !isNegated(text, moveMatch.index)) {
    type = 'moving';
    at = moveMatch.index;
    // "It moves and spreads out" is spreading; "it radiates up to my head" stays moving.
    if (spreads && /spread|expand|widen|bigger|wider|fan/.test(spreadMatch![0])) type = 'spreading';
  } else if (spreads) {
    type = 'spreading';
    at = spreadMatch!.index;
  }
  if (!type && contractMatch && !isNegated(text, contractMatch.index)) {
    type = 'contracting';
    at = contractMatch.index;
  }
  if (!type && staticMatch) type = 'static';
  if (!type) return undefined;

  const after = at >= 0 ? text.slice(at) : '';
  let direction: Direction | undefined;
  if (type !== 'static') {
    if (UP.test(after)) direction = 'up';
    else if (DOWN.test(after)) direction = 'down';
    else if (IN.test(after)) direction = 'inward';
    else if (OUT.test(after)) direction = 'outward';
    else if (ACROSS.test(after)) direction = 'across';
  }

  let destination: RegionMention | undefined;
  let origin: RegionMention | undefined;
  if (type === 'moving' || type === 'spreading') {
    const fromTo = /\bfrom (my |the )?(.+?) (to|into|toward|towards|up to|down to) /.exec(text);
    if (fromTo) {
      origin = regions.find((r) => r.index >= fromTo.index && r.index < fromTo.index + fromTo[0].length);
    }
    destination = regions.find((r) => r.index > at && r !== origin);
  }
  return { type, direction, destination, origin };
}

function findShape(text: string): Shape | undefined {
  if (/\b(spot|pinpoint|point|small (area|spot|place)|one (spot|place|point)|specific|concentrated|a dot|tiny|focused|localized|localised)\b/.test(text))
    return 'focused';
  if (/\b(line|band|strip|streak|stripe|cord|rope|string|thread|along (my|the))\b/.test(text)) return 'line';
  if (/\b(spread out|diffuse|all over|general|broad|wide|whole (area|side)|vague|big area|large area|cloud)\b/.test(text))
    return 'diffuse';
  if (/\b(patch|area|region|zone|block|ball)\b/.test(text)) return 'area';
  return undefined;
}

function findEdge(text: string): Edge | undefined {
  if (/\b(no (clear |real |definite )?edges?|fuzzy|blurr?y|blurred|hazy|fades? (out|away) at the edges|soft edges?|hard to (find|tell) where it (ends|stops)|doesn'?t have (a |an )?(clear |real )?edge|less defined|undefined)\b/.test(text))
    return 'soft';
  if (/\b((clear|sharp|defined|distinct|hard|definite) (edges?|borders?|boundar(y|ies)|outline)|well[- ]defined|i can (tell|see|feel) where it (ends|stops)|it has (an |a )?edge|yes,? (it has )?(a |an )?(clear )?edge)\b/.test(text))
    return 'clear';
  return undefined;
}

function findTemporal(text: string): TemporalQuality | undefined {
  if (/\b(puls\w*|throb\w*|beat(s|ing)? like|rhythm\w*|pound\w*|heartbeat)\b/.test(text)) return 'pulsing';
  if (/\b(comes and goes|come and go|on and off|off and on|in waves|waves|now and then|flicker\w*|flash\w*|every few seconds)\b/.test(text))
    return 'intermittent';
  if (/\b(constant|steady|all the time|doesn'?t stop|continuous|always there|nonstop|non-stop)\b/.test(text)) return 'constant';
  if (/\b(keeps changing|changing|fluctuat\w*|varies|varying|shifting around)\b/.test(text)) return 'changing';
  return undefined;
}

function findIntensity(text: string): IntensityShift | undefined {
  if (/\b(softer|soften\w*|less (intense|sharp|tight|strong|painful|there)|lighter|easier|eas(ed|ing)|loosen\w*|releas\w*|relax\w*|melt\w*|fad(e|es|ing)|quieter|weaker|calmer|dissolv\w*|letting go|not as (bad|strong|intense|sharp|tight)|smaller)\b/.test(text))
    return 'softer';
  if (/\b(stronger|more intense|worse|sharper|tighter|louder|intensif\w*|increas\w*|ramp\w* up|more painful)\b/.test(text))
    return 'stronger';
  if (/\b(same|no change|hasn'?t changed|not changing|nothing('?s)? changed|unchanged|didn'?t change|still there|just as it was|about the same)\b/.test(text))
    return 'same';
  return undefined;
}

export function extract(raw: string): Observation {
  const text = normalize(raw);
  const wordCount = text ? text.split(' ').length : 0;
  const regions = findRegions(text);

  const descriptors: string[] = [];
  const negatedDescriptors: string[] = [];
  for (const d of DESCRIPTORS) {
    const m = d.re.exec(text);
    if (!m) continue;
    if (isNegated(text, m.index)) negatedDescriptors.push(d.word);
    else if (!descriptors.includes(d.word)) descriptors.push(d.word);
  }
  // "Less tight" is an intensity report about tightness, not a new descriptor.
  const genericPain = GENERIC_PAIN.test(text);

  const movement = findMovement(text, regions);
  const shape = findShape(text);
  const edge = findEdge(text);
  const temporal = findTemporal(text);
  const intensity = findIntensity(text);

  const relocate = /\b(actually|more (in|like in|toward|towards)|mostly (in|my)|mainly (in|my)|it'?s really (in|my))\b/.test(text);
  const uncertain = /\b(i don'?t know|not sure|hard to (say|tell|describe)|no idea|can'?t tell|i guess|kind of hard|difficult to say)\b/.test(text);
  const nothing =
    /^(nothing|not really|nope|not much)\b/.test(text) ||
    /\b(don'?t|do not|can'?t|cannot) (really )?(feel|notice|sense) (anything|much|a thing)\b/.test(text) ||
    /\bnothing (really|much|in particular|stands out|specific)\b/.test(text);

  let answer: 'yes' | 'no' | undefined;
  if (/^(yes|yeah|yep|yup|mm-?hm+|uh-?huh|i think so|it does|sort of|a bit|a little|kind of|definitely)\b/.test(text)) answer = 'yes';
  else if (/^(no|nope|not really|it doesn'?t|i don'?t think so|not at all)\b/.test(text)) answer = 'no';

  let familiarity: 'familiar' | 'new' | undefined;
  if (/\b(new|never (felt|had|experienced) (this|it|anything like)|first time (i'?ve|i have|i)? ?(felt|had)|different from (usual|normal|before)|not (my )?usual|haven'?t (felt|had) (this|it|that) before|just started)\b/.test(text))
    familiarity = 'new';
  if (/\b(familiar|usual|always (have|get|had|there)|for (years|months|a long time|ages)|same as (always|usual|before)|i know (this|it|that)|chronic|every day|old (pain|friend)|had it before|i'?ve had (it|this) (a lot|before|for))\b/.test(text))
    familiarity = 'familiar';

  let command: Command | undefined;
  if (wordCount <= 6) {
    if (/^(pause|can we pause|hold on|wait a (second|moment|minute)|one (second|moment|sec))\b/.test(text)) command = 'pause';
    else if (/^(continue|resume|i'?m (back|ready)|go on|keep going|okay continue|let'?s continue)\b/.test(text)) command = 'resume';
    else if (/^(what|sorry|pardon|repeat( that)?|say (that|it) again|come again|can you repeat( that)?|i didn'?t (hear|catch) (that|it))\??$/.test(text))
      command = 'repeat';
  }
  if (/\b(stop the session|end (the )?session|i want to stop|i'?m done|that'?s enough for (now|today)|let'?s stop|i need to stop|stop now|end now)\b/.test(text))
    command = 'stop';

  const question = command ? undefined : findQuestion(raw, text);

  const acceptance =
    /\b(let(ting)? it (be|happen|move|stay|do)|it'?s (okay|ok|fine|alright)|just (watching|noticing|observing|feeling) (it)?|allow(ing)? it|accept\w*|curious|interesting|i can (stay|be) with it|i can (watch|observe|notice|feel) it|not fighting|without (trying|needing) to|it can (stay|be there)|being with it)\b/.test(text) &&
    !/\bnot (okay|ok|fine)\b/.test(text);
  const urgeToFix = /\b(want(ing)? (it|this) (to )?(stop|go away|gone|to leave)|make it (stop|go away)|trying to (relax|fix|stop|get rid)|can'?t stand|need it to|wish it would|get rid of|just want it gone)\b/.test(text);
  const fear = /\b(scar\w*|afraid|fear\w*|worr\w*|anxious|anxiety|panic\w*|nervous|frighten\w*|dread|alarm\w*|terrif\w*)\b/.test(text);

  return {
    raw,
    text,
    regions,
    descriptors,
    negatedDescriptors,
    genericPain,
    movement,
    shape,
    edge,
    temporal,
    intensity,
    relocate,
    uncertain,
    nothing: nothing && regions.length === 0 && descriptors.length === 0,
    answer,
    familiarity,
    command,
    question,
    acceptance,
    urgeToFix,
    fear,
    wordCount,
  };
}

/**
 * A question to the guide, and roughly what about. Recognisers rarely write a "?", so it is
 * read from how the sentence opens. "What I feel is a pull" is an answer, not a question:
 * "what" only counts when a verb follows it.
 */
function findQuestion(raw: string, text: string): QuestionTopic | undefined {
  const asking =
    /\?\s*$/.test(raw.trim()) ||
    /^(why|how)\b/.test(text) ||
    /^(what|where|when) (should|do|does|did|is|are|am|can|was|will|would)\b/.test(text) ||
    /^(should|can|could|do|does|is|am|will|would|shall|may|are) (i|it|this|that|you|we|there)\b/.test(text) ||
    /\b(i don'?t know what (to do|i'?m (supposed|meant) to)|what am i (supposed|meant) to|i don'?t understand)\b/.test(text);
  if (!asking) return undefined;
  if (/\b(how long|how much (longer|more|time)|time (is )?left|how many minutes|almost (done|over))\b/.test(text)) return 'time';
  if (/\bbreath/.test(text)) return 'breath';
  if (/\b(why|caus\w*|serious|dangerous|wrong with|worr\w*|normal|bad|damage\w*|injur\w*|doctor|what is (it|this|that)|what'?s (this|that|it))\b/.test(text)) return 'cause';
  if (/\b(open my eyes|my eyes|move|stretch|sit up|lie down|position|change position)\b/.test(text)) return 'move';
  if (/\b(how do i|what (should|do) i|doing (this|it) right|supposed to|meant to|understand|what do you mean|right way|wrong)\b/.test(text)) return 'how';
  return 'other';
}

/** Did this answer carry anything the body map can use? */
export function hasBodyContent(o: Observation): boolean {
  return (
    o.regions.length > 0 ||
    o.descriptors.length > 0 ||
    !!o.movement ||
    !!o.shape ||
    !!o.edge ||
    !!o.temporal ||
    !!o.intensity
  );
}
