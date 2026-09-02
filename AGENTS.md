# AGENTS.md — Random Pokemon Generator 项目规则（Kimi 版）

> **本项目以 SEO 为核心目标。** 所有代码、内容、UI 改动必须围绕 SEO 展开；
> 当任何直觉/便利与 SEO 冲突时，**SEO 优先**。
> 此文件为 **Kimi（本 AI 助手）的项目规则**，由 Hermes 项目规则平移而来，内容完全继承；
> 后续本项目所有开发工作（新页面、改动、上线）均由 Kimi 严格按照本规则执行。

---

## 1. 硬性 SEO 规则（不可违反）

1. **canonical**：一律指向 `https://www.random-pokemon-generator.co/...`（带 www 前缀；子页为 `/nuzlocke-generator/`）。禁止无 www 版本。
2. **Title**：每页唯一、**主词前置**、尽量 ≤60 字符；`og:title` / `twitter:title` 必须与 `<title>` 完全同步。标题可用完整关键词 + 简短副标题（例：`Random Pokemon Generator Wheel - Pokemon Spinner`）。
3. **H1**：每页**恰好 1 个**，必须用**完整目标关键词**（如 `Random Pokemon Generator Wheel`，禁止写 `Pokemon Wheel`）；标题层级 h1→h2→h3 不跳级。所有标题性元素（FAQ H2、How It Works H2）同样用完整关键词。
4. **词数**：每页正文 ≥800 词（目标 900-1200）；新页必须达标后才可提交。
5. **JSON-LD**：每页必须有 `SoftwareApplication` + `FAQPage`（FAQPage 必须与页面可见 FAQ **逐条一致**）；子页另加 `BreadcrumbList`。JSON-LD 的 `name` 必须与完整关键词一致（*不是*短变体）。所有 JSON-LD 必须可解析。
6. **OG/Twitter**：每页必须有 `og:image`（1200×630 绝对 www URL，放页面同目录 `og-image.png`）+ `og:image:width/height` + `twitter:card: summary_large_image` + `twitter:image`；`og:url` 必须带 www。
7. **URL slug 关键词化**：新页面目录名 = **完整目标关键词**（例：`pokemon-smash-or-pass/`、`random-pokemon-generator-wheel/`），**绝不省略关键词中的词**（`smash-or-pass/`、`pokemon-wheel/` ❌）。URL = Title 主词 = H1。
8. **锚文本完整关键词化**：所有引用点（nav、footer、正文语境内链、JSON-LD name、Breadcrumb name）的锚文本必须用**完整关键词**；禁止短变体锚文本（`Pokemon Wheel` ❌ → `Random Pokemon Generator Wheel` ✅）。关键词变体（如中长形式）只允许在**正文叙述**中自然出现，不允许作为锚文本。
9. **内链闭环**：**每个页面必须引用站内所有其他页面**（4×4 矩阵），三层引用：nav + footer + 正文语境内链（锚文本用关键词）。新增页面必须同步更新全部既有页面的 nav/footer/正文内链。
10. **sitemap.xml**：新页面必须加入（www URL + `lastmod` 当天，新增页用目录形式 URL）；禁止无 www 条目；robots.txt 的 `Sitemap:` 行保持指向 www sitemap。
11. **链接形式**：站内链接一律**目录形式**，**禁止在 href 中出现 `index.html`**（例：`nuzlocke-generator/`、`../`、`./`）——避免 Google 将 `xxx/index.html` 与 `xxx/` 视为两个 URL 造成重复页面。禁止 `href="/..."` 绝对路径。
12. **敏感字样**：禁止出现 "SEO-optimized"、"free" 等自曝/合规敏感措辞（历史决策：曾全站移除）。标题/描述/正文都不允许。

## 2. 内容规则

- **全站纯英文项目**：所有写入页面的内容一律使用英文——UI 文案、标题、正文、按钮、弹窗、alt、JSON-LD、og 描述等无一例外。用户（所有者）用中文描述需求或提供素材时，必须先翻译/改写为地道英文再落进页面；中文只允许出现在与所有者的对话中，绝不出现在站点代码与文案里。
- 正文自然覆盖目标长尾词 + 变体，不关键词堆砌；事实数字必须准确（1025 物种、326 形态、18 属性、Gen 1-9）。
- 每个页面回答用户真实意图：工具功能、使用场景、玩法（Nuzlocke、smash or pass、wheel 转盘等）。
- 新增内容段落后同步检查词数与 H2/H3 结构（标题性文字用完整关键词）。
- 正文内链放语境内（自然句子里嵌关键词锚文本），不单独堆链接行。

## 3. 工程约定

- 纯静态 Vanilla JS（ES5 IIFE 风格，无构建步骤、无依赖）。
- **禁止原生 `alert` / `confirm` / `prompt`（除非剪贴板兜底）**——一律使用全站自定义 modal 风格（`.modal-overlay` + `.modal` + 品牌按钮）。新页面交互同理。
- **ES5 陷阱**：禁止函数名与局部变量同名（`var pool = pool();` 类 var 提升遮蔽会导致 TypeError——已踩过）。
- **hero 区规范**：hero 只保留 eyebrow + H1 + lede，**不放 CTA 按钮**（工具入口在工具面板内，避免重复入口）；与既有页面视觉一致。
- 移动端（≤760px）必须适配（汉堡导航、历史/列表紧凑布局；nav 6 项完整关键词在桌面可用、移动端折叠）。
- **`vercel.json`**：新增页面目录后，必须在 `redirects` 加 `/{dir}/index.html → /{dir}/` 的 permanent 重定向。
- 修改后必须验证：`node --check` JS、HTML 标签配对、canonical/词数/内链矩阵/JSON-LD 回归（用 `kimi-verify-` 前缀临时脚本，跑完即删）。
- 文件名/目录：子页面用目录形式（`pokemon-smash-or-pass/index.html` → URL `/pokemon-smash-or-pass/`）。

## 4. 上线流程（新页面清单）

1. 页面文件 + JS + `og-image.png`（1200×630 同目录）
2. `sitemap.xml` 加新 URL（www + lastmod 当天）
3. `vercel.json` 加 `/{dir}/index.html → /{dir}/` 永久重定向
4. **全部既有页面**更新 nav + footer + 正文内链（新页关键词锚文本）
5. JSON-LD ×3（SoftwareApplication / FAQPage 一致 / BreadcrumbList）
6. `<title>`/`og:title`/`twitter:title` 三同步 + description 100-170 字符
7. 正文 ≥800 词 + 内外链闭环
8. 移动端适配（汉堡导航、按钮触屏 ≥44px）
9. 禁原生弹窗（modal 风格）
10. 推送后验证：308 重定向 / og-image 200 / 页面 200 / GSC 提交

- 提交信息用英文、语义化；推送后 Vercel 自动部署。
- 上线后验证线上：curl 检查 title/canonical/sitemap/重定向一致性。
- GSC 操作（人工）：sitemap 变更后重新提交 `https://www.random-pokemon-generator.co/sitemap.xml`。
