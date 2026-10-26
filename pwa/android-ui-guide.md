# Android 移动版 PWA 的 UI 适配 — 开发文档

> 本文件写给**下一个接手 Android 移动版 PWA UI 适配的 AI / 维护者**。
> iOS 端已完成一轮适配（见 `pwa/README.md` 与 `style/style.css` 末尾的
> 「iOS 安装模式 UI 适配」区块）；Android 端目前只完成了底部 Tab Bar 的
> 莫奈色胶囊样式，其余系统级适配待做。请按本文件逐项推进，**不要重做
> 已完成的底部 Tab Bar**。

## 一、已完成（不要重复搭建）

- 底部悬浮 Tab Bar 已在 `style/style.css` 中实现（`html[data-standalone]`
  选择器），Android 变体为 `html[data-app="android"]` 下的低饱和紫罗兰紫
  （Material You 莫奈色）圆角胶囊，深色模式自动切换为深紫灰。
- 检测与注入逻辑在 `script/script.js` 的 `initAppTabBar()`：`matchMedia('(display-mode: standalone)')`
  判定安装模式，`data-app` 按 UA 区分 `ios` / `android`。
- 全站 `viewport` meta 已含 `viewport-fit=cover`；底部安全区已用
  `env(safe-area-inset-bottom, 0px)` 处理。
- 深色模式已全局就绪（`prefers-color-scheme` 覆盖 CSS 变量 + `color-scheme`）。

## 二、Android 端待办（按优先级排序）

参考官方规范：**Material Design 3（Material You）** 与 **Web App Manifest 规范**。
文档链接：
- Material Design 3 导航栏（Navigation bar）：
  `https://m3.material.io/components/navigation-bar`
- Material Design 3 顶部应用栏（Top app bar）：
  `https://m3.material.io/components/top-app-bar`
- Web App Manifest `display_override` 与窗口控制：
  `https://developer.chrome.com/docs/capabilities/display-override`

- [ ] **① 顶部 App Bar 适配（较高优先级）**：当前安装模式仍沿用网页的毛玻璃
      header（`style.css` 的 `.header`）。建议为 `html[data-standalone][data-app="android"]`
      定制 Material 风格顶部栏：
      - 使用 Material 3 的 top app bar（surface container 色 + 标题居中/居左）；
      - 颜色取自莫奈紫罗兰色板（浅色 `#e9e2f4` 容器 / 深色 `#2e2938`，与底部
        Tab Bar 保持一致），保证上下导航视觉统一；
      - 状态栏区域：Android 的 `theme-color` 已按浅/深拆分（见各页面 `<head>`），
        无需额外处理状态栏，但顶部栏自身要避免与状态栏重叠。

- [ ] **② 莫奈动态色接入（条件性）**：目前 Google **没有**公开的 Web API 供网页
      读取系统 Material You（Monet）动态调色板，因此按项目约定写死低饱和紫罗兰紫
      （`style.css` 中 Android Tab Bar 区块有注释）。若未来 Chrome/Android 提供
      官方接口（例如 CSS `light-dark()` 之外的系统色变量，或 `navigator` 级取色
      API），优先接入并删除写死色值；在此之前**不要**自行通过 UA 或私有接口探测。

- [ ] **③ 触觉反馈**：Android 支持 `navigator.vibrate()`。建议在底部 Tab 点击时
      触发极短振动（如 5–10ms），提升「原生感」。注意：仅 `data-app="android"`
      且安装模式下触发，且尊重系统「触觉反馈」无障碍设置（能检测则跳过）。

- [ ] **④ 涟漪 / 按压态**：Material 组件常见 ripple 效果。当前 Tab 项用
      `background-color` 过渡做按压反馈，可替换为更贴近 Material 的涟漪
      （纯 CSS `:active` 缩放 + 色块，或轻量 JS 涟漪层）；保持 `prefers-reduced-motion`
      下禁用动画（现有全局 reduce 规则已覆盖 transition，涟漪动画需自行遵守）。

- [ ] **⑤ 手势导航边缘冲突**：Android 10+ 全面屏手势导航在屏幕左右边缘保留
      返回手势区。底部 Tab Bar 目前 `max-width: min(92vw, 30rem)` 居中，已远离
      左右边缘，无需改动；但若后续把 Tab Bar 拉宽到全屏，必须保留左右边缘
      至少 `env(safe-area-inset-left/right)` 的避让。

- [ ] **⑥ 平板 / 折叠屏 / 大屏适配**：Material 大屏规范建议导航栏可切换为
      Navigation rail（侧边竖排导航）。可作为增强项：`min-width` 断点下把
      底部 Tab Bar 改为左侧 rail。非必须，按需。

- [ ] **⑦ 独立窗口与手势返回**：确认 manifest 的 `display: standalone` 在
      Android 上以独立窗口打开，系统返回键/手势应退出 App 而非逐页后退——
      这是系统行为，无需代码干预，但上线后需真机验证。

## 三、验证清单（Android 端）

- Android Chrome：添加到主屏幕 → 独立窗口打开，底部 Tab Bar 为莫奈色胶囊；
- 深色模式下 Tab Bar 切为深紫灰（跟随系统深色）；
- 底部手势导航条不遮挡 Tab Bar（`env(safe-area-inset-bottom)` 生效）；
- 浏览器里访问（未安装）**不出现** Tab Bar；
- 触觉反馈（若已实现）在系统关闭触觉时不触发。

## 四、变更记录

- 2026-10-27：本文件创建。iOS 端完成首轮适配（状态栏 `black-translucent`、
  顶部安全区、汉堡菜单隐藏、Tab Bar 玻璃态透明度优化、图标前置工作）；
  Android 端底部 Tab Bar 已就绪，其余适配项登记为上方待办。
