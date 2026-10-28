#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""纯白 — 首发文章静态页面生成器（仅依赖 Python 3 标准库，无需安装任何包）。

用法（在仓库根目录执行）：

    python3 tools/build_articles.py                # 默认以仓库根目录为基准
    python3 tools/build_articles.py --root <path>  # 显式指定站点根目录

职责：

- 读取 article/ 下的 article-NN.md（含 front-matter 元数据）与
  article/covers/ 下的 PNG 封面；
- 生成 article/index.html（首发文章列表，按栏目分组，读者从首页
  「栏目」卡片进入）与 article/posts/<slug>.html（文章阅读页）；
- 清理 article/posts/ 下本次未再生成的旧 *.html。该目录完全由本脚本
  管理，请勿在其中存放其他文件；
- 已生成的页面不再依赖任何运行时 JavaScript 读取 Markdown，
  纯静态 HTML 可直接部署到任意静态托管（GitHub Pages 等）。

错误处理约定（详见 article/README.md）：

- 致命错误（缺标题、缺/坏日期、缺/未知栏目、非法/重复 slug、
  front-matter 缺失等）：脚本中止并返回退出码 1，不写入任何文件，
  以保证部署内容永远来自一份通过校验的源数据；
- 警告（未指定封面、封面缺失/非 PNG、正文图片缺失、未知元数据字段、
  不安全链接协议等）：打印可定位的警告并优雅降级（无图排版/纯文本），
  不生成破损图片；
- 正文 Markdown 先整体 HTML 转义再解析：源文件里的任何原始 HTML 都
  按纯文本显示，不会被当作可执行脚本；链接与图片协议受白名单校验。
"""

import argparse
import html
import os
import re
import struct
import sys
import tempfile
from collections import OrderedDict
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

# ---------------------------------------------------------------------------
# 常量与约定
# ---------------------------------------------------------------------------

ARTICLE_DIR_NAME = 'article'          # 首发文章源目录（相对站点根目录）
COVERS_DIR_NAME = 'covers'            # 封面子目录（相对 article/）
POSTS_DIR_NAME = 'posts'              # 生成的文章页面子目录（相对 article/）
INDEX_FILENAME = 'index.html'         # 生成的文章列表页（article/index.html）

SOURCE_RE = re.compile(r'^article-(\d+)\.md$')          # 源文件命名规则
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')            # 日期格式 YYYY-MM-DD
SLUG_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')     # slug 字符集
PNG_MAGIC = b'\x89PNG\r\n\x1a\n'                        # PNG 文件签名

# 栏目键 → (栏目名, 栏目说明)。与首页「栏目」区块保持一致；列表页按此顺序输出。
COLUMNS = OrderedDict([
    ('fiction', ('小说', '短篇、中篇节选、实验叙事')),
    ('poetry', ('诗歌', '现代诗 · 古诗词 · 诗序')),
    ('essay', ('散文', '随笔 · 游记 · 非虚构叙事')),
    ('fanfic', ('同人文学', '邦多利 · GBC')),
    ('short-poems', ('特别专栏-短诗', '集腋成裘')),
    ('others', ('其他', '致那些不被定义的文字')),
])

KNOWN_FIELDS = ('title', 'date', 'column', 'summary', 'cover', 'slug')
ALLOWED_LINK_SCHEMES = ('http', 'https', 'mailto')

# 生成页面顶部的标识注释，说明文件来源，避免手工编辑被覆盖时感到意外
GENERATED_MARK = (
    '<!-- 本文件由 tools/build-articles.py 自动生成，请勿手工编辑。\n'
    '     修改 article/ 下的 Markdown 后，在仓库根目录运行\n'
    '     python3 tools/build_articles.py 重新生成。 -->\n'
)

WARNINGS = []  # 本次构建收集到的警告（source_name, message）


class FatalError(Exception):
    """致命错误：构建中止，不写入任何文件。"""


class Cover:
    """通过校验的封面：article/ 内的相对路径 + PNG 尺寸。"""

    def __init__(self, rel, width, height):
        self.rel = rel
        self.width = width
        self.height = height


class Article:
    """一篇通过元数据校验的首发文章。"""

    def __init__(self, source_name, slug, title, date_str, date_obj,
                 column, summary, cover, body_html, body_empty):
        self.source_name = source_name
        self.slug = slug
        self.title = title
        self.date_str = date_str
        self.date_obj = date_obj
        self.column = column
        self.summary = summary
        self.cover = cover
        self.body_html = body_html
        self.body_empty = body_empty


def warn(source_name, message):
    WARNINGS.append((source_name, message))


# ---------------------------------------------------------------------------
# 工具函数
# ---------------------------------------------------------------------------

def escape(text):
    """HTML 转义：所有插入模板的动态文本都必须经过本函数。"""
    return html.escape(str(text), quote=True)


def write_text_atomic(path, text):
    """先写临时文件再原子替换，避免中途失败留下半个文件。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix='.tmp-', suffix='.html')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(text)
        os.chmod(tmp, 0o644)  # mkstemp 默认 600，统一为常规可读权限
        os.replace(tmp, str(path))
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _is_cjk_char(ch):
    o = ord(ch)
    return (0x2E80 <= o <= 0x9FFF or 0xF900 <= o <= 0xFAFF or
            0xFF00 <= o <= 0xFFEF or ch in '·—…')


