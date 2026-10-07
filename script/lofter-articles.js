/* ============================================
   纯白 — LOFTER 原文列表渲染模块（sub/ 各期LOFTER文章列表页）

   负责读取 sub/ 目录下的 lofter-article-01.md、
   lofter-article-02.md …… 等 Markdown 文件，按
   front-matter 中的 issue（期号）筛选后，动态渲染到页面上的
   <ul class="download-list" data-lofter-issue="N"> 中。
   列表沿用页面原有的样式类（download-list），不改动任何 CSS。

   回退数据源：sub/data.js（window.LOFTER_ARTICLES）。
   网站部署或使用本地服务器访问时优先读取 Markdown；
   仅当直接双击打开页面（file:// 协议）导致无法读取
   Markdown 时才使用 data.js，作为冗余措施。
   ============================================ */
(function () {
    'use strict';

    // 文章文件编号探测上限
    const ARTICLE_MD_MAX = 99;

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, function (ch) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[ch];
        });
    }

    // 解析文章文件 front-matter（--- 之间的键值对）
    function parseArticleMarkdown(source) {
        const meta = {};
        const fmMatch = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
        if (fmMatch) {
            fmMatch[1].split('\n').forEach(function (line) {
                const m = line.match(/^([A-Za-z]+)\s*:\s*(.*)$/);
                if (m) {
                    meta[m[1].toLowerCase()] = m[2].trim();
                }
            });
        }
        return {
            issue: meta.issue || '',
            title: meta.title || '',
            url: meta.url || ''
        };
    }

    function renderItem(item) {
        const title = escapeHtml(item.title);
        if (item.url) {
            return '<li><a href="' + escapeHtml(item.url) + '">' + title + '</a></li>';
        }
        // url 留空的文章渲染为纯文本条目
        return '<li>' + title + '</li>';
    }

    async function loadMarkdownArticles(mdBase, issue) {
        const items = [];
        for (let i = 1; i <= ARTICLE_MD_MAX; i++) {
            const num = String(i).padStart(2, '0');
            try {
                const res = await fetch(mdBase + num + '.md');
                if (!res.ok) break;
                const source = await res.text();
                // 静态托管（如 Cloudflare Pages）对不存在的路径会回退返回
                // 页面 HTML 且状态码仍为 200，因此必须以 front-matter 校验：
                // 内容不以 --- 开头即视为「文章已到尽头」，停止探测。
                if (!/^\s*---\s*\n/.test(source)) break;
                const item = parseArticleMarkdown(source);
                // 其他期号的文件跳过，继续向后探测
                if (String(item.issue) === String(issue)) {
                    items.push(item);
                }
            } catch (err) {
                break; // file:// 等环境下 fetch 不可用，停止探测
            }
        }
        return items;
    }

    async function loadArticles(mdBase, issue) {
        const mdItems = await loadMarkdownArticles(mdBase, issue);
        if (mdItems.length > 0) {
            return mdItems;
        }
        // 冗余回退：直接双击打开（file://）时使用 data.js
        const fallback = Array.isArray(window.LOFTER_ARTICLES) ? window.LOFTER_ARTICLES : [];
        return fallback.filter(function (item) {
            return String(item.issue) === String(issue);
        });
    }

    // 自动渲染所有标注了 data-lofter-issue 的 LOFTER 文章列表
    function init() {
        const lists = document.querySelectorAll('ul.download-list[data-lofter-issue]');
        lists.forEach(function (listEl) {
            const issue = listEl.getAttribute('data-lofter-issue');
            loadArticles('./lofter-article-', issue).then(function (items) {
                listEl.innerHTML = items.map(renderItem).join('');
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
