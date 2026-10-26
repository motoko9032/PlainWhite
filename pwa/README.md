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
| `pwa/apple-touch-icon.png`（180×180，RGB 无 alpha）、根目录 `apple-touch-icon.png`、根目录 `apple-touch-icon-180x180.png` | iOS 添加到主屏图标（`<link rel="apple-touch-icon">` 与站点根兜底） | ✅ 由正式字标栅格化生成 |
| `pwa/apple-touch-icon.base64.txt` | 图标 base64 数据（仅作内联备用，不能用于 iOS touch icon） | ✅ 随生成脚本产出 |
| `pwa/android-ui-guide.md` | Android 移动版 UI 适配开发文档（待办移交） | ✅ 已就绪 |
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
   `generate-icons.py` 已把 `apple-touch-icon.png` 与 `apple-touch-icon-180x180.png`
   输出为 RGB（颜色类型 2），并同步写一份到站点根目录（Apple 文档的整站 Web Clip
   兜底位置）。**注意两点**：① iOS 的 `<link rel="apple-touch-icon">` 不支持
   `data:` URI——Web Clip 图标抓取流程不解析 base64 数据，因此
   `pwa/apple-touch-icon.base64.txt` 只能用于内联备用，不能放进 link 的 href；
   ② `sw.js` 已把路径含 `apple-touch-icon` 的请求**直接放行**（不经过 Service
   Worker 的缓存策略）。这是为避免缓存成为变量的兼容性措施，**并未在真机上证实
   缓存就是占位图标的根因**。若真机仍显示占位图标，应核对部署后的页面 `<head>`、
   图标 URL / HTTP 响应和站点子路径，再删除旧 Web Clip 后重新添加；iOS 可能会
   长期复用已缓存的图标。

10. **`viewport` meta 必须含 `viewport-fit=cover`**，否则 `env(safe-area-inset-*)`
    不生效，底部 Tab Bar 会被 iOS 的 Home 指示条 / Android 手势导航条遮挡。
    新增页面照抄现有页面的 viewport 行即可。`<head>` 中的 `theme-color` 已按
    `prefers-color-scheme` 拆成浅色/深色两条（带 `media` 属性），复制 PWA 区块时
    两条都要带上，浏览器状态栏颜色才能跟随深色模式。

11. **导航按运行平台隔离**。底部 Tab Bar 只在「添加到主屏」的安装模式
    （standalone）显示，检测入口为 `script/script.js` 的 `initAppTabBar()`：
    `matchMedia('(display-mode: standalone)')` 或 iOS 的 `navigator.standalone`。
    浏览器访问不会设置 standalone 属性，也不会创建 Tab Bar。iOS 安装态会隐藏汉堡
    菜单并启用应用式页面路由；Android standalone 仍使用原有锚点导航；普通浏览器
    与 Android 的既有页面结构、滚动行为不可被 iOS 路由改动影响。

12. **iOS standalone 的页面与路由**。其顶层 Tab 为：首页（`#hero`）、公告
    （`#announcements`）、阅读（`#columns`）、下载（`#downloads`）、更多（动态生成
    的 `#iosMoreView`）。切换时只显示当前页面，主标题同步成为当前页面唯一的
    `h1.section-title`，页面标题和 `aria-current="page"` 也同步更新。「更多」目录
    再进入关于、特别文章、分发方式、支持、致谢、联系与投稿六个子页。
    新路由形式为 `#app/home`、`#app/announcements`、`#app/reading`、
    `#app/downloads`、`#app/more` 与 `#app/more/<子页>`；子页的 Tab 仍选中「更多」，
    并通过应用内返回按钮及浏览器历史记录回到上级。不要重新引入靠
    `IntersectionObserver` 猜测当前 Tab 的逻辑，也不要把 iOS 的应用路由套用到
    浏览器或 Android standalone。修改顶层路由、子页映射或页面标题时，应同步检查
    `initIOSAppNavigation()`、`iosAppRoutes`、`iosMoreRoutes` 和本节说明。

