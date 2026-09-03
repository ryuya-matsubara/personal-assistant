#!/usr/bin/env python3
"""依存なしでアプリアイコンPNGを生成する。
Pillow等が使えない環境向けに、zlib+structだけで有効なPNGを手書き出力する。
デザイン: 角丸の紺紫背景に、白いチェックリスト風のバーとドット(icon.svgと同系)。
"""
import struct
import zlib


def rounded_rect_mask(w, h, r):
    """角丸長方形の内側判定(True=描画領域)。"""
    def inside(x, y):
        # 各コーナーの円中心からの距離で判定
        if x < r and y < r:
            return (x - r) ** 2 + (y - r) ** 2 <= r * r
        if x >= w - r and y < r:
            return (x - (w - r - 1)) ** 2 + (y - r) ** 2 <= r * r
        if x < r and y >= h - r:
            return (x - r) ** 2 + (y - (h - r - 1)) ** 2 <= r * r
        if x >= w - r and y >= h - r:
            return (x - (w - r - 1)) ** 2 + (y - (h - r - 1)) ** 2 <= r * r
        return True
    return inside


def lerp(a, b, t):
    return int(round(a + (b - a) * t))


def gen(size, path, maskable=False):
    w = h = size
    # スケール係数(512基準の座標をsizeへ)
    s = size / 512.0
    bg1 = (99, 102, 241)   # #6366f1
    bg2 = (79, 70, 229)    # #4f46e5
    white = (255, 255, 255)
    corner_r = int(112 * s)
    # maskable はセーフゾーン確保のため角丸を小さく(ほぼ四角=塗り全面)
    if maskable:
        corner_r = int(40 * s)

    inside = rounded_rect_mask(w, h, corner_r)

    # 白い図形(バー3本 + ドット3つ)。maskableは内側80%へ縮小配置。
    inset = 0.10 if maskable else 0.0
    def sx(v):
        return (v * s) * (1 - 2 * inset) + w * inset
    def sy(v):
        return (v * s) * (1 - 2 * inset) + h * inset
    def sr(v):
        return v * s * (1 - 2 * inset)

    bars = [
        (sx(150), sy(120), sx(362), sy(180), sr(16), 0.95),
        (sx(150), sy(226), sx(362), sy(286), sr(16), 0.75),
        (sx(150), sy(332), sx(362), sy(392), sr(16), 0.55),
    ]
    dots = [
        (sx(118), sy(150), sr(18)),
        (sx(118), sy(256), sr(18)),
        (sx(118), sy(362), sr(18)),
    ]

    def bar_hit(x, y):
        for x0, y0, x1, y1, rr, alpha in bars:
            if x0 <= x <= x1 and y0 <= y <= y1:
                # 端の角丸
                if x < x0 + rr and y < y0 + rr and (x - (x0 + rr)) ** 2 + (y - (y0 + rr)) ** 2 > rr * rr:
                    continue
                if x > x1 - rr and y < y0 + rr and (x - (x1 - rr)) ** 2 + (y - (y0 + rr)) ** 2 > rr * rr:
                    continue
                if x < x0 + rr and y > y1 - rr and (x - (x0 + rr)) ** 2 + (y - (y1 - rr)) ** 2 > rr * rr:
                    continue
                if x > x1 - rr and y > y1 - rr and (x - (x1 - rr)) ** 2 + (y - (y1 - rr)) ** 2 > rr * rr:
                    continue
                return alpha
        for cx, cy, rr in dots:
            if (x - cx) ** 2 + (y - cy) ** 2 <= rr * rr:
                return 1.0
        return None

    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filter type 0
        t_row = y / (h - 1)
        for x in range(w):
            if not inside(x, y):
                raw += bytes((0, 0, 0, 0))  # 透明
                continue
            # 対角グラデーション
            t = (x / (w - 1) + t_row) / 2
            r = lerp(bg1[0], bg2[0], t)
            g = lerp(bg1[1], bg2[1], t)
            b = lerp(bg1[2], bg2[2], t)
            alpha = bar_hit(x, y)
            if alpha is not None:
                r = lerp(r, white[0], alpha)
                g = lerp(g, white[1], alpha)
                b = lerp(b, white[2], alpha)
            raw += bytes((r, g, b, 255))

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        crc = zlib.crc32(typ + data) & 0xffffffff
        return c + struct.pack(">I", crc)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)  # 8bit RGBA
    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print("wrote", path, size, "x", size, len(png), "bytes")


if __name__ == "__main__":
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    icons = os.path.join(os.path.dirname(here), "icons")
    os.makedirs(icons, exist_ok=True)
    gen(192, os.path.join(icons, "icon-192.png"))
    gen(512, os.path.join(icons, "icon-512.png"))
    gen(180, os.path.join(icons, "icon-180.png"))
    gen(512, os.path.join(icons, "icon-maskable-512.png"), maskable=True)
