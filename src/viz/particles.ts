/**
 * The session ring as a particle system (5 Nov 2026). Each particle has a home on the ring and
 * a position and velocity of its own. Every frame a spring pulls it home and damping settles
 * it, so at rest the particles sit together as one whole ring; a small wobble keeps them alive
 * even in silence. The guide's voice is what moves them: the attack of each syllable kicks
 * particles off their homes and loudness loosens their springs, unevenly round the circle (the
 * loosest arcs drift slowly round it), so the ring comes apart into smaller, coloured dots as a
 * line is spoken and the springs rebuild it in the gap after.
 *
 * Pure numbers, no React: the same functions step the ring on the phone's UI thread (as
 * Reanimated worklets) and in Node, where tests/particles.test.ts checks it gathers and settles.
 */

/** The afterimage colours, as rubbed eyes see them: violet, teal, gold, green. Never red. */
const PHOSPHENES: Array<[number, number, number]> = [
  [0.62, 0.5, 0.9],
  [0.4, 0.8, 0.82],
  [0.95, 0.8, 0.45],
  [0.6, 0.85, 0.58],
];

export type Ring = {
  n: number;
  /** Home angle and home radius (as a fraction of the ring's outer radius). */
  ang: number[];
  rad: number[];
  /** Diameter at rest, in points. */
  size: number[];
  /** 0..1, for each particle's own timing. */
  phase: number[];
  /** Each particle's afterimage colour, r g b. */
  tint: number[];
};

/** A deterministic ring: the same particles in the same places on every run. */
export function makeRing(n: number, seed = 7): Ring {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const ring: Ring = { n, ang: [], rad: [], size: [], phase: [], tint: [] };
  for (let i = 0; i < n; i++) {
    ring.ang.push(rnd() * Math.PI * 2);
    // Across the whole band, from the hole (half the radius) to the edge, a little denser in
    // the middle so the edges are softer than the body: a full ring, like the mark.
    const u = 0.6 * rnd() + 0.4 * ((rnd() + rnd()) / 2);
    ring.rad.push(0.5 + 0.49 * u);
    ring.size.push(1.6 + rnd() * 2.0);
    ring.phase.push(rnd());
    const c = PHOSPHENES[Math.floor(rnd() * PHOSPHENES.length)];
    const k = 0.75 + rnd() * 0.25;
    ring.tint.push(c[0] * k + (1 - k), c[1] * k + (1 - k), c[2] * k + (1 - k));
  }
  return ring;
}

/** Per particle: x, y, vx, vy, and its distance from home after the last step (for drawing). */
export const STRIDE = 5;

export function restState(ring: Ring, cx: number, cy: number, R: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < ring.n; i++) {
    out.push(cx + Math.cos(ring.ang[i]) * ring.rad[i] * R, cy + Math.sin(ring.ang[i]) * ring.rad[i] * R, 0, 0, 0);
  }
  return out;
}

export type Drive = {
  cx: number;
  cy: number;
  /** Outer radius, points. */
  R: number;
  /** Seconds since the last frame, already capped. */
  dt: number;
  /** Seconds since the ring began. */
  t: number;
  /** The voice now, 0..1. */
  level: number;
  /** How much the voice rose since the last frame (the attack of a syllable), 0..1. */
  attack: number;
};

/** How loose the ring is at an angle: arcs that drift slowly round the circle. */
export function arcWeight(ang: number, t: number): number {
  'worklet';
  const a = 0.5 + 0.5 * Math.sin(3 * ang + 0.7 * t + 2 * Math.sin(2 * ang - 0.3 * t));
  return 0.3 + 0.7 * a;
}

/** One frame of the ring, in place. */
export function stepRing(ring: Ring, st: number[], d: Drive): void {
  'worklet';
  const { cx, cy, R, dt, t, level, attack } = d;
  const rot = t * 0.02;
  const breath = 1 + 0.015 * Math.sin((t * Math.PI * 2) / 10);
  for (let i = 0; i < ring.n; i++) {
    const j = i * STRIDE;
    const ph = ring.phase[i];
    const a = ring.ang[i] + rot;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const hr = ring.rad[i] * R * breath;
    const hx = cx + ca * hr;
    const hy = cy + sa * hr;
    const w = arcWeight(ring.ang[i], t);
    const loose = Math.min(1, level * w * 1.3);
    // The spring home: stiff at rest (a ring that rebuilds within a breath), slack while loud.
    const k = 42 * (1 - 0.85 * loose);
    const damp = 7.5;
    let ax = -k * (st[j] - hx) - damp * st[j + 2];
    let ay = -k * (st[j + 1] - hy) - damp * st[j + 3];
    // Never quite still: each particle drifts a little round its home, on its own rhythm.
    const wob = 22;
    ax += wob * Math.sin(t * (0.9 + ph * 1.3) + ph * 40);
    ay += wob * Math.cos(t * (0.8 + ph * 1.1) + ph * 23);
    // While the voice sounds: pushed out from the ring (a few inward), with a little swirl.
    const out = ph > 0.25 ? 1 : -0.6;
    const push = level * w * 900 * (0.4 + 0.6 * Math.abs(Math.sin(t * 7 + ph * 30)));
    ax += ca * push * out - sa * push * 0.35 * Math.sin(ph * 50);
    ay += sa * push * out + ca * push * 0.35 * Math.sin(ph * 50);
    // The attack of a syllable: a kick, scattered so the ring breaks apart, not swells.
    const kick = attack * w * 2800 * (0.3 + 0.7 * ((ph * 7.31) % 1));
    const kx = Math.cos(a + (ph - 0.5) * 2.4);
    const ky = Math.sin(a + (ph - 0.5) * 2.4);
    st[j + 2] += (ax + kx * kick * out) * dt;
    st[j + 3] += (ay + ky * kick * out) * dt;
    st[j] += st[j + 2] * dt;
    st[j + 1] += st[j + 3] * dt;
    const ex = st[j] - hx;
    const ey = st[j + 1] - hy;
    st[j + 4] = Math.sqrt(ex * ex + ey * ey);
  }
}

/** How far a particle is from its home, in points. */
export function away(ring: Ring, st: number[], i: number, d: { cx: number; cy: number; R: number; t: number }): number {
  'worklet';
  const a = ring.ang[i] + d.t * 0.02;
  const hr = ring.rad[i] * d.R * (1 + 0.015 * Math.sin((d.t * Math.PI * 2) / 10));
  const dx = st[i * STRIDE] - (d.cx + Math.cos(a) * hr);
  const dy = st[i * STRIDE + 1] - (d.cy + Math.sin(a) * hr);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * How a particle looks: its diameter, and how much of its afterimage colour shows (0..1).
 * Away from home it is smaller (the ring breaking down into smaller dots) and more coloured.
 */
export function look(ring: Ring, i: number, dist: number, level: number): { size: number; color: number; alpha: number } {
  'worklet';
  const f = Math.min(1, dist / 16);
  return {
    size: ring.size[i] * (1 - 0.5 * f),
    color: Math.min(1, 0.1 + 0.8 * f + 0.25 * level),
    alpha: 0.95 - 0.3 * Math.min(1, dist / 36),
  };
}
