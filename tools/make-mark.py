"""Attend's mark (5 Nov 2026): a thick ring of grain, eclipsed on one side.

The ring is whole and level. A second, unseen disc 1.4 times its size sits to the right and
takes the grain away under it, so the ring dissolves along a curve, the way the moon's edge
crosses the sun: the cycle, softening. The same recipe draws the session's moving version
(src/viz/shaders.ts, ECLIPSE_SKSL), which breaks into grain while the guide speaks.

    python3 tools/make-mark.py            # writes every asset under assets/images/

Deterministic (fixed seed), so the icon is the same on every run. Needs numpy and Pillow.
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'images')

WASHI = (0xF3, 0xEE, 0xE5)  # design/theme.ts: bg by day
SUMI_BG = (0x1C, 0x1A, 0x17)  # bg at night
INK = (0x2F, 0x2B, 0x26)  # text by day
RICE = (0xED, 0xE6, 0xDA)  # text at night

# The recipe chosen for the PDFs ("M"): the hole is 52% of the ring, the eclipsing disc is
# 1.4x the ring, centred 1.95 ring radii to the right, with a soft edge of 0.45.
HOLE, OUT_SOFT, IN_SOFT = 0.52, 0.07, 0.045
MOON_DX, MOON_R, MOON_SOFT = 1.95, 1.4, 0.45


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def alpha(px: int, ring: float, seed: int = 7) -> np.ndarray:
    """The mark's coverage, 0..1 per pixel, on a px-square canvas; `ring` is the ring's outer
    radius as a fraction of the canvas."""
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:px, 0:px].astype(np.float32) + 0.5
    cx = cy = px / 2
    ro = ring * px
    ri = ro * HOLE
    rho = np.hypot(x - cx, y - cy)
    band = smoothstep(ri - IN_SOFT * ro, ri + IN_SOFT * ro, rho) * (1 - smoothstep(ro - OUT_SOFT * ro, ro + OUT_SOFT * ro, rho))
    band = band ** 0.8
    md = np.hypot(x - (cx + MOON_DX * ro), y - cy)
    moon = smoothstep(MOON_R * ro - MOON_SOFT * ro, MOON_R * ro + MOON_SOFT * ro, md)
    density = np.clip(band * moon, 0, 1)
    # Grain at a fixed size whatever the canvas, so the dissolve reads as particles.
    grain = max(1, round(px / 900))
    g = rng.random((px // grain + 1, px // grain + 1))
    g = np.kron(g, np.ones((grain, grain)))[:px, :px]
    return (g < density).astype(np.float32)


def draw(px: int, ring: float, ink, bg=None, supersample: int = 1) -> Image.Image:
    a = alpha(px * supersample, ring)
    img = np.zeros((px * supersample, px * supersample, 4), dtype=np.uint8)
    img[..., :3] = ink
    img[..., 3] = (a * 255).astype(np.uint8)
    im = Image.fromarray(img, 'RGBA')
    if supersample > 1:
        im = im.resize((px, px), Image.LANCZOS)
    if bg is None:
        return im
    base = Image.new('RGBA', (px, px), bg + (255,))
    base.alpha_composite(im)
    return base.convert('RGB')


def main():
    # iOS: by day sumi ink on washi; in Dark Mode rice paper on charcoal, like the app.
    draw(1024, 0.31, INK, WASHI, 2).save(os.path.join(OUT, 'icon.png'))
    draw(1024, 0.31, RICE, SUMI_BG, 2).save(os.path.join(OUT, 'icon-dark.png'))
    # The splash follows the phone's appearance too: one image per background.
    draw(512, 0.36, INK, None, 2).save(os.path.join(OUT, 'splash-icon.png'))
    draw(512, 0.36, RICE, None, 2).save(os.path.join(OUT, 'splash-icon-dark.png'))
    # Android adaptive icon: the mark inside the 66% safe zone, on washi.
    Image.new('RGB', (432, 432), WASHI).save(os.path.join(OUT, 'android-icon-background.png'))
    draw(432, 0.22, INK, None, 2).save(os.path.join(OUT, 'android-icon-foreground.png'))
    draw(432, 0.22, (255, 255, 255), None, 2).save(os.path.join(OUT, 'android-icon-monochrome.png'))
    draw(64, 0.36, INK, WASHI, 4).save(os.path.join(OUT, 'favicon.png'))
    print('wrote the mark to', os.path.normpath(OUT))


if __name__ == '__main__':
    main()
