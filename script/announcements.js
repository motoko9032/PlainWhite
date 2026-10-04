/* ============================================
   纯白 — 公告渲染共享模块（首页公告区 + 历史公告页）
   负责读取 announcements/ 目录下的 Markdown 公告文件，
   并支持两种渲染模式：
   - home：首页公告区，最多展示最新 3 条公告；
   - history：历史公告页，展示除最新 3 条外的全部更早公告。
   首页公告累计超过 3 条时，多余陈旧公告自动归档到
   历史公告页（announcements/history/），无需移动文件。
   ============================================ */
(function () {
    'use strict';

    // 首页最多展示的最新公告条数；超过此数量的更早公告自动归档
    const MAX_RECENT_ANNOUNCEMENTS = 3;
    // 公告文件编号探测上限
    const ANNOUNCEMENT_MD_MAX = 99;

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

    function inlineMarkdown(text) {
        return escapeHtml(text)
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
                '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }

    function parseAnnouncementMarkdown(source) {
        const meta = {};
        let body = source;

        // 解析 front-matter（--- 之间的键值对）
        const fmMatch = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
        if (fmMatch) {
            body = source.slice(fmMatch[0].length);
            fmMatch[1].split('\n').forEach(function (line) {
                const m = line.match(/^([A-Za-z]+)\s*:\s*(.*)$/);
                if (m) {
                    meta[m[1].toLowerCase()] = m[2].trim();
                }
            });
        }

        // 正文按空行分段
        const paragraphs = body
            .split(/\n\s*\n/)
            .map(function (block) { return block.trim(); })
            .filter(Boolean)
            .map(function (block) {
                return '<p class="announcement-text">' +
                    inlineMarkdown(block.replace(/\n/g, ' ')) +
                '</p>';
            })
            .join('');

        return {
            date: meta.date || '',
            datetime: meta.datetime || (meta.date ? meta.date.replace(/\./g, '-') : ''),
            title: meta.title || '',
            badge: meta.badge || '',
            text: paragraphs
        };
    }

    function renderItem(item) {
        const badge = item.badge
            ? '<span class="announcement-badge">' + escapeHtml(item.badge) + '</span>'
            : '';

        return '<article class="announcement-item">' +
            '<time class="announcement-date" datetime="' + escapeHtml(item.datetime || '') + '">' +
                escapeHtml(item.date) +
            '</time>' +
            '<div class="announcement-content">' +
                '<h3 class="announcement-title">' + escapeHtml(item.title) + badge + '</h3>' +
                (item.text || '') +
            '</div>' +
        '</article>';
    }

    function renderItems(listEl, items) {
        listEl.innerHTML = items.map(renderItem).join('');
    }

    function appendHistoryLink(listEl, historyUrl) {
        const link = document.createElement('a');
        link.className = 'announcement-history-link';
        link.href = historyUrl;
        link.innerHTML = '查看全部历史公告' +
            '<span class="announcement-history-arrow" aria-hidden="true">→</span>';
        listEl.appendChild(link);
    }

    async function loadMarkdownAnnouncements(mdBase) {
        const items = [];
        for (let i = 1; i <= ANNOUNCEMENT_MD_MAX; i++) {
            const num = String(i).padStart(2, '0');
            try {
                const res = await fetch(mdBase + num + '.md');
                if (!res.ok) break;
                const source = await res.text();
                // 静态托管（如 Cloudflare Pages）对不存在的路径会回退返回
                // 首页 HTML 且状态码仍为 200。因此必须以 front-matter 校验：
                // 内容不以 --- 开头即视为「公告已到尽头」，停止探测，
                // 避免把整个首页源码当作公告渲染成裸文本。
                if (!/^\s*---\s*\n/.test(source)) break;
                items.push(parseAnnouncementMarkdown(source));
            } catch (err) {
                break; // file:// 等环境下 fetch 不可用，停止探测
            }
        }
        return items;
    }

    async function loadAllAnnouncements(mdBase) {
        const mdItems = await loadMarkdownAnnouncements(mdBase);
        if (mdItems.length > 0) {
            return mdItems;
        }
        // 回退：直接双击打开（file://）时使用 data.js
        return Array.isArray(window.ANNOUNCEMENTS) ? window.ANNOUNCEMENTS : [];
    }

    // 首页公告区：只渲染最新 3 条；超过 3 条时在末尾追加历史公告入口
    async function renderHome(options) {
        const listEl = document.getElementById(options.listId || 'announcementList');
        if (!listEl) return;

        const items = await loadAllAnnouncements(options.mdBase);
        if (!items.length) return;

        renderItems(listEl, items.slice(-MAX_RECENT_ANNOUNCEMENTS));
        if (items.length > MAX_RECENT_ANNOUNCEMENTS && options.historyUrl) {
            appendHistoryLink(listEl, options.historyUrl);
        }
    }

    // 历史公告页：渲染除最新 3 条外的全部更早公告；没有时展示空状态
    async function renderHistory(options) {
        const listEl = document.getElementById(options.listId || 'historyList');
        if (!listEl) return;

        const items = await loadAllAnnouncements(options.mdBase);
        const historical = items.slice(0, Math.max(0, items.length - MAX_RECENT_ANNOUNCEMENTS));

        if (!historical.length) {
            listEl.innerHTML = '';
            if (options.emptyId) {
                const emptyEl = document.getElementById(options.emptyId);
                if (emptyEl) {
                    emptyEl.hidden = false;
                }
            }
            return;
        }

        renderItems(listEl, historical);
    }

    window.PlainWhiteAnnouncements = {
        MAX_RECENT: MAX_RECENT_ANNOUNCEMENTS,
        render: function (options) {
            options = options || {};
            if (options.mode === 'history') {
                return renderHistory(options);
            }
            return renderHome(options);
        }
    };
})();
