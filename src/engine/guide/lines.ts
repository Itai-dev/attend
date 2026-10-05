import { GUIDE_SCRIPT, type GuideScript } from '../../../server/lib/guideScript';
import { violatesGuideLanguage } from '../../domain/safety';

/**
 * The guide's voice, written down.
 *
 * The words live in server/lib/guideScript.ts so they can be edited without
 * an app release: the voice server serves that file, the app applies it at the
 * start of a session (applyScript), and the copy bundled here is the offline
 * fallback. The engine still decides structure; the script only supplies words.
 *
 * Calm, sparse, confident, human. Short sentences. No thanking, no "I hear
 * you", no praise, no apology for the person's pain, no therapy phrases.
 * Silence is part of every line: the number after each one is how long the
 * guide stays quiet before going on.
 *
 * Safety and crisis lines are below, not in the script: they are fixed text
 * that nothing remote can change.
 */

export type Line = [text: string, pauseMs: number];
export type { GuideScript };

// Live bindings: applyScript reassigns these, and `import * as L` sees the change.
export let ARRIVE = GUIDE_SCRIPT.ARRIVE;
export let NOTICE_ASK = GUIDE_SCRIPT.NOTICE_ASK;
export let NOTICE_RETRY = GUIDE_SCRIPT.NOTICE_RETRY;
export let NOTICE_SILENCE = GUIDE_SCRIPT.NOTICE_SILENCE;
export let OPEN_AWARENESS = GUIDE_SCRIPT.OPEN_AWARENESS;
export let LOCATE_ACK = GUIDE_SCRIPT.LOCATE_ACK;
export let LOCATE_WHERE = GUIDE_SCRIPT.LOCATE_WHERE;
export let LOCATE_NARROW = GUIDE_SCRIPT.LOCATE_NARROW;
export let LOCATE_SIDE_SIDED = GUIDE_SCRIPT.LOCATE_SIDE_SIDED;
export let LOCATE_SIDE_PAIRED = GUIDE_SCRIPT.LOCATE_SIDE_PAIRED;
export let ACK_WORD = GUIDE_SCRIPT.ACK_WORD;
export let ACK_PLAIN = GUIDE_SCRIPT.ACK_PLAIN;
export let ACK_UNCERTAIN = GUIDE_SCRIPT.ACK_UNCERTAIN;
export let ACK_SILENCE = GUIDE_SCRIPT.ACK_SILENCE;
export let EXPLORE_QUALITY = GUIDE_SCRIPT.EXPLORE_QUALITY;
export let QUALITY_HINT = GUIDE_SCRIPT.QUALITY_HINT;
export let DEEPEN_BY_FAMILY = GUIDE_SCRIPT.DEEPEN_BY_FAMILY;
export let EXPLORE_DEEPEN = GUIDE_SCRIPT.EXPLORE_DEEPEN;
export let EXPLORE_SHAPE = GUIDE_SCRIPT.EXPLORE_SHAPE;
export let EXPLORE_EDGE = GUIDE_SCRIPT.EXPLORE_EDGE;
export let EXPLORE_TEMPORAL = GUIDE_SCRIPT.EXPLORE_TEMPORAL;
export let EXPLORE_TEMPERATURE = GUIDE_SCRIPT.EXPLORE_TEMPERATURE;
export let LIGHTNESS = GUIDE_SCRIPT.LIGHTNESS;
export let HOLD = GUIDE_SCRIPT.HOLD;
export let OBSERVE_MOVEMENT_STATIC = GUIDE_SCRIPT.OBSERVE_MOVEMENT_STATIC;
export let OBSERVE_MOVEMENT = GUIDE_SCRIPT.OBSERVE_MOVEMENT;
export let OBSERVE_CHANGE = GUIDE_SCRIPT.OBSERVE_CHANGE;
export let OBSERVE_EDGE_AGAIN = GUIDE_SCRIPT.OBSERVE_EDGE_AGAIN;
export let REACT_MOVED = GUIDE_SCRIPT.REACT_MOVED;
export let REACT_SPREAD = GUIDE_SCRIPT.REACT_SPREAD;
export let REACT_CONTRACT = GUIDE_SCRIPT.REACT_CONTRACT;
export let REACT_SOFTENED = GUIDE_SCRIPT.REACT_SOFTENED;
export let REACT_INTENSIFIED = GUIDE_SCRIPT.REACT_INTENSIFIED;
export let REACT_STABLE = GUIDE_SCRIPT.REACT_STABLE;
export let REACT_BOUNDARY = GUIDE_SCRIPT.REACT_BOUNDARY;
export let REACT_QUALITY = GUIDE_SCRIPT.REACT_QUALITY;
export let REAPPRAISE_CORE = GUIDE_SCRIPT.REAPPRAISE_CORE;
export let REAPPRAISE_URGE = GUIDE_SCRIPT.REAPPRAISE_URGE;
export let REAPPRAISE_FAMILIAR = GUIDE_SCRIPT.REAPPRAISE_FAMILIAR;
export let REAPPRAISE_REFLECT = GUIDE_SCRIPT.REAPPRAISE_REFLECT;
export let CLOSE_PREPARE = GUIDE_SCRIPT.CLOSE_PREPARE;
export let CLOSE = GUIDE_SCRIPT.CLOSE;
export let VOICE_DIRECTION = GUIDE_SCRIPT.voice.direction;

