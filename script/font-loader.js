/* ============================================
   纯白 — 字体加载器（仅 Google Fonts）
   在 <head> 中同步执行：为非安装模式的普通网页加载
   style/fonts-google.css（Google Fonts @import）。
   本地 fonts/*.ttf 不再参与任何页面加载，避免大体积
   中文字体拖慢页面。
   ============================================ */

(function () {
    'use strict';

    const scriptElement = document.currentScript;
    const GOOGLE_FONT_TIMEOUT_MS = 10000;

    function isIOSUA() {
        const nav = window.navigator || {};
        const userAgent = nav.userAgent || '';
        return /iPad|iPhone|iPod/.test(userAgent) ||
            (nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1);
    }

    function isAppStandalone() {
        const nav = window.navigator || {};
        return nav.standalone === true ||
            (window.matchMedia &&
             window.matchMedia('(display-mode: standalone)').matches);
    }

    // 任何安装模式（iOS / Android / 桌面 standalone）都使用对应平台的
    // UI 字体，不加载 Google Fonts 编辑字体。字体栈分别由 style/style.css
    // 中的 html[data-ios-app]（Apple 系统字体）、
    // html[data-standalone][data-app="android"]（system-ui + Roboto）与
    // html[data-standalone][data-app="desktop"]（按 data-os 的桌面 UI 字体）
    // 提供；普通浏览器统一使用 Google Fonts。
    if (isAppStandalone()) {
        if (isIOSUA()) {
            // iOS standalone 沿用既有类名，CSS 契约不变
            document.documentElement.classList.add('ios-standalone-system-font');
        } else {
            document.documentElement.classList.add('standalone-platform-font');
        }
        return;
    }

    function resolveSiteAsset(path) {
        if (scriptElement && scriptElement.src) {
            return new URL(path, scriptElement.src).href;
        }
        return path;
    }

    // 预连接 Google Fonts 的 API 与静态域，缩短字体请求握手时间
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

    function loadGoogleFonts() {
        if (document.getElementById('googleFontsStylesheet')) return;

        const stylesheet = document.createElement('link');
        stylesheet.id = 'googleFontsStylesheet';
        stylesheet.rel = 'stylesheet';
        // 非阻塞加载：先用 print 媒体拉取，成功后切到 all；
        // Google Fonts 不可达时页面直接使用系统回退字体。
        stylesheet.media = 'print';
        stylesheet.href = resolveSiteAsset('../style/fonts-google.css');

        let loadTimer = 0;

        function giveUpOnGoogleFonts() {
            window.clearTimeout(loadTimer);
            // 远程样式不可用时移除链接，页面按 --font-sans / --font-serif
            // 的系统回退字体渲染，不阻塞首屏。
            stylesheet.remove();
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
        }, GOOGLE_FONT_TIMEOUT_MS);
    }

    loadGoogleFonts();
})();
