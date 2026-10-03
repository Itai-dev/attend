"""Generates the app icon, splash and Android icons: the breathing form, still.
Run: python3 tools/make-icon.py  (needs numpy + Pillow)."""
import numpy as np
from PIL import Image

rng = np.random.default_rng(7)

def noise2d(w, h, scale, seed):
    r = np.random.default_rng(seed)
    gw, gh = int(w / scale) + 2, int(h / scale) + 2
    g = r.random((gh, gw))
    ys = np.linspace(0, gh - 2, h); xs = np.linspace(0, gw - 2, w)
    y0 = np.floor(ys).astype(int); x0 = np.floor(xs).astype(int)
    fy = (ys - y0)[:, None]; fx = (xs - x0)[None, :]
    fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
    a = g[y0][:, x0]; b = g[y0][:, x0 + 1]; c = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def fbm(w, h, base, seed):
    v = np.zeros((h, w)); a = 0.5; s = base
    for i in range(5):
        v += a * noise2d(w, h, max(s, 2), seed + i); a *= 0.5; s /= 2
    return v

def orb(size, bg=(9, 9, 11), alpha=False, scale=1.0):
    w = h = size
    y, x = np.mgrid[0:h, 0:w]
    px = (x - w / 2) / w; py = (y - h / 2) / h
    r = np.sqrt(px ** 2 + py ** 2)
    ang = np.arctan2(py, px)
    warp = 0.5 + 0.22 * np.sin(2 * ang + 1.3) + 0.14 * np.sin(3 * ang + 0.4) + 0.08 * np.sin(5 * ang + 2.1)
    R = 0.215 * scale * (0.92 + 0.16 * (warp - 0.5) * 2)
    d = r - R
    body = np.clip((0.02 * scale - d) / (0.05 * scale), 0, 1)
    rr = r / R
    core = np.exp(-rr * rr * 0.95)
    rim = np.exp(-np.abs(d) * 90 / scale)
    halo = np.exp(-np.maximum(d, 0) * 9 / scale)
    n1 = fbm(w, h, size / 3.0, 11)
    n2 = fbm(w, h, size / 6.0, 21)
    lilac = np.array([0.70, 0.62, 1.0]); apricot = np.array([1.0, 0.74, 0.58]); sea = np.array([0.42, 0.86, 0.78])
    t = np.clip((n1 - 0.4) / 0.3, 0, 1)[..., None] * 0.5
    inner = lilac * (1 - t) + apricot * t
    t2 = np.clip((n2 - 0.48) / 0.28, 0, 1)[..., None] * 0.35
    inner = inner * (1 - t2) + sea * t2
    col = inner * (core * (0.5 + 0.6 * n1) * body)[..., None] + lilac * (halo * 0.14)[..., None] + np.array([0.95, 0.93, 0.9]) * (rim * 0.2)[..., None]
    col *= np.clip((0.5 - r) / 0.2, 0, 1)[..., None]
    col = 1 - np.exp(-col * 1.7)
    bgc = np.array(bg) / 255.0
    if alpha:
        a = np.clip(col.max(axis=2) * 1.5, 0, 1)
        rgb = np.clip(col / np.maximum(a[..., None], 1e-4), 0, 1)
        return Image.fromarray((np.concatenate([rgb, a[..., None]], axis=2) * 255).astype(np.uint8), 'RGBA')
    out = bgc + col * (1 - bgc) + (rng.random((h, w, 1)) - 0.5) * 0.01
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGB')

orb(1024, scale=1.2).save('assets/images/icon.png')
orb(512, alpha=True, scale=1.4).save('assets/images/splash-icon.png')
fg = orb(432, alpha=True, scale=1.05)
fg.save('assets/images/android-icon-foreground.png')
Image.new('RGB', (432, 432), (9, 9, 11)).save('assets/images/android-icon-background.png')
m = fg.split()[3]
Image.merge('RGBA', (m.point(lambda v: 255), m.point(lambda v: 255), m.point(lambda v: 255), m)).save('assets/images/android-icon-monochrome.png')
orb(64, scale=1.4).save('assets/images/favicon.png')
print('icons written')