def join_lines(lines):
    """合并段落内折行：中文之间不加空格，其他情况加一个空格。"""
    if not lines:
        return ''
    out = lines[0]
    for line in lines[1:]:
        if out and line and (_is_cjk_char(out[-1]) or _is_cjk_char(line[0])):
            out += line
        else:
            out += ' ' + line
    return out


# ---------------------------------------------------------------------------
# 元数据解析与校验
# ---------------------------------------------------------------------------

def read_article_files(article_dir):
    """发现 article/ 下的文章源文件（仅顶层、按文件名升序）。"""
    if not article_dir.is_dir():
        raise FatalError(
            'article/ 目录不存在（%s）。请先按 article/README.md 创建。'
            % article_dir)
    files = []
    for p in sorted(article_dir.glob('*.md')):
        if p.name.lower() == 'readme.md':
            continue  # 维护文档，不是文章
        if SOURCE_RE.match(p.name):
            files.append(p)
        else:
            warn(p.name, '文件名不符合 article-NN.md 规则，已忽略（如需保留为草稿，请移出 article/ 或改名）')
    return files


def parse_front_matter(text, source_name):
    """解析 front-matter（--- 之间单行 key: value 形式）。"""
    lines = text.split('\n')
    if not lines or lines[0].strip() != '---':
        raise FatalError('%s: 文件必须以 --- front-matter 开头' % source_name)
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == '---':
            end = i
            break
    if end is None:
        raise FatalError('%s: front-matter 缺少结束的 ---' % source_name)
    meta = OrderedDict()
    for line in lines[1:end]:
        if not line.strip():
            continue
        m = re.match(r'^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$', line)
        if not m:
            raise FatalError('%s: 无法解析的元数据行：%s' % (source_name, line))
        key = m.group(1).lower()
        value = m.group(2).strip()
        if key in meta:
            warn(source_name, '字段 "%s" 重复，采用最后一个值' % key)
        meta[key] = value
    body = '\n'.join(lines[end + 1:])
    return meta, body


def derive_summary(body, limit=160):
    """正文首段自动摘要：去掉 Markdown 标记、压缩空白、截断。"""
    for block in body.split('\n\n'):
        block = block.strip()
        if not block:
            continue
        if block.startswith('#'):
            continue
        if block.startswith('>'):
            block = block.lstrip('> ').strip()
        plain = re.sub(r'!\[([^\]]*)\]\([^)]*\)', r'\1', block)
        plain = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', plain)
        plain = re.sub(r'[`*#]', '', plain)
        plain = re.sub(r'\s+', ' ', plain).strip()
        if not plain:
            continue
        if len(plain) > limit:
            plain = plain[:limit] + '…'
        return plain
    return ''


