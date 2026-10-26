#!/usr/bin/env python3
"""纯白 PWA 图标生成器（仅使用 Python 标准库 + numpy，无其他第三方依赖）。

从 `pwa/icon.svg`（手写「纯白」字标的矢量源）栅格化生成全套 PNG 图标：

    icon-192.png           192x192   manifest "any" 用途
    icon-512.png           512x512   manifest "any" 用途
    icon-maskable-512.png  512x512   manifest "maskable" 用途（全出血底 + 安全区适配）
    apple-touch-icon.png   180x180   iOS 主屏图标（<link rel="apple-touch-icon">，无 alpha）
    favicon-32.png         32x32     浏览器标签页图标（<link rel="icon">）

其中 apple-touch-icon.png 会额外写一份到站点根目录（../apple-touch-icon.png），
因为 iOS 的整站 Web Clip 图标按 Apple 文档应位于根目录下；两者内容同源。

为何需要本脚本：`pwa/icon.svg` 是纯矢量的字标（viewBox 16800x12600、
stroke-width 5）。按等比缩放后，在 512px 图标里原始线宽只有约 0.15px，
肉眼几乎不可见，也不适合直接作为 PNG 供浏览器/系统使用（iOS 的
apple-touch-icon、manifest 的 192/512 图标都要求位图）。因此本脚本
解析该 SVG 的路径并用 numpy 栅格化，同时按 STROKE_SCALE 加粗描边，
保证小尺寸下依然可读。

渲染流程（纯标准库 + numpy，无外部 SVG 渲染器）：
    1) 正则解析 <path d="...">，仅支持本图标用到的 M/Z/c/l 四种命令；
    2) 三次贝塞尔按平坦度自适应细分（de Casteljau 折半）成折线；
    3) 以「胶囊距离场 + 1px 抗锯齿」逐段光栅化（round cap / round join）；
    4) 纸白全出血底 + 品牌墨色描边，输出 8bit RGBA PNG。

运行：

    python3 pwa/generate-icons.py
"""

import math
import os
import re
import struct
import sys
import zlib

try:
    import numpy as np
except ImportError:  # 类型检查器/未装 numpy 的环境下也能通过静态分析
    np = None


def require_numpy():
    """确保 numpy 可用；缺失时给出可执行的安装提示。"""
    if np is None:
        raise SystemExit(
            '本脚本需要 numpy（唯一第三方依赖）。请先安装：\n'
            '    python3 -m pip install numpy'
        )
    return np

# ---- 颜色常量 ----
PAPER = (0xF9, 0xF8, 0xF6)      # --paper: #f9f8f6（纯白品牌底色，图标全出血底）
INK_STROKE = (0x3A, 0x3A, 0x3C)  # --ink: #3a3a3c（品牌墨色，字标描边色）
# 如需保留字标原始黑色（#000000），把上面一行改为 (0x00, 0x00, 0x00)。

# ---- 描边加粗 ----
# SVG 的 stroke-width=5 在 16800px 宽的 viewBox 里极细（等比缩放到 512px
# 时约 0.15px）。STROKE_SCALE 是描边放大倍率，值越大线条越粗。
# 512px 图标下当前取值约对应 6px 描边；请按实际观感调整。
STROKE_SCALE = 32.0

# ---- 布局留白 ----
# "any" 用途图标四周留白比例（占边长）。字标为 4:3 横幅，放入正方形画布
# 时上下会自然留白，这里只控制横向留白。
MARGIN_ANY = 0.10

# maskable 图标的安全区是正中央直径 80% 的圆；这里让字标外接矩形对角线
# 恰好等于该圆直径，保证整枚字标完整落在安全区内、不会被系统裁切。
MASKABLE_SAFE_FRAC = 0.8


# ==================== SVG 路径解析 ====================

