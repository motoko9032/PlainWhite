# Android 移动版 PWA 的 UI 适配 — 实现说明

> 本文档说明 Android standalone（添加到主屏幕后独立窗口打开）专属体验的
> **已实现内容、设计依据与验证方法**。普通 Android 浏览器继续使用网站网页版
> 样式（Noto Sans SC 主字体），不受本区块影响。

## 一、平台判定

`script/script.js` 的 `initAppTabBar()` 检测安装模式
（`matchMedia('(display-mode: standalone)')` 或 `navigator.standalone`），
并在 `<html>` 上设置：

- `data-standalone`（任意安装模式）
- `data-app="android"`（UA 含 `Android` 时为 android；iOS 为 ios；其余为 desktop）
- `data-os="android"`（`detectPlatformAndFontFeature()`，另有 macos/windows/linux）

Android 专属 CSS 全部写在 `style/style.css` 末尾「平台化适配」区块的
`html[data-standalone][data-app="android"]` 作用域内，不会影响网页版、
iOS standalone 或桌面 standalone。

## 二、已实现（本轮完成）

### 1. 字体：system-ui + Roboto（Material 3）

```css
html[data-standalone][data-app="android"] {
    --m3-font: system-ui, Roboto, sans-serif;
    --font-serif: var(--m3-font);
    --font-sans: var(--m3-font);
}
```

- 中文由系统默认 CJK 字体回退（Android 上即 Noto Sans CJK），符合
  Material 字体体系；**不使用** Noto Serif SC、EB Garamond 或 Apple UI 字体。
- `script/font-loader.js` 在任何 standalone 模式下跳过站点编辑字体
  （本地 `fonts/` 与 Google Fonts 都不请求），文章页 `.article-body` 等在
  Android standalone 下同样渲染为 system-ui/Roboto。

### 2. 主题色：M3 颜色角色（固定低饱和紫罗兰色板）

Material You（Monet）动态取色目前没有公开 Web API，按项目约定沿用
低饱和紫罗兰色板并映射到 M3 颜色角色（浅/深两套，`prefers-color-scheme`
自动切换），角色包括 `primary / on-primary / primary-container /
secondary-container / on-secondary-container / surface-container /
on-surface-variant / outline-variant / state-hover / state-press`。
文字与容器对比度均 >= 4.5:1（WCAG AA）。

### 3. 顶部应用栏：M3 top app bar

- `header` 改为 `position: sticky`，背景 `--m3-surface-container`
  （浅色 #e9e2f4 / 深色 #2e2938），高度 64dp（`--header-height: 4rem`）；
- `padding-top: env(safe-area-inset-top, 0px)` 避让状态栏；
- 隐藏网页 `.nav` 链接与汉堡按钮（顶层目的地由底部导航栏承担），
  保留「纯白」作为顶栏标题；
- 内容左右边距取 `max(1.25rem, env(safe-area-inset-*))` 避让显示切口。

### 4. 底部导航栏：M3 navigation bar

- 全宽、贴底（`bottom: 0`），高度 `calc(5rem + env(safe-area-inset-bottom))`
  （80dp + 手势导航条 inset），背景 surface container，顶部分隔线
  `outline-variant`；
- 5 个等宽目的地（首页/公告/阅读/下载/关于），图标 24dp + 标签 12sp，
  选中项为 `secondary-container` 胶囊指示器，触摸目标 >= 48dp；
- 按压/悬停使用 M3 状态层（`--m3-state-hover` / `--m3-state-press`）；
- `prefers-reduced-transparency` 时去掉投影；
- 页面内容底部留白 `calc(env(safe-area-inset-bottom) + 6.5rem)`，
  SW 更新横幅也抬到导航栏上方。

### 5. 组件与动效

- 卡片统一 16dp 圆角（M3 Expressive 卡片规范）；
- 主按钮（支持/联系）为 M3 filled button：主色填充 + on-primary 文字 +
  状态层悬停，高度 40dp；
- 区块标题按 M3 title-large 层级（20px、primary 色）；
- 触觉反馈：导航项点击时 `navigator.vibrate(8)`，仅在
  `data-app="android"` standalone 且非 `prefers-reduced-motion` 下触发
  （系统触觉设置没有公开 Web API，reduced-motion 为保守代理）；
- 焦点可见：Android 作用域内 `:focus-visible` 使用 `--m3-primary` 描边。