13. **iOS 样式是 HIG 启发的 Web 适配，不是原生 UIKit 控件或 HIG 认证**。
    iPhone 使用底部安全区上方的悬浮玻璃 Tab Bar；宽屏触控设备使用顶部粘性 Tab
    Bar。触控目标至少 44 CSS px 高，当前项对比度清晰；header 处于文档流中的粘性
    定位，顶部安全区只计入一次。玻璃背景提高了透明度，启用「降低透明度」时回退
    为实色背景。卡片圆角不依赖设备型号，而由 CSS `clamp()` 与 `vmin` 根据视口短边
    响应计算。`backdrop-filter` 只能近似系统材质，不能保证等同 UIKit / Liquid Glass。
    新增页面或调整导航后，必须在真实 iPhone/iPad 检查安全区、横竖屏、放大文字、
    VoiceOver、深浅色与降低透明度；模拟器的安全区值不能代替真机验收。
    设计参考：[Apple HIG — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
    与 [Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)。

14. **iOS standalone 的排版只使用 iOS 系统 UI 字体**。`script/font-loader.js`
    在字体样式表加载前识别 iOS standalone，并跳过本地/Google 编辑字体；普通 Safari
    与非 iOS 安装模式继续使用原有字体逻辑。`style/style.css` 以
    `-apple-system-body`、`-apple-system-headline` 和 `-apple-system-footnote` 等
    WebKit 系统文本样式为基础，并按 Apple HIG 的 17 pt 默认、11 pt 最小字号组织层级；
    标题尺寸相对正文缩放，避免固定像素字号破坏 Dynamic Type。新增文字样式应继续使用
    系统字体、足够对比度和可伸展布局，不要在 iOS 安装态引入自托管或远程字体。
    参考：[Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
    与 [WebKit — Using the System Font in Web Content](https://webkit.org/blog/3709/using-the-system-font-in-web-content/)。

15. **iOS 安装态的内容与控件必须尊重系统安全区**。依赖现有
    `viewport-fit=cover`，使用 `env(safe-area-inset-top|right|bottom|left)` 读取设备/
    窗口实际 inset；不要按机型写死刘海、灵动岛或 Home 指示条尺寸，也不要套用 tvOS
    的安全边距。header 顶部只计入一次 safe-top；主内容的左右边距取常规阅读留白与
    对应方向 safe inset 的较大值；iPhone 底部 Tab Bar 位于 safe-bottom 上方，正文
    底部留白须保证最后内容滚动时不会被栏遮挡。宽屏 iPad 的 Tab Bar 在 header 后进入
    文档流，顶部 sticky 位置应按 header 总高度（含 safe-top）计算。参考：
    [Apple HIG — Layout: Guides and safe areas](https://developer.apple.com/design/human-interface-guidelines/layout#Guides-and-safe-areas)。

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
  - 底部 Tab Bar ✅ 已实现：仅安装模式（standalone）显示，iOS 采用 HIG 启发的
    应用式多页面路由、等宽导航与安全区布局，Android 为低饱和紫罗兰紫胶囊；
    浏览器与 Android 的既有导航行为保持不变。iOS CSS 材质只是 Web 近似，不代表
    原生 Liquid Glass 或完整 HIG 认证。
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
- 2026-10：尝试解决 iOS 添加到主屏时图标不显示的问题——`apple-touch-icon.png`
  改为无 alpha 的 RGB PNG、补 `sizes="180x180"`、并在站点根目录生成同源副本
  （Apple 文档的整站 Web Clip 兜底位置）；真机仍曾报告占位图标，故问题尚未确认
  解决；缓存版本递增至 `v5`。
- 2026-10：原生体验增强——① 全站 viewport 加 `viewport-fit=cover`；② 新增
  底部悬浮 Tab Bar（仅安装模式显示，iOS 玻璃态 / Android 莫奈色胶囊，安全区
  适配）；③ 深色模式（`prefers-color-scheme` 覆盖 CSS 变量 + `color-scheme` +
  双 `theme-color`，offline.html 同步适配）；缓存版本递增至 `v6`。
- 2026-10：iOS 安装模式 UI 适配——状态栏改为 `black-translucent`、header 顶部
  安全区让位、隐藏顶部汉堡菜单（底部 Tab Bar 承担导航）、玻璃态 Tab Bar 透明度
  提高（背景降至 ~0.45 + 32px 模糊）；图标前置工作：新增 `apple-touch-icon-180x180.png`
  （带尺寸命名，根目录 + pwa/）与 `apple-touch-icon.base64.txt`，并在文档确认
  iOS touch icon 不支持 data URI；新增 `pwa/android-ui-guide.md` 移交 Android 端
  待办；缓存版本递增至 `v7`。
- 本次 iOS HIG 启发式修正：将 standalone header 改为占据文档流的 sticky header，
  避免首屏和子页面被 fixed header 覆盖；重算顶部安全区、锚点与底部滚动留白；
  将五个 tab 目标设为等宽并保证至少 44 CSS px 高，改善选中状态对比度与键盘焦点，
  并响应降低透明度偏好。Tab Bar 材质仅为 CSS 近似；仍需 iOS 真机验证安全区、
  VoiceOver、文字放大及图标部署结果。Service Worker 缓存递增至 `v9`。
