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

- [Issue 1 WeChat articles](./sub/WeChatArticleList1.html)
- [Issue 2 WeChat articles](./sub/WeChatArticleList2.html)
- [Issue 3 WeChat articles](./sub/WeChatArticleList3.html)
- [Issue 4 WeChat articles](./sub/WeChatArticleList4.html)

The article lists are maintained as Markdown files in [`sub/`](./sub/) (`wechat-article-NN.md`, one file per article) and rendered dynamically by JavaScript, with a JavaScript fallback in `sub/data.js`. No HTML, CSS, or JS changes are needed to add articles — see [sub/README.md](./sub/README.md) for step-by-step instructions.

### LOFTER Originals
Per-issue pages linking directly to the original LOFTER articles.

- [Issue 1 LOFTER articles](./sub/LofterArticleList1.html)
- [Issue 2 LOFTER articles](./sub/LofterArticleList2.html)
- [Issue 3 LOFTER articles](./sub/LofterArticleList3.html)
- [Issue 4 LOFTER articles](./sub/LofterArticleList4.html)

The LOFTER lists work exactly like the WeChat lists: one Markdown file per article (`lofter-article-NN.md`) in [`sub/`](./sub/), rendered dynamically with a JavaScript fallback in `sub/data.js`. No HTML, CSS, or JS changes are needed to add articles — see [sub/README.md](./sub/README.md) for step-by-step instructions.

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

For collaboration and submissions, please reach out via the **White Cover** channels or follow the **White Cover** official WeChat account for the latest updates.

## Site Structure

| Path | Purpose |
| ---- | ------- |
| `index.html` | Homepage |
| `style/style.css` | All styles for the site |
| `script/script.js` | Interactions and announcement rendering |
| `script/wechat-articles.js` | Dynamic rendering of per-issue WeChat article lists |
| `script/lofter-articles.js` | Dynamic rendering of per-issue LOFTER article lists |
| `announcements/` | Announcement Markdown files, auto-rendered on the homepage |
| `announcements/history/` | Historical announcements page (auto-archived announcements older than the latest 3) |
| `files/` | Issue files (PDF / EPUB) |
| `sub/` | WeChat and LOFTER article list pages; lists are maintained via Markdown files (`wechat-article-NN.md` / `lofter-article-NN.md`) with a `data.js` fallback |
| `fonts/` | Local webfonts |
| `Common Manual/` | Common editorial manual (LaTeX source) |

## License

Online content is released under the [Creative Commons Attribution-NonCommercial (CC BY-NC)](https://creativecommons.org/licenses/by-nc/4.0/) license.
