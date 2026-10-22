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
