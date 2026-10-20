"""Generates the app icon, splash marks and Android icons: Attend's mark — a single ring, the
breathing form at rest — in ink on paper, after daisysound.com's wordmark and flower.
Run: python3 tools/make-icon.py  (needs numpy + Pillow)."""
import numpy as np
from PIL import Image, ImageDraw

PAPER = (243, 243, 240)
INK = (11, 12, 12)
NIGHT = (5, 6, 6)
S = 4  # supersampling for smooth edges


def ring(size, fg, bg=None, scale=1.0, grain=True):
    big = size * S
    im = Image.new('RGBA', (big, big), bg + (255,) if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    r = big * 0.2 * scale
    w = big * 0.052 * scale
    c = big / 2
    d.ellipse([c - r, c - r, c + r, c + r], outline=fg + (255,), width=int(w))
    im = im.resize((size, size), Image.LANCZOS)
    if bg and grain:
        # The same fine grain as the photographs, so the icon belongs to them.
        x = np.asarray(im).astype(np.float32)
        x[..., :3] += np.random.default_rng(7).standard_normal((size, size, 1)) * 2.2
        im = Image.fromarray(np.clip(x, 0, 255).astype(np.uint8), 'RGBA')
    return im


ring(1024, INK, PAPER).convert('RGB').save('assets/images/icon.png')
ring(512, INK, scale=1.3).save('assets/images/splash-icon.png')
ring(512, PAPER, scale=1.3).save('assets/images/splash-icon-dark.png')
fg = ring(432, INK, scale=0.95)
fg.save('assets/images/android-icon-foreground.png')
Image.new('RGB', (432, 432), PAPER).save('assets/images/android-icon-background.png')
a = fg.split()[3]
Image.merge('RGBA', (a.point(lambda v: 255), a.point(lambda v: 255), a.point(lambda v: 255), a)).save('assets/images/android-icon-monochrome.png')
ring(64, INK, PAPER, scale=1.4, grain=False).convert('RGB').save('assets/images/favicon.png')
print('icons written')
