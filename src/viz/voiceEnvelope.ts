/**
 * The guide's voice as a level the session's form can follow (20 Oct 2026: "the orb reacts to
 * the narration"). Pure and React-free, so it runs in node tests, on the JS thread (turning an
 * audio frame into a level) and on the UI thread (the envelope, once a frame): the functions the
 * form calls per frame carry the 'worklet' directive, which is only a string anywhere else.
 *
 * Three pieces:
 * - `levelOfFrames`: one block of PCM samples (expo-audio's `audioSampleUpdate`) → 0..1, by RMS
 *   in decibels between a floor and a ceiling, so a soft line and a firm one both move the form
 *   and the hiss between words does not.
 * - `followEnvelope`: the level the form shows. It rises quickly with a syllable (attack ~60 ms)
 *   and falls more slowly (release ~250 ms), then one gentle smoothing stage: iOS hands over a
 *   block about every 90 ms, and without it the form stepped in time with the blocks.
 * - `syntheticVoice`: where no level can be had (web, Android, a build without sampling, a tap
 *   that never delivers), a made-up envelope of syllables in phrases while the guide speaks,
 *   so the form is never dead. A pure function of time: nothing to schedule, nothing to stop.
 */

/** Below this the voice is silence (breath, room tone, the codec's floor). */
export const LEVEL_FLOOR_DB = -50;
/** At and above this the voice is as full as the form ever shows. ElevenLabs speech sits around -20 dBFS RMS. */
export const LEVEL_CEIL_DB = -14;

/** Root mean square of a block of samples in -1..1. Reads every `stride`th sample: a level, not a measurement. */
export function rms(frames: ArrayLike<number>, stride = 1): number {
  const n = frames.length;
  if (!n) return 0;
  const step = Math.max(1, Math.floor(stride));
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i += step) {
    const v = frames[i];
    if (Number.isFinite(v)) sum += v * v;
    count++;
  }
  return count ? Math.sqrt(sum / count) : 0;
}

/** RMS → 0..1: linear in decibels between the floor and the ceiling, clamped. */
export function levelFromRms(value: number, floorDb = LEVEL_FLOOR_DB, ceilDb = LEVEL_CEIL_DB): number {
  if (!(value > 0)) return 0;
  const db = 20 * Math.log10(value);
  const x = (db - floorDb) / (ceilDb - floorDb);
  return x <= 0 ? 0 : x >= 1 ? 1 : x;
}

/** One audio block (any number of channels) → 0..1. The loudest channel counts: ElevenLabs is mono. */
export function levelOfFrames(channels: readonly { frames: ArrayLike<number> }[], stride = 2): number {
  let best = 0;
  for (const c of channels) best = Math.max(best, rms(c.frames, stride));
  return levelFromRms(best);
}

export type EnvelopeState = { env: number; out: number };
export const ENVELOPE_REST: EnvelopeState = { env: 0, out: 0 };

export const ATTACK_MS = 60;
export const RELEASE_MS = 250;
/** The second, gentle stage: hides the 90 ms blocks without blunting a syllable. */
export const SMOOTH_MS = 70;

/** One-pole step toward `target` with time constant `tauMs`, frame-rate independent. */
export function onePole(current: number, target: number, dtMs: number, tauMs: number): number {
  'worklet';
  if (!(dtMs > 0)) return current;
  if (!(tauMs > 0)) return target;
  const k = 1 - Math.exp(-dtMs / tauMs);
  return current + (target - current) * k;
}

/**
 * Advance the envelope by one frame. `target` is 0..1 (a measured level, a synthetic one, or 0 in
 * silence). A long frame (the app was in the background) is capped so the form doesn't jump.
 */
export function followEnvelope(
  s: EnvelopeState,
  target: number,
  dtMs: number,
  attackMs?: number,
  releaseMs?: number,
  smoothMs?: number,
): EnvelopeState {
  'worklet';
  // No default parameters in a worklet: on the UI runtime its captured constants are unpacked in
  // the body, after the parameters are evaluated, so `attackMs = ATTACK_MS` threw a ReferenceError
  // on the first frame and closed the app as a practice opened (20 Oct 2026). Web runs the plain
  // JS function and never showed it. tests/sessionVisual.test.ts guards every worklet in src/.
  const a = attackMs ?? ATTACK_MS;
  const r = releaseMs ?? RELEASE_MS;
  const sm = smoothMs ?? SMOOTH_MS;
  const dt = Math.min(Math.max(dtMs, 0), 100);
  const t = target < 0 ? 0 : target > 1 ? 1 : target;
  const env = onePole(s.env, t, dt, t > s.env ? a : r);
  return { env, out: onePole(s.out, env, dt, sm) };
}

/** A repeatable 0..1 from an integer: the synthetic voice's "randomness", the same every run. */
export function hash01(n: number): number {
  'worklet';
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** A phrase, then a breath: the synthetic voice's rhythm. */
export const PHRASE_MS = 3200;
/** One syllable, near the guide's slow, calm pace. */
export const SYLLABLE_MS = 240;

/**
 * A made-up voice level at time `tMs`: syllables (a soft rise and fall each, of varied weight)
 * grouped into phrases, each phrase followed by a gap of 0.45–1.0 s. Fed through
 * `followEnvelope` like a measured level. 0..1, and 0 in the gaps.
 */
export function syntheticVoice(tMs: number): number {
  'worklet';
  const t = tMs < 0 ? 0 : tMs;
  const k = Math.floor(t / PHRASE_MS);
  const u = t - k * PHRASE_MS;
  const gap = 450 + 550 * hash01(k * 7 + 3);
  const spoken = PHRASE_MS - gap;
  if (u >= spoken) return 0;
  const j = Math.floor(u / SYLLABLE_MS);
  const f = (u - j * SYLLABLE_MS) / SYLLABLE_MS;
  // Some syllables barely there, a few stressed; one in seven a tiny pause inside the phrase.
  const h = hash01(k * 131 + j * 17 + 1);
  const weight = h < 0.14 ? 0.05 : 0.32 + 0.55 * hash01(k * 53 + j * 29 + 5);
  const bump = Math.sin(Math.PI * f);
  // The phrase opens and closes softly rather than starting at full weight.
  const edge = Math.min(1, u / 260, (spoken - u) / 320);
  return weight * bump * bump * edge;
}
