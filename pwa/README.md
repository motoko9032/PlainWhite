# PWA 基础设施 — 交接文档

> 本文件是 PWA（渐进式 Web 应用）工作的**交接说明**，写给未来接手本项目的
> 维护者或大模型。基础工作已经完成，**不要重复搭建**；请从「未来待办」一节
> 继续增量推进。文中的每一条说明都应与代码注释保持一致（sw.js、script/script.js、
> 各 HTML 页面的 `<head>` 区块），修改代码时请同步更新本文件。

## 一、目标与现状

目标：让「纯白」站点可以被安装为 PWA App（Android 主屏、iOS 添加到主屏幕、
桌面 Chrome/Edge），并在离线时仍能打开已缓存页面。

**现状（基础工作已完成）：**

| 文件 | 作用 | 状态 |
|------|------|------|
| `manifest.webmanifest` | Web App 清单：名称、主题色、图标、start_url、shortcuts | ✅ 已就绪 |
| `sw.js` | Service Worker：预缓存外壳、离线回退、静态资源缓存 | ✅ 已就绪 |
| `offline.html` | 离线兜底页（样式内联、零外部依赖） | ✅ 已就绪 |
| `pwa/icon-192.png`、`pwa/icon-512.png` | manifest 图标（purpose: any） | ✅ 由正式字标栅格化生成 |
| `pwa/icon-maskable-512.png` | manifest 图标（purpose: maskable） | ✅ 由正式字标栅格化生成 |
| `pwa/apple-touch-icon.png`（180×180，RGB 无 alpha）、根目录 `apple-touch-icon.png` | iOS 添加到主屏图标（`<link rel="apple-touch-icon">`） | ✅ 由正式字标栅格化生成 |
| `pwa/favicon-32.png` | 浏览器标签页图标 | ✅ 由正式字标栅格化生成 |
| `pwa/icon.svg` | 正式字标矢量源（手写「纯白」，仅描边） | ✅ 已替换占位设计 |
| `pwa/generate-icons.py` | 纯 Python（标准库 + numpy）SVG 栅格化脚本 | ✅ 可复现 |
| 全部 11 个 HTML 页面 | 已在 `<head>` 加入 PWA 区块（manifest、SVG/PNG favicon、iOS 元数据、viewport-fit、双 theme-color） | ✅ 已就绪 |
| `script/script.js` | SW 注册 + 新版本横幅 + 底部 Tab Bar（仅安装模式显示） | ✅ 已就绪 |
| `style/style.css` | 深色模式变量 + 底部 Tab Bar 样式（Android 莫奈胶囊 / iOS 玻璃态） | ✅ 已就绪 |

图标体系说明：正式图标是手写「纯白」字标（`pwa/icon.svg`，仅描边）。它同时被用于
四处：① `manifest.webmanifest` 的 SVG 图标条目（`sizes: "any"`，现代浏览器安装时
直接使用矢量，清晰不糊）；② 各页面 `<head>` 的 SVG favicon（PNG 兜底）；③ 首页
页脚右下角 1×1 像素的装饰水印；④ 作为位图图标的矢量源——`generate-icons.py`
从同一矢量源栅格化出全部 PNG，二者同源，不会出现两套设计。

## 二、给未来接手者的硬性规则（务必遵守）

1. **sw.js 必须永远位于站点根目录**（与 `manifest.webmanifest`、`offline.html`
   同级）。它的作用域覆盖整个站点；移到子目录会破坏所有缓存逻辑。
   `script/script.js` 通过 `new URL('../sw.js', 本脚本地址)` 从任意深度的页面
   解析出同一个根目录地址，因此新增页面**无需**为 SW 注册写任何代码。

2. **每次发布静态资源变更（HTML/CSS/JS/公告数据等）后，必须递增
   `sw.js` 顶部的 `CACHE_VERSION`**（如 `'v1'` → `'v2'`）。这是目前唯一的缓存
   失效开关；忘记递增会导致用户长期看到旧内容。缓存名称必须保留
   `plainwhite-` 前缀；激活阶段只清理此前缀下的旧版本缓存。

3. **`files/` 目录（PDF/EPUB 等大文件）永不缓存**。原因：① 体积大；
   ② PDF 阅读器用 HTTP Range 分段读取，缓存整份响应会导致分段读取错乱。
   相关判断在 sw.js 的 fetch 处理器中，不要移除。

