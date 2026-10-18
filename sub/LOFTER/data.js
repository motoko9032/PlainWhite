/* ============================================
   纯白 — LOFTER 原文数据（冗余回退数据源）

   网站部署或使用本地服务器访问时，各期 LOFTER 原文列表页
   优先读取本目录下的 lofter-article-01.md、
   lofter-article-02.md …… 等 Markdown 文件；
   仅当直接双击打开页面（file:// 协议）导致无法读取
   Markdown 时才使用本文件。

   新增文章请优先添加 .md 文件（参见 sub/README.md）；
   若修改了 .md，请同步更新这里的内容，保持两者一致。

   字段说明：
   - issue：期号，对应 LofterArticleList1.html（1）、
     LofterArticleList2.html（2）……
   - title：文章标题，显示在列表中
   - url：LOFTER 文章链接；没有链接的纯文字条目留空 ""
   ============================================ */
window.LOFTER_ARTICLES = [];
