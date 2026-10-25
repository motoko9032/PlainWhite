# PlainWhite (纯白)

A monthly comprehensive literary journal featuring poetry, fiction, essays, and fan fiction, independently maintained by the **White Cover** collective.

> This is another form of paper. It exists for the long term.

## About

**PlainWhite** is a literary exchange project centered on poetry, short stories, essays, and fan fiction. We do not chase traffic – we only present words and images that deserve to be seen.

- **Editorial team**: distributed nationwide, globally, and perhaps across the universe
- **Publication status**: inaugural issue (Re0) and Issue 2 (Bandori special) released

## Columns

| Column | Description |
|--------|-------------|
| **Fiction** | Short stories, excerpts from novellas, experimental narratives |
| **Poetry** | Modern poetry, classical Chinese poetry, prefaces to poems |
| **Essays** | Personal essays, travelogues, non-fiction narratives |
| **Fan Fiction** | BanG Dream! (Bandori), Girls Band Cry (GBC) |
| **Special Column – Short Poems** | “Many a little makes a mickle” |
| **Others** | For words that defy definition |

## Downloads

### PDF Version
Suitable for reading and printing.

- [PlainWhite Re0 (PDF)](./files/纯白-Re0.pdf)
- [PlainWhite Issue 2 – Bandori Special (PDF)](./files/纯白-第二期-邦多利特刊_副本.pdf)

### EPUB Version
Suitable for e-book readers.

- [PlainWhite Re0 (EPUB)](./files/纯白-Re0.epub)
- [PlainWhite Issue 2 – Bandori Special (EPUB)](./files/纯白-第二期-邦多利特刊_副本.epub)

### WeChat Originals
Per-issue links to the original WeChat article lists.

- [Issue 1 WeChat articles](./sub/WeChat/WeChatArticleList1.html)
- [Issue 2 WeChat articles](./sub/WeChat/WeChatArticleList2.html)
- [Issue 3 WeChat articles](./sub/WeChat/WeChatArticleList3.html)
- [Issue 4 WeChat articles](./sub/WeChat/WeChatArticleList4.html)

The article lists are maintained as Markdown files in [`sub/WeChat/`](./sub/WeChat/) (`wechat-article-NN.md`, one file per article) and rendered dynamically by JavaScript, with a JavaScript fallback in `sub/WeChat/data.js`. No HTML, CSS, or JS changes are needed to add articles — see [sub/README.md](./sub/README.md) for step-by-step instructions.

### LOFTER Originals
Per-issue pages linking directly to the original LOFTER articles.

- [Issue 1 LOFTER articles](./sub/LOFTER/LofterArticleList1.html)
- [Issue 2 LOFTER articles](./sub/LOFTER/LofterArticleList2.html)
- [Issue 3 LOFTER articles](./sub/LOFTER/LofterArticleList3.html)

The LOFTER lists work exactly like the WeChat lists: one Markdown file per article (`lofter-article-NN.md`) in [`sub/LOFTER/`](./sub/LOFTER/), rendered dynamically with a JavaScript fallback in `sub/LOFTER/data.js`. No HTML, CSS, or JS changes are needed to add articles — see [sub/README.md](./sub/README.md) for step-by-step instructions.

### White Cover Special Articles (特别文章专栏)

Standalone special articles published by the **White Cover** collective alongside the journal issues, with PDF downloads and WeChat originals only (no LOFTER, no EPUB).

- [Special Articles – WeChat originals](./sub/special-sub/SpecialArticleList.html)
- [秋风 (PDF)](./files/秋风-main_副本.pdf)

The special article list works exactly like the WeChat lists: one Markdown file per article (`special-article-NN.md`) in [`sub/special-sub/`](./sub/special-sub/), rendered dynamically with a JavaScript fallback in `sub/special-sub/data.js`. No HTML, CSS, or JS changes are needed to add articles. Special article PDFs live in [`files/`](./files/) and are linked from the homepage "特别文章" section with plain `li` + `a href` entries — see [sub/README.md](./sub/README.md) for step-by-step instructions.

## Announcements

The homepage announcement section is maintained independently in the [`announcements/`](./announcements/) directory.

