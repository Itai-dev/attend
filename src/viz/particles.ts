/**
 * The session ring as a particle system (5 Nov 2026). Particles live in a thick ring with
 * depth, a torus seen in slow, gently tilting perspective. Each one is born somewhere in it,
 * fades in, wanders, and fades out after a few seconds, then is born again somewhere else, so
 * the ring is always being built and unbuilt, even in silence. Each is sprung to its home and
 * jostled at random in three dimensions; near particles are larger and brighter, far ones
 * smaller and dimmer.
 *
 * The guide's voice drives it: the attack of each syllable kicks particles off their homes,
 * loudness slackens their springs, shakes them harder and shortens their lives, unevenly round
 * the circle (the loosest arcs drift slowly round it), so the ring breaks into smaller,
 * coloured dots while a line is spoken and gathers again in the gap after.
 *
 * Pure numbers, no React: the same functions step the ring on the phone's UI thread (as
 * Reanimated worklets) and in Node, where tests/particles.test.ts checks its behaviour.
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
  /** Diameter at rest, in points. */
  size: number[];
  /** 0..1, each particle's own timing. */
  phase: number[];
  /** Each particle's afterimage colour, r g b. */
  tint: number[];
};

export function makeRing(n: number, seed = 7): Ring {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const ring: Ring = { n, size: [], phase: [], tint: [] };
  for (let i = 0; i < n; i++) {
    ring.size.push(1.6 + rnd() * 2.2);
    ring.phase.push(rnd());
    const c = PHOSPHENES[Math.floor(rnd() * PHOSPHENES.length)];
    const k = 0.75 + rnd() * 0.25;
    ring.tint.push(c[0] * k + (1 - k), c[1] * k + (1 - k), c[2] * k + (1 - k));
  }
  return ring;
}

/**
 * Per particle: position x y z and velocity (ring space, points, centre at 0), home x y z,
 * age and lifespan (seconds), and what the last step worked out for drawing: screen x y,
 * diameter, opacity, and how much afterimage colour shows.
 */
export const X = 0, Y = 1, Z = 2, VX = 3, VY = 4, VZ = 5, HX = 6, HY = 7, HZ = 8, AGE = 9, LIFE = 10;
export const SX = 11, SY = 12, SIZE = 13, ALPHA = 14, COLOR = 15, DIST = 16;
export const STRIDE = 17;

/** The ring's shape: the hole is half the radius; its depth is about a quarter of it. */
const INNER = 0.5;
const DEPTH = 0.13;

/** A new home somewhere in the ring: across the band, a little denser in the middle. */
export function placeHome(st: number[], j: number, R: number, rnd: () => number): void {
  'worklet';
  const a = rnd() * Math.PI * 2;
  const u = 0.6 * rnd() + 0.4 * ((rnd() + rnd()) / 2);
  const r = R * (INNER + (0.99 - INNER) * u);
  const across = (r / R - INNER) / (1 - INNER);
  // Thickest in the middle of the band, as a torus is.
  const zMax = R * DEPTH * Math.sqrt(Math.max(0, 1 - Math.pow(across * 2 - 1, 2)));
  st[j + HX] = Math.cos(a) * r;
  st[j + HY] = Math.sin(a) * r;
  st[j + HZ] = (rnd() * 2 - 1) * zMax;
}

/** Born: a new home, a short random life, placed near home (scattered, if the voice is loud). */
export function spawn(st: number[], j: number, R: number, rnd: () => number, level: number): void {
  'worklet';
  placeHome(st, j, R, rnd);
  const spread = 1.5 + 14 * level;
  st[j + X] = st[j + HX] + (rnd() - 0.5) * spread;
  st[j + Y] = st[j + HY] + (rnd() - 0.5) * spread;
  st[j + Z] = st[j + HZ] + (rnd() - 0.5) * spread;
  st[j + VX] = (rnd() - 0.5) * 12;
  st[j + VY] = (rnd() - 0.5) * 12;
  st[j + VZ] = (rnd() - 0.5) * 12;
  st[j + AGE] = 0;
  st[j + LIFE] = 1.2 + rnd() * 3.8;
}

export function restState(ring: Ring, R: number, rnd: () => number = Math.random): number[] {
  const st = new Array<number>(ring.n * STRIDE).fill(0);
  for (let i = 0; i < ring.n; i++) {
    const j = i * STRIDE;
    spawn(st, j, R, rnd, 0);
    // Begin at every point of their lives, so the ring doesn't all appear at once.
    st[j + AGE] = rnd() * st[j + LIFE];
  }
  return st;
}

export type Drive = {
  /** Where the ring's centre is drawn, and its outer radius, in points. */
  cx: number;
  cy: number;
  R: number;
  /** Seconds since the last frame, already capped. */
  dt: number;
  /** Seconds since the ring began. */
  t: number;
  /** The voice now, 0..1. */
  level: number;
  /** How much the voice rose since the last frame (the attack of a syllable), 0..1. */
  attack: number;
  /** Random numbers, 0..1. Math.random on the phone; seeded in tests. */
  rnd?: () => number;
};

/** How loose the ring is at an angle: arcs that drift slowly round the circle. */
export function arcWeight(ang: number, t: number): number {
  'worklet';
  const a = 0.5 + 0.5 * Math.sin(3 * ang + 0.7 * t + 2 * Math.sin(2 * ang - 0.3 * t));
  return 0.3 + 0.7 * a;
}

