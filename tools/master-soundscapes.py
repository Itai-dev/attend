"""Masters the soundscapes in assets/audio/soundscapes/ from source recordings.
Run: python3 tools/master-soundscapes.py <folder of source WAVs>  (needs numpy; ffmpeg decodes
the generator's MP3s to WAV first).

The sources are ElevenLabs Sound Effects v2 generations (30 s, looping), two takes per sound;
the calmer take was kept: the one whose loudness moves least and whose seam matches best.
This pass makes them fit to fall asleep to:

- softer transients: a slow limiter holds peaks to 14 dB over the average, so a crackle or a
  heavy drop never jumps out of the bed;
- warmer top: a gentle shelf takes a little off above 7 kHz (not for crickets, which live
  there);
- one level for all: every sound sits at the same average loudness (-26 dBFS RMS), so
  switching sounds never surprises, and the app sets the final level (domain/soundscapes.ts);
- a seamless loop: the last half-second is crossfaded (equal power) into the first, so the
  player can loop the file without a seam.

Stereo, 32 kHz, 16-bit WAV: stereo for headphones, WAV because AAC's encoder padding would
leave a gap each time the loop comes round.
"""
import os
import sys
import wave

import numpy as np

SR_OUT = 32000
TARGET_DB = -26.0
CREST_DB = 14.0
XFADE_S = 0.5
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio', 'soundscapes')

# Which take became which sound, and whether its top end is kept.
CHOSEN = {
    'rain': ('rain_b', True),
    'forest': ('forest_a', True),
    'stream': ('stream_b', True),
    'waterfall': ('waterfall_b', True),
    'ocean': ('ocean_b', True),
    'night': ('night_b', False),
    'fire': ('fire_a', True),
}


def read(path):
    with wave.open(path) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64).reshape(-1, ch) / 32768
    return sr, x


def resample(x, sr, to):
    """Band-limited resampling by FFT (the loop is periodic, so this introduces no seam)."""
    n = len(x)
    m = int(round(n * to / sr))
    X = np.fft.rfft(x, axis=0)
    keep = m // 2 + 1
    Y = np.zeros((keep, x.shape[1]), dtype=complex)
    k = min(keep, X.shape[0])
    Y[:k] = X[:k]
    return np.fft.irfft(Y, m, axis=0) * (m / n)


def shelf(x, sr, hz=7000.0, db=-3.0):
    f = np.fft.rfftfreq(len(x), 1 / sr)
    g = 10 ** (db / 20)
    H = 1 + (g - 1) / (1 + (hz / np.maximum(f, 1)) ** 2)
    return np.fft.irfft(np.fft.rfft(x, axis=0) * H[:, None], len(x), axis=0)


def limit(x, sr):
    """Slow peak control: a smoothed gain that pulls peaks down to CREST_DB over the RMS."""
    rms = np.sqrt((x ** 2).mean())
    thresh = rms * 10 ** (CREST_DB / 20)
    env = np.abs(x).max(axis=1)
    # Peak-hold over 5 ms, then a release of ~120 ms, so the gain moves smoothly.
    hold = int(0.005 * sr)
    env = np.maximum.reduce([np.roll(env, i) for i in range(-hold, hold + 1, max(1, hold // 4))])
    gain = np.minimum(1.0, thresh / np.maximum(env, 1e-9))
    a = np.exp(-1 / (0.12 * sr))
    g = np.empty_like(gain)
    prev = 1.0
    for i, v in enumerate(gain):  # fast attack, slow release
        prev = v if v < prev else a * prev + (1 - a) * v
        g[i] = prev
    return x * g[:, None]


def loop(x, sr):
    n = int(XFADE_S * sr)
    t = np.linspace(0, np.pi / 2, n)[:, None]
    out = x[:-n].copy()
    out[:n] = x[:n] * np.sin(t) + x[-n:] * np.cos(t)
    return out


def level(x):
    rms = np.sqrt((x ** 2).mean())
    return x * (10 ** (TARGET_DB / 20) / rms)


def write(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(x.shape[1])
        w.setsampwidth(2)
        w.setframerate(SR_OUT)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    src = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    for name, (take, bright) in CHOSEN.items():
        sr, x = read(os.path.join(src, f'{take}.wav'))
        x = x - x.mean(axis=0)
        x = loop(x, sr)
        x = resample(x, sr, SR_OUT)
        if bright:
            x = shelf(x, SR_OUT)
        # Limiting lowers the average, and levelling raises the peaks again: a few rounds settle both.
        for _ in range(4):
            x = level(limit(level(x), SR_OUT))
        x = np.tanh(x / 0.9) * 0.9  # never a hard clip
        write(os.path.join(OUT, f'{name}.wav'), x)
        peak = 20 * np.log10(np.abs(x).max())
        print(f'{name}: {take}, {len(x) / SR_OUT:.1f}s, peak {peak:.1f} dBFS, {os.path.getsize(os.path.join(OUT, name + ".wav")) / 1e6:.1f} MB')
