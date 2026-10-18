"""Grades and compresses the app's photographs into assets/images/photos/.
Run: python3 tools/grade-photos.py <folder of source PNGs>  (needs numpy + Pillow).

The sources were generated (ElevenLabs, GPT Image) from prompts in the style of
daisysound.com: misty, overcast, 35mm film. This pass makes them one family: a little less
saturation, lifted blacks, a cool shadow, fine grain, then 1200 px on the long side as JPEG.
Re-running it on the same sources gives the same files.
"""
import os
import sys

import numpy as np
from PIL import Image

NAMES = ['rain', 'forest', 'stream', 'waterfall', 'ocean', 'night', 'fire', 'tone', 'dawn', 'day', 'dusk', 'evening']
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images', 'photos')


def grade(im: Image.Image, seed: int) -> Image.Image:
    im.thumbnail((1200, 1200), Image.LANCZOS)
    x = np.asarray(im.convert('RGB')).astype(np.float32) / 255
    lum = (x @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32))[..., None]
    x = lum + (x - lum) * 0.82                      # quieter colour
    x = 0.035 + x * 0.94                            # lifted blacks, softer whites: printed, not digital
    x[..., 2] += 0.012 * (1 - lum[..., 0])          # a cool cast in the shadows
    r = np.random.default_rng(seed)
    x += (r.standard_normal(x.shape[:2])[..., None] * 0.012).astype(np.float32)  # fine, even grain
    return Image.fromarray((np.clip(x, 0, 1) * 255).astype(np.uint8))


if __name__ == '__main__':
    src = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    for i, n in enumerate(NAMES):
        out = os.path.join(OUT, f'{n}.jpg')
        grade(Image.open(os.path.join(src, f'{n}.png')), i).save(out, quality=80, optimize=True, progressive=True)
        print(n, f'{os.path.getsize(out) / 1e3:.0f} KB')