def load_cover(raw_value, article_dir, source_name):
    """校验封面：必须为 article/ 内存在的 PNG 文件；失败返回 None 并警告。"""
    value = (raw_value or '').strip()
    if not value:
        warn(source_name, '未指定 cover（封面）字段，该文章与所在栏目将不使用题图')
        return None
    if urlparse(value).scheme or value.startswith('/') or value.startswith('#'):
        warn(source_name, 'cover 必须是 article/ 目录内的相对路径（如 covers/article-01.png）：%s' % value)
        return None
    if not value.lower().endswith('.png'):
        warn(source_name, 'cover 必须是 PNG 文件（路径以 .png 结尾）：%s' % value)
        return None
    p = article_dir / value
    if not p.is_file():
        warn(source_name, 'cover 指定的文件不存在：%s' % value)
        return None
    data = p.read_bytes()[:24]
    if len(data) < 24 or not data.startswith(PNG_MAGIC):
        warn(source_name, 'cover 不是有效的 PNG 文件（文件头签名不符）：%s' % value)
        return None
    width, height = struct.unpack('>II', data[16:24])
    return Cover(rel=value.replace('\\', '/'), width=width, height=height)


def build_article(path, article_dir):
    source_name = path.name
    text = path.read_text(encoding='utf-8-sig')
    meta, body = parse_front_matter(text, source_name)

    for key in meta:
        if key not in KNOWN_FIELDS:
            warn(source_name, '未知元数据字段 "%s"（已忽略）。可用字段：%s'
                 % (key, ', '.join(KNOWN_FIELDS)))

    title = (meta.get('title') or '').strip()
    if not title:
        raise FatalError('%s: 缺少必填字段 title（文章标题）' % source_name)

    date_str = (meta.get('date') or '').strip()
    if not DATE_RE.match(date_str):
        raise FatalError('%s: date 字段缺失或格式无效（要求 YYYY-MM-DD，如 2026-10-28）：%r'
                         % (source_name, date_str))
    try:
        date_obj = date.fromisoformat(date_str)
    except ValueError:
        raise FatalError('%s: date 不是有效的日历日期（要求 YYYY-MM-DD）：%r'
                         % (source_name, date_str))

    column = (meta.get('column') or '').strip().lower()
    if column not in COLUMNS:
        raise FatalError('%s: column 字段无效：%r（允许值：%s）'
                         % (source_name, column, ' / '.join(COLUMNS.keys())))

    slug = (meta.get('slug') or '').strip()
    if not slug:
        slug = Path(source_name).stem
    if not SLUG_RE.match(slug) or len(slug) > 64:
        raise FatalError('%s: slug 无效（仅小写字母、数字与连字符，长度 ≤ 64）：%r'
                         % (source_name, slug))

    summary = (meta.get('summary') or '').strip()
    if not summary:
        summary = derive_summary(body)
        warn(source_name, '未提供 summary 字段，已自动取正文首段作为摘要（建议显式填写）')

    cover = load_cover(meta.get('cover'), article_dir, source_name)
    body_html = render_markdown(body, source_name, article_dir)
    body_empty = not body.strip()
    if body_empty:
        warn(source_name, '正文为空，页面将只显示标题与摘要')

    return Article(source_name=source_name, slug=slug, title=title,
                   date_str=date_str, date_obj=date_obj, column=column,
                   summary=summary, cover=cover, body_html=body_html,
                   body_empty=body_empty)


# ---------------------------------------------------------------------------
# Markdown 渲染（安全子集）
#
# 支持：标题（# ～ ######，页面内 # 映射为 h2）、段落、**加粗**、*斜体*、
#       `行内代码`、> 引用、无序/有序列表（支持一层缩进嵌套）、
#       [链接](url)、![图片](路径)、``` 围栏代码块、--- 分隔线。
#
# 安全策略：正文在渲染前整体 HTML 转义（见 render_inline），源文件中的
# 原始 HTML 一律按纯文本显示；链接协议白名单 http/https/mailto 或相对路径，
# javascript: 等不安全协议降级为纯文本并告警；正文图片只允许 article/ 内
# 相对路径且必须真实存在，缺失时渲染文字占位而不是破损图片。
# ---------------------------------------------------------------------------

CODE_SPAN_RE = re.compile(r'`([^`\n]+)`')
LINK_RE = re.compile(r'\[([^\]\n]+)\]\(([^)\s]+)\)')
IMAGE_RE = re.compile(r'!\[([^\]\n]*)\]\(([^)\s]+)\)')