def parse_path_data(d):
    """把 SVG path 的 d 属性解析成图元列表。

    仅支持本图标用到的四种命令：
        M x,y          绝对 moveto（其后若紧跟数字对，按绝对 lineto 处理）
        c dx1,dy1 dx2,dy2 dx,dy   相对三次贝塞尔
        l dx,dy        相对 lineto
        Z              闭合当前子路径
    返回图元列表，每个图元为元组：
        ('line', x0, y0, x1, y1)
        ('cubic', x0, y0, x1, y1, x2, y2, x3, y3)
    图元使用绝对坐标，便于后续统一变换。
    """
    # 把命令字母与数字（含小数、负号、科学计数法）切成 token
    tokens = re.findall(r'[MZcl]|[-+]?(?:\d+\.\d*|\.\d*|\d+)(?:[eE][-+]?\d+)?', d)
    prims = []
    cx = cy = sx = sy = 0.0
    cmd = None
    i = 0
    n = len(tokens)
    while i < n:
        tok = tokens[i]
        if re.fullmatch(r'[MZcl]', tok):
            if tok == 'Z':
                # 闭合：回到子路径起点
                prims.append(('line', cx, cy, sx, sy))
                cx, cy = sx, sy
            cmd = tok
            i += 1
            continue
        # 下面是数字，按当前命令消费对应个数
        if cmd == 'M':
            x = float(tok)
            y = float(tokens[i + 1])
            i += 2
            cx, cy = x, y
            sx, sy = x, y
            cmd = 'L'  # M 后的后续数字对视为绝对 lineto
        elif cmd == 'L':
            x = float(tok)
            y = float(tokens[i + 1])
            i += 2
            prims.append(('line', cx, cy, x, y))
            cx, cy = x, y
        elif cmd == 'l':
            dx = float(tok)
            dy = float(tokens[i + 1])
            i += 2
            prims.append(('line', cx, cy, cx + dx, cy + dy))
            cx += dx
            cy += dy
        elif cmd == 'c':
            x1 = cx + float(tok)
            y1 = cy + float(tokens[i + 1])
            x2 = cx + float(tokens[i + 2])
            y2 = cy + float(tokens[i + 3])
            x3 = cx + float(tokens[i + 4])
            y3 = cy + float(tokens[i + 5])
            i += 6
            prims.append(('cubic', cx, cy, x1, y1, x2, y2, x3, y3))
            cx, cy = x3, y3
        else:
            # 未知命令：本图标不应出现，安全跳过该数字
            i += 1
    return prims


def _dist_point_line(px, py, x0, y0, x1, y1):
    """点 (px,py) 到直线（过 x0,y0 与 x1,y1）的距离。"""
    dx = x1 - x0
    dy = y1 - y0
    length2 = dx * dx + dy * dy
    if length2 == 0:
        return math.hypot(px - x0, py - y0)
    return abs(dy * px - dx * py + x1 * y0 - y1 * x0) / math.sqrt(length2)


def _flatten_cubic(p0, p1, p2, p3, tol):
    """把三次贝塞尔细分成折线点列（含首点，不含重复尾点）。

    tol 是允许的曲线相对弦的最大偏差。采用 de Casteljau 折半 + 控制点
    到弦的距离作为平坦度判据：贝塞尔曲线整体落在控制多边形凸包内，
    因此只要两个内部控制点到弦的距离都不超过 tol，整段曲线对弦的
    偏差也不超过 tol（保守判据，宁可多细分也不产生视觉折角）。
    """
    pts = [p0]
    stack = [(p0, p1, p2, p3)]
    while stack:
        a, b, c, d = stack.pop()
        d1 = _dist_point_line(b[0], b[1], a[0], a[1], d[0], d[1])
        d2 = _dist_point_line(c[0], c[1], a[0], a[1], d[0], d[1])
        if max(d1, d2) <= tol:
            pts.append(d)
            continue
        # de Casteljau 在 t=0.5 处一分为二
        ab = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        bc = ((b[0] + c[0]) / 2, (b[1] + c[1]) / 2)
        cd = ((c[0] + d[0]) / 2, (c[1] + d[1]) / 2)
        abc = ((ab[0] + bc[0]) / 2, (ab[1] + bc[1]) / 2)
        bcd = ((bc[0] + cd[0]) / 2, (bc[1] + cd[1]) / 2)
        mid = ((abc[0] + bcd[0]) / 2, (abc[1] + bcd[1]) / 2)
        stack.append((mid, bcd, cd, d))
        stack.append((a, ab, abc, mid))
    return pts


def prims_to_segments(prims, tol):
    """把图元列表展平成线段列表 [(x0,y0,x1,y1), ...]（绝对坐标）。"""
    segments = []
    for prim in prims:
        if prim[0] == 'line':
            _, x0, y0, x1, y1 = prim
            segments.append((x0, y0, x1, y1))
        else:
            _, x0, y0, x1, y1, x2, y2, x3, y3 = prim
            pts = _flatten_cubic((x0, y0), (x1, y1), (x2, y2), (x3, y3), tol)
            for a, b in zip(pts, pts[1:]):
                segments.append((a[0], a[1], b[0], b[1]))
    return segments


