# Common Manual

本目录保存《纯白通用工作手册》的 LaTeX 源码、发布版 PDF 与发布压缩包。它是手册材料，不是网站运行时代码。

## 目录结构

```text
Common Manual/
├── README.md          # 本文件
├── CommonMan.tex      # 手册 LaTeX 源码
├── CommonMan.pdf      # 手册发布版
├── CommonMan.zip      # 源码、说明和 PDF 的发布压缩包
└── build/
    ├── .gitignore     # 忽略本地 LaTeX 构建产物
    └── [aux、log、toc、xdv、fls、fdb_latexmk 等临时文件]
```

仓库根目录另保留一份 `CommonMan.pdf` 作为网站发布下载文件。更新手册时，应同步更新本目录和仓库根目录中的 PDF；其他网站代码和内容不属于本手册构建流程。

## 编译与发布

在仓库根目录运行：

```bash
mkdir -p "Common Manual/build"
latexmk -xelatex -outdir="Common Manual/build" -interaction=nonstopmode "Common Manual/CommonMan.tex"
cp "Common Manual/build/CommonMan.pdf" "Common Manual/CommonMan.pdf"
cp "Common Manual/CommonMan.pdf" CommonMan.pdf
```

`latexmk` 会根据交叉引用自动重复编译，使目录页码更新。编译工具要求 XeLaTeX、`ctexrep` 与 `latexmk`；本手册使用 `fontset=fandol`。

更新压缩包时，从本目录运行以下命令；压缩包只包含可分发的源码、说明与 PDF，不包含编译缓存：

```bash
zip -j -q CommonMan.new.zip README.md CommonMan.tex CommonMan.pdf
mv CommonMan.new.zip CommonMan.zip
```

完成后检查 `CommonMan.pdf` 与 `CommonMan.zip` 均已更新，再将手册相关文件纳入提交。
