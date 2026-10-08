import { familyOf } from '../domain/lexicon';
import { REGIONS } from '../domain/regions';
import type { BodyMapState, BodyRegion, BodySensation, QualityFamily, Session, Side } from '../domain/types';
import { familyColor } from '../design/palette';

/**
 * BodyMapState → the numbers the body shader reads. Pure, so it is tested
 * without a GPU, and so the map's data stays independent of how it is drawn.
 */

export type View = 'front' | 'back';
export const MAX_FIELDS = 6;

const FAMILY_CODE: Record<QualityFamily, number> = {
  contract: 0,
  press: 1,
  pull: 2,
  warm: 3,
  grain: 4,
  pulse: 5,
  point: 6,
  heavy: 7,
  mute: 8,
  cold: 9,
  unknown: 10,
};
const SHAPE_CODE = { focused: 0, diffuse: 1, line: 2, area: 3, unknown: 4 } as const;
const TEMPORAL_CODE = { constant: 0, pulsing: 1, intermittent: 2, changing: 3, unknown: 4 } as const;
const MOVE_CODE = { static: 0, unknown: 0, moving: 1, spreading: 2, contracting: 3 } as const;

export type FieldSpec = {
  a: [number, number, number, number];
  b: [number, number, number, number];
  c: [number, number, number, number];
  k: [number, number, number];
  /** 3D figure only: depth of the field's centre and of its destination (front of the body is +z). */
  z?: [number, number];
};

/**
 * How deep inside the 3D figure a region's sensation sits. Felt on the front → toward the
 * front, felt in the back → toward the back, felt all the way through → at the centre.
 * Always inside the surface: the figure shows sensations within the body, never on its skin.
 */
