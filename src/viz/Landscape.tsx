import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  Rect,
  Skia,
  useClock,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import type { SoundscapeId } from '../domain/soundscapes';

/**
 * Small illustrated landscapes, drawn in code: layered hills, a sky, a moon or a low sun,
 * and what the sound is — rain, a fall of water, a shoreline, a fire. They give each sound a
 * place to be and give Today a window to look out of. No image files: every scene scales to
 * any size, costs nothing to ship, and keeps the palette in one place.
 *
 * Motion is slow and small (rain falling, mist drifting, water moving) and stops entirely
 * under Reduce Motion, or when `still` is set for small thumbnails. Colours come from dusk
 * outdoors; there is no red.
 */

export type SceneId = SoundscapeId | 'dawn' | 'day' | 'dusk' | 'evening';

type Ridge = { color: string; base: number; amp: number; seed: number; pines?: boolean };
type SceneDef = {
  sky: string[];
  light?: { x: number; y: number; r: number; color: string };
  stars?: boolean;
  ridges: Ridge[];
  mist?: string;
  feature?: 'rain' | 'waterfall' | 'ocean' | 'stream' | 'fireflies' | 'fire' | 'rings';
};

const SCENES: Record<SceneId, SceneDef> = {
  dawn: {
    sky: ['#24404D', '#7C93A0', '#EBC9A0'],
    light: { x: 0.72, y: 0.66, r: 0.06, color: '#F8DDB0' },
    ridges: [
      { color: '#4A6567', base: 0.66, amp: 0.07, seed: 1 },
      { color: '#2F4A4B', base: 0.76, amp: 0.08, seed: 2 },
      { color: '#172826', base: 0.88, amp: 0.06, seed: 3, pines: true },
    ],
    mist: '#F4E6D2',
  },
  day: {
    sky: ['#3C6A80', '#8DB3C7', '#CFE0E6'],
    light: { x: 0.84, y: 0.42, r: 0.045, color: '#FFF4DE' },
    ridges: [
      { color: '#6E938E', base: 0.62, amp: 0.08, seed: 4 },
      { color: '#466D69', base: 0.74, amp: 0.08, seed: 5 },
      { color: '#1D3633', base: 0.88, amp: 0.06, seed: 6, pines: true },
    ],
    mist: '#EAF2F2',
  },
  dusk: {
    sky: ['#26304F', '#8E86AE', '#EFC49A'],
    light: { x: 0.28, y: 0.7, r: 0.055, color: '#F8D3A4' },
    ridges: [
      { color: '#4B4F6C', base: 0.66, amp: 0.07, seed: 7 },
      { color: '#2E3550', base: 0.77, amp: 0.08, seed: 8 },
      { color: '#141B29', base: 0.89, amp: 0.06, seed: 9, pines: true },
    ],
  },
  evening: {
    sky: ['#09121F', '#162A3C', '#2B4A57'],
    light: { x: 0.82, y: 0.4, r: 0.04, color: '#F2ECE0' },
    stars: true,
    ridges: [
      { color: '#1E3442', base: 0.68, amp: 0.07, seed: 10 },
      { color: '#142533', base: 0.78, amp: 0.07, seed: 11 },
      { color: '#0B1620', base: 0.89, amp: 0.05, seed: 12, pines: true },
    ],
  },
  forest: {
    sky: ['#17302F', '#4F7B70', '#A9C6B4'],
    light: { x: 0.3, y: 0.3, r: 0.05, color: '#F5EBCF' },
    ridges: [
      { color: '#4A7466', base: 0.56, amp: 0.06, seed: 13, pines: true },
      { color: '#2D5247', base: 0.7, amp: 0.06, seed: 14, pines: true },
      { color: '#13261F', base: 0.85, amp: 0.05, seed: 15, pines: true },
    ],
    mist: '#DCEBE0',
  },
  rain: {
    sky: ['#1E2B35', '#4C5F6C', '#7F919B'],
    ridges: [
      { color: '#435661', base: 0.64, amp: 0.07, seed: 16 },
      { color: '#2B3A43', base: 0.75, amp: 0.07, seed: 17, pines: true },
      { color: '#141E24', base: 0.88, amp: 0.05, seed: 18 },
    ],
    mist: '#C9D6DE',
    feature: 'rain',
  },
  stream: {
    sky: ['#1C3A42', '#6E9C9A', '#C4DCCF'],
    light: { x: 0.74, y: 0.26, r: 0.05, color: '#FFF4DE' },
    ridges: [
      { color: '#5E8A7E', base: 0.56, amp: 0.06, seed: 19 },
      { color: '#3A6457', base: 0.66, amp: 0.05, seed: 20, pines: true },
      { color: '#21423A', base: 0.8, amp: 0.03, seed: 21 },
    ],
    feature: 'stream',
  },
  waterfall: {
    sky: ['#162E38', '#5D8A92', '#B5D0CF'],
    ridges: [
      { color: '#4D7575', base: 0.5, amp: 0.06, seed: 22 },
      { color: '#1F3A3A', base: 0.88, amp: 0.04, seed: 24, pines: true },
    ],
    mist: '#E4F0F0',
    feature: 'waterfall',
  },
  ocean: {
    sky: ['#1B2F4D', '#6D8FB3', '#E2CFB4'],
    light: { x: 0.66, y: 0.5, r: 0.06, color: '#FBE6C4' },
    ridges: [{ color: '#3B5170', base: 0.54, amp: 0.025, seed: 25 }],
    feature: 'ocean',
  },
  night: {
    sky: ['#070F1D', '#14243A', '#26405A'],
    light: { x: 0.22, y: 0.24, r: 0.045, color: '#F2ECE0' },
    stars: true,
    ridges: [
      { color: '#18293C', base: 0.66, amp: 0.06, seed: 26 },
      { color: '#0F1C2B', base: 0.8, amp: 0.05, seed: 27, pines: true },
    ],
    feature: 'fireflies',
  },
  fire: {
    sky: ['#0B1018', '#1A1E2A', '#2E2A30'],
    stars: true,
    ridges: [
      { color: '#1A1F28', base: 0.64, amp: 0.06, seed: 28, pines: true },
      { color: '#0E1217', base: 0.82, amp: 0.02, seed: 29 },
    ],
    feature: 'fire',
  },
  tone: {
    sky: ['#17213B', '#3D5677', '#7B95A8'],
    ridges: [{ color: '#18253A', base: 0.86, amp: 0.03, seed: 30 }],
    feature: 'rings',
  },
};