# ==================== 布局与光栅化 ====================

def compute_bbox(prims):
    """所有图元（含贝塞尔控制点）的包围盒，用于等比缩放。"""
    xs = []
    ys = []
    for prim in prims:
        if prim[0] == 'line':
            xs.extend((prim[1], prim[3]))
            ys.extend((prim[2], prim[4]))
        else:
            xs.extend((prim[1], prim[3], prim[5], prim[7]))
            ys.extend((prim[2], prim[4], prim[6], prim[8]))
    return min(xs), min(ys), max(xs), max(ys)


def fit_transform(bbox, size, maskable):
    """计算把字标平移到画布中央的等比缩放与偏移。

    返回 (scale, offset_x, offset_y)：
        像素坐标 = 源坐标 * scale + offset。
    """
    minx, miny, maxx, maxy = bbox
    aw = maxx - minx
    ah = maxy - miny
    if aw <= 0 or ah <= 0:
        return 1.0, 0.0, 0.0
    if maskable:
        # 对角线适配安全圆：diag * scale <= MASKABLE_SAFE_FRAC * size
        diag = math.hypot(aw, ah)
        scale = (MASKABLE_SAFE_FRAC * size) / diag
    else:
        usable = size * (1.0 - 2.0 * MARGIN_ANY)
        scale = min(usable / aw, usable / ah)
    ox = (size - aw * scale) / 2.0 - minx * scale
    oy = (size - ah * scale) / 2.0 - miny * scale
    return scale, ox, oy


def render(size, segments, bbox, maskable):
    """把线段列表光栅化为 size x size 的 RGBA numpy 数组。"""
    scale, ox, oy = fit_transform(bbox, size, maskable)
    # SVG 中 stroke-width=5（运行时从 icon.svg 读取），此处乘 STROKE_SCALE 加粗
    stroke_px = STROKE_SCALE * STROKE_WIDTH * scale
    half = stroke_px / 2.0
    if half <= 0.0:
        half = 0.5

    # 先整体变换到像素坐标，再逐段求胶囊距离场
    segs = np.asarray(segments, dtype=np.float64) * scale
    segs[:, 0] += ox
    segs[:, 1] += oy
    segs[:, 2] += ox
    segs[:, 3] += oy

    coverage = np.zeros((size, size), dtype=np.float64)

    for x0, y0, x1, y1 in segs:
        minx = int(math.floor(min(x0, x1) - half - 1.0))
        maxx = int(math.ceil(max(x0, x1) + half + 1.0))
        miny = int(math.floor(min(y0, y1) - half - 1.0))
        maxy = int(math.ceil(max(y0, y1) + half + 1.0))
        minx = max(minx, 0)
        maxx = min(maxx, size - 1)
        miny = max(miny, 0)
        maxy = min(maxy, size - 1)
        if minx > maxx or miny > maxy:
            continue

        # 该包围盒内所有像素中心坐标
        yy, xx = np.mgrid[miny:maxy + 1, minx:maxx + 1]
        px = xx.astype(np.float64) + 0.5
        py = yy.astype(np.float64) + 0.5

        dx = x1 - x0
        dy = y1 - y0
        length2 = dx * dx + dy * dy
        if length2 < 1e-12:
            dist = np.sqrt((px - x0) ** 2 + (py - y0) ** 2)
        else:
            t = ((px - x0) * dx + (py - y0) * dy) / length2
            np.clip(t, 0.0, 1.0, out=t)
            cx = x0 + t * dx
            cy = y0 + t * dy
            dist = np.sqrt((px - cx) ** 2 + (py - cy) ** 2)

        # 1px 抗锯齿：距中心 half 处 50% 覆盖，half±0.5 处线性过渡
        cov = np.clip(half + 0.5 - dist, 0.0, 1.0)
        np.maximum(coverage[miny:maxy + 1, minx:maxx + 1], cov,
                   out=coverage[miny:maxy + 1, minx:maxx + 1])

    # 颜色混合：纸白底 + 墨色描边按覆盖率叠加
    img = np.empty((size, size, 4), dtype=np.uint8)
    for ch in range(3):
        img[..., ch] = np.rint(
            PAPER[ch] + (INK_STROKE[ch] - PAPER[ch]) * coverage
        ).astype(np.uint8)
    img[..., 3] = 255
    return img


