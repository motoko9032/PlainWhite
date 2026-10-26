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

    // ---- PWA：底部悬浮 Tab Bar（仅安装为 App 的 standalone 模式显示）----
    // 本脚本以 defer 加载，执行时 DOM 已解析完毕，可直接注入 DOM。
    // 浏览器里访问不会设置 html[data-standalone]，因此 Tab Bar 完全不
    // 出现、与未安装时的效果一致；样式见 style/style.css 的 .app-tabbar。
    // 平台差异：iOS 玻璃态、Android 莫奈色胶囊（详见 CSS 注释）。
    function initAppTabBar() {
        // 判定「添加到主屏」的安装模式：
        //   - 标准 matchMedia('(display-mode: standalone)')（Chrome/Edge/Android）
        //   - iOS Safari 的特有属性 window.navigator.standalone
        const standalone = (window.matchMedia &&
            window.matchMedia('(display-mode: standalone)').matches) ||
            (window.navigator && window.navigator.standalone === true);
        if (!standalone) {
            return;
        }

        // 平台判定：与 detectPlatformAndFontFeature 相同的 iOS 判定逻辑；
        // 其余环境（Android / 桌面安装窗口）统一按 Android 莫奈色处理。
        const ua = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua) ||
            (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
        const root = document.documentElement;
        root.setAttribute('data-standalone', '');
        root.setAttribute('data-app', isIOS ? 'ios' : 'android');

        // 首页基准 URL：本脚本位于 script/ 子目录，上溯一级即站点根目录。
        let homeBase;
        try {
            homeBase = new URL('../', scriptElement.src);
        } catch (e) {
            homeBase = new URL('../', location.href);
        }
        // 当前页面是否即首页（含 /index.html 的写法）
        const isHome = location.pathname === homeBase.pathname ||
            location.pathname === homeBase.pathname + 'index.html';

        // Tab Bar 的 5 个入口，与首页各 section 的 id 对应。
        // 图标为内联 SVG 线性图标（stroke 风格），label 供朗读与显示。
        const items = [
            { hash: '#hero', label: '首页',
              icon: '<path d="M4 11.2 12 5l8 6.2"/><path d="M6.5 9.8V19h11V9.8"/>' },
            { hash: '#announcements', label: '公告',
              icon: '<path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 2 5.5 2 5.5H4s2-1 2-5.5"/><path d="M10 18.5a2 2 0 0 0 4 0"/>' },
            { hash: '#columns', label: '阅读',
              icon: '<path d="M4.5 5.5c3-1.4 5-1.4 7.5 0 2.5-1.4 4.5-1.4 7.5 0v13c-3-1.4-5-1.4-7.5 0-2.5-1.4-4.5-1.4-7.5 0z"/><path d="M12 5.5v13"/>' },
            { hash: '#downloads', label: '下载',
              icon: '<path d="M12 4.5v10"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 19.5h14"/>' },
            { hash: '#about', label: '关于',
              icon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11.5v5"/><path d="M12 8h.01"/>' }
        ];

        const tabbar = document.createElement('nav');
        tabbar.className = 'app-tabbar';
        tabbar.setAttribute('aria-label', '应用底部导航');

        // id → 元素 的映射，仅首页用于可见性高亮
        const sections = {};

        items.forEach(function (item) {
            const a = document.createElement('a');
            a.className = 'app-tabbar-item';
            // 首页用纯 hash 平滑滚动到对应栏目；子页面跳回首页对应锚点
            a.href = isHome ? item.hash : homeBase.href + item.hash;
            a.innerHTML =
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
                'aria-hidden="true">' + item.icon + '</svg>' +
                '<span class="app-tabbar-item-label">' + item.label + '</span>';
            tabbar.appendChild(a);

            if (isHome) {
                const section = document.querySelector(item.hash);
                if (section) {
                    sections[item.hash] = section;
                }
            }
        });

        document.body.appendChild(tabbar);

        // 当前项高亮：首页根据视口中「最靠近顶部」的 section 动态切换；
        // 子页面没有这些锚点，固定高亮「首页」项。
        const links = tabbar.querySelectorAll('.app-tabbar-item');

        function setCurrent(hash) {
            links.forEach(function (link) {
                if (link.getAttribute('href') === hash) {
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.removeAttribute('aria-current');
                }
            });
        }

        if (isHome && 'IntersectionObserver' in window) {
            // rootMargin 把判定区间压缩到视口顶部附近：某 section 进入
            // 该区间时即视为「当前所在栏目」，据此更新 aria-current。
            const observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        setCurrent('#' + entry.target.id);
                    }
                });
            }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

            Object.keys(sections).forEach(function (hash) {
                observer.observe(sections[hash]);
            });
            setCurrent('#hero');
        } else {
            // 子页面：链接指向「首页锚点」的完整 URL，无法按 hash 匹配，
            // 固定高亮第一项（首页）即可。
            if (links.length) {
                links[0].setAttribute('aria-current', 'page');
            }
        }
    }

    initAppTabBar();

    // ---- PWA：Service Worker 注册 ----
    // 可安装 + 离线缓存能力由站点根目录 sw.js 提供（manifest 见根目录
    // manifest.webmanifest，交接文档见 pwa/README.md）。
    // 注册时机放在 window load 之后，避免与首屏资源加载抢占带宽；
    // 仅在安全上下文（HTTPS 或 localhost 本地调试）中注册，失败不影响站点功能。
    if ('serviceWorker' in navigator &&
        (location.protocol === 'https:' ||
         location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        window.addEventListener('load', function () {
            // sw.js 必须与站点根目录同级，其作用域即整个站点：
            // 本脚本位于 script/ 子目录，从本脚本地址上溯一级得到站点根目录，
            // 因此任意目录深度的页面都能解析出同一个 sw.js 地址。
            const swUrl = scriptElement && scriptElement.src
                ? new URL('../sw.js', scriptElement.src).href
                : new URL('sw.js', location.href).href;

            // ---- 新版本提示横幅（DOM 由本脚本动态创建，无需改动各 HTML
            // 页面；样式见 style/style.css 的 .sw-update-banner）。----
            const banner = document.createElement('div');
            banner.className = 'sw-update-banner';
            banner.hidden = true;
            const bannerText = document.createElement('span');
            bannerText.textContent = '发现新版本';
            const bannerBtn = document.createElement('button');
            bannerBtn.type = 'button';
            bannerBtn.className = 'sw-update-banner-btn';
            bannerBtn.textContent = '立即刷新';
            banner.appendChild(bannerText);
            banner.appendChild(bannerBtn);
            document.body.appendChild(banner);

            // 仅当「旧 SW 正在控制页面」且「新 SW 已等待接管」时显示横幅；
            // 首次安装时 navigator.serviceWorker.controller 为空，不会误弹。
            function showUpdateBanner() {
                if (navigator.serviceWorker.controller) {
                    banner.hidden = false;
                }
            }

            // 用户点击后告知 SW 立即接管；新 SW 在 activate 阶段
            // clients.claim() 接管所有页面并触发 controllerchange，
            // 下方监听器据此刷新页面，确保用户看到新版本内容。
            let reloadOnControllerChange = false;
            bannerBtn.addEventListener('click', function () {
                reloadOnControllerChange = true;
                navigator.serviceWorker.getRegistration().then(function (reg) {
                    if (reg && reg.waiting) {
                        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });

            navigator.serviceWorker.addEventListener('controllerchange', function () {
                // 用 reloadOnControllerChange 作闸门：只在用户主动点击
                // 「立即刷新」后触发重载，避免首次安装时的 controllerchange
                // 造成一次无谓刷新。
                if (reloadOnControllerChange) {
                    window.location.reload();
                }
            });

            navigator.serviceWorker.register(swUrl).then(function (reg) {
                // 注册时若已有等待接管的新 SW（例如上次访问已下载好），直接提示。
                if (reg.waiting && navigator.serviceWorker.controller) {
                    showUpdateBanner();
                }
                reg.addEventListener('updatefound', function () {
                    const newWorker = reg.installing;
                    if (!newWorker) {
                        return;
                    }
                    // 监听新 SW 状态：安装完成（installed）即处于 waiting，
                    // 此时可提示用户刷新。
                    newWorker.addEventListener('statechange', function () {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateBanner();
                        }
                    });
                });
            }).catch(function (error) {
                console.warn('[PWA] Service Worker 注册失败（不影响站点正常使用）：', error);
            });
        });
    }
})();
