"""Builds assets/audio/tones/<id>.m4a: the soft tones under a practice and on the Sounds tab.

Run:  python3 tools/make-tones.py   (needs numpy and ffmpeg)

Why tones (20 Oct 2026): for now the sound under a practice is a soft tone at one of six pitches
instead of a nature recording (those are paused, not deleted: assets/audio/soundscapes/). A tone
sits under a voice without competing with it. Each is named by its number ("432 Hz") because
that is how people know these pitches; docs/RESEARCH.md ("Frequencies") says what is and is not
known about them, and why the app claims nothing.

Output: 600-second files, 22.05 kHz stereo, AAC at 48 kbps (a steady narrow-band tone needs
very little), one per id in TONES. The script prints each file's integrated loudness (LUFS);
copy those into LUFS in src/domain/soundscapes.ts, which sets every playback level from them.

How each tone is made, and why:
- Every partial is a very narrow band (0.45 Hz) around its frequency with its envelope made
  constant, not a pure sine. It sounds like a steady tone, but its phase wanders slowly on its
  own, so it lives instead of sounding flat ("linear"), and it never repeats within the file.
- The loop. The app loops a file with two players that crossfade (src/voice/crossfadeLoop.ts).
  Two copies of a tone overlapping can partly cancel for a moment (measured: a dip of a few dB
  for a second or two), so each file is ten minutes long: a practice never reaches the seam,
  and a long listen meets it once every ten minutes. Several partials, each wandering on its
  own, keep any dip shallow, because they never all cancel at once.
- Partials: the pitch and four harmonics (f, 2f at -6 dB, 3f -11, 4f -16, 5f -21), each softer
  than the last, so the pitch stays clear, the tone is warm on headphones and still audible on a
  phone's small speaker. Each partial has a second voice 0.09 Hz higher at 0.3 amplitude, which
  gives a slow, uneven swell, like a held note.
- Left and right are nearly the same sound (two different ones beat against each other, which
  is the wobble this avoids), with a little difference for width.
- A slow, irregular "breath" of about ±1.5 dB over the whole tone, so it is never perfectly still.
- One static gain (RMS_DB, held under PEAK_DB), no compression. The app sets the final level from
  the measured loudness (src/domain/soundscapes.ts).

The pitches run from deep to bright. The app says nothing about what a frequency does for the
body: they are sounds, chosen and matched to practices by ear.
"""
import os
import subprocess

import numpy as np

# Content stays under about 3.2 kHz (5 x 639 Hz), so 22.05 kHz loses nothing and halves the work.
SR = 22050
# Ten minutes: a practice (10 minutes at most) never reaches the loop point. Longer listens do,
# every ten minutes; see the note on the crossfade above.
SECONDS = 600
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio', 'tones')
RMS_DB = -22.0
PEAK_DB = -1.5

# id (SoundscapeId in src/domain/soundscapes.ts): fundamental Hz
TONES = {'hz174': 174.0, 'hz285': 285.0, 'hz396': 396.0, 'hz432': 432.0, 'hz528': 528.0, 'hz639': 639.0}
BITRATE = '48k'


def band(n: int, f: float, bw: float, rng: np.random.Generator) -> np.ndarray:
    """
    A steady tone at `f` whose phase wanders within `bw` Hz. Built as a noise band, then its
    envelope is flattened (noise alone swells and nearly vanishes, 12 dB apart, which reads as
    wobble, not as a tone). Periodic over the file, so the file loops on its own too.
    """
    freqs = np.fft.rfftfreq(n, 1 / SR)
    sigma = bw / 2.355
    mag = np.exp(-0.5 * ((freqs - f) / sigma) ** 2)
    spec = mag * np.exp(1j * rng.uniform(0, 2 * np.pi, len(freqs)))
    full = np.zeros(n, complex)
    full[: len(spec)] = spec
    full[1 : len(spec)] *= 2  # analytic signal: positive frequencies only
    z = np.fft.ifft(full)
    env = np.abs(z)
    x = np.real(z / np.maximum(env, 1e-9 * env.max()) ** 1.0)
    return x / np.sqrt((x ** 2).mean())


def breath(n: int, rng: np.random.Generator, depth_db: float = 1.5) -> np.ndarray:
    """A slow, irregular rise and fall (periods of roughly 8 to 25 s), about ±depth_db."""
    freqs = np.fft.rfftfreq(n, 1 / SR)
    mag = ((freqs > 0.04) & (freqs < 0.12)).astype(float)
    x = np.fft.irfft(mag * np.exp(1j * rng.uniform(0, 2 * np.pi, len(freqs))), n)
    x /= np.abs(x).max()
    return 10 ** (depth_db * x / 20)


def tone(f: float, seed: int) -> np.ndarray:
    n = SR * SECONDS
    partials = [(f, 0.0), (2 * f, -6.0), (3 * f, -11.0), (4 * f, -16.0), (5 * f, -21.0)]
    voices = [(0.0, 1.0), (0.09, 0.3)]
    rng = np.random.default_rng(seed)
    out = np.zeros((n, 2))
    for (pf, db), (df, va) in ((p, v) for p in partials for v in voices):
        a = 10 ** (db / 20) * va
        common = band(n, pf + df, 0.45, rng)
        for ch in range(2):
            own = band(n, pf + df, 0.45, rng)
            out[:, ch] += a * (0.97 * common + 0.24 * own)  # nearly shared: a little width, no beating between them
    out *= breath(n, rng)[:, None]
    rms = 20 * np.log10(np.sqrt((out ** 2).mean()))
    peak = 20 * np.log10(np.abs(out).max())
    gain = min(RMS_DB - rms, PEAK_DB - peak)
    return out * 10 ** (gain / 20)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for i, (name, f) in enumerate(TONES.items()):
        x = tone(f, 1000 + i)
        out = os.path.join(OUT, f'{name}.m4a')
        subprocess.run(
            ['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'aac', '-b:a', BITRATE, out],
            input=x.astype('<f4').tobytes(), check=True,
        )
        lufs = subprocess.run(['ffmpeg', '-nostats', '-i', out, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
        integrated = [l for l in lufs.splitlines() if l.strip().startswith('I:')][-1].split()[1]
        print(f'{name:6s} {f:6.1f} Hz  {integrated} LUFS  {os.path.getsize(out) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