/** Today's window: the sky that matches the hour. */
export function sceneForHour(hour: number): SceneId {
  if (hour >= 5 && hour < 10) return 'dawn';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'evening';
}

/** The colour at the top of a scene's sky, for a status bar area that has to meet it. */
export function sceneSky(id: SceneId): string {
  return SCENES[id].sky[0];
}

function rng(seed: number) {
  let a = seed * 9301 + 49297;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ridgeY(r: Ridge, x: number, h: number) {
  const p = r.seed * 1.7;
  const u = x * Math.PI * 2;
  const n = 0.55 * Math.sin(u * 1.1 + p) + 0.3 * Math.sin(u * 2.3 + p * 2.1) + 0.15 * Math.sin(u * 4.7 + p * 0.6);
  return h * (r.base - r.amp * n);
}

function ridgePath(r: Ridge, w: number, h: number): SkPath {
  const path = Skia.Path.Make();
  const steps = 48;
  path.moveTo(0, h);
  for (let i = 0; i <= steps; i++) path.lineTo((w * i) / steps, ridgeY(r, i / steps, h));
  path.lineTo(w, h);
  path.close();
  if (r.pines) {
    const rand = rng(r.seed + 100);
    const count = Math.round(w / 16);
    for (let i = 0; i < count; i++) {
      if (rand() < 0.35) continue;
      const x = (i + rand() * 0.8) / count;
      const gx = x * w;
      const gy = ridgeY(r, x, h) + 2;
      const th = h * (0.05 + rand() * 0.07);
      const tw = th * 0.42;
      for (let k = 0; k < 3; k++) {
        const top = gy - th * (1 - k * 0.22);
        const bot = gy - th * (0.42 - k * 0.2);
        const half = tw * (0.55 + k * 0.22);
        path.moveTo(gx, top);
        path.lineTo(gx + half, bot);
        path.lineTo(gx - half, bot);
        path.close();
      }
    }
  }
  return path;
}

type Props = {
  scene: SceneId;
  width: number;
  height: number;
  /** No motion: for thumbnails, and anywhere many are on screen at once. */
  still?: boolean;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  /** Fade the lower part into this colour, so the scene opens out of the screen behind it. */
  fadeTo?: string;
};

export function Landscape({ scene, width: w, height: h, still, style, radius = 0, fadeTo }: Props) {
  const def = SCENES[scene];
  const reduceMotion = useReducedMotion();
  const clock = useClock();
  const moving = !still && !reduceMotion;
  // Seconds, frozen when still.
  const t = useDerivedValue(() => (moving ? clock.value / 1000 : 12), [moving]);

  const shapes = useMemo(() => {
    const rand = rng(scene.length * 31 + 7);
    const ridges = def.ridges.map((r) => ({ color: r.color, path: ridgePath(r, w, h) }));
    const stars = def.stars
      ? Array.from({ length: Math.round((w * h) / 2600) }, () => ({ x: rand() * w, y: rand() * h * 0.5, r: 0.4 + rand() * 0.9, o: 0.25 + rand() * 0.6 }))
      : [];
    return { ridges, stars };
  }, [def, scene, w, h]);

  return (
    <View style={[{ width: w, height: h, borderRadius: radius, overflow: 'hidden' }, style]} pointerEvents="none">
      <Canvas style={{ width: w, height: h }}>
        <Rect x={0} y={0} width={w} height={h}>
          <LinearGradient start={vec(0, 0)} end={vec(0, h)} colors={def.sky} />
        </Rect>
        {shapes.stars.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} color="#F2ECE0" opacity={s.o} />
        ))}
        {def.light ? <Light {...def.light} w={w} h={h} /> : null}
        {def.feature === 'rings' ? <Rings w={w} h={h} t={t} /> : null}
        {def.feature === 'ocean' ? <Ocean w={w} h={h} t={t} /> : null}
        {shapes.ridges.map((r, i) => (
          <Group key={i}>
            <Path path={r.path} color={r.color} />
            {def.feature === 'waterfall' && i === 0 ? <Waterfall w={w} h={h} t={t} /> : null}
          </Group>
        ))}
        {def.feature === 'stream' ? <Stream w={w} h={h} t={t} /> : null}
        {def.mist ? <Mist w={w} h={h} t={t} color={def.mist} /> : null}
        {def.feature === 'rain' ? <Rain w={w} h={h} t={t} /> : null}
        {def.feature === 'fireflies' ? <Fireflies w={w} h={h} t={t} /> : null}
        {def.feature === 'fire' ? <Fire w={w} h={h} t={t} /> : null}
        {fadeTo ? (
          <Rect x={0} y={h * 0.55} width={w} height={h * 0.45}>
            <LinearGradient start={vec(0, h * 0.55)} end={vec(0, h)} colors={[`${fadeTo}00`, fadeTo]} />
          </Rect>
        ) : null}
      </Canvas>
    </View>
  );
}

