"""
The soft bed under each session type: assets/audio/ambience-<type>.wav.

    python3 tools/make-ambience.py

Real field recordings (21 Oct 2026), replacing the synthesised beds the founder found harsh.
All four are from the radio aporee ::: maps archive on the Internet Archive, released under the
Creative Commons Public Domain Mark: free to use, no attribution required (credited anyway, in
assets/audio/CREDITS.md).

  notice  a mountain stream over stones   Pitões das Júnias, Portugal   aporee_69234_80475
  flare   slow ocean waves on a beach     Cox's Bazar, Bangladesh       aporee_55131_63018
  sleep   rain through the night          Serrinha do Alambari, Brazil  aporee_54335_62155
  fear    wind in a pine forest           Miren, Slovenia               aporee_51715_59066

For each, the script downloads the recording, finds its steadiest 45 seconds (no sudden sound
rising more than a few dB above the rest), softens the top end so nothing hisses, levels it,
and folds the last five seconds into the first with an equal-power crossfade, so the 40-second
loop has no seam. No claim is made that any of these does anything for pain: they are there so
the silence between the guide's lines feels like a place, not a gap.

Needs ffmpeg and numpy. Downloads go to a temporary folder outside the repo.
"""

import os
import subprocess
import tempfile
import urllib.request

import numpy as np

SR = 22050  # Water and rain have detail up to ~10 kHz; 22 kHz keeps it and keeps files small.
LOOP = 40
FADE = 5
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')

BEDS = {
    'notice': ('aporee_69234_80475', '11pitoesdejunias1108250938.mp3', 7000),
    'flare': ('aporee_55131_63018', 'coxbazarsea.mp3', 6500),
    'sleep': ('aporee_54335_62155', 'PluiependantlanuitSerrinhaORTF2239242044560264BR2108310248kHz20min.mp3', 5500),
    'fear': ('aporee_51715_59066', 'Pineforestinthewind.mp3', 7000),
}


def decode(path: str, lowpass: int) -> np.ndarray:
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-af', f'highpass=f=60,lowpass=f={lowpass}', '-f', 'f32le', '-'],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def steadiest(x: np.ndarray, seconds: int) -> np.ndarray:
    """The window whose loudness varies least and never jumps far above its own median."""
    hop = SR // 10
    frames = x[: len(x) // hop * hop].reshape(-1, hop)
    db = 20 * np.log10(np.sqrt((frames**2).mean(1)) + 1e-9)
    w = seconds * 10
    best, at = None, 0
    for s in range(0, len(db) - w, 10):
        win = db[s : s + w]
        score = win.std() + max(0.0, (win.max() - np.median(win)) - 6) * 2
        if best is None or score < best:
            best, at = score, s
    start = at * hop
    return x[start : start + seconds * SR]


def loop(x: np.ndarray) -> np.ndarray:
    """Fold the tail into the head with an equal-power crossfade: the end flows into the start."""
    body, tail = x[: LOOP * SR], x[LOOP * SR : (LOOP + FADE) * SR]
    t = np.linspace(0, np.pi / 2, len(tail))
    out = body.copy()
    out[: len(tail)] = body[: len(tail)] * np.sin(t) + tail * np.cos(t)
    return out


def level(x: np.ndarray, rms_db: float = -24) -> np.ndarray:
    x = x / np.sqrt(np.mean(x**2)) * 10 ** (rms_db / 20)
    peak = np.max(np.abs(x))
    return x if peak < 0.7 else x * 0.7 / peak


def write(name: str, x: np.ndarray):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    path = os.path.join(OUT, f'ambience-{name}.wav')
    import wave

    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(path, f'{len(pcm.tobytes()) / 1e6:.2f} MB')


if __name__ == '__main__':
    with tempfile.TemporaryDirectory() as tmp:
        for name, (ident, file, lowpass) in BEDS.items():
            src = os.path.join(tmp, file)
            urllib.request.urlretrieve(f'https://archive.org/download/{ident}/{file}', src)
            write(name, level(loop(steadiest(decode(src, lowpass), LOOP + FADE))))
