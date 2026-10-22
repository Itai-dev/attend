"""
The gong that opens and closes a session: assets/audio/gong.wav.

    python3 tools/make-gong.py

Synthesised here, so it is the app's own (no licence to track). A deep singing bowl struck
once with a soft mallet: a low fundamental (D3) and the bowl's inharmonic overtones, each one
a slightly detuned pair so it beats slowly ("wah… wah…") the way a real bowl does, the higher
ones dying first. The strike is soft — a felt mallet, not a stick — so nothing in it startles
an eyes-closed person; it rings out over about eight seconds.

Needs numpy.
"""

import os
import wave

import numpy as np

SR = 22050  # The highest overtone is under 2.5 kHz; 22 kHz is plenty and keeps the file small.
SECONDS = 8.0
F0 = 146.8  # D3: low enough to feel like a gong, high enough for phone speakers.
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio', 'gong.wav')

# (ratio to the fundamental, level, decay time constant in seconds, beat in Hz)
# Ratios follow a struck bowl's modes (about 1 : 2.7 : 5.2 : 8.4), not a string's harmonics.
PARTIALS = [
    (1.0, 1.0, 3.2, 0.55),
    (2.71, 0.55, 2.2, 0.9),
    (5.18, 0.22, 1.3, 1.4),
    (8.41, 0.09, 0.8, 2.1),
    (12.3, 0.035, 0.5, 2.8),
]


def gong() -> np.ndarray:
    t = np.arange(int(SR * SECONDS)) / SR
    rng = np.random.default_rng(7)
    x = np.zeros_like(t)
    for ratio, level, tau, beat in PARTIALS:
        f = F0 * ratio
        phase = rng.uniform(0, 2 * np.pi, 2)
        # Two modes a beat apart: the slow swell and fade of a real bowl.
        pair = np.sin(2 * np.pi * (f - beat / 2) * t + phase[0]) + 0.6 * np.sin(2 * np.pi * (f + beat / 2) * t + phase[1])
        x += level * np.exp(-t / tau) * pair / 1.6
    # A soft mallet: the attack takes ~12 ms, so there is no click, and a breath of low noise
    # under the first few milliseconds gives the strike some body.
    attack = 1 - np.exp(-t / 0.012)
    thud = rng.normal(0, 1, len(t)) * np.exp(-t / 0.02)
    thud = np.convolve(thud, np.ones(40) / 40, mode='same')  # low-passed: felt, not metal
    x = (x + 0.25 * thud) * attack
    # The last second fades to true silence, so the file never ends on a cut.
    tail = int(SR * 1.0)
    x[-tail:] *= np.cos(np.linspace(0, np.pi / 2, tail)) ** 2
    return x / np.max(np.abs(x)) * 0.7  # about -3 dBFS peak; the app plays it softer still


def write(path: str, x: np.ndarray) -> None:
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    write(OUT, gong())
    print(f'wrote {os.path.relpath(OUT)}')
