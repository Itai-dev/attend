/**
 * The two SkSL shaders that carry Attend's visual identity.
 *
 * BODY: an abstract figure built from a smooth union of soft primitives,
 * drawn as a faint luminous rim and a fine dot screen, with up to six
 * sensation fields living inside it. Each quality has its own motion
 * language — tightness draws inward, pressure breathes, pulling streams
 * along a direction, warmth drifts, buzzing grains, throbbing pulses,
 * sharpness concentrates, heaviness sinks, numbness barely moves. These are
 * aesthetic metaphors for what the person said, not a picture of tissue,
 * nerves or brain activity.
 *
 * BREATH: the session visual. One organic form that breathes at about five
 * and a half breaths a minute, warms slightly while the guide speaks and
 * opens, listening, when it is the person's turn.
 *
 * Both take `uMotion` (0 = Reduce Motion: a still frame) and draw their own
 * background so the canvas is opaque and cheap to composite.
 */

export const BREATH_SKSL = `
uniform float2 uRes;
uniform float uTime;
uniform float uMotion;
uniform float uSpeak;
uniform float uListen;
uniform float uLevel;
uniform float uDim;
uniform float3 uBg;
uniform float3 uInk;
uniform float uPaper;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1.0, 0.0)), u.x), mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x), u.y);
}

float fbm(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.0 + float2(5.2, 1.3);
    a *= 0.5;
  }
  return v;
}

half4 main(float2 fragCoord) {
  float s = min(uRes.x, uRes.y);
  float2 p = (fragCoord - uRes * 0.5) / s;
  float t = uTime * uMotion;

  float breath = sin(t * 6.2831853 / 11.0);
  float ang = atan(p.y, p.x);
  float2 ring = float2(cos(ang), sin(ang));
  float warp = fbm(ring * 1.3 + float2(t * 0.05, -t * 0.035));
  float ripple = sin(ang * 5.0 + t * 1.8) * 0.01 * uSpeak + sin(ang * 3.0 - t * 1.1) * 0.022 * uLevel * uListen;
  float R = 0.18 * (1.0 + 0.075 * breath + 0.05 * uListen) * (0.87 + 0.26 * warp) + ripple + 0.025 * uLevel * uListen;

  float d = length(p) - R;
  float body = smoothstep(0.06, -0.09, d);
  float rr = length(p) / R;
  float core = exp(-rr * rr * 1.25);
  float rim = exp(-abs(d) * 36.0);
  float halo = exp(-max(d, 0.0) * 6.5);

  // Grey with a breath of the app's sage (21 Oct 2026): told mostly by light and movement,
  // barely by hue. The names stay so the mixing below reads as before.
  float3 lilac = float3(0.70, 0.80, 0.76);
  float3 apricot = float3(0.82, 0.88, 0.85);
  float3 sea = float3(0.60, 0.74, 0.69);
  float3 moon = float3(0.95, 0.96, 0.95);
  float3 tint = mix(lilac, apricot, uSpeak * 0.5);
  tint = mix(tint, sea, uListen * 0.6);

  float n1 = fbm(p * 4.2 + float2(t * 0.05, -t * 0.03));
  float n2 = fbm(p * 7.5 - float2(t * 0.04, t * 0.06));
  float3 inner = mix(tint, apricot, smoothstep(0.45, 0.85, n1) * 0.3);
  inner = mix(inner, sea, smoothstep(0.5, 0.9, n2) * 0.22 * (1.0 - uSpeak));

  float3 col = inner * core * (0.34 + 0.32 * n1) * body + tint * halo * 0.14 + moon * rim * 0.08;
  col *= (0.6 + 0.4 * (0.5 + 0.5 * breath) * uMotion + 0.4 * (1.0 - uMotion)) * uDim;
  col *= smoothstep(0.5, 0.26, length(p));

  col = float3(1.0) - exp(-col * 1.35);
  float grain = (hash(fragCoord + fract(t * 0.37)) - 0.5) * 0.014;
  // Sumi (night): light on charcoal, as it always was. Washi (day): the same form as a soft
  // ink wash on the paper, so a daytime session is not a dark rectangle on a light app.
  float3 onDark = uBg + col * (1.0 - uBg);
  float wash = clamp(dot(col, float3(0.3333)) * 0.9, 0.0, 1.0);
  float3 onPaper = mix(uBg, uInk, wash);
  col = mix(onDark, onPaper, uPaper) + grain;
  return half4(col, 1.0);
}
`;