def resolve_image(raw, source_name, article_dir):
    """解析正文图片：返回 (相对 posts/ 的 URL, 宽, 高)；失败返回 None。"""
    if not raw:
        return None
    parsed = urlparse(raw)
    if parsed.scheme or raw.startswith('/') or raw.startswith('#'):
        warn(source_name, '不支持的图片地址（仅允许 article/ 内的相对路径）：%s' % raw)
        return None
    norm = raw.replace('\\', '/')
    if norm.startswith('./') or norm.startswith('../'):
        warn(source_name, '图片路径请直接写相对 article/ 的路径（如 images/foo.png），不要使用 ./ 或 ../：%s' % raw)
        return None
    p = article_dir / norm
    if not p.is_file():
        warn(source_name, '正文图片文件不存在，已降级为文字占位：%s' % raw)
        return None
    width = height = None
    if norm.lower().endswith('.png'):
        data = p.read_bytes()[:24]
        if len(data) >= 24 and data.startswith(PNG_MAGIC):
            width, height = struct.unpack('>II', data[16:24])
    return ('../' + norm, width, height)


def image_repl(m, source_name, article_dir):
    alt = m.group(1).strip() or '图片'
    resolved = resolve_image(m.group(2).strip(), source_name, article_dir)
    if resolved is None:
        return '<span class="article-img-missing">［图片缺失：%s］</span>' % alt
    rel_url, width, height = resolved
    size = (' width="%d" height="%d"' % (width, height)) if width else ''
    return '<img src="%s" alt="%s"%s loading="lazy" decoding="async">' % (rel_url, alt, size)


def link_repl(m, source_name):
    label = m.group(1)
    raw = m.group(2).strip()
    parsed = urlparse(raw)
    if parsed.scheme:
        scheme = parsed.scheme.lower()
        if scheme in ('http', 'https'):
            return '<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>' % (raw, label)
        if scheme == 'mailto':
            return '<a href="%s">%s</a>' % (raw, label)
        warn(source_name, '不安全的链接协议已按纯文本显示：%s' % raw)
        return label
    if not raw:
        return label
    if re.search(r'[\s\x00-\x1f]', raw):
        warn(source_name, '链接地址包含空白等非法字符，已按纯文本显示：%s' % raw)
        return label
    return '<a href="%s">%s</a>' % (raw, label)


