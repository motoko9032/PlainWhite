# 公众号原文、LOFTER 原文与特别文章目录（sub/WeChat/、sub/LOFTER/ 与 sub/special-sub/）

`sub/` 下按平台分为三个自包含的子目录：

- `sub/WeChat/` — 公众号原文列表页、公众号联系页、公众号文章 Markdown 与回退数据
- `sub/LOFTER/` — LOFTER 原文列表页、LOFTER 文章 Markdown 与回退数据
- `sub/special-sub/` — 白色封皮特别文章公众号原文列表页、特别文章 Markdown 与回退数据

各类列表页都会自动读取各自目录下的 Markdown 文章文件并渲染成文章列表，**新增文章完全不需要改 HTML、CSS 或 JavaScript**，列表的样式和风格保持不变。

此外，`sub/WeChat/WeChatContact.html` 是公众号联系页面，展示公众号二维码与公众号名片，从首页「联系」栏目的「来看看公众号」按钮进入。更新内容时只需替换 `files/白色封皮公众号.JPG` 或修改该页面中的二维码图片路径。

### 关于 PWA（渐进式 Web 应用）

全站已内置 PWA 基础支持（manifest、Service Worker、离线兜底页，详见 [pwa/README.md](../pwa/README.md)）。新增 HTML 页面时，请照抄现有同级页面 `<head>` 中的 PWA 区块（manifest、favicon、apple-touch-icon、theme-color 等 8 行注释已标明的标签），并按页面所在目录层级调整相对路径前缀——本目录下的页面一律用 `../../`。Service Worker 会随 `script/script.js` 在页面加载后自动注册，无需额外配置。

## 公众号原文

- `sub/WeChat/WeChatArticleList1.html` — 第 1 期公众号原文列表页（显示 `issue: 1` 的文章）
- `sub/WeChat/WeChatArticleList2.html` — 第 2 期公众号原文列表页（显示 `issue: 2` 的文章）
- `sub/WeChat/WeChatArticleList3.html` — 第 3 期公众号原文列表页（显示 `issue: 3` 的文章）
- `sub/WeChat/wechat-article-01.md`、`wechat-article-02.md`…… — **每篇文章一个 Markdown 文件**，页面按编号顺序读取
- `sub/WeChat/data.js` — 冗余回退数据源（仅在无法读取 Markdown 时使用）

### 新增一篇文章（推荐方式，适合非专业编辑）

只需要两步：

1. 复制上一篇文章文件（例如 `wechat-article-08.md`）；
2. 把文件名编号 **+1**（例如改成 `wechat-article-09.md`），然后改掉内容：

```markdown
---
issue: 2
title: 新文章标题
url: https://mp.weixin.qq.com/s/文章链接
---
```

保存后，对应期号的页面会自动显示这篇文章。如果暂时没有公众号链接，把 `url` 留空即可，文章会显示为一行普通文字。

### 字段说明

- 顶部三横线（`---`）之间是文章信息：
  - `issue`：期号。填 `1` 显示在第 1 期页面，填 `2` 显示在第 2 期页面（必填）
  - `title`：文章标题，显示在列表中（必填）
  - `url`：公众号文章链接。没有链接时留空（选填）
- 两个 `---` 之后不需要写任何内容。

### 注意事项

- 文件名必须形如 `wechat-article-01.md`、`wechat-article-02.md`……，**编号必须连续**，页面按编号顺序读取，遇到断号会停止；
- 每个文章文件**必须以 `---` front-matter 开头**（照抄上面的模板即可），否则会被忽略，视为文章列表结束；
- 若删除中间某篇文章，请把后面的文件重新连续编号。

### 冗余回退：直接填 JavaScript（data.js）

网站部署或使用本地服务器访问时，页面优先读取 Markdown 文件。如果**直接双击打开页面**（`file://` 协议），浏览器禁止读取文件，此时页面会自动回退到 `data.js` 中的数据。两种方式内容应保持一致：