type Layer = { w: number; h: number; t: SharedValue<number> };

function Light({ x, y, r, color, w, h }: { x: number; y: number; r: number; color: string; w: number; h: number }) {
  const R = r * Math.max(w, h);
  return (
    <Group>
      <Circle cx={x * w} cy={y * h} r={R * 2.6} color={color} opacity={0.16}>
        <BlurMask blur={R * 1.6} style="normal" />
      </Circle>
      <Circle cx={x * w} cy={y * h} r={R} color={color} />
    </Group>
  );
}

/** Low banks of mist, drifting sideways very slowly. Drawn twice so the drift wraps. */
function Mist({ w, h, t, color }: Layer & { color: string }) {
  const transform = useDerivedValue(() => [{ translateX: -((t.value * 6) % w) }]);
  const bank = (dx: number) => (
    <Group key={dx}>
      <Rect x={dx - w * 0.1} y={h * 0.7} width={w * 0.7} height={h * 0.06} color={color} opacity={0.14}>
        <BlurMask blur={h * 0.05} style="normal" />
      </Rect>
      <Rect x={dx + w * 0.45} y={h * 0.8} width={w * 0.6} height={h * 0.05} color={color} opacity={0.1}>
        <BlurMask blur={h * 0.05} style="normal" />
      </Rect>
    </Group>
  );
  return <Group transform={transform}>{[bank(0), bank(w)]}</Group>;
}

