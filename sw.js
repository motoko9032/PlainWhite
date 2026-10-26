/* ============================================================
   纯白 — Service Worker（PWA 离线缓存与安装支持）

   作用域：本文件位于站点根目录（GitHub Pages 上即 /PlainWhite/ 的
   根路径），作用域自动覆盖整个站点，所有页面共用这一份 SW。

   交接须知（给未来的维护者 / 大模型）：
   - 完整的设计文档与未完成事项见 pwa/README.md；
   - 每次更新静态资源后必须递增 CACHE_VERSION（见下方说明）；
   - files/ 下的大文件（PDF/EPUB）有意不缓存，原因见 fetch 处理器注释；
   - 本文件使用 ES5 语法，兼容所有支持 Service Worker 的浏览器。
   ============================================================ */

/* 缓存版本：发布任何静态资源变更（HTML/CSS/JS/公告数据等）后，
   必须递增此版本号（例如 'v1' → 'v2'），旧缓存会在 activate 阶段
   被自动清空。⚠️ 这是目前唯一的缓存失效开关，忘记递增会导致
   用户长期看到旧内容。 */
/* CacheStorage 按 origin 共享，因此所有本站缓存统一使用专属前缀，
   activate 阶段只清理此前缀下的旧版本，不能清除同源其他应用的缓存。 */
const CACHE_PREFIX = 'plainwhite-';
const CACHE_VERSION = 'v12';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

/* 预缓存清单：SW 安装时一次性写入的应用外壳（App Shell）。
   路径相对于 sw.js 所在目录，即站点根目录。
   仅收录首页必需、体积小的核心资源；大文件（fonts/*.ttf、
   files/*.pdf、files/*.epub）严禁加入预缓存，它们会在用户
   实际访问时按需缓存或保持不缓存。 */
const PRECACHE_URLS = [
    './',
    './index.html',
    './offline.html',
    './style/style.css',
    './style/fonts-local.css',
    './pwa/icon.svg',
    './script/script.js',
    './script/font-loader.js',
    './script/announcements.js',
    './announcements/data.js'
];

/* ---- install：写入预缓存 ---- */
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                /* 单个资源预缓存失败只记录警告、不中断安装：
                   避免某个资源 404 导致整个 SW 安装失败。 */
                return Promise.all(PRECACHE_URLS.map(function (url) {
                    return cache.add(url).catch(function (error) {
                        console.warn('[SW] 预缓存失败（不影响安装）：' + url, error);
                    });
                }));
            })
    );
    /* 注意：此处刻意不调用 self.skipWaiting()。
       新版本 SW 安装完成后会进入 waiting 状态，由页面 script.js 检测到
       「已有旧 SW 控制页面 + 新 SW 等待接管」后展示「发现新版本」横幅；
       用户点击刷新时，页面通过 postMessage 发送 SKIP_WAITING，本文件
       下方 message 监听器收到后才调用 skipWaiting() 完成接管。
       这样可避免读者在阅读中途被静默刷新打断。
       首次安装（尚无任何旧 SW 控制页面）时，浏览器会在没有受控窗口的
       情况下自动激活新 SW，因此不需要 skipWaiting 也能正常生效。 */
});

/* ---- message：接收页面发来的更新指令 ---- */
self.addEventListener('message', function (event) {
    const data = event.data || {};
    if (data && data.type === 'SKIP_WAITING') {
        /* 用户已在页面上确认「立即刷新」，此时才允许新 SW 接管。 */
        self.skipWaiting();
    }
});

/* ---- activate：清空本项目旧版本缓存，并立即控制已打开的页面 ---- */
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (key) {
                /* CacheStorage 按 origin 共享，而非按 Service Worker 作用域隔离。
                   只删除带本项目专属前缀的旧缓存，避免清除同源其他应用的数据。 */
                if (key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        }).then(function () {
            return self.clients.claim();
        })
    );
});