- 正常维护时**只改 Markdown 文件即可**；
- 如需同步回退数据，打开 `sub/WeChat/data.js`，在 `window.WECHAT_ARTICLES` 数组末尾照着已有格式添加一条：

```javascript
{ issue: "2", title: "新文章标题", url: "https://mp.weixin.qq.com/s/文章链接" }
```

- `issue`、`title`、`url` 的含义与 Markdown 中的字段相同；没有链接的纯文字条目把 `url` 留空（`""`）；
- 修改了 Markdown 后请同步更新这里，保持两者一致。

### 新增一期页面（可选）

需要新一期时：

1. 复制 `sub/WeChat/WeChatArticleList3.html`，在同一目录下改名为 `WeChatArticleList4.html`；
2. 修改页面标题、期号说明等文字；
3. 把列表标签 `<ul ... data-wechat-issue="3">` 改成 `data-wechat-issue="4"`；
4. 新文章文件的 `issue` 字段填 `4`，保存后就会自动出现在该页面。

## LOFTER 原文

以下结构与公众号原文完全一致，仅文件前缀、页面名与链接平台不同。

- `sub/LOFTER/LofterArticleList1.html` — 第 1 期 LOFTER 原文列表页（显示 `issue: 1` 的文章）
- `sub/LOFTER/LofterArticleList2.html` — 第 2 期 LOFTER 原文列表页（显示 `issue: 2` 的文章）
- `sub/LOFTER/LofterArticleList3.html` — 第 3 期 LOFTER 原文列表页（显示 `issue: 3` 的文章）
- `sub/LOFTER/lofter-article-01.md`、`lofter-article-02.md`…… — **每篇文章一个 Markdown 文件**，页面按编号顺序读取
- `sub/LOFTER/data.js` — 冗余回退数据源（`window.LOFTER_ARTICLES`，仅在无法读取 Markdown 时使用）

### 新增一篇文章（推荐方式，适合非专业编辑）

只需要两步：

1. 复制上一篇文章文件（例如 `lofter-article-01.md`）；
2. 把文件名编号 **+1**（例如改成 `lofter-article-02.md`），然后改掉内容：

```markdown
---
issue: 1
title: 新文章标题
url: https://xxxx.lofter.com/post/文章标识
---
```

保存后，对应期号的页面会自动显示这篇文章。如果暂时没有 LOFTER 链接，把 `url` 留空即可，文章会显示为一行普通文字。

### 字段说明

- 顶部三横线（`---`）之间是文章信息：
  - `issue`：期号。填 `1` 显示在第 1 期页面，填 `2` 显示在第 2 期页面（必填）
  - `title`：文章标题，显示在列表中（必填）
  - `url`：LOFTER 文章链接。没有链接时留空（选填）
- 两个 `---` 之后不需要写任何内容。

### 注意事项

- 文件名必须形如 `lofter-article-01.md`、`lofter-article-02.md`……，**编号必须连续**，页面按编号顺序读取，遇到断号会停止；
- 每个文章文件**必须以 `---` front-matter 开头**（照抄上面的模板即可），否则会被忽略，视为文章列表结束；
- 若删除中间某篇文章，请把后面的文件重新连续编号。

### 冗余回退：直接填 JavaScript（data.js）

网站部署或使用本地服务器访问时，页面优先读取 Markdown 文件。如果**直接双击打开页面**（`file://` 协议），浏览器禁止读取文件，此时页面会自动回退到 `data.js` 中的 `window.LOFTER_ARTICLES`。两种方式内容应保持一致：

- 正常维护时**只改 Markdown 文件即可**；
- 如需同步回退数据，打开 `sub/LOFTER/data.js`，在 `window.LOFTER_ARTICLES` 数组末尾照着已有格式添加一条：

```javascript
{ issue: "1", title: "新文章标题", url: "https://xxxx.lofter.com/post/文章标识" }
```