function Rain({ w, h, t }: Layer) {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const rand = rng(77);
    const n = Math.round((w * h) / 900);
    for (let i = 0; i < n; i++) {
      const x = rand() * (w + h * 0.2);
      const y = rand() * h;
      const len = 6 + rand() * 12;
      p.moveTo(x, y);
      p.lineTo(x - len * 0.18, y + len);
    }
    return p;
  }, [w, h]);
  const transform = useDerivedValue(() => {
    const k = (t.value * 160) % h;
    return [{ translateX: -k * 0.18 }, { translateY: k }];
  });
  return (
    <Group transform={transform} opacity={0.38}>
      <Path path={path} color="#D4E2EC" style="stroke" strokeWidth={1} />
      <Group transform={[{ translateX: h * 0.18 }, { translateY: -h }]}>
        <Path path={path} color="#D4E2EC" style="stroke" strokeWidth={1} />
      </Group>
    </Group>
  );
}

function Waterfall({ w, h, t }: Layer) {
  const x = w * 0.46;
  const top = h * 0.36;
  const fw = Math.max(10, w * 0.09);
  const bottom = h * 0.9;
  const streaks = useMemo(() => {
    const p = Skia.Path.Make();
    const rand = rng(91);
    const span = bottom - top;
    for (let i = 0; i < 26; i++) {
      const sx = x + rand() * fw;
      const sy = top + rand() * span * 2 - span;
      p.moveTo(sx, sy);
      p.lineTo(sx, sy + 8 + rand() * 20);
    }
    return p;
  }, [x, top, fw, bottom]);
  const transform = useDerivedValue(() => [{ translateY: (t.value * 70) % (bottom - top) }]);
  const clip = useMemo(() => Skia.XYWHRect(x, top, fw, bottom - top), [x, top, fw, bottom]);
  return (
    <Group>
      <Rect x={x} y={top} width={fw} height={bottom - top}>
        <LinearGradient start={vec(0, top)} end={vec(0, bottom)} colors={['#B8D6DC', '#E6F2F2']} />
      </Rect>
      <Group clip={clip}>
        <Group transform={transform}>
          <Path path={streaks} color="#FFFFFF" style="stroke" strokeWidth={1.2} opacity={0.55} />
        </Group>
      </Group>
      <Circle cx={x + fw / 2} cy={bottom} r={fw * 1.6} color="#EEF6F6" opacity={0.35}>
        <BlurMask blur={fw} style="normal" />
      </Circle>
    </Group>
  );
}

function Ocean({ w, h, t }: Layer) {
  const horizon = h * 0.56;
  const lines = useMemo(() => {
    const p = Skia.Path.Make();
    for (let k = 0; k < 6; k++) {
      const y = horizon + (h - horizon) * (0.15 + k * 0.15);
      const amp = 1 + k * 0.9;
      const wl = 30 + k * 16;
      p.moveTo(-wl, y);
      for (let x = -wl; x <= w * 2; x += 6) p.lineTo(x, y + Math.sin((x / wl) * Math.PI * 2) * amp);
    }
    return p;
  }, [w, h, horizon]);
  const transform = useDerivedValue(() => [{ translateX: -((t.value * 8) % w) }]);
  return (
    <Group>
      <Rect x={0} y={horizon} width={w} height={h - horizon}>
        <LinearGradient start={vec(0, horizon)} end={vec(0, h)} colors={['#4E739A', '#1A3048']} />
      </Rect>
      <Rect x={w * 0.5} y={horizon} width={w * 0.32} height={h * 0.02} color="#FBE6C4" opacity={0.35}>
        <BlurMask blur={4} style="normal" />
      </Rect>
      <Group transform={transform} opacity={0.3}>
        <Path path={lines} color="#D9E6F2" style="stroke" strokeWidth={1} />
      </Group>
    </Group>
  );
}

