"""
The soft beds under a session, one per session type: assets/audio/ambience-<type>.wav.

    python3 tools/make-ambience.py

Why they sound like this (21 Oct 2026). The first tone was four pure, unchanging sine waves
(108/162/216/432 Hz). A phone speaker can't play 108 Hz, so what was left was a thin, beep-like
216/432 Hz that never moved, which is what made it harsh. These are instead:

  - pads: each note is several soft harmonics on three slightly detuned voices, with harmonics
    falling away steeply, so it is warm rather than pure; notes are in just intonation on
    A = 432 Hz (108, 162, 216, 270, 324 Hz), so they blend without beating;
  - slow movement: every note swells and fades over 10 to 40 seconds, so the ear has no fixed
    tone to fixate on;
  - shaped noise (pink or brown, low-passed), the sound of air, tide or distant rain;
  - for flares and fear, a swell every 10 seconds: six a minute, a slow, calm breathing pace,
    there to lean on, never mentioned.

No claim is made for 432 Hz or any frequency: the evidence that a tuning does anything for pain
is thin (small, uncontrolled studies). The tuning stays only because it's familiar; what matters
here is soft, low, moving and quiet under the voice.

Every component repeats exactly every LOOP seconds (whole cycles only, noise built in the
frequency domain), so the file loops with no seam. Needs numpy only.
"""

import os
import wave

import numpy as np

SR = 16_000  # The beds have almost nothing above 2 kHz; 16 kHz keeps each file small.
LOOP = 40  # seconds; every frequency and swell below completes whole cycles in this time.
N = SR * LOOP
t = np.arange(N) / SR
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')


def whole(f: float) -> float:
    """Round a frequency to whole cycles per loop, so the loop has no seam."""
    return round(f * LOOP) / LOOP


def swell(period: float, depth: float, phase: float) -> np.ndarray:
    """A slow rise and fall between 1 - depth and 1."""
    assert (LOOP / period).is_integer()
    return 1 - depth * (0.5 + 0.5 * np.cos(2 * np.pi * t / period + phase))


def pad(f: float, rolloff: float, rng: np.random.Generator) -> np.ndarray:
    """One warm note: soft harmonics on three slightly detuned voices."""
    out = np.zeros(N)
    for detune in (0.0, 0.1, -0.075):
        for k in range(1, 9):
            fk = whole(k * f + detune)
            if fk > 2400:
                break
            out += np.sin(2 * np.pi * fk * t + rng.uniform(0, 2 * np.pi)) / k**rolloff
    return out / 3


def noise(color: float, lowpass: float, rng: np.random.Generator, highpass: float = 40) -> np.ndarray:
    """Noise with a 1/f^color spectrum, band-limited, periodic over the loop."""
    f = np.fft.rfftfreq(N, 1 / SR)
    f[0] = 1
    mag = f ** (-color / 2) / (1 + (f / lowpass) ** 4) / (1 + (highpass / f) ** 4)
    mag[0] = 0
    spec = mag * np.exp(1j * rng.uniform(0, 2 * np.pi, len(f)))
    x = np.fft.irfft(spec, n=N)
    return x / np.sqrt(np.mean(x**2))


def norm(x: np.ndarray, rms_db: float) -> np.ndarray:
    x = x / np.sqrt(np.mean(x**2)) * 10 ** (rms_db / 20)
    peak = np.max(np.abs(x))
    return x if peak < 0.85 else x * 0.85 / peak


def notes(spec, rolloff, rng):
    """spec: (frequency, level, swell period, swell depth)."""
    return sum(level * pad(f, rolloff, rng) * swell(period, depth, rng.uniform(0, 2 * np.pi)) for f, level, period, depth in spec)


def notice(rng):
    # Open and even: a wide A chord, slowly breathing, with a little air.
    chord = notes([(108, 1.0, 40, 0.3), (162, 0.8, 20, 0.4), (216, 0.55, 40 / 3, 0.5), (270, 0.25, 10, 0.6), (324, 0.2, 20, 0.6)], 2.0, rng)
    air = noise(1.0, 1200, rng)
    return norm(chord, -20) + norm(air, -34)


def flare(rng):
    # A slow tide: brown noise swelling six times a minute, over a low, quiet root and fifth.
    tide = noise(1.7, 1000, rng) * swell(10, 0.65, 0) ** 1.5
    ground = notes([(108, 1.0, 40, 0.2), (162, 0.6, 20, 0.3)], 2.4, rng)
    return norm(tide, -20) + norm(ground, -27)


def sleep(rng):
    # Darker and slower: lower notes, steeper harmonics, the slowest swells, distant soft rain.
    chord = notes([(81, 0.9, 40, 0.25), (108, 1.0, 40, 0.3), (162, 0.6, 20, 0.4), (216, 0.25, 40, 0.5)], 2.6, rng)
    rain = noise(1.0, 1600, rng, highpass=200)
    return norm(chord, -21) + norm(rain, -33)


def fear(rng):
    # Close and warm: a full major chord with a gentle breath-paced swell.
    chord = notes([(108, 1.0, 40, 0.2), (162, 0.8, 20, 0.3), (216, 0.6, 40, 0.3), (270, 0.45, 20, 0.4)], 2.2, rng)
    chord = chord * swell(10, 0.25, 0)
    air = noise(1.5, 1000, rng)
    return norm(chord, -20) + norm(air, -33)


def write(name: str, x: np.ndarray):
    x = norm(x, -17)
    pcm = (x * 32767).astype(np.int16)
    path = os.path.join(OUT, f'ambience-{name}.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(path, f'{len(pcm.tobytes()) / 1e6:.2f} MB')


if __name__ == '__main__':
    for i, (name, make) in enumerate([('notice', notice), ('flare', flare), ('sleep', sleep), ('fear', fear)]):
        write(name, make(np.random.default_rng(432 + i)))
