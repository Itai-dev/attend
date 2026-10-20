import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { BREATH_SKSL } from '../src/viz/shaders';
import { clockProgress, clockSpoken, clockText, formatClock, remainingMs } from '../src/domain/sessionClock';
import {
  ATTACK_MS,
  ENVELOPE_REST,
  followEnvelope,
  levelFromRms,
  levelOfFrames,
  LEVEL_CEIL_DB,
  LEVEL_FLOOR_DB,
  PHRASE_MS,
  RELEASE_MS,
  rms,
  syntheticVoice,
  type EnvelopeState,
} from '../src/viz/voiceEnvelope';

/** Run the follower at 60 fps for `ms` toward `target`. */
function run(s: EnvelopeState, target: number, ms: number, dt = 1000 / 60): EnvelopeState {
  for (let t = 0; t < ms; t += dt) s = followEnvelope(s, target, dt);
  return s;
}

describe('session clock (20 Oct 2026: a timer in the session)', () => {
  it('counts down from the plan, pauses excluded (active ms is the engine clock)', () => {
    assert.equal(remainingMs(300_000, 0), 300_000);
    assert.equal(remainingMs(300_000, 120_000), 180_000);
    assert.equal(remainingMs(300_000, 400_000), 0);
    assert.equal(remainingMs(0, 5000), 0);
    assert.equal(remainingMs(300_000, -50), 300_000);
  });

  it('formats as m:ss with tabular-friendly two-digit seconds, rounded up', () => {
    assert.equal(formatClock(300_000), '5:00');
    assert.equal(formatClock(299_999), '5:00');
    assert.equal(formatClock(372_000), '6:12');
    assert.equal(formatClock(45_000), '0:45');
    assert.equal(formatClock(9_001), '0:10');
    assert.equal(formatClock(600_000), '10:00');
    assert.equal(formatClock(1), '0:01');
    assert.equal(formatClock(-3), '0:00');
  });

  it('a five-minute practice opens on "5:00"', () => {
    assert.equal(clockText(300_000, 0), '5:00');
    assert.equal(clockText(300_000, 1), '5:00');
    assert.equal(clockText(300_000, 1000), '4:59');
  });

  it('shows nothing without a plan, and goes (rather than reading 0:00) once the plan has run out', () => {
    assert.equal(clockText(0, 0), undefined);
    assert.equal(clockText(300_000, 300_000), undefined);
    assert.equal(clockText(300_000, 330_000), undefined);
    assert.equal(clockSpoken(300_000, 330_000), undefined);
  });

  it('the ring fills 0..1 with practised time and stops full', () => {
    assert.equal(clockProgress(300_000, 0), 0);
    assert.equal(clockProgress(300_000, 150_000), 0.5);
    assert.equal(clockProgress(300_000, 900_000), 1);
    assert.equal(clockProgress(0, 10_000), 0);
  });

  it('reads to VoiceOver in words, singular and plural right', () => {
    assert.equal(clockSpoken(300_000, 0), '5 minutes left');
    assert.equal(clockSpoken(300_000, 72_000), '3 minutes 48 seconds left');
    assert.equal(clockSpoken(61_000, 0), '1 minute 1 second left');
    assert.equal(clockSpoken(45_000, 0), '45 seconds left');
  });

  it('clock copy never grades or warns: digits only, no words about the end', () => {
    for (let a = 0; a < 300_000; a += 7_919) {
      const t = clockText(300_000, a);
      assert.ok(t === undefined || /^\d+:\d\d$/.test(t), t);
    }
  });
});