function Stream({ w, h, t }: Layer) {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const y0 = h * 0.7;
    p.moveTo(w * 0.52, y0);
    p.cubicTo(w * 0.6, h * 0.78, w * 0.3, h * 0.84, w * 0.18, h * 1.0);
    p.lineTo(w * 0.72, h * 1.0);
    p.cubicTo(w * 0.62, h * 0.86, w * 0.7, h * 0.76, w * 0.56, y0);
    p.close();
    return p;
  }, [w, h]);
  const shimmer = useDerivedValue(() => 0.5 + 0.12 * Math.sin(t.value * 0.8));
  return (
    <Group>
      <Rect x={0} y={h * 0.78} width={w} height={h * 0.22} color="#1B342E" />
      <Path path={path} opacity={shimmer}>
        <LinearGradient start={vec(0, h * 0.7)} end={vec(0, h)} colors={['#CFE6E4', '#7FB0BA']} />
      </Path>
    </Group>
  );
}

function Fireflies({ w, h, t }: Layer) {
  const flies = useMemo(() => {
    const rand = rng(55);
    return Array.from({ length: 9 }, () => ({ x: rand() * w, y: h * (0.62 + rand() * 0.3), phase: rand() * 6.28, speed: 0.5 + rand() * 0.5 }));
  }, [w, h]);
  return (
    <Group>
      {flies.map((f, i) => (
        <Firefly key={i} {...f} t={t} />
      ))}
    </Group>
  );
}

function Firefly({ x, y, phase, speed, t }: { x: number; y: number; phase: number; speed: number; t: SharedValue<number> }) {
  const opacity = useDerivedValue(() => Math.max(0, Math.sin(t.value * speed + phase)) * 0.9);
  return (
    <Circle cx={x} cy={y} r={1.6} color="#F6E7A6" opacity={opacity}>
      <BlurMask blur={2} style="solid" />
    </Circle>
  );
}

function Fire({ w, h, t }: Layer) {
  const cx = w * 0.5;
  const base = h * 0.86;
  const s = Math.min(w, h);
  const flame = useMemo(() => {
    const p = Skia.Path.Make();
    const tear = (x: number, hh: number, ww: number) => {
      p.moveTo(x, base - hh);
      p.cubicTo(x + ww * 0.2, base - hh * 0.6, x + ww, base - hh * 0.35, x, base);
      p.cubicTo(x - ww, base - hh * 0.35, x - ww * 0.2, base - hh * 0.6, x, base - hh);
      p.close();
    };
    tear(cx, s * 0.24, s * 0.09);
    tear(cx - s * 0.06, s * 0.15, s * 0.06);
    tear(cx + s * 0.065, s * 0.17, s * 0.06);
    return p;
  }, [cx, base, s]);
  const glow = useDerivedValue(() => 0.32 + 0.05 * Math.sin(t.value * 1.3) + 0.03 * Math.sin(t.value * 2.9 + 1));
  const sway = useDerivedValue(() => [{ translateX: cx }, { translateY: base }, { scaleY: 1 + 0.04 * Math.sin(t.value * 1.7) }, { translateX: -cx }, { translateY: -base }]);
  return (
    <Group>
      <Circle cx={cx} cy={base - s * 0.1} r={s * 0.42} color="#F4B98B" opacity={glow}>
        <BlurMask blur={s * 0.2} style="normal" />
      </Circle>
      <Group transform={sway}>
        <Path path={flame}>
          <LinearGradient start={vec(0, base - s * 0.25)} end={vec(0, base)} colors={['#FFE7B8', '#F6B77E']} />
          <BlurMask blur={2} style="solid" />
        </Path>
      </Group>
      <Rect x={cx - s * 0.16} y={base - 2} width={s * 0.32} height={s * 0.035} color="#3A2E2A" />
    </Group>
  );
}

function Rings({ w, h, t }: Layer) {
  const cx = w / 2;
  const cy = h * 0.46;
  const s = Math.min(w, h);
  const scale = useDerivedValue(() => [{ translateX: cx }, { translateY: cy }, { scale: 1 + 0.03 * Math.sin(t.value * 0.55) }, { translateX: -cx }, { translateY: -cy }]);
  return (
    <Group transform={scale}>
      {[0.36, 0.27, 0.18].map((r, i) => (
        <Circle key={r} cx={cx} cy={cy} r={s * r} color="#A8DCC4" opacity={0.1 + i * 0.08}>
          <BlurMask blur={s * 0.04} style="normal" />
        </Circle>
      ))}
      <Circle cx={cx} cy={cy} r={s * 0.07} color="#F2ECE0" opacity={0.85}>
        <BlurMask blur={s * 0.03} style="solid" />
      </Circle>
    </Group>
  );
}
