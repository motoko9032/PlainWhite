# Fonts

This is the font vault of the PlainWhite Project. It provides TrueType
variable fonts for the project's own archival/print needs.

**The website no longer loads these files.** Web pages load their editorial
fonts exclusively from Google Fonts via `style/fonts-google.css`
(EB Garamond, Noto Sans SC, Noto Serif SC — `display=swap`), and installed
PWA modes use the platform UI typefaces. Keeping the TTF files out of the
page-loading path avoids shipping ~40 MB of Chinese fonts to every visitor.

## Contents

- `EBGaramond-{VariableFont,Italic-VariableFont}_wght.ttf` — Latin serif
- `NotoSerifSC-VariableFont_wght.ttf` — Chinese serif
- `NotoSansSC-VariableFont_wght.ttf` — Chinese sans

## Usage scope (平台字体范围)

| Runtime | Fonts |
| ------- | ----- |
| Website (desktop & mobile browsers) | Google Fonts: UI `Noto Sans SC` first (`--font-sans`); article reading pages `EB Garamond` + `Noto Serif SC` (`--font-serif`); unreachable → system fallback stacks |
| iOS standalone PWA | Apple system UI fonts only |
| Android standalone PWA | `system-ui` + `Roboto` |
| Desktop standalone PWA | Per-OS UI stacks (macOS system font / Windows Segoe UI / Linux system-ui) |

## Version

v.0.0.2 — local TTFs are no longer referenced by any page (Google Fonts only).
