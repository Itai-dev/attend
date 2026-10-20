"""Builds assets/audio/soundscapes/*.m4a from real field recordings.

Run:  python3 tools/master-recordings.py <cache folder>   (needs numpy and ffmpeg)

Why real recordings (20 Oct 2026): the generated 30-second loops sounded "linear" and not
natural. Every source here is a radio aporee field recording on the Internet Archive,
marked Public Domain (https://creativecommons.org/publicdomain/mark/1.0/). The identifiers
are the provenance record. assets/audio/soundscapes/SOURCES.md lists the recordists.

What this pass does, and deliberately doesn't do:
- takes the cleanest 5-minute stretch of each recording (chosen by analysis: no voices,
  traffic, planes or hum inside the window);
- high-passes wind and traffic rumble where a recording has it;
- sets one static gain so every sound averages about the same level (TARGET_DB), capped so
  peaks stay below PEAK_DB. No compression and no limiting: the natural rise and fall of
  waves, gusts and crackles is the point, and squeezing it out is what made the old loops
  sound flat;
- encodes AAC 128 kbps stereo. The app loops each file on two players that crossfade
  (src/voice/crossfadeLoop.ts), so the files need no loop seam of their own.
"""
import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request

import numpy as np

SR = 44100
TARGET_DB = -26.0
PEAK_DB = -1.5
# How far the loudest few transients (single raindrops, a crackle) may be rounded off so a
# sound with sharp peaks still reaches the common level. Touches a tiny fraction of samples.
MAX_KNEE_DB = 4.0
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio', 'soundscapes')

# id: (archive identifier, start seconds, length seconds, high-pass Hz or 0, note)
SOURCES = {
    'rain': ('aporee_48133_54753', 260, 300, 60, 'Felix Blume: light rain on banana leaves, Telaya, Veracruz, Mexico'),
    'forest': ('aporee_64630_74591', 10, 300, 60, 'Piotrek Zyla: forest atmosphere, insects and wind, Ustka, Poland'),
    'stream': ('aporee_50749_57876', 255, 300, 100, 'Bojan Marušič: stream Krčnik, Slovenia'),
    'waterfall': ('aporee_72832_85026', 30, 300, 0, 'Jean-François Cavro: Cascade du Liaret, Sixt-Fer-à-Cheval, French Alps'),
    'ocean': ('aporee_64627_74588', 133, 300, 40, 'Piotrek Zyla: sea waves from a distance, Dąbki, Poland'),
    'night': ('aporee_70515_82219', 150, 300, 0, 'La Clapère, Maureillas-las-Illas, France: night crickets'),
    'fire': ('aporee_54707_62564', 5, 275, 90, 'Mierki, Poland: fireplace in the woods'),
}


def fetch(identifier: str, cache: str) -> str:
    """The item's lossless copy if it has one, else its original file."""
    for f in os.listdir(cache):
        if f.startswith(identifier + '.') or f.startswith(identifier + '__'):
            if not f.endswith('.wav') or '.f32.' not in f:
                return os.path.join(cache, f)
    meta = json.load(urllib.request.urlopen(f'https://archive.org/metadata/{identifier}'))
    lic = meta.get('metadata', {}).get('licenseurl', '')
    assert 'publicdomain' in lic, f'{identifier}: not public domain ({lic})'
    files = [f for f in meta['files'] if f['name'].lower().endswith(('.flac', '.wav', '.mp3'))]
    rank = {'flac': 0, 'wav': 1, 'mp3': 2}
    best = sorted(files, key=lambda f: (rank[f['name'].rsplit('.', 1)[1].lower()], -int(f.get('size', 0))))[0]
    dest = os.path.join(cache, identifier + '.' + best['name'].rsplit('.', 1)[1].lower())
    urllib.request.urlretrieve(f'https://archive.org/download/{identifier}/{urllib.parse.quote(best["name"])}', dest)
    return dest


def decode(path: str, start: float, length: float, hp: int) -> np.ndarray:
    filters = [f'atrim=start={start}:duration={length}', 'asetpts=PTS-STARTPTS']
    if hp:
        filters.append(f'highpass=f={hp}:poles=2')
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', path, '-af', ','.join(filters), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, '<f4').reshape(-1, 2).astype(np.float64)


def soft_peaks(x: np.ndarray) -> np.ndarray:
    """Rounds off only what rises above the knee, toward PEAK_DB; everything below is untouched."""
    ceil = 10 ** (PEAK_DB / 20)
    knee = 10 ** ((PEAK_DB - MAX_KNEE_DB - 1) / 20)
    a = np.abs(x)
    over = a > knee
    span = ceil - knee
    y = x.copy()
    y[over] = np.sign(x[over]) * (knee + span * np.tanh((a[over] - knee) / span))
    return y


def main(cache: str) -> None:
    os.makedirs(cache, exist_ok=True)
    report = []
    for name, (ident, start, length, hp, note) in SOURCES.items():
        x = decode(fetch(ident, cache), start, length, hp)
        x -= x.mean(axis=0)
        rms = 20 * np.log10(np.sqrt((x ** 2).mean()))
        peak = 20 * np.log10(np.abs(x).max())
        gain = min(TARGET_DB - rms, PEAK_DB - peak + MAX_KNEE_DB)  # one static gain
        x *= 10 ** (gain / 20)
        x = soft_peaks(x)
        n = int(0.05 * SR)  # 50 ms edges, so the very first start never clicks
        ramp = np.linspace(0, 1, n)[:, None]
        x[:n] *= ramp
        x[-n:] *= ramp[::-1]
        out = os.path.join(OUT, f'{name}.m4a')
        subprocess.run(
            ['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'aac', '-b:a', '128k', out],
            input=x.astype('<f4').tobytes(), check=True,
        )
        final = 20 * np.log10(np.sqrt((x ** 2).mean()))
        touched = float((np.abs(x) > 10 ** ((PEAK_DB - MAX_KNEE_DB - 1) / 20)).mean() * 100)
        print(f'           samples rounded off: {touched:.4f}%')
        report.append((name, ident, final, 20 * np.log10(np.abs(x).max()), os.path.getsize(out) / 1e6, note))
        print(f'{name:10s} {ident}  rms {final:6.1f} dBFS  peak {report[-1][3]:5.1f}  {os.path.getsize(out) / 1e6:.1f} MB')
    with open(os.path.join(OUT, 'levels.json'), 'w') as f:
        json.dump({r[0]: round(r[2], 1) for r in report}, f, indent=2)


if __name__ == '__main__':
    main(sys.argv[1])