/**
 * ECLIPSE: the ring of grain (5 Nov 2026), two ways.
 *
 * The mark (`uEclipse` 1, tools/make-mark.py): eclipsed on the right by an unseen disc 1.4x
 * its size, so it dissolves along a curve. The other screens show it, breathing slowly.
 *
 * The session (`uEclipse` 0): a whole, perfect ring at rest, and only the guide's voice
 * changes it. As a line is spoken the ring loosens into grain all the way round, more in some
 * places than others, the places drifting slowly round the circle; in the silence after it, it
 * gathers back into the whole ring. Under Reduce Motion it is still.
 *
 * `uOpaque` 1 draws the background (the session, full screen); 0 draws the mark alone with
 * alpha (the small mark on other screens).
 */
export const ECLIPSE_SKSL = `
uniform float2 uRes;
uniform float uTime;
uniform float uMotion;
uniform float uLevel;
uniform float uSpeak;
uniform float uDim;
uniform float3 uBg;
uniform float3 uInk;
uniform float uOpaque;
uniform float uSize;
uniform float uGrain;
uniform float uEclipse;

// No sin(): on GPUs its precision breaks down at large arguments and the grain lines up
// in diagonal streaks.
float hash(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1.0, 0.0)), u.x), mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x), u.y);
}

half4 main(float2 fragCoord) {
  float s = min(uRes.x, uRes.y);
  float2 p = (fragCoord - uRes * 0.5) / s;
  float t = uTime * uMotion;

  // The voice, or, where the voice can't be measured, a slow swell while the guide speaks.
  float swell = uSpeak * (0.22 + 0.12 * sin(t * 1.3));
  float L = clamp(max(uLevel, swell), 0.0, 1.0) * uMotion;

  // Round the ring, the voice lands unevenly: some arcs loosen more, and the loosest arcs
  // drift slowly round the circle, like sound moving through it. On the mark this is off.
  float ang = atan(p.y, p.x);
  float arc = noise(float2(cos(ang), sin(ang)) * 1.6 + float2(t * 0.22, -t * 0.17));
  float local = L * mix(1.0, 0.35 + 1.1 * arc, 1.0 - uEclipse);

  float breath = sin(t * 6.2831853 / 10.0) * uMotion;
  float ro = uSize * (1.0 + 0.015 * breath + 0.035 * local * (1.0 - uEclipse));
  float ri = ro * 0.52;

  // Particles drift as it loosens: the sampled radius wanders with a slow noise field.
  float rho = length(p);
  float drift = noise(fragCoord / (s * 0.018) + float2(t * 0.35, -t * 0.25)) - 0.35;
  rho -= local * 0.1 * drift * ro / 0.31;

  float outSoft = (0.07 + 0.28 * local) * ro;
  float inSoft = (0.045 + 0.16 * local) * ro;
  float band = smoothstep(ri - inSoft, ri + inSoft, rho) * (1.0 - smoothstep(ro - outSoft, ro + outSoft, rho));
  band = pow(band, 0.8);

  // The eclipse: the mark's disc at rest, moving in and softening with the voice.
  float moonDx = (1.95 - 0.4 * L) * ro;
  float moonR = 1.4 * ro;
  float moonSoft = (0.45 + 0.3 * L) * ro;
  float md = length(p - float2(moonDx, 0.0));
  float moon = mix(1.0, smoothstep(moonR - moonSoft, moonR + moonSoft, md), uEclipse);

  // Loud, the ring itself thins into grain: patches of it open up and fill again, so it breaks
  // down into smaller dots and is rebuilt as the voice falls.
  float holes = noise(fragCoord / (s * 0.03) + float2(-t * 0.5, t * 0.4));
  float density = clamp(band * moon * (1.0 - 0.75 * local * smoothstep(0.25, 0.75, holes)), 0.0, 1.0);

  // Grain: a fixed screen of thresholds, so the mark is made of particles, not a blur. While
  // the voice is loud some of them re-roll a few times a second: the grain shimmers.
  float2 cell = floor(fragCoord / uGrain);
  float h = hash(cell);
  float h2 = hash(cell + floor(t * 6.0) * 17.0);
  // Kept above zero, so where there is no mark there is no grain at all.
  float thr = 0.03 + 0.97 * mix(h, h2, 0.55 * local);
  float a = smoothstep(thr - 0.02, thr + 0.02, density) * uDim;

  if (uOpaque > 0.5) {
    return half4(mix(uBg, uInk, a), 1.0);
  }
  return half4(uInk * a, a);
}
`;

/**
 * MOTIF: the small pictures on Explore's tiles (5 Nov 2026), placeholders until there is
 * illustration. Drawn in the same grain as the ring, in the tile's own light colour over its
 * dye, so the shelves keep their colours and each tile says at a glance what it is. Kept to
 * the top of the tile: the title sits below. Still, never animated: a shelf is for browsing.
 *
 *   0 ring        familiar pain: meet what's here
 *   1 low sun     flares: slower, steadier
 *   2 crescent    sleep
 *   3 two circles worry: fear and sensation, side by side
 *   4 stream      5 waves      6 rain      7 pines
 */
