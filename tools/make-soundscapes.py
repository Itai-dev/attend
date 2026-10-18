"""Generates the nature soundscapes in assets/audio/soundscapes/: forest, rain, waterfall,
ocean, stream, night and fire. Run: python3 tools/make-soundscapes.py  (needs numpy).

Every sound is built to loop without a seam. Noise is shaped in the frequency domain (which
makes it exactly periodic), events that run past the end wrap round to the start, and the
reverb is a circular convolution. So the last sample flows into the first, and a player that
loops the file never clicks.

These are synthesised, not recorded: no licences to track, nothing to attribute, and they
can be regenerated or retuned here. Field recordings can replace any of them later under the
same file name (docs/LAUNCH.md).

Mono, 24 kHz, 16-bit WAV. Calm sounds carry little above 10 kHz, and WAV keeps the loop
gapless where AAC's encoder padding would leave a dropout at the seam.
"""
import os
import wave

import numpy as np

SR = 24000
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio', 'soundscapes')


def freqs(n):
    return np.fft.rfftfreq(n, 1 / SR)


def shaped(n, shape, seed):
    """Periodic noise whose magnitude spectrum follows shape(f)."""
    r = np.random.default_rng(seed)
    spec = np.fft.rfft(r.standard_normal(n))
    f = freqs(n)
    f[0] = 1.0
    x = np.fft.irfft(spec * shape(f), n)
    return x / (np.sqrt(np.mean(x ** 2)) + 1e-12)


def band(lo, hi, slope=2.0):
    """A soft band-pass in log frequency."""
    def s(f):
        hp = 1 / (1 + (lo / f) ** slope)
        lp = 1 / (1 + (f / hi) ** slope)
        return hp * lp
    return s


def tilt(alpha):
    """1/f^alpha: 0 white, 0.5 pink-ish, 1 brown-ish."""
    return lambda f: 1 / np.maximum(f, 20) ** alpha


def mul(*shapes):
    def s(f):
        out = np.ones_like(f)
        for sh in shapes:
            out = out * sh(f)
        return out
    return s


def env_periodic(n, parts):
    """Slow modulation made of whole cycles over the loop, so it loops too. parts: (cycles, depth, phase)."""
    t = np.arange(n) / n
    e = np.ones(n)
    for k, depth, ph in parts:
        e += depth * np.sin(2 * np.pi * k * t + ph)
    return np.maximum(e, 0)


def place(buf, snd, at):
    """Add snd into buf at sample `at`, wrapping round the end."""
    n = len(buf)
    at %= n
    end = at + len(snd)
    if end <= n:
        buf[at:end] += snd
    else:
        k = n - at
        buf[at:] += snd[:k]
        buf[: end - n] += snd[k:]


def reverb(x, seconds, seed, damp_hz=3500):
    """Circular convolution with a decaying, darkening noise tail."""
    n = len(x)
    m = int(seconds * SR)
    r = np.random.default_rng(seed)
    ir = r.standard_normal(m) * np.exp(-np.arange(m) / (m / 6.5))
    ir = np.fft.irfft(np.fft.rfft(ir) / (1 + (freqs(m) / damp_hz) ** 2), m)
    ir /= np.sqrt(np.sum(ir ** 2))
    pad = np.zeros(n)
    pad[:m] = ir
    return np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(pad), n)


def lowpass(x, hz):
    n = len(x)
    return np.fft.irfft(np.fft.rfft(x) / np.sqrt(1 + (freqs(n) / hz) ** 4), n)