4. **新页面 head 区块的相对路径必须匹配目录层级**：
   - 根目录页面：`./manifest.webmanifest`、`./pwa/...`
   - 二级目录页面（`sub/WeChat/`、`sub/LOFTER/`、`sub/special-sub/`、
     `announcements/history/`）：`../../manifest.webmanifest`、`../../pwa/...`
   - 每个 HTML `<head>` 中已有一段带注释的 PWA 区块，复制时按上述规则改前缀即可。

5. **`offline.html` 必须保持自包含**（内联样式、不引用外部 CSS/JS/字体），
   因为它是缓存中只剩它自己时仍要能完整渲染的兜底页。

6. **预缓存清单只放首页必需的小型核心资源**。`fonts/*.ttf`（体积数 MB）与
   `files/*` 大文件禁止加入 `PRECACHE_URLS`；字体等会在用户实际访问时
   按需缓存（缓存优先 + 后台更新）。

7. **CacheStorage 与 Service Worker 作用域无关，而是按 origin 共享**。
   清理缓存时必须检查 `plainwhite-` 前缀；查找/回放请求也只使用当前版本缓存，
   不要用无范围的 `caches.match()`，以免同源其他应用的缓存影响本站。

8. **更换品牌图标时只改 `pwa/icon.svg`，然后运行 `python3 pwa/generate-icons.py`**
   重新生成全部 PNG。脚本会解析 SVG 路径（仅支持本图标用到的 M/Z/c/l）并用
   numpy 光栅化，按 `STROKE_SCALE` 加粗描边——字标原始 `stroke-width=5` 在
   16800px 宽的 viewBox 里按比例缩到图标尺寸后不可见。不要手工编辑 PNG，也
   无需改动 `manifest.webmanifest` 的图标条目（除非增减尺寸）。

9. **iOS 添加到主屏的图标必须是无 alpha 通道的 PNG**。iOS 不读取 SVG/含透明
   通道的 `apple-touch-icon`，会拒绝并回退为「网站标题首字」方块（如「纯」）。
   `generate-icons.py` 已把 `apple-touch-icon.png` 输出为 RGB（颜色类型 2），
   并同步写一份到站点根目录（Apple 文档的整站 Web Clip 兜底位置）。不要手工
   把该 PNG 换成带透明通道的文件；若更换图标，重跑脚本即可同时刷新两份。

10. **`viewport` meta 必须含 `viewport-fit=cover`**，否则 `env(safe-area-inset-*)`
    不生效，底部 Tab Bar 会被 iOS 的 Home 指示条 / Android 手势导航条遮挡。
    新增页面照抄现有页面的 viewport 行即可。`<head>` 中的 `theme-color` 已按
    `prefers-color-scheme` 拆成浅色/深色两条（带 `media` 属性），复制 PWA 区块时
    两条都要带上，浏览器状态栏颜色才能跟随深色模式。

11. **底部 Tab Bar 只在「添加到主屏」的安装模式（standalone）显示**。检测逻辑
    在 `script/script.js` 的 `initAppTabBar()`：`matchMedia('(display-mode: standalone)')`
    或 iOS 的 `navigator.standalone`；样式由 `html[data-standalone]` 与
    `html[data-app="ios"|"android"]` 驱动。浏览器里访问不设置这些属性，效果与
    未安装时完全一致。Tab Bar 项改动只需改 `script.js` 里 `items` 数组。

## 三、未来待办（完整部署 PWA 还需做的事，按优先级排序）

- [x] **① 替换正式图标**：已用正式设计（手写「纯白」字标）替换占位几何设计，
      矢量源为 `pwa/icon.svg`；`pwa/generate-icons.py` 重写为纯 Python（标准库 +
      numpy）SVG 栅格化器，运行后从字标生成全部 PNG。如需调整线条粗细或留白，
      修改脚本顶部的 `STROKE_SCALE`、`MARGIN_ANY`、`INK_STROKE` 等常量后重跑即可。
- [ ] **② 部署后验证可安装性**：站点托管在 GitHub Pages（仓库
      `motoko9032/PlainWhite`，站点根路径 `/PlainWhite/`，HTTPS 天然满足）。
      上线后用 Chrome DevTools → Application → Manifest 检查无报错，用
      Lighthouse 的 PWA 审计跑一遍。
- [ ] **③ 上线前递增一次 `CACHE_VERSION`**：若部署时新增了公告/资源，
      确认版本号已递增。
