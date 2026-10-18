/* ============================================
   纯白 — 字体加载方式选择器
   在 <head> 中同步执行：默认加载本地字体；
   若此前检测到页面完全加载过慢，则改用 Google Fonts 的 @import 远程字体。
   ============================================ */

(function () {
    'use strict';

    const scriptElement = document.currentScript;
    const FONT_MODE_KEY = 'plainwhite:font-mode';
    const FONT_FALLBACK_KEY = 'plainwhite:font-fallback';
    const GOOGLE_FONT_TIMEOUT_MS = 10000;

    function resolveSiteAsset(path) {
        if (scriptElement && scriptElement.src) {
            return new URL(path, scriptElement.src).href;
        }
        return path;
    }

    function readSession(key) {
        try {
            return window.sessionStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function writeSession(key, value) {
        try {
            window.sessionStorage.setItem(key, value);
        } catch (e) {
            // 隐私模式等禁用 sessionStorage 时忽略
        }
    }

    function addGooglePreconnect() {
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
    }

    function loadLocalFonts() {
        if (document.getElementById('localFontsStylesheet')) return;
        const stylesheet = document.createElement('link');
        stylesheet.id = 'localFontsStylesheet';
        stylesheet.rel = 'stylesheet';
        stylesheet.href = resolveSiteAsset('../style/fonts-local.css');
        document.head.appendChild(stylesheet);
    }

    function fallbackToLocalFonts() {
        document.documentElement.classList.remove('font-mode-google');
        writeSession(FONT_MODE_KEY, 'local');
        writeSession(FONT_FALLBACK_KEY, '1');

        const googleStylesheet = document.getElementById('googleFontsStylesheet');
        if (googleStylesheet) {
            googleStylesheet.remove();
        }
        loadLocalFonts();
    }

    function loadGoogleFonts() {
        if (document.getElementById('googleFontsStylesheet')) return;

        document.documentElement.classList.add('font-mode-google');
        addGooglePreconnect();

        const stylesheet = document.createElement('link');
        stylesheet.id = 'googleFontsStylesheet';
        stylesheet.rel = 'stylesheet';
        // 非阻塞加载：Google Fonts 不可达时，页面先使用系统字体
        stylesheet.media = 'print';
        stylesheet.href = resolveSiteAsset('../style/fonts-google.css');

        let loadTimer = 0;

        stylesheet.addEventListener('load', function () {
            window.clearTimeout(loadTimer);
            stylesheet.media = 'all';
        });
        stylesheet.addEventListener('error', function () {
            window.clearTimeout(loadTimer);
            fallbackToLocalFonts();
        });

        document.head.appendChild(stylesheet);

        loadTimer = window.setTimeout(function () {
            if (stylesheet.media !== 'all') {
                fallbackToLocalFonts();
            }
        }, GOOGLE_FONT_TIMEOUT_MS);
    }

    if (readSession(FONT_MODE_KEY) === 'google' && readSession(FONT_FALLBACK_KEY) !== '1') {
        loadGoogleFonts();
    } else {
        loadLocalFonts();
    }
})();
