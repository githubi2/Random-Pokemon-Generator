# AGENTS.md — Random Pokemon Generator 项目规则

> **本项目以 SEO 为核心目标。** 所有代码、内容、UI 改动必须围绕 SEO 展开；
> 当任何直觉/便利与 SEO 冲突时，**SEO 优先**。此文件对所有 AI 工具（Hermes / Codex / Claude 等）生效。

---

## 1. 硬性 SEO 规则（不可违反）

1. **canonical**：一律指向 `https://www.random-pokemon-generator.co/...`（带 www 前缀；子页为 `/nuzlocke-generator/`）。禁止无 www 版本。
2. **Title**：每页唯一、主词前置、尽量 ≤60 字符；`og:title` / `twitter:title` 必须与 `<title>` 完全同步。
3. **H1**：每页**恰好 1 个**，与目标词一致；标题层级 h1→h2→h3 不跳级。
4. **词数**：每页正文 ≥800 词（目标 900-1200）。
5. **JSON-LD**：每页必须有 `SoftwareApplication` + `FAQPage`（FAQPage 必须与页面可见 FAQ **逐条一致**）；子页另加 `BreadcrumbList`。所有 JSON-LD 必须可解析。
6. **OG/Twitter**：每页必须有 `og:image`（1200×630 绝对 www URL）+ `og:image:width/height` + `twitter:card: summary_large_image` + `twitter:image`；`og:url` 必须带 www；`og:title`/`twitter:title` 与 `<title>` 同步。分享图放页面同目录 `og-image.png`。
7. **锚文本**：链接锚文本必须用关键词变体（如 "Nuzlocke Team Builder" / "Pokemon team builder"），禁止 "click here" 类。
8. **内链**：页面间双向内链（导航 + 正文语境内链）；新页面必须与首页互链。
9. **sitemap.xml**：新页面必须加入（www URL + `lastmod` 当天）；禁止无 www 条目；robots.txt 的 `Sitemap:` 行保持指向 www sitemap。
10. **链接形式**：站内链接一律**目录形式**，**禁止在 href 中出现 `index.html`**（例：`nuzlocke-generator/`、`../`、`./`）——避免 Google 将 `xxx/index.html` 与 `xxx/` 视为两个 URL 造成重复页面。禁止 `href="/..."` 绝对路径。
11. **敏感字样**：禁止出现 "SEO-optimized"、"free" 等自曝/合规敏感措辞（历史决策：曾全站移除）。标题/描述/正文都不允许。

## 2. 内容规则

- 正文自然覆盖目标长尾词 + 变体，不关键词堆砌；事实数字必须准确（1025 物种、326 形态、18 属性、Gen 1-9）。
- 每个页面回答用户真实意图：工具功能、使用场景（Nuzlocke 玩法、分享、导出等）。
- 新增内容段落后同步检查词数与 H2/H3 结构。

## 3. 工程约定

- 纯静态 Vanilla JS（ES5 IIFE 风格，无构建步骤、无依赖）。
- **禁止原生 `alert` / `confirm` 弹窗**——一律使用全站自定义 modal 风格（`.modal-overlay` + `.modal` + 品牌按钮）。
- 移动端（≤760px）必须适配（汉堡导航、历史/列表紧凑布局）。
- **`vercel.json`**：新增页面目录后，必须在 `redirects` 加 `/{dir}/index.html → /{dir}/` 的 permanent 重定向，防止 Google 视两个 URL 为重复页面。
- 修改后必须验证：`node --check` JS、HTML 标签配对、canonical/词数/内链回归。
- 文件名/目录：子页面用目录形式（`nuzlocke-generator/index.html` → URL `/nuzlocke-generator/`）。

## 4. 上线流程

- 提交信息用英文、语义化；推送后 Vercel 自动部署。
- 上线后验证线上：curl 检查 title/canonical/sitemap 一致性。
- GSC 操作（人工）：sitemap 变更后重新提交 `https://www.random-pokemon-generator.co/sitemap.xml`。