function smooth(e0: number, e1: number, x: number): number {
  'worklet';
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/** One frame of the ring, in place: physics, then what to draw. */
export function stepRing(ring: Ring, st: number[], d: Drive): void {
  'worklet';
  const { cx, cy, R, dt, t, level, attack } = d;
  const rnd = d.rnd ?? Math.random;
  // The ring turns slowly in depth: a gentle tilt this way and that, never a spin.
  const tx = 0.42 + 0.22 * Math.sin(t * 0.09);
  const ty = 0.3 * Math.sin(t * 0.063 + 1.3);
  const cX = Math.cos(tx);
  const sX = Math.sin(tx);
  const cY = Math.cos(ty);
  const sY = Math.sin(ty);
  const rot = t * 0.03;
  const cR = Math.cos(rot);
  const sR = Math.sin(rot);
  const focal = R * 3.2;
  const breath = 1 + 0.015 * Math.sin((t * Math.PI * 2) / 10);

  for (let i = 0; i < ring.n; i++) {
    const j = i * STRIDE;
    const ph = ring.phase[i];
    const w = arcWeight(Math.atan2(st[j + HY], st[j + HX]), t);
    const loose = Math.min(1, level * w * 1.3);

    // Life: older faster while the voice is loud, so more of the ring comes and goes. Reborn
    // before the home is read: the spring must pull toward the new home, not across the ring
    // to the old one.
    st[j + AGE] += dt * (1 + 2.2 * loose);
    if (st[j + AGE] >= st[j + LIFE]) spawn(st, j, R, rnd, loose);
    const hx = st[j + HX] * breath;
    const hy = st[j + HY] * breath;
    const hz = st[j + HZ];

    // The spring home: firm in silence, slack while loud.
    const k = 30 * (1 - 0.6 * loose);
    const damp = 5.5;
    let ax = -k * (st[j + X] - hx) - damp * st[j + VX];
    let ay = -k * (st[j + Y] - hy) - damp * st[j + VY];
    let az = -k * (st[j + Z] - hz) - damp * st[j + VZ];

    // Random wandering in three dimensions: gentle in silence, much stronger with the voice.
    const jitter = 420 + 1800 * loose;
    ax += (rnd() - 0.5) * 2 * jitter;
    ay += (rnd() - 0.5) * 2 * jitter;
    az += (rnd() - 0.5) * 2 * jitter;

    // While the voice sounds: pushed off the ring, outward mostly, some inward and in depth.
    const rr = Math.sqrt(hx * hx + hy * hy) || 1;
    const ux = hx / rr;
    const uy = hy / rr;
    const out = ph > 0.25 ? 1 : -0.6;
    const push = level * w * 560 * (0.4 + 0.6 * Math.abs(Math.sin(t * 7 + ph * 30)));
    ax += ux * push * out;
    ay += uy * push * out;
    az += push * 0.6 * Math.sin(ph * 41 + t * 3);

    // The attack of a syllable: a kick in a random direction, so the ring breaks, not swells.
    if (attack > 0) {
      const kick = attack * w * 2600 * (0.3 + 0.7 * rnd());
      ax += (ux * out + (rnd() - 0.5) * 1.6) * kick;
      ay += (uy * out + (rnd() - 0.5) * 1.6) * kick;
      az += (rnd() - 0.5) * 1.6 * kick;
    }

    st[j + VX] += ax * dt;
    st[j + VY] += ay * dt;
    st[j + VZ] += az * dt;
    st[j + X] += st[j + VX] * dt;
    st[j + Y] += st[j + VY] * dt;
    st[j + Z] += st[j + VZ] * dt;

    const ex = st[j + X] - hx;
    const ey = st[j + Y] - hy;
    const ez = st[j + Z] - hz;
    const dist = Math.sqrt(ex * ex + ey * ey + ez * ez);
    st[j + DIST] = dist;

    // To the screen: turn about the view axis, tilt, then perspective.
    const px = st[j + X] * cR - st[j + Y] * sR;
    const py = st[j + X] * sR + st[j + Y] * cR;
    const pz = st[j + Z];
    const y1 = py * cX - pz * sX;
    const z1 = py * sX + pz * cX;
    const x2 = px * cY + z1 * sY;
    const z2 = -px * sY + z1 * cY;
    const persp = focal / (focal - z2);
    st[j + SX] = cx + x2 * persp;
    st[j + SY] = cy + y1 * persp;

    // Faded in and out over its life; nearer is larger and brighter; away from home it is
    // smaller (the ring breaking into smaller dots) and shows its afterimage colour.
    const age = st[j + AGE];
    const life = st[j + LIFE];
    const env = smooth(0, 0.35, age) * (1 - smooth(life - 0.7, life, age));
    const off = Math.min(1, dist / 18);
    const near = Math.min(1, Math.max(0, (z2 / (R * 0.6) + 1) / 2));
    st[j + SIZE] = ring.size[i] * persp * (1 - 0.45 * off) * (0.6 + 0.4 * env);
    st[j + ALPHA] = env * (0.55 + 0.45 * near) * (0.95 - 0.3 * Math.min(1, dist / 40));
    st[j + COLOR] = Math.min(1, 0.1 + 0.8 * off + 0.25 * level);
  }
}
