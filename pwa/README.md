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
| `pwa/icon-192.png`、`pwa/icon-512.png` | manifest 图标（purpose: any） | ✅ 已生成（占位设计，待替换正式设计） |
| `pwa/icon-maskable-512.png` | manifest 图标（purpose: maskable） | ✅ 已生成 |
| `pwa/apple-touch-icon.png`（180×180）、`pwa/favicon-32.png` | iOS 主屏图标、浏览器标签页图标 | ✅ 已生成 |
| `pwa/icon.svg`、`pwa/generate-icons.py` | 图标矢量源 + 纯标准库 Python 生成脚本 | ✅ 可复现 |
| 全部 11 个 HTML 页面 | 已在 `<head>` 加入 PWA 区块（manifest、主题色、iOS 元数据、图标） | ✅ 已就绪 |
| `script/script.js` | 已追加 Service Worker 注册逻辑（所有页面共用） | ✅ 已就绪 |

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

## 三、未来待办（完整部署 PWA 还需做的事，按优先级排序）

- [ ] **① 替换正式图标**：当前图标是「纸白底 + 墨色方 + 樱色内方」的占位设计。
      正式设计定稿后，修改 `pwa/icon.svg` 与 `pwa/generate-icons.py` 中的颜色/比例
      常量，运行 `python3 pwa/generate-icons.py` 重新生成全部 PNG。
- [ ] **② 部署后验证可安装性**：站点托管在 GitHub Pages（仓库
      `motoko9032/PlainWhite`，站点根路径 `/PlainWhite/`，HTTPS 天然满足）。
      上线后用 Chrome DevTools → Application → Manifest 检查无报错，用
      Lighthouse 的 PWA 审计跑一遍。
- [ ] **③ 上线前递增一次 `CACHE_VERSION`**：若部署时新增了公告/资源，
      确认版本号已递增。
- [ ] **④ 增强（可选，按需）**：
  - 离线阅读 PDF/EPUB 全文（当前有意不缓存，需要时改用
    `CacheStorage` 之外的手段，如 OPFS + Range 适配，或干脆保持在线）；
  - SW 更新提示 UI（当前 `skipWaiting + clients.claim` 静默换新，
    无「发现新版本」横幅）；
  - 推送通知（刊物更新通知）——需要后端推送服务，超出静态站范围；
  - 迁移 Workbox（当前手写 ES5 SW，无构建依赖，功能已够用，无强制理由）；
  - 深色模式（`style/style.css` 顶部注释明确「无暗色模式」，manifest 的
    `theme_color`/`background_color` 均为纸白 `#f9f8f6`，改色需两处同步）。
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
python3 pwa/generate-icons.py   # 仅用标准库，无第三方依赖
```

## 五、新增 HTML 页面的接入检查清单

新增任何 HTML 页面（例如第 5 期文章列表 `WeChatArticleList5.html`）时：

1. 复制现有同级页面的 `<head>` 中的 PWA 区块（8 行：manifest、favicon、
   apple-touch-icon、theme-color、3 个 mobile-web-app meta、apple-mobile-web-app-title）；
2. 按「硬性规则 4」调整相对路径前缀；
3. 保证页面 `<script src="...script.js" defer>` 存在（SW 注册随 script.js 自动生效）；
4. 无需修改 `sw.js` 与 `manifest.webmanifest`（除非该页面要加入预缓存清单）。

## 六、变更记录

- 2026-10：完成 PWA 基础搭建（manifest、sw.js、offline.html、图标生成链、
  全站 head 区块、SW 注册、本交接文档）。
- 2026-10：隔离 CacheStorage 操作，仅清理和查询 `plainwhite-` 命名空间内的缓存；
  缓存版本递增至 `v2`。
