#!/usr/bin/env python3
"""纯白 PWA 图标生成器（仅使用 Python 标准库，无第三方依赖）。

设计：纸白底(#f9f8f6) + 居中墨色方(#3a3a3c) + 居中樱色内方(#e8a0b0)，
与 pwa/icon.svg 的矢量源文件保持一致；若更换品牌设计，请同时修改
icon.svg 与本脚本中的颜色/比例常量，然后重新运行：

    python3 pwa/generate-icons.py

输出文件（均写入本脚本所在目录）：
    icon-192.png           192x192   manifest "any" 用途
    icon-512.png           512x512   manifest "any" 用途
    icon-maskable-512.png  512x512   manifest "maskable" 用途（全出血背景）
    apple-touch-icon.png   180x180   iOS 主屏图标（<link rel="apple-touch-icon">）
    favicon-32.png         32x32     浏览器标签页图标（<link rel="icon">）

抗锯齿：按像素解析计算矩形覆盖率，边缘平滑，无需超采样。
"""

import os
import struct
import zlib

PAPER = (0xF9, 0xF8, 0xF6)  # --paper: #f9f8f6（纯白品牌底色）
INK = (0x3A, 0x3A, 0x3C)    # --ink: #3a3a3c（墨色）
SAKURA = (0xE8, 0xA0, 0xB0)  # --sakura: #e8a0b0（樱花点缀色）

OUTER_FRAC = 0.4375  # 墨色外方边长占图标尺寸的比例（512 时即 224px）
INNER_FRAC = 0.5     # 樱色内方边长占墨色外方的比例（224 时即 112px）


def mix(a, b, t):
    """按覆盖率 t 混合颜色 a、b（t 为 0~1 的浮点数）。"""
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rect_coverage(px, py, x0, y0, x1, y1):
    """像素 [px, px+1) x [py, py+1) 与矩形 [x0, x1) x [y0, y1) 的重叠面积（0~1）。"""
    cx = min(px + 1.0, x1) - max(px * 1.0, x0)
    cy = min(py + 1.0, y1) - max(py * 1.0, y0)
    if cx <= 0.0 or cy <= 0.0:
        return 0.0
    return min(cx, 1.0) * min(cy, 1.0)


def pixel(px, py, size):
    """返回尺寸为 size 的图标中，像素 (px, py) 的 RGBA 颜色。"""
    outer = size * OUTER_FRAC
    inner = outer * INNER_FRAC
    x0 = (size - outer) / 2.0
    y0 = (size - outer) / 2.0
    ix0 = (size - inner) / 2.0
    iy0 = (size - inner) / 2.0

    c_outer = rect_coverage(px, py, x0, y0, x0 + outer, y0 + outer)
    color = mix(PAPER, INK, c_outer)
    c_inner = rect_coverage(px, py, ix0, iy0, ix0 + inner, iy0 + inner)
    color = mix(color, SAKURA, c_inner)
    return color[0], color[1], color[2], 255


def write_png(path, size):
    """将 size x size 的图标写为 RGBA PNG 文件。"""
    def chunk(tag, data):
        raw = tag + data
        return struct.pack('>I', len(data)) + raw + struct.pack('>I', zlib.crc32(raw))

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)  # 8bit RGBA
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0 (None)
        for x in range(size):
            raw.extend(pixel(x, y, size))
    idat = zlib.compress(bytes(raw), 9)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', idat))
        f.write(chunk(b'IEND', b''))


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    targets = {
        'icon-192.png': 192,
        'icon-512.png': 512,
        'icon-maskable-512.png': 512,
        'apple-touch-icon.png': 180,
        'favicon-32.png': 32,
    }
    for filename, size in targets.items():
        out = os.path.join(here, filename)
        write_png(out, size)
        print('wrote %s (%dx%d)' % (out, size, size))


if __name__ == '__main__':
    main()