- `issue`、`title`、`url` 的含义与 Markdown 中的字段相同；没有链接的纯文字条目把 `url` 留空（`""`）；
- 修改了 Markdown 后请同步更新这里，保持两者一致。

### 新增一期页面（可选）

需要新一期时：

1. 复制 `sub/LOFTER/LofterArticleList3.html`，在同一目录下改名为 `LofterArticleList4.html`；
2. 修改页面标题、期号说明等文字；
3. 把列表标签 `<ul ... data-lofter-issue="3">` 改成 `data-lofter-issue="4"`；
4. 新文章文件的 `issue` 字段填 `4`，保存后就会自动出现在该页面。

## 白色封皮特别文章（sub/special-sub/）

特别文章与公众号原文、LOFTER 原文同为 `sub/` 下的自包含子目录，区别在于：

- 特别文章**不分期**，全部文章显示在同一个列表页；
- 特别文章只提供 **PDF 下载**（位于首页「特别文章」版块）与**公众号原文**两个入口，没有 LOFTER 与 EPUB 区域。

- `sub/special-sub/SpecialArticleList.html` — 特别文章公众号原文列表页
- `sub/special-sub/special-article-01.md`、`special-article-02.md`…… — **每篇文章一个 Markdown 文件**，页面按编号顺序读取
- `sub/special-sub/data.js` — 冗余回退数据源（`window.SPECIAL_ARTICLES`，仅在无法读取 Markdown 时使用）

### 新增一篇文章（推荐方式，适合非专业编辑）

只需要两步：

1. 复制上一篇文章文件（例如 `special-article-01.md`）；
2. 把文件名编号 **+1**（例如改成 `special-article-02.md`），然后改掉内容：

```markdown
---
title: 新文章标题
url: https://mp.weixin.qq.com/s/文章链接
---
```

保存后，列表页会自动显示这篇文章。如果暂时没有公众号链接，把 `url` 留空即可，文章会显示为一行普通文字。

### 字段说明

- 顶部三横线（`---`）之间是文章信息：
  - `title`：文章标题，显示在列表中（必填）
  - `url`：公众号文章链接。没有链接时留空（选填）
- 两个 `---` 之后不需要写任何内容。

### 注意事项

- 文件名必须形如 `special-article-01.md`、`special-article-02.md`……，**编号必须连续**，页面按编号顺序读取，遇到断号会停止；
- 每个文章文件**必须以 `---` front-matter 开头**（照抄上面的模板即可），否则会被忽略，视为文章列表结束；
- 若删除中间某篇文章，请把后面的文件重新连续编号。

### 冗余回退：直接填 JavaScript（data.js）

网站部署或使用本地服务器访问时，页面优先读取 Markdown 文件。如果**直接双击打开页面**（`file://` 协议），浏览器禁止读取文件，此时页面会自动回退到 `data.js` 中的 `window.SPECIAL_ARTICLES`。两种方式内容应保持一致：

- 正常维护时**只改 Markdown 文件即可**；
- 如需同步回退数据，打开 `sub/special-sub/data.js`，在 `window.SPECIAL_ARTICLES` 数组末尾照着已有格式添加一条：

```javascript
{ title: "新文章标题", url: "https://mp.weixin.qq.com/s/文章链接" }
```

- `title`、`url` 的含义与 Markdown 中的字段相同；没有链接的纯文字条目把 `url` 留空（`""`）；
- 修改了 Markdown 后请同步更新这里，保持两者一致。

### 特别文章 PDF 下载区

特别文章的 PDF 下载入口在首页「特别文章」版块，与首页「下载」区的 PDF 版本卡片一致：

- PDF 文件放在 `files/` 目录；
- 新增 PDF 时，在首页该版块对应的 `ul.download-list` 中追加一行 `li` + `a href`（照抄已有条目格式即可，无需改 CSS 或 JavaScript）。