To publish a new announcement, add a Markdown file named `announcement-NN.md` (continuous numbering, e.g. `announcement-04.md`) with a front matter block (`date`, `title`, `badge`) followed by the body text. The site picks it up automatically and appends it after the previous announcement — no HTML, CSS, or JS changes required.

The homepage shows only the latest **3** announcements. When more than 3 accumulate, the older ones are automatically moved to the separate [historical announcements page](./announcements/history/) (`announcements/history/` directory) and a "view all historical announcements" link appears at the bottom of the homepage announcement section. No file relocation is needed.

See [announcements/README.md](./announcements/README.md) for detailed instructions.

## Distribution

- **Online version**: freely distributed on the official website (CC license)
- **Print version**: no plans in the long term
- **Donations**: small donations are welcome; they do not affect content quality

## Support

You can support the project through small donations. All income and expenses are disclosed regularly.

## Thanks

Thanks to everyone who has contributed time and effort.

## Contact

For collaboration and submissions, please contact us via the submission mailboxes (**投稿邮箱（一）** `motoko9032@outlook.com` / **投稿邮箱（二）** `3087946949@qq.com`), reach out via the **White Cover** channels, or follow the **White Cover** official WeChat account for the latest updates.

The **来看看公众号** button in the contact section opens [`sub/WeChat/WeChatContact.html`](./sub/WeChat/WeChatContact.html), which shows the official account QR code and card. The navigation bar intentionally only links to the contact section on the homepage, not directly to this subpage.

The official account QR code is `files/白色封皮公众号.JPG`; the *下载公众号二维码* button links to that image. Replace the image file (or update the `<img src>` and the download `href`) to change the QR code.

## Fonts

Local variable fonts live in [`fonts/`](./fonts/) (the Chinese fonts are large, roughly 40 MB in total) and are declared in [`style/fonts-local.css`](./style/fonts-local.css). [`script/script.js`](./script/script.js) measures the full page load time — including `document.fonts.ready` — and when it exceeds **3000 ms**, it switches to the Google Fonts `@import` stylesheet in [`style/fonts-google.css`](./style/fonts-google.css) instead of the local font files. The choice is stored in `sessionStorage` so the rest of the session uses the same font source.

[`script/font-loader.js`](./script/font-loader.js) runs in each page's `<head>` and loads only the chosen font stylesheet, so once Google Fonts mode is active, the large local font files are no longer requested. If the remote stylesheet cannot be loaded within 10 seconds, the loader falls back to the local fonts.

## Site Structure

| Path | Purpose |
| ---- | ------- |
| `index.html` | Homepage |
| `style/style.css` | All styles for the site |
| `style/fonts-local.css` | Local `@font-face` declarations (default font source) |
| `style/fonts-google.css` | Google Fonts `@import` fallback, loaded when page load is slow |
| `script/font-loader.js` | Loads the chosen font stylesheet early in `<head>` |
| `script/script.js` | Interactions, announcement rendering, and font-loading strategy |
| `script/wechat-articles.js` | Dynamic rendering of per-issue WeChat article lists |
| `script/lofter-articles.js` | Dynamic rendering of per-issue LOFTER article lists |
| `script/special-articles.js` | Dynamic rendering of the White Cover special articles list |
| `announcements/` | Announcement Markdown files, auto-rendered on the homepage |
| `announcements/history/` | Historical announcements page (auto-archived announcements older than the latest 3) |
| `files/` | Issue files (PDF / EPUB) and the official account QR code |
| `sub/WeChat/` | WeChat article list pages, the official account contact page, Markdown article files, and `data.js` fallback |
| `sub/LOFTER/` | LOFTER article list pages, Markdown article files, and `data.js` fallback |
| `sub/special-sub/` | White Cover special articles list page, Markdown article files, and `data.js` fallback |
| `sub/README.md` | Shared maintenance instructions for all sub-directories |
| `fonts/` | Local webfonts |
| `Common Manual/` | Common editorial manual (LaTeX source) |

## License

Online content is released under the [Creative Commons Attribution-NonCommercial (CC BY-NC)](https://creativecommons.org/licenses/by-nc/4.0/) license.