function setAll(s: GuideScript) {
  ARRIVE = s.ARRIVE;
  NOTICE_ASK = s.NOTICE_ASK;
  NOTICE_RETRY = s.NOTICE_RETRY;
  NOTICE_SILENCE = s.NOTICE_SILENCE;
  OPEN_AWARENESS = s.OPEN_AWARENESS;
  LOCATE_ACK = s.LOCATE_ACK;
  LOCATE_WHERE = s.LOCATE_WHERE;
  LOCATE_NARROW = s.LOCATE_NARROW;
  LOCATE_SIDE_SIDED = s.LOCATE_SIDE_SIDED;
  LOCATE_SIDE_PAIRED = s.LOCATE_SIDE_PAIRED;
  ACK_WORD = s.ACK_WORD;
  ACK_PLAIN = s.ACK_PLAIN;
  ACK_UNCERTAIN = s.ACK_UNCERTAIN;
  ACK_SILENCE = s.ACK_SILENCE;
  EXPLORE_QUALITY = s.EXPLORE_QUALITY;
  QUALITY_HINT = s.QUALITY_HINT;
  DEEPEN_BY_FAMILY = s.DEEPEN_BY_FAMILY;
  EXPLORE_DEEPEN = s.EXPLORE_DEEPEN;
  EXPLORE_SHAPE = s.EXPLORE_SHAPE;
  EXPLORE_EDGE = s.EXPLORE_EDGE;
  EXPLORE_TEMPORAL = s.EXPLORE_TEMPORAL;
  EXPLORE_TEMPERATURE = s.EXPLORE_TEMPERATURE;
  LIGHTNESS = s.LIGHTNESS;
  HOLD = s.HOLD;
  OBSERVE_MOVEMENT_STATIC = s.OBSERVE_MOVEMENT_STATIC;
  OBSERVE_MOVEMENT = s.OBSERVE_MOVEMENT;
  OBSERVE_CHANGE = s.OBSERVE_CHANGE;
  OBSERVE_EDGE_AGAIN = s.OBSERVE_EDGE_AGAIN;
  REACT_MOVED = s.REACT_MOVED;
  REACT_SPREAD = s.REACT_SPREAD;
  REACT_CONTRACT = s.REACT_CONTRACT;
  REACT_SOFTENED = s.REACT_SOFTENED;
  REACT_INTENSIFIED = s.REACT_INTENSIFIED;
  REACT_STABLE = s.REACT_STABLE;
  REACT_BOUNDARY = s.REACT_BOUNDARY;
  REACT_QUALITY = s.REACT_QUALITY;
  REAPPRAISE_CORE = s.REAPPRAISE_CORE;
  REAPPRAISE_URGE = s.REAPPRAISE_URGE;
  REAPPRAISE_FAMILIAR = s.REAPPRAISE_FAMILIAR;
  REAPPRAISE_REFLECT = s.REAPPRAISE_REFLECT;
  CLOSE_PREPARE = s.CLOSE_PREPARE;
  CLOSE = s.CLOSE;
  VOICE_DIRECTION = s.voice.direction;
}

type Shape = 'text' | 'lines' | 'variants';

