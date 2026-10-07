/* ============================================
   纯白 — 公众号原文数据（冗余回退数据源）

   网站部署或使用本地服务器访问时，各期公众号原文列表页
   优先读取本目录下的 wechat-article-01.md、
   wechat-article-02.md …… 等 Markdown 文件；
   仅当直接双击打开页面（file:// 协议）导致无法读取
   Markdown 时才使用本文件。

   新增文章请优先添加 .md 文件（参见 sub/README.md）；
   若修改了 .md，请同步更新这里的内容，保持两者一致。

   字段说明：
   - issue：期号，对应 WeChatArticleList1.html（1）、
     WeChatArticleList2.html（2）……
   - title：文章标题，显示在列表中
   - url：公众号文章链接；没有链接的纯文字条目留空 ""
   ============================================ */
window.WECHAT_ARTICLES = [
    {
        issue: "1",
        title: "千早爱音变成舞萌痴了？！",
        url: "https://mp.weixin.qq.com/s/daaY_SfnJ6OM5LTJfVKygQ"
    },
    {
        issue: "1",
        title: "冯青诗二首",
        url: "https://mp.weixin.qq.com/s/ntVuaJxT9SNrTwbZX3fKNQ"
    },
    {
        issue: "1",
        title: "黑铁诗一首",
        url: "https://mp.weixin.qq.com/s/IxqKNM-T6vAV0Wod3LiwkQ"
    },
    {
        issue: "2",
        title: "长崎素世与清醒梦",
        url: "https://mp.weixin.qq.com/s/VMHw8WXkmoVUa9VmcgJCSg"
    },
    {
        issue: "2",
        title: "昨日恐惧症",
        url: "https://mp.weixin.qq.com/s/skn8VuNQxJfvHVG988H5LA"
    },
    {
        issue: "2",
        title: "丰川逃避行",
        url: "https://mp.weixin.qq.com/s/ikDSjm5grDaRYZXcrfv-YA"
    },
    {
        issue: "2",
        title: "幽冥的心",
        url: "https://mp.weixin.qq.com/s/VwjpUXe55RC3Ed4yrb7Ljg"
    },
    {
        issue: "2",
        title: "《草莓抹茶》是纯白的邦多利特刊独占篇目。",
        url: ""
    },
    {
        issue: "3",
        title: "爱灯｜美焚我",
        url: "https://mp.weixin.qq.com/s/AlmyNK4Eh9XYv7QmOpyDaA"
    },
    {
        issue: "4",
        title: "浴室｜天花板",
        url: "https://mp.weixin.qq.com/s/HNW5mhohm6Tjr3jPibFGvA"
    },
    {
        issue: "4",
        title: "宿醉的人",
        url: "https://mp.weixin.qq.com/s/9bdayHoDJLDKrmeT-BMY8g"
    },
    {
        issue: "4",
        title: "白花",
        url: "https://mp.weixin.qq.com/s/8107q-y-skmqAFWHLW8Okw"
    }
];

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
