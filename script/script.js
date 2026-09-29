/* ============================================
   纯白 — 文学刊物宣传页面交互脚本
   ============================================ */

(function () {
    'use strict';

    const menuToggle = document.getElementById('menuToggle');
    const nav = document.getElementById('nav');
    const supportBtn = document.getElementById('supportBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const header = document.getElementById('header');
    const navLinks = document.querySelectorAll('.nav-link');

    // ---- 汉堡菜单切换 ----
    function toggleMenu() {
        if (!menuToggle || !nav) return;

        const isOpen = !nav.classList.contains('active');
        menuToggle.classList.toggle('active', isOpen);
        nav.classList.toggle('active', isOpen);
        menuToggle.setAttribute('aria-expanded', String(isOpen));
    }

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', toggleMenu);
    }

    // 点击导航链接后关闭菜单（移动端）
    navLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            if (nav && nav.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // ---- 捐款弹窗 ----
    function openModal() {
        if (!modalOverlay) return;
        modalOverlay.classList.add('active');
        modalOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        if (modalClose) {
            modalClose.focus();
        }
    }

    function closeModal() {
        if (!modalOverlay) return;
        modalOverlay.classList.remove('active');
        modalOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (supportBtn) {
            supportBtn.focus();
        }
    }

    if (supportBtn && modalOverlay) {
        supportBtn.addEventListener('click', openModal);
    }

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', function (e) {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }

    // ESC 关闭弹窗 / 菜单
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (modalOverlay && modalOverlay.classList.contains('active')) {
                closeModal();
            }
            if (nav && nav.classList.contains('active')) {
                toggleMenu();
            }
        }
    });

    // ---- 页眉滚动状态 ----
    let ticking = false;

    function updateHeader() {
        if (!header) return;
        if (window.scrollY > 20) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        ticking = false;
    }

    window.addEventListener('scroll', function () {
        if (!ticking) {
            window.requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }, { passive: true });

    // ---- 公告渲染 --
    // 优先读取 announcements/ 目录下的 Markdown 公告文件
    // （announcement-01.md、announcement-02.md …），按编号顺序
    // 依次追加；file:// 直接打开时 fetch 不可用，回退到 data.js。
    const announcementList = document.getElementById('announcementList');
    const ANNOUNCEMENT_MD_BASE = './announcements/announcement-';
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

    function renderAnnouncementItems(items) {
        if (!announcementList) return;
        if (!Array.isArray(items) || items.length === 0) return;

        announcementList.innerHTML = items.map(function (item) {
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
        }).join('');
    }

    async function loadMarkdownAnnouncements() {
        const items = [];
        for (let i = 1; i <= ANNOUNCEMENT_MD_MAX; i++) {
            const num = String(i).padStart(2, '0');
            try {
                const res = await fetch(ANNOUNCEMENT_MD_BASE + num + '.md');
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

    async function renderAnnouncements() {
        const mdItems = await loadMarkdownAnnouncements();
        if (mdItems.length > 0) {
            renderAnnouncementItems(mdItems);
            return;
        }
        // 回退：直接双击打开（file://）时使用 data.js
        renderAnnouncementItems(window.ANNOUNCEMENTS);
    }

    renderAnnouncements();

    // ---- 初始化 ----
    document.addEventListener('DOMContentLoaded', function () {
        updateHeader();
    });
})();