- [ ] **④ 增强（可选，按需）**：
  - 离线阅读 PDF/EPUB 全文（当前有意不缓存，需要时改用
    `CacheStorage` 之外的手段，如 OPFS + Range 适配，或干脆保持在线）；
  - SW 更新提示 UI ✅ 已完成：sw.js 不再静默 `skipWaiting`，改由页面横幅
    「发现新版本 → 立即刷新」驱动（script.js 检测等待中的新 SW，用户点击后
    发 `SKIP_WAITING`，接管后自动刷新；样式见 style.css 的 `.sw-update-banner`）；
  - 推送通知（刊物更新通知）——需要后端推送服务，超出静态站范围；
  - 迁移 Workbox（当前手写 ES5 SW，无构建依赖，功能已够用，无强制理由）；
  - 深色模式 ✅ 已完成：`style/style.css` 用 `@media (prefers-color-scheme: dark)`
    覆盖 CSS 变量，遵循 WCAG 对比度；`<head>` 的 `theme-color` 拆分浅/深两条，
    `offline.html` 与 `color-scheme` 同步适配，浏览器与安装模式均跟随系统；
  - 底部悬浮 Tab Bar ✅ 已完成：仅安装模式（standalone）显示，iOS 为高斯模糊
    玻璃态、Android 为低饱和紫罗兰紫（Material You 莫奈色）胶囊，均按官方
    安全区文档适配底部 inset；浏览器里访问不显示，保持原样。
- [ ] **⑤ 测试清单**：
  - Chrome/Edge 桌面：安装图标出现、离线刷新仍可浏览已访问页面；
  - Android Chrome：添加到主屏幕 → 独立窗口（standalone）打开；
  - iOS Safari：分享 → 添加到主屏幕，标题为「纯白」，图标为 apple-touch-icon；
  - 未访问过的二级页面离线访问时应回退到 `offline.html`。

## 四、本地验证方法

```bash
# 在仓库根目录起本地服务（Service Worker 只在 https 或 localhost 下工作）
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000/ → DevTools → Application：
#   - Manifest 面板无错误；
#   - Service Workers 面板显示 sw.js 已激活；
#   - 勾选 Offline 后刷新，页面仍可用；访问未缓存页面应见 offline.html。
```

图标重新生成与校验：

```bash
python3 pwa/generate-icons.py   # 依赖：Python 3 + numpy（无其他第三方依赖）
```

## 五、新增 HTML 页面的接入检查清单

新增任何 HTML 页面（例如第 5 期文章列表 `WeChatArticleList5.html`）时：

1. 复制现有同级页面的 `<head>` 中的 PWA 区块（manifest、SVG favicon、PNG favicon、
   apple-touch-icon（含 `sizes="180x180"`）、theme-color 两条（浅/深、带 `media`）、
   3 个 mobile-web-app meta、apple-mobile-web-app-title），以及含
   `viewport-fit=cover` 的 viewport meta；
2. 按「硬性规则 4」调整相对路径前缀；
3. 保证页面 `<script src="...script.js" defer>` 存在（SW 注册随 script.js 自动生效）；
4. 无需修改 `sw.js` 与 `manifest.webmanifest`（除非该页面要加入预缓存清单）。

## 六、变更记录

- 2026-10：完成 PWA 基础搭建（manifest、sw.js、offline.html、图标生成链、
  全站 head 区块、SW 注册、本交接文档）。
- 2026-10：隔离 CacheStorage 操作，仅清理和查询 `plainwhite-` 命名空间内的缓存；
  缓存版本递增至 `v2`。
- 2026-10：页脚加入 1×1 像素装饰水印（`icons/PW-Icon-FinalVer.svg`），缓存版本
  递增至 `v3`。
- 2026-10：正式图标替换——把 `icons/PW-Icon-FinalVer.svg` 移入 `pwa/icon.svg`
  （删除 `icons/`，文件树对齐 Common Manual），重写 `generate-icons.py` 为 SVG
  栅格化器并重新生成全部 PNG；manifest 增补 SVG 图标条目、全站 11 页增补 SVG
  favicon；新增 SW 更新提示横幅（不再静默 skipWaiting）；缓存版本递增至 `v4`。
- 2026-10：修复 iOS 添加到主屏时图标不显示的问题——`apple-touch-icon.png`
  改为无 alpha 的 RGB PNG、补 `sizes="180x180"`、并在站点根目录生成同源副本
  （Apple 文档的整站 Web Clip 兜底位置）；缓存版本递增至 `v5`。
- 2026-10：原生体验增强——① 全站 viewport 加 `viewport-fit=cover`；② 新增
  底部悬浮 Tab Bar（仅安装模式显示，iOS 玻璃态 / Android 莫奈色胶囊，安全区
  适配）；③ 深色模式（`prefers-color-scheme` 覆盖 CSS 变量 + `color-scheme` +
  双 `theme-color`，offline.html 同步适配）；缓存版本递增至 `v6`。