def render_inline(raw_text, source_name, article_dir):
    """行内 Markdown → HTML。先转义、再识别，保证原始 HTML 只按文本显示。"""
    if not raw_text:
        return ''
    # 1. 行内代码先占位，避免其中的 ** 等标记被误解析
    code_tokens = []

    def code_sub(m):
        code_tokens.append(m.group(1))
        return '\x00C%d\x00' % len(code_tokens)

    text = CODE_SPAN_RE.sub(code_sub, raw_text)
    # 2. 整体 HTML 转义（安全核心：任何 <script> 等原始 HTML 都变成纯文本）
    text = escape(text)
    # 3. 图片 → 链接 → 加粗 → 斜体
    text = IMAGE_RE.sub(lambda m: image_repl(m, source_name, article_dir), text)
    text = LINK_RE.sub(lambda m: link_repl(m, source_name), text)
    text = re.sub(r'\*\*([^*\n]+)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'(?<!\*)\*([^*\n]+)\*(?!\*)', r'<em>\1</em>', text)
    # 4. 还原行内代码（内容单独转义）
    text = re.sub(r'\x00C(\d+)\x00',
                  lambda m: '<code>%s</code>' % escape(code_tokens[int(m.group(1)) - 1]),
                  text)
    return text


LIST_ITEM_RE = re.compile(r'^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$')


def parse_blocks(raw_source, source_name):
    """块级解析：围栏代码、标题、分隔线、引用、列表、段落。"""
    lines = raw_source.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    n = len(lines)
    blocks = []
    para = []

    def flush_para():
        if para:
            blocks.append(('para', join_lines(para)))
            del para[:]

    i = 0
    while i < n:
        line = lines[i]
        stripped = line.strip()
        if not stripped:
            flush_para()
            i += 1
            continue

        # 围栏代码块 ``` 或 ~~~
        m = re.match(r'^(```+|~~~+)\s*(.*)$', stripped)
        if m:
            flush_para()
            fence = m.group(1)[0]
            fence_len = len(m.group(1))
            info = m.group(2).strip()
            lang = info.split()[0] if info.split() else ''
            code = []
            i += 1
            close_re = re.compile(r'^\s*' + re.escape(fence) + '{' + str(fence_len) + r',}\s*$')
            while i < n and not close_re.match(lines[i]):
                code.append(lines[i])
                i += 1
            if i >= n:
                warn(source_name, '代码块缺少闭合的 %s（已渲染到正文末尾）' % m.group(1))
            else:
                i += 1
            blocks.append(('code', lang, '\n'.join(code)))
            continue

        # ATX 标题：# 映射为 h2（页面唯一 h1 留给文章标题），###### 为 h6
        m = re.match(r'^(#{1,6})\s+(.*)$', stripped)
        if m:
            flush_para()
            level = min(len(m.group(1)) + 1, 6)
            blocks.append(('heading', level, m.group(2).rstrip()))
            i += 1
            continue

        # 分隔线
        if re.match(r'^(---+|\*\*\*+|___+)$', stripped):
            flush_para()
            blocks.append(('hr',))
            i += 1
            continue

        # 引用
        if stripped.startswith('>'):
            flush_para()
            quote_lines = []
            while i < n:
                s = lines[i]
                if s.strip() == '':
                    j = i
                    while j < n and lines[j].strip() == '':
                        j += 1
                    if j < n and lines[j].lstrip().startswith('>'):
                        quote_lines.append('')
                        i = j
                        continue
                    break
                if s.lstrip().startswith('>'):
                    quote_lines.append(s.lstrip()[1:].lstrip())
                    i += 1
                else:
                    break
            blocks.append(('quote', quote_lines))
            continue

        # 列表（支持一层缩进嵌套；缩进的非列表行视为上一项续行）
        lm = LIST_ITEM_RE.match(line)
        if lm:
            flush_para()
            items = []
            while i < n:
                lm2 = LIST_ITEM_RE.match(lines[i])
                if lm2:
                    indent = len(lm2.group(1))
                    ordered = lm2.group(2)[0].isdigit()
                    # 列表类型变化（有序 ↔ 无序）视为新列表，避免把两个列表
                    # 合并成一个（Markdown 的常见行为）
                    if items and ordered != items[-1][1]:
                        break
                    items.append([indent, ordered, lm2.group(3).strip()])
                    i += 1
                    continue
                if not lines[i].strip():
                    j = i
                    while j < n and not lines[j].strip():
                        j += 1
                    if j < n and LIST_ITEM_RE.match(lines[j]):
                        i = j
                        continue
                    break
                if items and (lines[i].startswith(' ') or lines[i].startswith('\t')):
                    items[-1][2] = items[-1][2] + ' ' + lines[i].strip()
                    i += 1
                    continue
                break
            blocks.append(('list', items))
            continue

        para.append(stripped)
        i += 1

    flush_para()
    return blocks


def render_list_items(items, source_name, article_dir):
    """渲染列表（items: [indent, ordered, text]），缩进增大即嵌套。"""

    def render_level(idx, indent):
        ordered = items[idx][1]
        tag = 'ol' if ordered else 'ul'
        parts = ['<%s>' % tag]
        open_li = False
        while idx < len(items) and items[idx][0] >= indent:
            it_indent, it_ordered, text = items[idx]
            if it_indent > indent:
                inner, idx = render_level(idx, it_indent)
                parts.append(inner)
                continue
            if open_li:
                parts.append('</li>')
            parts.append('<li>' + render_inline(text, source_name, article_dir))
            open_li = True
            idx += 1
        if open_li:
            parts.append('</li>')
        parts.append('</%s>' % tag)
        return ''.join(parts), idx

    rendered, _ = render_level(0, 0)
    return rendered


def render_block(block, source_name, article_dir):
    kind = block[0]
    if kind == 'para':
        return '<p>' + render_inline(block[1], source_name, article_dir) + '</p>'
    if kind == 'heading':
        level, text = block[1], block[2]
        return '<h%d>%s</h%d>' % (level, render_inline(text, source_name, article_dir), level)
    if kind == 'hr':
        return '<hr>'
    if kind == 'code':
        lang, code = block[1], block[2]
        cls = ' class="language-%s"' % lang if lang else ''
        return '<pre><code%s>%s</code></pre>' % (cls, escape(code))
    if kind == 'quote':
        paras = []
        cur = []
        for ln in block[1]:
            if ln == '':
                if cur:
                    paras.append(join_lines(cur))
                    cur = []
            else:
                cur.append(ln)
        if cur:
            paras.append(join_lines(cur))
        if not paras:
            paras = ['']
        return '<blockquote>' + ''.join(
            '<p>%s</p>' % render_inline(p, source_name, article_dir) for p in paras) + '</blockquote>'
    if kind == 'list':
        return render_list_items(block[1], source_name, article_dir)
    return ''


def render_markdown(source, source_name, article_dir):
    blocks = parse_blocks(source, source_name)
    return '\n'.join(render_block(b, source_name, article_dir) for b in blocks).strip()


# ---------------------------------------------------------------------------
# 页面模板
# ---------------------------------------------------------------------------

def page_head(prefix, title, description):
    """<head>：PWA 区块与脚本引用。prefix 为本页面到站点根的相对前缀。"""
    return '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="description" content="__DESCRIPTION__">
    <!-- PWA 基础支持（渐进式 Web 应用）：manifest 声明、主题色与图标。
         相对路径必须与页面所在目录层级匹配：根目录页面用 ./，
         二级目录页面（sub/*/、announcements/history/、article/posts/）用 ../../。
         本区块由 tools/build-articles.py 生成。详见 pwa/README.md。 -->
    <link rel="manifest" href="__PREFIX__manifest.webmanifest">
    <link rel="icon" href="__PREFIX__pwa/icon.svg" type="image/svg+xml">
    <link rel="icon" href="__PREFIX__pwa/favicon-32.png" sizes="32x32" type="image/png">
    <link rel="apple-touch-icon" sizes="180x180" href="__PREFIX__pwa/apple-touch-icon.png">
    <meta name="theme-color" content="#f9f8f6" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#161618" media="(prefers-color-scheme: dark)">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="纯白">
    <title>__TITLE__</title>
    <script src="__PREFIX__script/font-loader.js"></script>
    <link rel="stylesheet" href="__PREFIX__style/style.css">
    <script src="__PREFIX__script/script.js" defer></script>
</head>
'''.replace('__PREFIX__', prefix).replace('__TITLE__', title).replace('__DESCRIPTION__', description)


def page_header(prefix, articles_url, articles_current):
    """页眉：与全站其他子页面结构一致（logo + 导航 + 汉堡按钮）。"""
    current_attr = ' aria-current="page"' if articles_current else ''
    return '''<body>
    <!-- 页眉 -->
    <header class="header" id="header">
        <div class="header-inner">
            <a href="__PREFIX__index.html" class="logo">纯白</a>
            <nav class="nav" id="nav" aria-label="主导航">
                <a href="__ARTICLES__" class="nav-link"__CURRENT__>文章</a>
                <a href="__PREFIX__index.html#announcements" class="nav-link">公告</a>
                <a href="__PREFIX__index.html#columns" class="nav-link">阅读</a>
                <a href="__PREFIX__index.html#downloads" class="nav-link">下载</a>
                <a href="__PREFIX__index.html#contact" class="nav-link">联系</a>
            </nav>
            <button class="menu-toggle" id="menuToggle" aria-label="切换导航" aria-expanded="false" aria-controls="nav">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </header>
'''.replace('__PREFIX__', prefix).replace('__ARTICLES__', articles_url).replace('__CURRENT__', current_attr)


def page_footer(prefix, extra_links):
    """页脚：返回首页 + 首发文章列表 + 合作联系。extra_links 为附加链接 HTML。"""
    return '''    <!-- 页脚 -->
    <footer class="footer">
        <div class="footer-inner">
            <div class="footer-main">
                <p class="footer-copyright">《纯白》 · 2026</p>
                <nav class="footer-nav" aria-label="页脚导航">
                    <a href="__PREFIX__index.html" class="footer-link">返回首页</a>
__EXTRA__
                    <a href="__PREFIX__index.html#contact" class="footer-link">合作联系</a>
                </nav>
            </div>
            <p class="footer-note">开放知识 · 免费交流</p>
            <p class="footer-license">线上内容采用知识共享协议（<a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans">BY-NC 4.0</a>）发布</p>
        </div>
    </footer>
</body>
</html>
'''.replace('__PREFIX__', prefix).replace('__EXTRA__', extra_links)


def footer_link(href, label):
    return '                    <a href="%s" class="footer-link">%s</a>\n' % (escape(href), escape(label))


# ---------------------------------------------------------------------------
# 页面生成
# ---------------------------------------------------------------------------

def render_article_page(article):
    """文章阅读页（article/posts/<slug>.html，二级目录，前缀 ../../）。"""
    prefix = '../../'
    col_name, _ = COLUMNS[article.column]

    cover_html = ''
    if article.cover:
        cover_html = ('<img class="article-cover" src="../%s" alt="《%s》封面" '
                      'width="%d" height="%d">'
                      % (escape(article.cover.rel), escape(article.title),
                         article.cover.width, article.cover.height))
    body_html = article.body_html
    if article.body_empty:
        body_html = '<p class="article-body-empty">（本文暂无正文内容。）</p>'

    content = GENERATED_MARK + page_head(
        prefix,
        '%s · 纯白' % article.title,
        article.summary or article.title,
    ) + page_header(prefix, '../index.html', True) + '''    <main>
        <!-- 首发文章阅读页（由 tools/build-articles.py 生成） -->
        <article class="article-section">
            <div class="container article-container">
                <a class="article-back" href="../index.html"><span aria-hidden="true">←</span>首发文章列表</a>
                <header class="article-header">
                    <div class="article-meta">
                        <span class="article-column-badge">%s</span>
                        <time class="article-date" datetime="%s">%s</time>
                    </div>
                    <h1 class="article-title">%s</h1>
                    <p class="article-summary">%s</p>
%s
                </header>
                <div class="article-body">
%s
                </div>
                <nav class="article-pager" aria-label="文章导航">
                    <a href="../index.html">返回首发文章列表</a>
                    <a href="../../index.html">返回首页</a>
                </nav>
            </div>
        </article>
    </main>
''' % (escape(col_name), escape(article.date_str), escape(article.date_str),
       escape(article.title), escape(article.summary), cover_html, body_html) + \
        page_footer(prefix, footer_link('../index.html', '首发文章列表'))
    return content


def render_column_section(key, name, desc, hero_article, articles):
    """列表页中单个栏目的区块：标题 + 可选 Hero 题图 + 文章列表。"""
    hero_html = ''
    if hero_article and hero_article.cover:
        c = hero_article.cover
        hero_html = '''                <figure class="article-column-hero">
                    <img src="./%s" alt="栏目「%s」题图（《%s》封面）" width="%d" height="%d" loading="lazy" decoding="async">
                    <figcaption>栏目题图 · 封面来源：<a href="./posts/%s.html">《%s》</a>（本栏目最新一篇提供封面的文章）</figcaption>
                </figure>
''' % (escape(c.rel), escape(name), escape(hero_article.title), c.width, c.height,
       escape(hero_article.slug), escape(hero_article.title))

    items = []
    for a in articles:
        items.append('''                    <li>
                        <a class="article-index-link" href="./posts/%s.html">
                            <time datetime="%s">%s</time>
                            <h3 class="article-index-title">%s</h3>
                            <p class="article-index-summary">%s</p>
                        </a>
                    </li>''' % (escape(a.slug), escape(a.date_str), escape(a.date_str),
                                escape(a.title), escape(a.summary)))
    return '''            <section class="article-column" id="%s">
                <header class="article-column-header">
                    <h2 class="article-column-title">%s</h2>
                    <p class="article-column-desc">%s</p>
                </header>
%s                <ul class="article-index-list">
%s
                </ul>
            </section>
''' % (escape(key), escape(name), escape(desc), hero_html, '\n'.join(items))


def render_index_page(by_column):
    """首发文章列表页（article/index.html，一级目录，前缀 ../）。"""
    prefix = '../'
    non_empty = [(k, v) for k, v in by_column.items() if v]

    chips = []
    sections = []
    for key, articles in by_column.items():
        if not articles:
            continue
        name, desc = COLUMNS[key]
        hero = next((a for a in articles if a.cover), None)
        chips.append('            <a class="article-column-chip" href="#%s">%s</a>'
                     % (escape(key), escape(name)))
        sections.append(render_column_section(key, name, desc, hero, articles))

    if not non_empty:
        body = '''                <div class="article-empty">
                    <p>暂无首发文章。在 <code>article/</code> 目录新增 <code>article-NN.md</code> 与封面后，运行
                    <code>python3 tools/build_articles.py</code> 即可生成文章页并出现在这里。</p>
                    <p>详细步骤见 <a href="./README.md">article/README.md</a>。</p>
                </div>
'''
    else:
        body = ('''                <nav class="article-columns-nav" aria-label="栏目导航">
%s
                </nav>
''' % '\n'.join(chips)) + '\n'.join(sections)

    content = GENERATED_MARK + page_head(
        prefix,
        '首发文章 · 纯白',
        '纯白 — 白色封皮首发文章列表。按栏目分组的在线阅读入口，最新文章在前。',
    ) + page_header(prefix, './index.html', True) + '''    <main>
        <!-- 首发文章列表页（由 tools/build-articles.py 生成） -->
        <section class="article-list-section">
            <div class="container">
                <h1 class="section-title">首发文章</h1>
                <p class="article-list-note">
                    白色封皮首发文章 · 独立成篇发布，按栏目分组展示，每栏目的文章按发布日期从新到旧排列。
                </p>
''' + body + '''            </div>
        </section>
    </main>
''' + page_footer(prefix, footer_link('./index.html', '首发文章列表'))
    return content


# ---------------------------------------------------------------------------
# 构建主流程
# ---------------------------------------------------------------------------

def build(article_dir, verbose=True):
    WARNINGS.clear()
    md_files = read_article_files(article_dir)

    articles = [build_article(p, article_dir) for p in md_files]

    seen = {}
    for a in articles:
        if a.slug in seen:
            raise FatalError('slug 重复："%s" 同时用于 %s 与 %s。请修改其中一篇的 slug 字段或文件名。'
                             % (a.slug, seen[a.slug], a.source_name))
        seen[a.slug] = a

    by_column = OrderedDict((k, []) for k in COLUMNS)
    for a in articles:
        by_column[a.column].append(a)
    for key in by_column:
        # 栏目内按日期从新到旧；同日按文件名升序（先按文件名稳定排序）
        col = sorted(by_column[key], key=lambda a: a.source_name)
        by_column[key] = sorted(col, key=lambda a: a.date_obj, reverse=True)

    index_html = render_index_page(by_column)
    write_text_atomic(article_dir / INDEX_FILENAME, index_html)

    current_files = {INDEX_FILENAME}
    for a in articles:
        post_path = article_dir / POSTS_DIR_NAME / (a.slug + '.html')
        write_text_atomic(post_path, render_article_page(a))
        current_files.add('%s/%s.html' % (POSTS_DIR_NAME, a.slug))

    # 清理本次未再生成的旧页面（article/posts/ 完全由本脚本管理）
    posts_dir = article_dir / POSTS_DIR_NAME
    if posts_dir.is_dir():
        for f in posts_dir.glob('*.html'):
            rel = '%s/%s' % (POSTS_DIR_NAME, f.name)
            if rel not in current_files:
                f.unlink()
                if verbose:
                    print('已删除过期页面：%s' % rel)

    if not verbose:
        return

    if WARNINGS:
        print('警告 %d 条：' % len(WARNINGS))
        for source_name, message in WARNINGS:
            print('  - [%s] %s' % (source_name, message))

    col_count = sum(1 for v in by_column.values() if v)
    print('生成完成：%d 篇文章、%d 个栏目' % (len(articles), col_count))
    print('  %s' % (article_dir / INDEX_FILENAME))
    for a in articles:
        print('  %s' % (article_dir / POSTS_DIR_NAME / (a.slug + '.html')))


def main(argv=None):
    parser = argparse.ArgumentParser(
        description='纯白首发文章静态页面生成器（仅依赖 Python 3 标准库）')
    parser.add_argument('--root', default=str(Path(__file__).resolve().parent.parent),
                        help='站点根目录（默认：本脚本的上一级目录）')
    args = parser.parse_args(argv)
    root = Path(args.root).resolve()
    article_dir = root / ARTICLE_DIR_NAME
    try:
        build(article_dir)
    except FatalError as e:
        print('[错误] ' + str(e), file=sys.stderr)
        print('构建中止：未写入或修改任何文件。修正上述问题后重新运行。', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