export function zFor(region: BodyRegion): number {
  const info = REGIONS[region];
  if (region === 'whole_body' || info.view === 'both') return 0;
  const depth = Math.min(0.034, info.radius * 0.62);
  return info.view === 'front' ? depth : -depth;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Viewer-space x for a region on a side, given which way the figure faces. */
export function xFor(region: BodyRegion, side: Side | undefined, view: View): number[] {
  const info = REGIONS[region];
  const lateral = info.paired || info.sided;
  const mirror = view === 'front' ? 1 : -1; // the person's left is the viewer's right from the front
  if (!lateral || side === 'center' || (!side && info.sided)) return [0];
  if (side === 'bilateral' || (!side && info.paired)) return [info.x * mirror, -info.x * mirror];
  return [(side === 'left' ? info.x : -info.x) * mirror];
}

function viewWeight(region: BodyRegion, view: View): number {
  const v = REGIONS[region].view;
  return v === 'both' || v === view ? 1 : 0.5;
}

/**
 * The fields for the turning 3D figure: positions in figure space (as seen from the front),
 * each with its depth. No view weighting: every side of the body is in sight as it turns.
 */
export function fieldsFor3d(map: BodyMapState, opts: { weights?: Map<string, number> } = {}): FieldSpec[] {
  return fieldsFor(map, 'front', { ...opts, allSides: true });
}

export function fieldsFor(map: BodyMapState, view: View, opts: { weights?: Map<string, number>; allSides?: boolean } = {}): FieldSpec[] {
  const out: FieldSpec[] = [];
  const ordered = [...map.sensations].sort((a, b) => Number(!!b.primary) - Number(!!a.primary));
  for (const s of ordered) {
    const info = REGIONS[s.region];
    const family = familyOf(s.descriptors);
    const weight = opts.weights?.get(s.id) ?? (s.primary ? 0.95 : 0.62);
    const intensity = weight * (opts.allSides ? 1 : viewWeight(s.region, view));
    const shape = s.shape ?? 'unknown';
    // Fields read larger than the region itself: a feeling has no hard border on the figure.
    const radius = s.region === 'whole_body' ? 0.32 : info.radius * 1.45 * (shape === 'line' ? 1.1 : 1);
    const destRegion = s.movement?.destinationRegion;
    for (const x of xFor(s.region, s.side, view)) {
      if (out.length >= MAX_FIELDS) break;
      let dest: [number, number, number] = [0, 0, 0];
      if (destRegion) {
        const dInfo = REGIONS[destRegion];
        const destSide = s.movement?.destinationSide ?? (dInfo.sided ? s.side : undefined);
        const dxs = xFor(destRegion, destSide, view);
        const dx = dxs.length > 1 ? (Math.sign(x) || 1) * Math.abs(dxs[0]) : dxs[0];
        dest = [dx, dInfo.y, 1];
      }
      out.push({
        a: [x, info.y, radius, intensity],
        b: [FAMILY_CODE[family], SHAPE_CODE[shape], TEMPORAL_CODE[s.temporalQuality ?? 'unknown'], MOVE_CODE[s.movement?.type ?? 'unknown']],
        c: [dest[0], dest[1], dest[2], s.edge === 'clear' ? 0.8 : 0],
        k: hexToRgb(familyColor[family]),
        z: [zFor(s.region), destRegion ? zFor(destRegion) : 0],
      });
    }
  }
  return out;
}

const EMPTY_FIELD: FieldSpec = { a: [0, 0, 0, 0], b: [10, 4, 4, 0], c: [0, 0, 0, 0], k: [0, 0, 0] };

/** Flatten into the uniform names the shader declares. */
export function bodyUniforms(fields: FieldSpec[], opts: { depth?: boolean } = {}): Record<string, number[]> {
  const u: Record<string, number[]> = {};
  for (let i = 0; i < MAX_FIELDS; i++) {
    const f = fields[i] ?? EMPTY_FIELD;
    u[`uA${i}`] = f.a;
    u[`uB${i}`] = f.b;
    u[`uC${i}`] = f.c;
    u[`uK${i}`] = f.k;
    // Only the 3D shader declares depth uniforms.
    if (opts.depth) u[`uZ${i}`] = f.z ?? [0, 0];
  }
  return u;
}

/**
 * Everything the person has attended to, across sessions, as one map.
 * Recent sessions are drawn brighter; older ones fade but do not vanish.
 */
export function compositeMap(sessions: Session[]): { map: BodyMapState; weights: Map<string, number> } {
  const sorted = [...sessions].filter((s) => s.bodyMapEnd.sensations.length > 0).sort((a, b) => b.startedAt - a.startedAt);
  const byPlace = new Map<string, { s: BodySensation; w: number; n: number }>();
  sorted.forEach((session, i) => {
    const recency = Math.max(0.35, 1 - i * 0.12);
    for (const s of session.bodyMapEnd.sensations) {
      const key = `${s.region}|${s.side ?? ''}`;
      const w = (s.primary ? 1 : 0.7) * recency;
      const prev = byPlace.get(key);
      if (!prev) byPlace.set(key, { s: { ...s, id: key, primary: false }, w, n: 1 });
      else byPlace.set(key, { s: prev.s, w: Math.min(1, prev.w + w * 0.25), n: prev.n + 1 });
    }
  });
  const ranked = [...byPlace.values()].sort((a, b) => b.w - a.w).slice(0, MAX_FIELDS);
  if (ranked[0]) ranked[0].s.primary = true;
  const weights = new Map(ranked.map((r) => [r.s.id, Math.min(0.95, 0.35 + r.w * 0.6)]));
  return { map: { sensations: ranked.map((r) => r.s) }, weights };
}

/** Which side of the figure has more to show. */
export function preferredView(map: BodyMapState): View {
  let front = 0;
  let back = 0;
  for (const s of map.sensations) {
    const v = REGIONS[s.region].view;
    if (v === 'front') front += s.primary ? 2 : 1;
    if (v === 'back') back += s.primary ? 2 : 1;
  }
  return back > front ? 'back' : 'front';
}

/**
 * Where to centre a zoomed figure: on the main sensation, but never so far
 * that the figure slides off the canvas.
 */
export function focusFor(map: BodyMapState, scale: number): number {
  if (scale <= 1) return 0.5;
  const p = map.sensations.find((s) => s.primary) ?? map.sensations[0];
  const y = p ? REGIONS[p.region].y : 0.5;
  const half = 0.5 / (0.92 * scale);
  return Math.min(1 - half + 0.04, Math.max(half - 0.04, y + 0.06));
}