export const MOTIF_SKSL = `
uniform float2 uRes;
uniform float uKind;
uniform float uSeed;
uniform float3 uInk;
uniform float uGrain;

float hash(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float band(float d, float w, float soft) {
  return 1.0 - smoothstep(w - soft, w + soft, abs(d));
}

float disc(float2 q, float2 c, float r, float soft) {
  return 1.0 - smoothstep(r - soft, r + soft, length(q - c));
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / uRes;
  float aspect = uRes.x / uRes.y;
  // Square-ish working space: x scaled so circles stay round on tall or wide tiles.
  float2 q = float2(uv.x * aspect, uv.y);
  float sx = fract(uSeed * 0.618);
  float sy = fract(uSeed * 0.414);
  float d = 0.0;
  int k = int(uKind + 0.5);

  if (k == 0) {
    float r = 0.17 + 0.04 * sy;
    // Kept inside the tile whatever its shape: the ring's right edge stops short of the side.
    float2 c = float2(min(aspect * (0.5 + 0.14 * sx), aspect - r - 0.11), 0.3 + 0.05 * sy);
    d = band(length(q - c) - r, 0.055, 0.03);
  } else if (k == 1) {
    float hy = 0.42;
    float2 c = float2(aspect * (0.5 + 0.2 * (sx - 0.5)), hy);
    float sun = disc(q, c, 0.17 + 0.03 * sy, 0.035) * (1.0 - smoothstep(hy - 0.005, hy + 0.01, uv.y));
    float line = band(uv.y - hy - 0.025, 0.006, 0.006) * smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);
    float line2 = band(uv.y - hy - 0.07, 0.004, 0.005) * smoothstep(0.15, 0.35, uv.x) * smoothstep(0.85, 0.65, uv.x) * 0.7;
    d = max(sun * 0.85, max(line, line2));
  } else if (k == 2) {
    float2 c = float2(aspect * (0.6 + 0.12 * sx), 0.28 + 0.05 * sy);
    float r = 0.15;
    float moon = disc(q, c, r, 0.02) * (1.0 - disc(q, c + float2(0.07, -0.045), r * 0.92, 0.025));
    float2 cell = floor(q * 22.0);
    float star = step(0.965, hash(cell + uSeed)) * disc(fract(q * 22.0), float2(0.5), 0.12, 0.06) * smoothstep(0.62, 0.3, uv.y);
    d = max(moon, star);
  } else if (k == 3) {
    float2 c = float2(aspect * (0.5 + 0.12 * sx), 0.3);
    float a = band(length(q - c + float2(0.085, 0.0)) - 0.13, 0.04, 0.025);
    float b = band(length(q - c - float2(0.085, 0.0)) - 0.13, 0.04, 0.025);
    d = max(a, b * 0.75);
  } else if (k == 4) {
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float y = 0.16 + fi * 0.055 + 0.018 * sin(uv.x * 9.0 + fi * 1.7 + uSeed);
      d = max(d, band(uv.y - y, 0.009, 0.008) * (0.55 + 0.45 * sin(uv.x * 3.0 + fi)));
    }
  } else if (k == 5) {
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float y = 0.18 + fi * 0.075 - 0.05 * sin(uv.x * 3.1416 * (1.2 + 0.2 * fi) + fi * 0.9 + uSeed);
      d = max(d, band(uv.y - y, 0.012 - fi * 0.002, 0.01) * (1.0 - fi * 0.15));
    }
  } else if (k == 6) {
    float2 g = float2(q.x * 14.0 + q.y * 2.5, q.y * 7.0);
    float2 cell = floor(g);
    float2 f = fract(g);
    float on = step(0.55, hash(cell + uSeed));
    float off = hash(cell * 1.7 + 3.0);
    d = on * band(f.x - 0.5, 0.045, 0.03) * band(f.y - 0.5 + (off - 0.5) * 0.3, 0.32, 0.08) * smoothstep(0.66, 0.4, uv.y);
  } else {
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float cx = aspect * (0.32 + fi * 0.22 + 0.04 * sin(fi * 2.3 + uSeed));
      float h = 0.28 + 0.06 * fract(fi * 0.73 + uSeed);
      float top = 0.5 - h;
      float tri = step(top, uv.y) * step(uv.y, 0.5) * (1.0 - smoothstep(0.0, 0.01, abs(q.x - cx) - (uv.y - top) * 0.34));
      d = max(d, tri * (0.85 - fi * 0.15));
    }
    d = max(d, band(uv.y - 0.51, 0.006, 0.006));
  }

  // Leave the lower part to the title.
  d *= smoothstep(0.7, 0.5, uv.y);

  float h = 0.03 + 0.97 * hash(floor(fragCoord / uGrain));
  float a = smoothstep(h - 0.03, h + 0.03, d) * 0.85;
  return half4(uInk * a, a);
}
`;