# ==================== PNG 写入 ====================

def write_png(path, arr, alpha=True):
    """把 (size, size, 3/4) 的 numpy 数组写为 PNG 文件。

    alpha=True  输出 RGBA（颜色类型 6，4 字节/像素），用于 manifest 与
               浏览器 favicon 等允许透明通道的场合。
    alpha=False 输出 RGB（颜色类型 2，3 字节/像素，无 alpha 通道），
               用于 iOS 的 apple-touch-icon——iOS 的 Web Clip 图标
               不允许包含透明通道，含 alpha 会被拒绝并回退为标题首字。
    """
    size = arr.shape[0]
    color_type = 6 if alpha else 2
    channels = 4 if alpha else 3

    def chunk(tag, data):
        raw = tag + data
        return struct.pack('>I', len(data)) + raw + struct.pack('>I', zlib.crc32(raw))

    ihdr = struct.pack('>IIBBBBB', size, size, 8, color_type, 0, 0, 0)
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0 (None)
        raw.extend(arr[y][:, :channels].tobytes())
    idat = zlib.compress(bytes(raw), 9)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', idat))
        f.write(chunk(b'IEND', b''))


# ==================== 主流程 ====================

# 从 pwa/icon.svg 读取的描边宽度（模块级，供 render 使用）
STROKE_WIDTH = 5.0


def main():
    global STROKE_WIDTH

    here = os.path.dirname(os.path.abspath(__file__))
    svg_path = os.path.join(here, 'icon.svg')
    with open(svg_path, encoding='utf-8') as f:
        svg = f.read()

    # 读取 viewBox 与 stroke-width，确认源文件形态
    vb_match = re.search(r'viewBox="([^"]+)"', svg)
    if not vb_match:
        raise SystemExit('icon.svg 缺少 viewBox')
    sw_match = re.search(r'stroke-width:\s*([0-9.]+)', svg)
    if sw_match:
        STROKE_WIDTH = float(sw_match.group(1))

    paths = re.findall(r'\bd="([^"]+)"', svg)
    if not paths:
        raise SystemExit('icon.svg 中未找到 <path d="...">')

    # 解析并展平所有路径（按 512px 目标的平坦度统一细分，小尺寸直接复用）
    prims = []
    for d in paths:
        prims.extend(parse_path_data(d))
    bbox = compute_bbox(prims)
    # 平坦度：512px 图标下允许约 0.25px 的弦偏差，换算回源坐标单位
    tol = 0.25 / fit_transform(bbox, 512, False)[0]
    segments = prims_to_segments(prims, tol)

    targets = {
        'icon-192.png': (192, False),
        'icon-512.png': (512, False),
        'icon-maskable-512.png': (512, True),
        'apple-touch-icon.png': (180, False),
        'favicon-32.png': (32, False),
    }
    for filename, (size, maskable) in targets.items():
        out = os.path.join(here, filename)
        arr = render(size, segments, bbox, maskable)
        # apple-touch-icon 专供 iOS 添加到主屏幕使用：必须无 alpha 通道，
        # 否则 iOS 会拒绝该图标并回退为「网站标题首字」方块。
        # 其余 PNG（manifest/favicon）保留 RGBA 无碍。
        write_png(out, arr, alpha=(filename != 'apple-touch-icon.png'))
        print('wrote %s (%dx%d)' % (out, size, size))

    # iOS 的站点级兜底：Apple 文档要求「整站图标」放在站点根目录下、名为
    # apple-touch-icon.png。部分 iOS 版本在 <link> 失效时会回退到根目录查找
    # 该文件；这里在生成图标时同步写一份到仓库根目录（与本脚本同级再上一级），
    # 保证根目录副本与 pwa/ 内副本永远同源、不会漂移。
    root_icon = os.path.join(here, os.pardir, 'apple-touch-icon.png')
    root_icon = os.path.abspath(root_icon)
    arr = render(180, segments, bbox, False)
    write_png(root_icon, arr, alpha=False)
    print('wrote %s (180x180)' % root_icon)


if __name__ == '__main__':
    main()
