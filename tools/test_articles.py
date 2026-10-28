#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""纯白首发文章生成器的自测脚本（仅依赖 Python 3 标准库）。

运行：

    python3 tools/test_articles.py

覆盖：正常生成、栏目分组与排序、Hero 封面选取规则、HTML 转义安全、
元数据错误（缺标题/坏日期/未知栏目/重复 slug）、封面缺失与非 PNG 降级、
正文图片缺失、不安全链接、过期页面清理、空目录等。
"""

import os
import struct
import sys
import tempfile
import unittest
import zlib
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_articles as ba


def make_png(path, w=640, h=360, color=(232, 160, 176)):
    """用标准库写一个最小合法 PNG。"""
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        c += struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
        return c
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    row = b'\x00' + bytes(color) * w
    idat = zlib.compress(row * h)
    data = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) +
            chunk(b'IDAT', idat) + chunk(b'IEND', b''))
    Path(path).write_bytes(data)


FM = '---\ntitle: {title}\ndate: {date}\ncolumn: {column}\nsummary: {summary}\ncover: {cover}\n---\n\n{body}\n'


class GeneratorTest(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.article_dir = self.root / 'article'
        self.article_dir.mkdir()
        self.covers_dir = self.article_dir / 'covers'
        self.covers_dir.mkdir()

    def tearDown(self):
        self.tmp.cleanup()

    def add_article(self, name, text):
        p = self.article_dir / name
        p.write_text(text, encoding='utf-8')
        return p

    def add_cover(self, rel, w=640, h=360):
        p = self.article_dir / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        make_png(p, w, h)
        return p

    def build(self):
        return ba.build(self.article_dir, verbose=False)

    def read(self, rel):
        return (self.article_dir / rel).read_text(encoding='utf-8')

    def warnings_text(self):
        return '\n'.join('%s: %s' % (s, m) for s, m in ba.WARNINGS)

    def std_article(self, name='article-01.md', title='测试文章', date='2026-10-28',
                    column='fiction', summary='摘要', cover='covers/article-01.png',
                    body='正文第一段。\n\n第二段。'):
        if cover:
            self.add_cover(cover)
        return self.add_article(name, FM.format(title=title, date=date, column=column,
                                                summary=summary, cover=cover, body=body))

    # ---- 正常生成 ----

    def test_happy_path_generates_index_and_posts(self):
        self.std_article(body='这是正文，包含**加粗**与*斜体*。')
        self.build()
        self.assertTrue((self.article_dir / 'index.html').is_file())
        self.assertTrue((self.article_dir / 'posts/article-01.html').is_file())
        post = self.read('posts/article-01.html')
        self.assertIn('<h1 class="article-title">测试文章</h1>', post)
        self.assertIn('<strong>加粗</strong>', post)
        self.assertIn('<em>斜体</em>', post)
        # 封面与相对路径
        self.assertIn('src="../covers/article-01.png"', post)
        self.assertIn('width="640" height="360"', post)
        # PWA 前缀（article/posts/ 为二级目录）
        self.assertIn('href="../../manifest.webmanifest"', post)
        self.assertIn('src="../../script/script.js"', post)
        index = self.read('index.html')
        self.assertIn('./posts/article-01.html', index)
        self.assertIn('src="./covers/article-01.png"', index)

    def test_column_grouping_and_sorting(self):
        self.std_article('article-01.md', '旧文', '2026-10-01', 'poetry', cover=None, body='旧。')
        self.std_article('article-02.md', '新诗', '2026-11-05', 'poetry', cover=None, body='新。')
        self.std_article('article-03.md', '小说文', '2026-10-15', 'fiction', cover=None, body='文。')
        self.build()
        index = self.read('index.html')
        # 栏目按 COLUMNS 定义顺序：fiction 在 poetry 之前
        self.assertLess(index.index('id="fiction"'), index.index('id="poetry"'))
        # 栏目内按日期从新到旧
        self.assertLess(index.index('>新诗<'), index.index('>旧文<'))
        # 同日期时按文件名升序（稳定排序）
        self.std_article('article-04.md', '同日甲', '2026-10-15', 'fiction', cover=None, body='甲。')
        self.build()
        index = self.read('index.html')
        self.assertLess(index.index('>小说文<'), index.index('>同日甲<'))

    def test_hero_picks_latest_article_with_cover(self):
        self.std_article('article-01.md', '旧封面文', '2026-10-01', 'essay',
                         cover='covers/a.png', body='旧。')
        self.std_article('article-02.md', '新无封面文', '2026-11-01', 'essay',
                         cover='', body='新。')
        self.std_article('article-03.md', '新封面文', '2026-11-02', 'essay',
                         cover='covers/b.png', body='新新。')
        self.build()
        index = self.read('index.html')
        hero_img = index.split('article-column-hero', 1)[1]
        self.assertIn('src="./covers/b.png"', hero_img)
        self.assertIn('《新封面文》', hero_img)

    def test_empty_article_dir_generates_empty_index(self):
        self.build()
        index = self.read('index.html')
        self.assertIn('article-empty', index)
        self.assertIn('暂无首发文章', index)

    def test_unmatched_md_ignored_with_warning(self):
        self.add_article('notes.md', FM.format(title='x', date='2026-10-28',
                                               column='others', summary='', cover='',
                                               body='draft'))
        self.build()
        self.assertIn('notes.md', self.warnings_text())
        self.assertIn('article-empty', self.read('index.html'))

    # ---- 元数据校验（致命错误） ----

    def assert_fatal(self, text):
        self.add_article('article-01.md', text)
        with self.assertRaises(ba.FatalError):
            self.build()
        # 失败时不写任何产物
        self.assertFalse((self.article_dir / 'index.html').exists())

    def test_missing_title_fatal(self):
        self.assert_fatal('---\ndate: 2026-10-28\ncolumn: others\n---\n\n正文。')

    def test_missing_date_fatal(self):
        self.assert_fatal('---\ntitle: 无日期\ncolumn: others\n---\n\n正文。')

    def test_invalid_date_format_fatal(self):
        self.assert_fatal('---\ntitle: x\ndate: 2026/10/28\ncolumn: others\n---\n\n正文。')

    def test_impossible_date_fatal(self):
        self.assert_fatal('---\ntitle: x\ndate: 2026-13-40\ncolumn: others\n---\n\n正文。')

    def test_unknown_column_fatal(self):
        self.assert_fatal('---\ntitle: x\ndate: 2026-10-28\ncolumn: unknown\n---\n\n正文。')

    def test_invalid_slug_fatal(self):
        self.assert_fatal('---\ntitle: x\ndate: 2026-10-28\ncolumn: others\nslug: 大写Slug\n---\n\n正文。')

    def test_duplicate_slug_fatal(self):
        self.std_article('article-01.md', title='第一篇', cover='', body='一。')
        self.add_article('article-02.md',
                         '---\ntitle: 第二篇\ndate: 2026-10-29\ncolumn: others\nslug: article-01\n---\n\n二。')
        with self.assertRaises(ba.FatalError) as ctx:
            self.build()
        self.assertIn('slug 重复', str(ctx.exception))

    def test_missing_front_matter_fatal(self):
        self.assert_fatal('没有 front-matter 的正文。')

    # ---- 封面降级 ----

    def test_cover_missing_warns_and_degrades(self):
        # 直接引用不存在的封面文件（不经 add_cover 创建）
        self.add_article('article-01.md', FM.format(
            title='x', date='2026-10-28', column='others', summary='',
            cover='covers/nope.png', body='正文。'))
        self.build()
        self.assertIn('不存在', self.warnings_text())
        post = self.read('posts/article-01.html')
        self.assertNotIn('article-cover', post)
        index = self.read('index.html')
        self.assertNotIn('article-column-hero', index)

    def test_cover_wrong_magic_warns_and_degrades(self):
        self.add_article('article-01.md', FM.format(
            title='x', date='2026-10-28', column='others', summary='', cover='covers/fake.png',
            body='正文。'))
        fake = self.article_dir / 'covers/fake.png'
        fake.write_bytes(b'not-a-png')
        self.build()
        self.assertIn('不是有效的 PNG', self.warnings_text())
        self.assertNotIn('article-cover', self.read('posts/article-01.html'))

    def test_cover_non_png_extension_warns(self):
        self.std_article(cover='covers/a.jpg', body='正文。')
        self.add_cover('covers/a.jpg')
        self.build()
        self.assertIn('必须是 PNG', self.warnings_text())

    # ---- 安全：HTML 转义与链接校验 ----

    def test_raw_html_is_escaped(self):
        self.std_article(body='<script>alert(1)</script>\n\n<b>粗体</b> <img src=x onerror=alert(1)>')
        self.build()
        post = self.read('posts/article-01.html')
        self.assertNotIn('<script>alert', post)
        self.assertIn('&lt;script&gt;alert(1)&lt;/script&gt;', post)
        self.assertNotIn('<img src=x', post)

    def test_javascript_link_is_plain_text(self):
        self.std_article(body='[点我](javascript:alert(1)) 与 [正常](https://example.com)')
        self.build()
        post = self.read('posts/article-01.html')
        self.assertNotIn('href="javascript:', post)
        self.assertIn('不安全的链接协议', self.warnings_text())
        self.assertIn('href="https://example.com"', post)

    def test_heading_blockquote_list_code(self):
        body = ('# 一级标题\n\n> 引用内容\n>\n> 第二段引用\n\n'
                '- 甲\n- 乙\n  - 嵌套\n\n1. 一\n2. 二\n\n```python\nprint("纯白")\n```\n\n---')
        self.std_article(body=body)
        self.build()
        post = self.read('posts/article-01.html')
        self.assertIn('<h2>一级标题</h2>', post)
        self.assertIn('<blockquote><p>引用内容</p><p>第二段引用</p></blockquote>', post)
        self.assertIn('<li>甲</li>', post)
        self.assertIn('<li>乙<ul><li>嵌套</li></ul></li>', post)
        self.assertIn('<ol><li>一</li><li>二</li></ol>', post)
        self.assertIn('class="language-python"', post)
        self.assertIn('print(&quot;纯白&quot;)', post)
        self.assertIn('<hr>', post)

    def test_markdown_image_missing_placeholder(self):
        self.std_article(body='![示例图](images/not-there.png)')
        self.build()
        post = self.read('posts/article-01.html')
        self.assertIn('article-img-missing', post)
        self.assertIn('正文图片文件不存在', self.warnings_text())

    def test_markdown_image_present(self):
        self.add_cover('images/fig.png', w=100, h=50)
        self.std_article(body='![示例图](images/fig.png)')
        self.build()
        post = self.read('posts/article-01.html')
        self.assertIn('src="../images/fig.png"', post)
        self.assertIn('width="100" height="50"', post)

    # ---- 其他 ----

    def test_summary_derived_with_warning(self):
        self.std_article(summary='', body='自动摘要首段。')
        self.build()
        self.assertIn('未提供 summary', self.warnings_text())
        self.assertIn('自动摘要首段。', self.read('index.html'))

    def test_unknown_field_warning(self):
        self.add_article('article-01.md',
                         '---\ntitle: x\ndate: 2026-10-28\ncolumn: others\nauthor: 某甲\n---\n\n正文。')
        self.build()
        self.assertIn('未知元数据字段 "author"', self.warnings_text())

    def test_stale_post_cleanup(self):
        self.std_article(body='正文。')
        self.build()
        self.assertTrue((self.article_dir / 'posts/article-01.html').is_file())
        # 删除源文章后重建，旧页面应被清理
        (self.article_dir / 'article-01.md').unlink()
        self.build()
        self.assertFalse((self.article_dir / 'posts/article-01.html').exists())

    def test_idempotent_rebuild(self):
        self.std_article(body='正文。')
        self.build()
        first = self.read('index.html')
        self.build()
        self.assertEqual(first, self.read('index.html'))

    def test_cjk_soft_wrap_join(self):
        self.std_article(body='这是第一行\n这是第二行')
        self.build()
        post = self.read('posts/article-01.html')
        self.assertIn('<p>这是第一行这是第二行</p>', post)

    def test_empty_body_warning(self):
        self.std_article(body='')
        self.build()
        self.assertIn('正文为空', self.warnings_text())
        self.assertIn('article-body-empty', self.read('posts/article-01.html'))


if __name__ == '__main__':
    unittest.main(verbosity=2)