### 6. 状态栏 / 导航栏 / 切口安全区

- 全站 viewport 已含 `viewport-fit=cover`；`env(safe-area-inset-top)`
  用于顶栏、`env(safe-area-inset-bottom)` 用于底部导航栏与滚动留白、
  `env(safe-area-inset-left/right)` 用于横向（横屏/切口）避让；
- `<head>` 的双 `theme-color`（浅/深）使系统状态栏颜色跟随主题。
- Android 浏览器模式与安装模式明确区分：浏览器模式不设
  `data-standalone`，不出现应用导航，仍使用网页版样式。

## 三、与既有规则的边界

- iOS standalone 的字体 CSS（`html[data-ios-app]` 区块）未改动；
  Android 规则通过 `[data-app="android"]` 隔离，不会覆盖 iOS。
- 桌面 standalone（Windows/macOS/Linux）使用 `data-app="desktop"`，
  走各自的平台 UI 字体栈与网页式导航，同样不受 Android 规则影响。
- 底部 Tab Bar 的 DOM 结构（`.app-tabbar` / `.app-tabbar-item` /
  `aria-current="location"`）沿用原实现，仅 Android 作用域内重样式；
  锚点导航（`#hero` / `#announcements` / …）与 IntersectionObserver
  高亮逻辑保持不变。

## 四、验证方法

真机（推荐）：

1. Android Chrome 打开站点 → 菜单 → 「添加到主屏幕」→ 从主屏幕打开；
2. 检查：独立窗口、顶部应用栏为紫罗兰 surface container、底部全宽导航栏、
   状态栏颜色跟随主题、手势导航条不遮挡导航栏；
3. 横屏确认左右切口避让（`env(safe-area-inset-left/right)`）；
4. 深色模式切换后导航栏/顶栏变为深紫灰；
5. 普通浏览器访问不出现应用导航、字体为 Noto Sans SC。

桌面浏览器模拟（无真机时的开发验证）：

- Chrome DevTools 无法直接模拟 `display-mode: standalone`；开发期可用
  Playwright 在页面脚本运行前打补丁：把 `matchMedia('(display-mode: standalone)')`
  的 `matches` 置为 true、`navigator.userAgent` 替换为 Android UA，再加载页面。
  自动化验证要点见下一条。

自动化验证要点（本项目曾用 Playwright 模拟验证，见 pwa/README.md 变更记录）：

- `data-standalone` / `data-app="android"` / `data-os="android"` 已设置；
- `body` 计算字体为 `system-ui, Roboto, sans-serif`，`.article-body` 同；
- 顶栏 sticky + `padding-top: env(...)`；导航栏 `position: fixed`、
  `width: 100%`、`bottom: 0`、`min-height: calc(5rem + env(...))`；
- 请求列表中没有 `fonts/` 与 Google Fonts 资源；
- 导航项点击不报错（vibrate 被门控）。

## 五、规范依据

- Material Design 3（Material You）导航栏：
  https://m3.material.io/components/navigation-bar
- Material Design 3 顶部应用栏：https://m3.material.io/components/top-app-bar
- Material Design 3 形状（卡片 16dp 等）：https://m3.material.io/styles/shape/shape-scale-tokens
- Material Design 3 颜色角色：https://m3.material.io/styles/color/roles
- 安全区：https://web.dev/articles/safe-area-insets
- Web App Manifest `display: standalone`：
  https://developer.mozilla.org/docs/Web/Manifest/display

已知限制：

- Monet 动态取色无公开 Web API，使用固定色板（上文已说明）；
- `navigator.vibrate` 无法读取系统触觉开关，以 reduced-motion 为代理；
- 系统返回手势/返回键退出 App 由系统处理，无需代码；尚未在真机验证；
- 平板/折叠屏的 Navigation rail（大屏导航）未实现，属可选增强。

## 六、变更记录

- 2026-10-29：完成 Android standalone 的 Material 3 Expressive 适配——
  顶部应用栏、全宽底部导航栏、M3 颜色角色、system-ui/Roboto 字体、
  状态栏与手势导航条安全区、状态层按压/悬停、触觉反馈、16dp 卡片、
  filled button 与 title-large 标题；`data-app` 拆分为
  ios / android / desktop；font-loader 对所有 standalone 跳过编辑字体；
  缓存版本递增至 v17。