function shapeOf(v: unknown): Shape | undefined {
  if (!Array.isArray(v) || v.length === 0) return undefined;
  if (v.every((x) => typeof x === 'string' && x.trim().length > 0)) return 'text';
  const isLine = (x: unknown) => Array.isArray(x) && x.length === 2 && typeof x[0] === 'string' && x[0].trim().length > 0 && typeof x[1] === 'number' && x[1] >= 0 && x[1] <= 60_000;
  if (v.every(isLine)) return 'lines';
  if (v.every((x) => Array.isArray(x) && x.length > 0 && x.every(isLine))) return 'variants';
  return undefined;
}

function texts(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap((x) => (Array.isArray(x) && typeof x[1] === 'number' ? [String(x[0])] : texts(x)));
  return [];
}

/** A remote value is used only if it has the bundled value's shape and every line passes the guide-language guard. */
function sameShape(bundled: unknown, remote: unknown): boolean {
  if (Array.isArray(bundled)) {
    if (shapeOf(remote) !== shapeOf(bundled)) return false;
  } else if (bundled && typeof bundled === 'object') {
    if (!remote || typeof remote !== 'object') return false;
    for (const k of Object.keys(bundled)) if (!sameShape((bundled as Record<string, unknown>)[k], (remote as Record<string, unknown>)[k])) return false;
    return true;
  } else return typeof remote === typeof bundled;
  return !texts(remote).some(violatesGuideLanguage);
}

/**
 * Use an edited script. Each section is checked on its own: a malformed or
 * off-voice section keeps the bundled words, the rest of the edit still applies.
 * Returns the sections that were rejected.
 */
export function applyScript(remote: unknown): string[] {
  const next = { ...GUIDE_SCRIPT } as Record<string, unknown>;
  const rejected: string[] = [];
  if (remote && typeof remote === 'object') {
    for (const k of Object.keys(GUIDE_SCRIPT)) {
      const r = (remote as Record<string, unknown>)[k];
      if (r === undefined) continue;
      if (k === 'voice' ? sameShape(GUIDE_SCRIPT.voice, r) && /^[\w\s\[\]]{0,80}$/.test((r as { direction: string }).direction) : sameShape((GUIDE_SCRIPT as Record<string, unknown>)[k], r))
        next[k] = r;
      else rejected.push(k);
    }
  }
  setAll(next as GuideScript);
  return rejected;
}

/**
 * The session's opening line from the ElevenLabs agent's "First message". It replaces the
 * first line of that type's arrival, keeping its silence; an off-voice line is ignored.
 */
export function applyOpening(type: keyof GuideScript['ARRIVE'], text: unknown): boolean {
  if (typeof text !== 'string') return false;
  const t = text.trim();
  if (!t || t.length > 200 || violatesGuideLanguage(t)) return false;
  ARRIVE = { ...ARRIVE, [type]: ARRIVE[type].map((v) => [[t, v[0]?.[1] ?? 3500] as Line, ...v.slice(1)]) };
  return true;
}

/** Back to the words bundled with the app. */
export function resetScript() {
  setAll(GUIDE_SCRIPT);
}

export const SAFETY_ASK: string[] = [
  'Before we go on: is this a sensation you know well, or is it something new?',
];
export const SAFETY_CLOSE: Line[] = [
  ["Let's pause the practice here.", 3000],
  ['This practice is meant for sensations you already know well.', 3500],
  ['Something new or changing deserves a proper look from a doctor, or another medical professional.', 4000],
  ['If it feels severe or urgent, please contact emergency services now.', 3500],
  ['You can open your eyes.', 0],
];
export const CRISIS_CLOSE: Line[] = [
  ["I'm going to stop the practice here.", 2500],
  ['What you just said matters more than this session.', 3000],
  ["If you might act on these thoughts, please contact your local emergency number, or a crisis line, now.", 3500],
  ['If you can, reach out to someone you trust, and let them know how you are.', 3500],
  ['You can open your eyes.', 0],
];
export const EARLY_CLOSE: Line[] = [
  ["Okay. Let's stop here.", 3000],
  ['Notice the room around you.', 4000],
  ["When you're ready, open your eyes.", 0],
];
export const RESUME: Line = ["Let's continue.", 2500];
