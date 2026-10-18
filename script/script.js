/* ============================================
   纯白 — 文学刊物宣传页面交互脚本
   ============================================ */

(function () {
    'use strict';

    // 供字体加载方式切换定位 style/ 目录（各页面引用本脚本的相对路径不同）
    const scriptElement = document.currentScript;

    const menuToggle = document.getElementById('menuToggle');
    const nav = document.getElementById('nav');
    const supportBtn = document.getElementById('supportBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const header = document.getElementById('header');
    const navLinks = document.querySelectorAll('.nav-link');

    // ---- 平台与字体特性检测 ----
    // 为 font-feature-settings 的跨平台适配在 <html> 上设置 data-os / data-hw：
    //   macOS / Windows / Linux / Android 使用 halt（半角替代），iOS 单独使用 hwid；
    //   当 halt 在所用字体中不可用时，自动回退为 hwid。
    function detectPlatformAndFontFeature() {
        const root = document.documentElement;
        const ua = navigator.userAgent || '';

        const isIOS = /iPad|iPhone|iPod/.test(ua) ||
            (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
        const isAndroid = /Android/i.test(ua);

        root.setAttribute('data-os', isIOS ? 'ios' : (isAndroid ? 'android' : 'desktop'));

        if (isIOS) {
            // iOS 单独使用 hwid，无需检测回退
            root.setAttribute('data-hw', 'hwid');
            return;
        }

        // 检测字体是否真正应用半角特性：比较 CJK 文本宽度是否明显收窄
        function featureHalvesWidth(feature) {
            const text = '中文测试';
            const font = '"EB Garamond", Georgia, "Noto Serif SC", "Noto Serif CJK SC", "Songti SC", "SimSun", serif';

            function measure(withFeature) {
                const span = document.createElement('span');
                span.textContent = text;
                span.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;' +
                    'white-space:nowrap;font-family:' + font + ';font-size:32px;' +
                    (withFeature ? 'font-feature-settings:"' + feature + '" 1;' : '');
                document.body.appendChild(span);
                const width = span.getBoundingClientRect().width;
                document.body.removeChild(span);
                return width;
            }

            const full = measure(false);
            const half = measure(true);
            return full > 0 && half / full < 0.75;
        }

        function applyFeature() {
            root.setAttribute('data-hw', featureHalvesWidth('halt') ? 'halt' :
                (featureHalvesWidth('hwid') ? 'hwid' : 'halt'));
        }

        // 等待页面字体加载完成后再检测，避免因字体未就绪而误判
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(applyFeature);
        } else {
            applyFeature();
        }
    }

    if (document.body) {
        detectPlatformAndFontFeature();
    } else {
        document.addEventListener('DOMContentLoaded', detectPlatformAndFontFeature);
    }

    // ---- 字体加载方式自适应 ----
    // fonts/ 下的中文字体体积较大（合计约 40MB），慢速网络下会显著拖慢完全加载时间。
    // 页面完全加载（含字体）耗时超过阈值时，改用 Google Fonts 的 @import 远程字体，
    // 并把选择写入 sessionStorage，让本次会话内的后续页面直接使用远程字体。
    const FONT_MODE_KEY = 'plainwhite:font-mode';
    const FONT_FALLBACK_KEY = 'plainwhite:font-fallback';
    const FONT_MODE_GOOGLE = 'google';
    const SLOW_LOAD_THRESHOLD_MS = 3000;
    const FONT_CHECK_TIMEOUT_MS = 15000;

    function getStoredFontMode() {
        try {
            return window.sessionStorage.getItem(FONT_MODE_KEY);
        } catch (e) {
            return null;
        }
    }

    function getStoredFontFallback() {
        try {
            return window.sessionStorage.getItem(FONT_FALLBACK_KEY);
        } catch (e) {
            return null;
        }
    }

    function storeFontMode(mode) {
        try {
            window.sessionStorage.setItem(FONT_MODE_KEY, mode);
        } catch (e) {
            // 隐私模式等禁用 sessionStorage 时忽略，仅当前页面生效
        }
    }

    function storeFontFallback() {
        try {
            window.sessionStorage.setItem(FONT_FALLBACK_KEY, '1');
        } catch (e) {
            // 同上
        }
    }

    function resolveSiteAsset(path) {
        if (scriptElement && scriptElement.src) {
            return new URL(path, scriptElement.src).href;
        }
        return path;
    }

    function enableGoogleFonts() {
        if (document.getElementById('googleFontsStylesheet')) return;

        document.documentElement.classList.add('font-mode-google');

        [
            ['googleFontsPreconnectApi', 'https://fonts.googleapis.com'],
            ['googleFontsPreconnectStatic', 'https://fonts.gstatic.com']
        ].forEach(function (item) {
            if (document.getElementById(item[0])) return;
            const preconnect = document.createElement('link');
            preconnect.id = item[0];
            preconnect.rel = 'preconnect';
            preconnect.href = item[1];
            preconnect.crossOrigin = 'anonymous';
            document.head.appendChild(preconnect);
        });

        const stylesheet = document.createElement('link');
        stylesheet.id = 'googleFontsStylesheet';
        stylesheet.rel = 'stylesheet';
        // 先用非阻塞的 print 媒体加载，避免 Google Fonts 不可达时拖住页面加载
        stylesheet.media = 'print';
        stylesheet.href = resolveSiteAsset('../style/fonts-google.css');

        let loadTimer = 0;

        function giveUpOnGoogleFonts() {
            window.clearTimeout(loadTimer);
            // 远程样式不可用时保留本地字体，避免白屏或无字体回退
            document.documentElement.classList.remove('font-mode-google');
            stylesheet.remove();
            storeFontMode('local');
            storeFontFallback();
        }

        stylesheet.addEventListener('load', function () {
            window.clearTimeout(loadTimer);
            stylesheet.media = 'all';
        });
        stylesheet.addEventListener('error', giveUpOnGoogleFonts);

        document.head.appendChild(stylesheet);

        loadTimer = window.setTimeout(function () {
            if (stylesheet.media !== 'all') {
                giveUpOnGoogleFonts();
            }
        }, 10000);
    }

    // 等待 load 事件与网页字体全部就绪，再统计从导航开始到完全加载的耗时
    function whenPageFullyLoaded() {
        return new Promise(function (resolve) {
            function afterLoad() {
                const fontsReady = (document.fonts && document.fonts.ready)
                    ? document.fonts.ready
                    : Promise.resolve();
                const timeout = new Promise(function (done) {
                    window.setTimeout(done, FONT_CHECK_TIMEOUT_MS);
                });

                Promise.race([fontsReady, timeout]).then(function () {
                    window.setTimeout(function () {
                        resolve(performance.now());
                    }, 0);
                });
            }

            if (document.readyState === 'complete') {
                afterLoad();
            } else {
                window.addEventListener('load', afterLoad, { once: true });
            }
        });
    }

    function detectFontLoadingStrategy() {
        if (getStoredFontMode() === FONT_MODE_GOOGLE) {
            if (getStoredFontFallback() === '1') return;
            enableGoogleFonts();
            return;
        }

        if (navigator.onLine === false) return;
        if (getStoredFontFallback() === '1') return;

        whenPageFullyLoaded().then(function (duration) {
            if (duration > SLOW_LOAD_THRESHOLD_MS) {
                storeFontMode(FONT_MODE_GOOGLE);
                enableGoogleFonts();
            }
        });
    }

    detectFontLoadingStrategy();

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

    // ---- 公告渲染 ----
    // 首页公告区与历史公告页共用 script/announcements.js 的渲染逻辑：
    // 首页只展示最新 3 条公告；当公告累计超过 3 条时，更早的公告
    // 自动归档到 announcements/history/ 历史公告页，并在首页公告区
    // 末尾追加「查看全部历史公告」入口。
    const announcementList = document.getElementById('announcementList');
    const historyList = document.getElementById('historyList');

    if (window.PlainWhiteAnnouncements) {
        if (historyList) {
            // 历史公告页：展示除最新 3 条外的全部更早公告
            window.PlainWhiteAnnouncements.render({
                listId: 'historyList',
                emptyId: 'historyEmpty',
                mode: 'history',
                mdBase: '../announcement-'
            });
        } else if (announcementList) {
            // 首页公告区：只展示最新 3 条，超出的自动归档
            window.PlainWhiteAnnouncements.render({
                listId: 'announcementList',
                mode: 'home',
                mdBase: './announcements/announcement-',
                historyUrl: './announcements/history/'
            });
        }
    }

    // ---- 初始化 ----
    document.addEventListener('DOMContentLoaded', function () {
        updateHeader();
    });
})();