def tone_sweep(dur, f0, f1, curve=1.0, vib_hz=0.0, vib_depth=0.0, harm=0.15):
    """A whistle that glides f0 → f1, with optional vibrato and a little second harmonic."""
    m = max(1, int(dur * SR))
    t = np.arange(m) / SR
    u = (t / dur) ** curve
    f = f0 + (f1 - f0) * u
    if vib_hz:
        f = f * (1 + vib_depth * np.sin(2 * np.pi * vib_hz * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + harm * np.sin(2 * ph)
    a = np.minimum(1, t / 0.008) * np.minimum(1, (dur - t) / 0.02)
    return s * np.clip(a, 0, 1) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.5


def burst(dur, lo, hi, seed, decay=None):
    """A short band of noise with a fast attack: a drop, a crackle, a splash."""
    m = max(8, int(dur * SR))
    r = np.random.default_rng(seed)
    x = shaped(m, band(lo, hi, 3.0), seed)
    t = np.arange(m) / SR
    d = decay or dur / 4
    return x * np.exp(-t / d) * np.minimum(1, t / 0.0015) * (0.6 + 0.4 * r.random())


def finish(x, rms_db=-21.0, peak=0.89):
    x = x - np.mean(x)
    x = x / (np.sqrt(np.mean(x ** 2)) + 1e-12) * 10 ** (rms_db / 20)
    # Soft ceiling rather than a clip: no corner is audible at low listening levels.
    return np.tanh(x / peak) * peak


def write(name, x):
    os.makedirs(OUT, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, f'{name}.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'{name}: {len(x) / SR:.0f}s, {os.path.getsize(os.path.join(OUT, name + ".wav")) / 1e6:.1f} MB')


# ---------------------------------------------------------------- the soundscapes

def rain(sec=30):
    n = sec * SR
    r = np.random.default_rng(1)
    hiss = shaped(n, mul(tilt(0.35), band(900, 7000, 1.5)), 11) * 0.55
    body = shaped(n, mul(tilt(0.8), band(120, 1400, 1.5)), 12) * 0.5
    bed = (hiss + body) * env_periodic(n, [(2, 0.08, 0.3), (5, 0.05, 1.7)])
    drops = np.zeros(n)
    for i in range(int(sec * 28)):
        lo = r.uniform(1200, 3500)
        place(drops, burst(r.uniform(0.006, 0.02), lo, lo * 2.2, 100 + i) * r.uniform(0.15, 0.9) ** 2, int(r.integers(n)))
    # A few heavier drops on leaves and the sill: a low plink, never sharp.
    for i in range(int(sec * 1.2)):
        f = r.uniform(900, 2200)
        m = int(0.05 * SR)
        plink = tone_sweep(0.05, f, f * 0.82, harm=0.0) * np.exp(-np.arange(m) / (0.01 * SR))
        place(drops, plink * r.uniform(0.05, 0.18), int(r.integers(n)))
    x = bed + 1.6 * drops + 0.35 * reverb(drops, 0.8, 13)
    return finish(lowpass(x, 7500))


def waterfall(sec=30):
    n = sec * SR
    roar = shaped(n, mul(tilt(0.55), band(150, 2600, 1.4)), 21)
    spray = shaped(n, mul(tilt(0.2), band(1200, 6500, 2.0)), 22) * 0.35
    rumble = shaped(n, band(30, 160, 2.0), 23) * 0.6
    x = roar * env_periodic(n, [(1, 0.06, 0.0), (3, 0.05, 2.0), (7, 0.03, 0.4)])
    x += spray * env_periodic(n, [(13, 0.15, 0.2), (29, 0.1, 1.1), (47, 0.08, 2.3)])
    x += rumble * env_periodic(n, [(2, 0.12, 1.0)])
    return finish(x + 0.3 * reverb(x, 1.2, 24), rms_db=-20)


def ocean(sec=45, waves=6):
    n = sec * SR
    r = np.random.default_rng(3)
    deep = shaped(n, mul(tilt(1.0), band(25, 900, 1.5)), 31)
    wash = shaped(n, mul(tilt(0.3), band(400, 5500, 1.6)), 32)
    t = np.arange(n) / n
    period = 1 / waves
    swell = np.zeros(n)
    crash = np.zeros(n)
    for w in range(waves):
        c = (w + r.uniform(-0.12, 0.12)) * period
        d = ((t - c + 0.5) % 1.0) - 0.5  # signed distance to the wave's peak, wrapping
        a = r.uniform(0.75, 1.0)
        rise = np.exp(-((np.minimum(d, 0) / (period * 0.32)) ** 2))
        fall = np.exp(-np.maximum(d, 0) / (period * 0.38))
        swell += a * np.where(d < 0, rise, fall)
        crash += a * np.exp(-((d - period * 0.04) / (period * 0.16)) ** 2) * (d > -period * 0.2)
    x = deep * (0.35 + 0.65 * swell) + wash * (0.06 + 0.9 * crash ** 1.5)
    return finish(x + 0.25 * reverb(x, 1.5, 33), rms_db=-21)


def stream(sec=30):
    n = sec * SR
    r = np.random.default_rng(4)
    flow = shaped(n, mul(tilt(0.4), band(350, 3800, 1.6)), 41) * env_periodic(n, [(3, 0.1, 0.0), (11, 0.08, 1.0), (23, 0.06, 2.0)])
    bubbles = np.zeros(n)
    for i in range(int(sec * 34)):
        f0 = r.uniform(380, 1500)
        dur = r.uniform(0.02, 0.07)
        b = tone_sweep(dur, f0, f0 * r.uniform(1.15, 1.6), curve=0.6, harm=0.05)
        b *= np.exp(-np.arange(len(b)) / (dur * SR * 0.35))
        place(bubbles, b * r.uniform(0.05, 0.5) ** 1.5, int(r.integers(n)))
    x = 0.5 * flow + 1.8 * bubbles
    return finish(x + 0.3 * reverb(x, 0.7, 42), rms_db=-22)


def bird_phrase(r, kind):
    """Three gentle songs: a warbling run, a rising whistle, a soft two-note coo."""
    if kind == 'warble':
        notes = []
        base = r.uniform(3000, 4200)
        for k in range(int(r.integers(4, 8))):
            f = base * r.uniform(0.85, 1.15)
            notes.append(tone_sweep(r.uniform(0.05, 0.09), f * 1.12, f * 0.9, vib_hz=r.uniform(30, 60), vib_depth=0.02))
            notes.append(np.zeros(int(r.uniform(0.02, 0.05) * SR)))
        return np.concatenate(notes) * 0.5
    if kind == 'whistle':
        f = r.uniform(1900, 2600)
        a = tone_sweep(r.uniform(0.3, 0.45), f, f * r.uniform(1.35, 1.6), curve=1.6, harm=0.08)
        gap = np.zeros(int(0.12 * SR))
        b = tone_sweep(r.uniform(0.18, 0.3), f * 1.45, f * 1.1, harm=0.08)
        return np.concatenate([a, gap, b]) * 0.55
    # coo: low and round, far away
    f = r.uniform(480, 620)
    one = tone_sweep(0.32, f * 0.96, f, curve=0.5, harm=0.25, vib_hz=6, vib_depth=0.01)
    two = tone_sweep(0.5, f, f * 0.93, harm=0.25, vib_hz=6, vib_depth=0.01)
    return np.concatenate([one, np.zeros(int(0.08 * SR)), two]) * 0.5


def forest(sec=60):
    n = sec * SR
    r = np.random.default_rng(5)
    wind = shaped(n, mul(tilt(0.9), band(60, 700, 1.4)), 51) * env_periodic(n, [(1, 0.35, 0.0), (2, 0.25, 1.4), (5, 0.12, 0.3)])
    leaves = shaped(n, mul(tilt(0.2), band(1500, 7000, 2.0)), 52) * env_periodic(n, [(2, 0.5, 1.4), (7, 0.25, 0.2), (17, 0.15, 2.2)]) ** 2 * 0.05
    birds = np.zeros(n)
    t = 0.8
    while t < sec:
        kind = r.choice(['warble', 'whistle', 'coo'], p=[0.5, 0.35, 0.15])
        dist = r.uniform(0.25, 1.0)
        place(birds, bird_phrase(r, kind) * dist, int(t * SR))
        # Answering calls come in small clusters, then a longer quiet.
        t += r.uniform(0.6, 1.6) if r.random() < 0.45 else r.uniform(2.5, 6.0)
    x = 0.6 * wind + leaves + 0.9 * birds + 0.6 * reverb(birds, 1.6, 53)
    return finish(x, rms_db=-23)


def night(sec=60):
    n = sec * SR
    r = np.random.default_rng(6)
    air = shaped(n, mul(tilt(1.0), band(40, 500, 1.4)), 61) * env_periodic(n, [(1, 0.3, 0.5), (3, 0.15, 2.0)]) * 0.5
    crickets = np.zeros(n)
    for c, (f, every, amp) in enumerate([(4300, 0.62, 0.5), (3900, 0.81, 0.35), (4700, 0.55, 0.22), (3600, 1.1, 0.15)]):
        count = int(round(sec / every))
        step = sec / count  # whole chirps over the loop, so the rhythm loops too
        phase = r.uniform(0, step)
        m = int(0.014 * SR)
        tt = np.arange(m) / SR
        pulse = np.sin(2 * np.pi * f * tt) * np.sin(np.pi * tt / 0.014) ** 2
        for k in range(count):
            if r.random() < 0.12:
                continue  # a cricket pauses now and then
            start = phase + k * step + r.uniform(-0.01, 0.01)
            for p in range(3):
                place(crickets, pulse * amp, int((start + p * 0.028) * SR))
    x = air + 0.3 * crickets + 0.25 * reverb(crickets, 1.4, 63, damp_hz=5000)
    return finish(x, rms_db=-25)


def fire(sec=30):
    n = sec * SR
    r = np.random.default_rng(7)
    roar = shaped(n, mul(tilt(1.0), band(50, 600, 1.5)), 71) * env_periodic(n, [(2, 0.2, 0.0), (5, 0.15, 1.0), (11, 0.1, 2.0)])
    hiss = shaped(n, band(2000, 6000, 2.0), 72) * env_periodic(n, [(3, 0.4, 0.3), (19, 0.3, 1.5)]) * 0.06
    crackle = np.zeros(n)
    t = 0.0
    i = 0
    while t < sec:
        # Crackles cluster: a few close together, then a gap.
        burst_n = int(r.integers(1, 5))
        for _ in range(burst_n):
            lo = r.uniform(800, 3000)
            place(crackle, burst(r.uniform(0.002, 0.012), lo, lo * 3, 700 + i) * r.uniform(0.1, 1.0) ** 2.5, int((t + r.uniform(0, 0.12)) * SR))
            i += 1
        t += r.exponential(0.32)
    for _ in range(int(sec / 6)):
        place(crackle, burst(0.03, 300, 1800, 900 + i) * 0.9, int(r.integers(n)))  # a log settling
        i += 1
    x = 0.8 * roar + hiss + 1.2 * crackle + 0.15 * reverb(crackle, 0.5, 73)
    return finish(lowpass(x, 8000), rms_db=-22)


if __name__ == '__main__':
    for name, fn in [('forest', forest), ('rain', rain), ('waterfall', waterfall), ('ocean', ocean), ('stream', stream), ('night', night), ('fire', fire)]:
        write(name, fn())
