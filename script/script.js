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

    // ---- 初始化 ----
    document.addEventListener('DOMContentLoaded', function () {
        updateHeader();
    });
})();
