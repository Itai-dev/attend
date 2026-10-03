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

export const BODY_SKSL = `
uniform float2 uRes;
uniform float uTime;
uniform float uMotion;
uniform float uReveal;
uniform float uScale;
uniform float uFocus;
uniform float3 uBg;

uniform float4 uA0; uniform float4 uB0; uniform float4 uC0; uniform float3 uK0;
uniform float4 uA1; uniform float4 uB1; uniform float4 uC1; uniform float3 uK1;
uniform float4 uA2; uniform float4 uB2; uniform float4 uC2; uniform float3 uK2;
uniform float4 uA3; uniform float4 uB3; uniform float4 uC3; uniform float3 uK3;
uniform float4 uA4; uniform float4 uB4; uniform float4 uC4; uniform float3 uK4;
uniform float4 uA5; uniform float4 uB5; uniform float4 uC5; uniform float3 uK5;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + float2(17.0, 9.0);
    a *= 0.5;
  }
  return v;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdCapsule(float2 p, float2 a, float2 b, float r) {
  float2 pa = p - a;
  float2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float sdEllipse(float2 p, float2 c, float2 r) {
  float2 q = (p - c) / r;
  return (length(q) - 1.0) * min(r.x, r.y);
}

float body(float2 p) {
  float2 q = float2(abs(p.x), p.y);
  float d = sdEllipse(p, float2(0.0, 0.07), float2(0.049, 0.06));
  d = smin(d, sdCapsule(p, float2(0.0, 0.118), float2(0.0, 0.19), 0.023), 0.022);
  float t = sdEllipse(p, float2(0.0, 0.29), float2(0.088, 0.1));
  t = smin(t, sdCapsule(q, float2(0.068, 0.222), float2(0.058, 0.34), 0.04), 0.035);
  t = smin(t, sdEllipse(p, float2(0.0, 0.39), float2(0.073, 0.075)), 0.04);
  t = smin(t, sdEllipse(p, float2(0.0, 0.475), float2(0.092, 0.07)), 0.045);
  t = smin(t, sdCapsule(q, float2(0.0, 0.206), float2(0.1, 0.212), 0.03), 0.04);
  d = smin(d, t, 0.024);
  float a = sdCapsule(q, float2(0.124, 0.224), float2(0.158, 0.36), 0.026);
  a = smin(a, sdCapsule(q, float2(0.158, 0.36), float2(0.182, 0.495), 0.021), 0.014);
  a = smin(a, sdEllipse(q, float2(0.19, 0.54), float2(0.019, 0.033)), 0.014);
  d = smin(d, a, 0.012);
  float l = sdCapsule(q, float2(0.05, 0.515), float2(0.062, 0.73), 0.044);
  l = smin(l, sdCapsule(q, float2(0.062, 0.73), float2(0.06, 0.925), 0.03), 0.02);
  l = smin(l, sdCapsule(q, float2(0.058, 0.948), float2(0.075, 0.972), 0.017), 0.012);
  d = smin(d, l, 0.02);
  return d;
}

float soft(float d, float r, float clearEdge) {
  float x = d / max(r, 0.0001);
  float gaussian = exp(-x * x * 2.2);
  float plateau = exp(-x * x * x * x * 2.6);
  return mix(gaussian, plateau, clearEdge);
}

float sdSegment(float2 p, float2 a, float2 b, out float h) {
  float2 pa = p - a;
  float2 ba = b - a;
  h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.00001), 0.0, 1.0);
  return length(pa - ba * h);
}

float3 field(float2 p, float4 A, float4 B, float4 C, float3 K, float t) {
  float inten = A.w;
  if (inten <= 0.001) { return float3(0.0); }
  float2 c = A.xy;
  float r = A.z;
  float fam = B.x;
  float shape = B.y;
  float temporal = B.z;
  float mv = B.w;
  float clearEdge = C.w;

  if (shape < 0.5) { r *= 0.72; }
  else if (shape < 1.5) { r *= 1.3; }
  else if (shape > 2.5 && shape < 3.5) { r *= 1.1; }

  float2 q = p - c;
  float dist = length(q);
  float v = 0.0;
  float2 dir = float2(0.0, -1.0);
  if (C.z > 0.5) { dir = normalize(C.xy - c + float2(0.00001, 0.0)); }

  if (fam < 0.5) {
    float rr = r * (1.0 - 0.1 * (0.5 + 0.5 * sin(t * 1.1)));
    float ring = 0.5 + 0.5 * sin(dist / rr * 16.0 + t * 2.4);
    v = soft(dist, rr, clearEdge) * (0.72 + 0.28 * ring);
  } else if (fam < 1.5) {
    float rr = r * (1.0 + 0.13 * sin(t * 0.7));
    float2 qq = float2(q.x, q.y * 1.3);
    v = soft(length(qq), rr, clearEdge) * 0.95;
  } else if (fam < 2.5) {
    float2 perp = float2(-dir.y, dir.x);
    float along = dot(q, dir);
    float across = dot(q, perp);
    float d2 = length(float2(along * 0.55, across * 1.35));
    float streak = 0.5 + 0.5 * sin(along * 110.0 - t * 3.2);
    v = soft(d2, r, clearEdge) * (0.75 + 0.25 * streak);
  } else if (fam < 3.5) {
    float n = fbm(p * 22.0 + float2(0.0, -t * 0.35));
    v = soft(dist * (0.8 + 0.45 * n), r * 1.15, clearEdge * 0.5) * (0.85 + 0.25 * n);
  } else if (fam < 4.5) {
    float g = hash(floor(p * 260.0) + floor(t * 11.0));
    v = soft(dist, r * 1.05, clearEdge) * (0.45 + 0.75 * g * g);
  } else if (fam < 5.5) {
    float beat = pow(0.5 + 0.5 * sin(t * 3.1), 3.0);
    v = soft(dist, r * (1.0 + 0.18 * beat), clearEdge) * (0.8 + 0.25 * beat);
  } else if (fam < 6.5) {
    float tw = 0.9 + 0.1 * sin(t * 5.0);
    v = soft(dist, r * 0.5, 0.6) * 1.2 * tw + soft(dist, r * 1.2, 0.0) * 0.32;
  } else if (fam < 7.5) {
    float2 qq = q - float2(0.0, 0.006 * sin(t * 0.45));
    v = soft(length(float2(qq.x, qq.y * 0.85)), r * 1.12, clearEdge * 0.5) * 0.85;
  } else if (fam < 8.5) {
    v = soft(dist, r, clearEdge) * 0.5;
  } else if (fam < 9.5) {
    v = soft(dist, r, clearEdge) * (0.82 + 0.18 * sin(dist * 70.0 - t * 1.4));
  } else {
    v = soft(dist, r, clearEdge) * 0.8;
  }

  if (temporal > 0.5 && temporal < 1.5) { v *= 0.78 + 0.22 * sin(t * 3.0); }
  else if (temporal > 1.5 && temporal < 2.5) { v *= 0.5 + 0.5 * smoothstep(-0.4, 0.7, sin(t * 0.85)); }
  else if (temporal > 2.5 && temporal < 3.5) { v *= 0.8 + 0.2 * noise(float2(t * 0.6, A.x * 40.0)); }

  if (C.z > 0.5 && mv > 0.5 && mv < 1.5) {
    float h;
    float ds = sdSegment(p, c, C.xy, h);
    float travel = 0.5 + 0.5 * sin(h * 11.0 - t * 2.1);
    float flow = soft(ds, r * 0.5, 0.0) * (0.3 + 0.7 * travel) * (0.55 + 0.45 * h);
    float arrive = soft(length(p - C.xy), r * 0.75, 0.0) * 0.55;
    v = max(v, max(flow * 0.85, arrive));
  }
  if (mv > 1.5 && mv < 2.5) {
    float wave = 0.5 + 0.5 * sin(dist / r * 9.0 - t * 1.7);
    v += soft(dist, r * 1.7, 0.0) * 0.38 * wave;
  } else if (mv > 2.5) {
    float wave = 0.5 + 0.5 * sin(dist / r * 9.0 + t * 1.7);
    v += soft(dist, r * 1.5, 0.0) * 0.3 * wave;
  }

  float3 hue = K * mix(float3(1.0), K, 0.55);
  return hue * v * inten * 1.3;
}

half4 main(float2 fragCoord) {
  float figH = uRes.y * 0.92 * uScale;
  float2 p = (fragCoord - float2(uRes.x * 0.5, uRes.y * 0.5)) / figH + float2(0.0, uFocus);
  float t = uTime * uMotion + 3.0;

  float d = body(p);
  float px = 1.0 / figH;
  float inside = smoothstep(px * 1.2, -px * 1.2, d);

  float2 g = p * 150.0;
  float2 cell = fract(g) - 0.5;
  float jitter = noise(floor(g) * 0.37);
  float dotMask = smoothstep(0.2, 0.08, length(cell)) * inside;

  float rim = exp(-abs(d) * 110.0) * 0.5 + exp(-max(d, 0.0) * 28.0) * 0.06;
  float3 moon = float3(0.93, 0.91, 0.87);
  float3 col = moon * (inside * 0.035 + dotMask * (0.07 + 0.04 * jitter) + rim * 0.32);

  float3 acc = float3(0.0);
  acc += field(p, uA0, uB0, uC0, uK0, t);
  acc += field(p, uA1, uB1, uC1, uK1, t);
  acc += field(p, uA2, uB2, uC2, uK2, t);
  acc += field(p, uA3, uB3, uC3, uK3, t);
  acc += field(p, uA4, uB4, uC4, uK4, t);
  acc += field(p, uA5, uB5, uC5, uK5, t);

  float outside = (1.0 - inside) * exp(-max(d, 0.0) * 20.0) * 0.7;
  float3 light = acc * (inside * 0.95 + outside) + acc * dotMask * 1.7;
  col += light * uReveal;

  col = float3(1.0) - exp(-col * 1.35);
  float grain = (hash(fragCoord + fract(t)) - 0.5) * 0.012;
  col = uBg + col * (1.0 - uBg) + grain;
  return half4(col, 1.0);
}
`;

export const BREATH_SKSL = `
uniform float2 uRes;
uniform float uTime;
uniform float uMotion;
uniform float uSpeak;
uniform float uListen;
uniform float uLevel;
uniform float uDim;
uniform float3 uBg;

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

  float3 lilac = float3(0.72, 0.65, 1.0);
  float3 apricot = float3(1.0, 0.76, 0.6);
  float3 sea = float3(0.42, 0.86, 0.78);
  float3 moon = float3(0.95, 0.93, 0.9);
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
  col = uBg + col * (1.0 - uBg) + grain;
  return half4(col, 1.0);
}
`;
