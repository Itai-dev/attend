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
 * that nothing remote can change. That includes the arrival's doctor and
 * emergency lines (ARRIVAL_SAFETY), which the brain adds to every arrival.
 */

export type Line = [text: string, pauseMs: number];
export type { GuideScript };

// Live bindings: applyScript reassigns these, and `import * as L` sees the change.
export let ARRIVE = GUIDE_SCRIPT.ARRIVE;
export let SCAN_BRIEF = GUIDE_SCRIPT.SCAN_BRIEF;
export let SCAN_SHORT = GUIDE_SCRIPT.SCAN_SHORT;
export let SCAN_FULL = GUIDE_SCRIPT.SCAN_FULL;
/** A remote or saved script from before the body scan has no SCAN_BODY: applyScript keeps the bundled one. */
export let SCAN_BODY = GUIDE_SCRIPT.SCAN_BODY;
export let SCAN_NOTICE = GUIDE_SCRIPT.SCAN_NOTICE;
export let SCAN_USUAL = GUIDE_SCRIPT.SCAN_USUAL;
export let LOCATE_USUAL = GUIDE_SCRIPT.LOCATE_USUAL;
export let EXPLORE_USUAL_WORD = GUIDE_SCRIPT.EXPLORE_USUAL_WORD;
export let GUIDE_OBSERVE = GUIDE_SCRIPT.GUIDE_OBSERVE;
export let GUIDED_SETTLE = GUIDE_SCRIPT.GUIDED_SETTLE;
export let GUIDED_OBSERVE = GUIDE_SCRIPT.GUIDED_OBSERVE;
export let GUIDED_OPEN = GUIDE_SCRIPT.GUIDED_OPEN;
export let GUIDED_THEMES = GUIDE_SCRIPT.GUIDED_THEMES;
export let ANSWER = GUIDE_SCRIPT.ANSWER;
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
export let EXPLORE_DEEPEN = GUIDE_SCRIPT.EXPLORE_DEEPEN;
export let EXPLORE_SHAPE = GUIDE_SCRIPT.EXPLORE_SHAPE;
export let EXPLORE_EDGE = GUIDE_SCRIPT.EXPLORE_EDGE;
export let EXPLORE_TEMPORAL = GUIDE_SCRIPT.EXPLORE_TEMPORAL;
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
  SCAN_BRIEF = s.SCAN_BRIEF;
  SCAN_SHORT = s.SCAN_SHORT;
  SCAN_FULL = s.SCAN_FULL;
  SCAN_BODY = s.SCAN_BODY ?? GUIDE_SCRIPT.SCAN_BODY;
  SCAN_NOTICE = s.SCAN_NOTICE;
  SCAN_USUAL = s.SCAN_USUAL;
  LOCATE_USUAL = s.LOCATE_USUAL;
  EXPLORE_USUAL_WORD = s.EXPLORE_USUAL_WORD;
  GUIDE_OBSERVE = s.GUIDE_OBSERVE;
  GUIDED_SETTLE = s.GUIDED_SETTLE;
  GUIDED_OBSERVE = s.GUIDED_OBSERVE;
  GUIDED_OPEN = s.GUIDED_OPEN;
  GUIDED_THEMES = s.GUIDED_THEMES;
  ANSWER = s.ANSWER;
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
  EXPLORE_DEEPEN = s.EXPLORE_DEEPEN;
  EXPLORE_SHAPE = s.EXPLORE_SHAPE;
  EXPLORE_EDGE = s.EXPLORE_EDGE;
  EXPLORE_TEMPORAL = s.EXPLORE_TEMPORAL;
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

/**
 * The arrival's safety lines (safety review round 3). They lived in the remotely edited
 * script, where one edit, or one malformed ARRIVE section replaced wholesale, could delete the
 * only doctor line a worried person hears at 2am. They are fixed here, and withArrivalSafety
 * puts them into every arrival, whatever the script's ARRIVE says.
 */
export const ARRIVAL_SAFETY = {
  /** Worry may be about something new; the welcome's note was days ago. */
  fear: [
    ['This practice is for a sensation you know. If this one is new, or different, stop here and contact a doctor.', 5500],
    ['If it is sudden, or severe, call your local emergency number.', 5000],
  ] as Line[],
  /** Second in a flare's arrival: before anything invites staying with it. */
  flare: ['If this flare feels new, or different from your usual, stop here and contact a doctor.', 4500] as Line,
  /** The first session ever, of any other type: the welcome's note, said once in the voice. */
  first: ['This practice is for pain you already know. If something is new, or different, stop and contact a doctor.', 5500] as Line,
  /** Every arrival, once: the eyes-closed practice is never a commitment. */
  stop: ['You can open your eyes, or stop, at any time.', 3000] as Line,
};

const FIXED_ARRIVAL = new Set([...ARRIVAL_SAFETY.fear, ARRIVAL_SAFETY.flare, ARRIVAL_SAFETY.first, ARRIVAL_SAFETY.stop].map(([t]) => t));

/**
 * An arrival as spoken: the script's lines with the fixed safety lines put in place. Any copy
 * of a fixed line already in the script (a stale remote or saved script) is dropped first, so
 * each is heard exactly once.
 *  - stop goes before the arrival's last line (after the fear lines, for fear), so the arrival
 *    still ends on its own settling words; a one-line arrival gets it after;
 *  - flare's doctor line is second; fear's two lines close the arrival, as they always have;
 *  - the first-session line is second, for the types without their own doctor line.
 */
export function withArrivalSafety(script: Line[], type: keyof GuideScript['ARRIVE'], firstSession = false): Line[] {
  const base = script.filter(([t]) => !FIXED_ARRIVAL.has(t));
  const out = [...base];
  if (type === 'fear') out.push(...ARRIVAL_SAFETY.fear, ARRIVAL_SAFETY.stop);
  else out.splice(out.length >= 2 ? out.length - 1 : out.length, 0, ARRIVAL_SAFETY.stop);
  if (type === 'flare') out.splice(Math.min(1, out.length), 0, ARRIVAL_SAFETY.flare);
  else if (firstSession && type !== 'fear') out.splice(Math.min(1, out.length), 0, ARRIVAL_SAFETY.first);
  return out;
}

/** Every fixed arrival line a type can speak, for warming the audio cache. */
export function arrivalSafetyTexts(type: keyof GuideScript['ARRIVE']): string[] {
  const ls = type === 'fear' ? ARRIVAL_SAFETY.fear : type === 'flare' ? [ARRIVAL_SAFETY.flare] : [ARRIVAL_SAFETY.first];
  return [...ls, ARRIVAL_SAFETY.stop].map(([t]) => t);
}
/**
 * "Is this serious?", "Why does it hurt?" — fixed, like the safety lines: the guide can't
 * know, says so, and points to a professional for anything new or changing. Never a
 * reassurance in either direction.
 */
export const ANSWER_CAUSE: Line[] = [
  ["I can't tell what's causing it. That's a question for a doctor.", 3500],
  ['If it feels new, or is changing, or worries you, have it looked at.', 4000],
  ['Here, we only notice it.', 3000],
];