describe('guide voice level (20 Oct 2026: the orb reacts to the narration)', () => {
  it('RMS of silence is 0, of a full-scale square is 1, of a sine is ~0.707', () => {
    assert.equal(rms([]), 0);
    assert.equal(rms([0, 0, 0, 0]), 0);
    assert.equal(rms([1, -1, 1, -1]), 1);
    const sine = Array.from({ length: 4410 }, (_, i) => Math.sin((2 * Math.PI * 220 * i) / 44100));
    assert.ok(Math.abs(rms(sine) - Math.SQRT1_2) < 0.01);
    // Striding reads fewer samples and lands on nearly the same level.
    assert.ok(Math.abs(rms(sine, 2) - Math.SQRT1_2) < 0.02);
  });

  it('ignores non-finite samples instead of poisoning the level', () => {
    assert.ok(Number.isFinite(rms([NaN, 0.5, Infinity, 0.5])));
  });

  it('maps RMS to 0..1 linearly in decibels between floor and ceiling', () => {
    const at = (db: number) => levelFromRms(10 ** (db / 20));
    assert.equal(levelFromRms(0), 0);
    assert.equal(levelFromRms(-1), 0);
    assert.equal(at(LEVEL_FLOOR_DB - 10), 0);
    assert.ok(Math.abs(at(LEVEL_FLOOR_DB)) < 1e-9);
    assert.ok(Math.abs(at(LEVEL_CEIL_DB) - 1) < 1e-9);
    assert.equal(at(0), 1);
    assert.ok(Math.abs(at((LEVEL_FLOOR_DB + LEVEL_CEIL_DB) / 2) - 0.5) < 1e-9);
    // Typical speech (-20 dBFS RMS) moves the form clearly but leaves headroom.
    const speech = at(-20);
    assert.ok(speech > 0.7 && speech < 0.95, String(speech));
    // Room tone / codec floor (-60 dBFS) is stillness.
    assert.equal(at(-60), 0);
  });

  it('takes the loudest channel of a block', () => {
    const quiet = { frames: Array(512).fill(0.001) };
    const loud = { frames: Array.from({ length: 512 }, (_, i) => (i % 2 ? 0.1 : -0.1)) };
    assert.equal(levelOfFrames([quiet, loud]), levelOfFrames([loud]));
    assert.equal(levelOfFrames([]), 0);
  });

  it('envelope: fast attack (~60 ms), slower release (~250 ms)', () => {
    const up = run(ENVELOPE_REST, 1, ATTACK_MS);
    // One time constant: the follower is ~63% of the way there.
    assert.ok(up.env > 0.55 && up.env < 0.7, String(up.env));
    const full = run(ENVELOPE_REST, 1, 600);
    assert.ok(full.env > 0.99 && full.out > 0.99);
    const down = run(full, 0, ATTACK_MS);
    // After the same 60 ms it has fallen far less than it rose: release is slower.
    assert.ok(down.env > 0.7, String(down.env));
    const later = run(full, 0, RELEASE_MS);
    assert.ok(later.env > 0.3 && later.env < 0.45, String(later.env));
    assert.ok(run(full, 0, 3000).out < 0.01);
  });

  it('envelope: the smoothing stage lags the follower a little, and the output stays in 0..1', () => {
    const s = run(ENVELOPE_REST, 1, 40);
    assert.ok(s.out < s.env);
    assert.ok(s.out > 0);
    const wild = run(ENVELOPE_REST, 7, 500);
    assert.ok(wild.env <= 1 && wild.out <= 1);
    const neg = run(ENVELOPE_REST, -3, 500);
    assert.ok(neg.env >= 0 && neg.out >= 0);
  });

  it('envelope: frame-rate independent, and a long frame (back from background) cannot jump it', () => {
    const at60 = run(ENVELOPE_REST, 1, 200, 1000 / 60);
    const at120 = run(ENVELOPE_REST, 1, 200, 1000 / 120);
    assert.ok(Math.abs(at60.env - at120.env) < 0.02);
    const jump = followEnvelope(ENVELOPE_REST, 1, 5000);
    assert.ok(jump.env < 0.9, String(jump.env));
    assert.deepEqual(followEnvelope({ env: 0.4, out: 0.3 }, 1, 0), { env: 0.4, out: 0.3 });
  });

  it('the synthetic voice speaks in phrases with gaps, within 0..1, the same every run', () => {
    let silent = 0;
    let voiced = 0;
    let sum = 0;
    let peak = 0;
    const N = 60_000;
    for (let t = 0; t < N; t += 10) {
      const v = syntheticVoice(t);
      assert.ok(v >= 0 && v <= 1, `${t}: ${v}`);
      if (v < 0.01) silent++;
      else voiced++;
      sum += v;
      peak = Math.max(peak, v);
      assert.equal(v, syntheticVoice(t));
    }
    // Mostly speech, with real silences (the phrase gaps and between syllables).
    assert.ok(voiced > silent, `${voiced} voiced vs ${silent} silent`);
    assert.ok(silent > (N / 10) * 0.2, `${silent} silent`);
    const mean = sum / (N / 10);
    assert.ok(mean > 0.1 && mean < 0.4, String(mean));
    assert.ok(peak > 0.6 && peak <= 0.87 + 1e-9, String(peak));
    // The end of every phrase is a gap of at least 0.45 s.
    for (let k = 0; k < 20; k++) {
      const end = (k + 1) * PHRASE_MS;
      for (let t = end - 440; t < end; t += 20) assert.equal(syntheticVoice(t), 0, `phrase ${k} at ${t}`);
    }
  });

  it('the synthetic voice through the envelope moves the form modestly and settles in the gaps', () => {
    let s = ENVELOPE_REST;
    let max = 0;
    let min = 1;
    for (let t = 0; t < 30_000; t += 16) {
      s = followEnvelope(s, syntheticVoice(t), 16);
      if (t > 2000) {
        max = Math.max(max, s.out);
        min = Math.min(min, s.out);
      }
    }
    assert.ok(max < 0.9 && max > 0.4, String(max));
    assert.ok(min < 0.05, String(min));
  });

  it('negative time is treated as the start', () => {
    assert.equal(syntheticVoice(-500), syntheticVoice(0));
  });
});

describe('the breathing form shader', () => {
  it('BreathingField passes exactly the uniforms BREATH_SKSL declares (Skia throws on a mismatch)', () => {
    const declared = [...BREATH_SKSL.matchAll(/^uniform\s+\w+\s+(\w+);/gm)].map((m) => m[1]).sort();
    const src = readFileSync(new URL('../src/viz/BreathingField.tsx', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('const uniforms = useDerivedValue'));
    const passed = [...block.slice(0, block.indexOf('};')).matchAll(/^\s+(u[A-Z]\w*):/gm)].map((m) => m[1]).sort();
    assert.deepEqual(passed, declared);
  });

  it('carries no red: every colour constant in the form is cool or neutral', () => {
    for (const m of BREATH_SKSL.matchAll(/float3\(([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/g)) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      assert.ok(!(r > g + 0.15 && r > b + 0.25), `too red: ${m[0]}`);
    }
  });
});