/* ---- fetch：拦截请求，按类型区分缓存策略 ---- */
self.addEventListener('fetch', function (event) {
    const request = event.request;

    /* 只处理同源 GET 请求；POST 与跨域请求（Google Fonts、
       CC 协议链接等）一律放行，由浏览器默认处理。 */
    if (request.method !== 'GET') {
        return;
    }
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    /* files/ 目录（PDF/EPUB 等大文件）不缓存、不拦截：
       1) 体积大，缓存收益低且容易撑爆存储配额；
       2) PDF 阅读器使用 Range 分段请求，缓存整份响应后
          按 Range 读取会出错。 */
    if (url.pathname.indexOf('/files/') !== -1) {
        return;
    }

    /* iOS 添加到主屏幕（Web Clip）的图标请求直接放行、不拦截：
       iOS 在「添加到主屏幕」时抓取 apple-touch-icon 的流程对
       Service Worker 返回的缓存响应存在兼容性问题（可能因此拿不到
       图标而回退为「标题首字」占位）。这里一律直连网络，保证 iOS
       能拿到原始 PNG 图标。 */
    if (url.pathname.indexOf('apple-touch-icon') !== -1) {
        return;
    }

    /* 页面导航（HTML 文档请求）：网络优先。
       成功时以请求 URL 为键缓存本次响应（离线时原样回放），
       首页（站点根路径或其 index.html）额外写入 './index.html'
       缓存位，作为首页导航离线时的兜底。
       失败（离线）时依次回退：请求本身缓存 →（仅首页）首页兜底 →
       offline.html。非首页一律回退到 offline.html 而不是首页，
       因为首页 HTML 的 ./ 相对资源路径在子目录 URL 下会解析错误，
       导致样式丢失。 */
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).then(function (response) {
                if (response && response.status === 200) {
                    /* 首页判定：请求路径等于站点根路径或根路径下的 index.html。
                       './' 以 sw.js 所在目录为基准解析，即站点根目录。 */
                    const scopePath = new URL('./', self.location.href).pathname;
                    const isHome = url.pathname === scopePath ||
                        url.pathname === scopePath + 'index.html';
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(request, copy.clone());
                        if (isHome) {
                            cache.put('./index.html', copy);
                        }
                    });
                }
                return response;
            }).catch(function () {
                const scopePath = new URL('./', self.location.href).pathname;
                const isHome = url.pathname === scopePath ||
                    url.pathname === scopePath + 'index.html';
                return caches.open(CACHE_NAME).then(function (cache) {
                    return cache.match(request);
                }).then(function (cached) {
                    if (cached) {
                        return cached;
                    }
                    return isHome ? caches.open(CACHE_NAME).then(function (cache) {
                        return cache.match('./index.html');
                    }) : null;
                }).then(function (cached) {
                    if (cached) {
                        return cached;
                    }
                    /* 最后兜底：offline.html 在预缓存清单中，
                       正常安装后必然存在；此分支仅为极端情况保险。 */
                    return caches.open(CACHE_NAME).then(function (cache) {
                        return cache.match('./offline.html');
                    }).then(function (offlinePage) {
                        return offlinePage || new Response(
                            '纯白 — 当前处于离线状态，请联网后重试。',
                            { status: 503, statusText: 'Offline',
                              headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
                        );
                    });
                });
            })
        );
        return;
    }

    /* 同源静态资源（CSS/JS/字体/图标等）：缓存优先 + 后台更新
       （stale-while-revalidate）。命中缓存立即返回，同时后台
       发起网络请求刷新缓存；未命中缓存则等待网络，失败时静默。 */
    event.respondWith(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.match(request).then(function (cached) {
                const fetched = fetch(request).then(function (response) {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const copy = response.clone();
                        cache.put(request, copy);
                    }
                    return response;
                }).catch(function () {
                    return cached;
                });
                /* 未缓存且网络失败时返回 error 响应（浏览器按资源加载失败处理），
                   避免 respondWith 收到 undefined 抛出异常。 */
                return cached || fetched || Response.error();
            });
        })
    );
});
