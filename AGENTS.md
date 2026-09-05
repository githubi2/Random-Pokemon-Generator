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
9. **内链闭环**：**每个页面必须引用站内所有其他页面**，三层引用缺一不可：nav + footer + **正文语境内链**（锚文本用关键词）。正文互链的判定口径：在剔除 `<script>/<style>` 后的 `<main>` 可见内容里，必须存在指向**其余每一个页面**的至少 1 条语境内链（header logo、nav、footer 里的链接不计入正文层）。新增页面必须同步更新全部既有页面的 nav/footer/正文内链，并在提交前用脚本验证 N×N 正文矩阵无缺口。
10. **sitemap.xml**：新页面必须加入（www URL + `lastmod` 当天，新增页用目录形式 URL）；禁止无 www 条目；robots.txt 的 `Sitemap:` 行保持指向 www sitemap。
11. **链接形式**：站内链接一律**目录形式**，**禁止在 href 中出现 `index.html`**（例：`nuzlocke-generator/`、`../`、`./`）——避免 Google 将 `xxx/index.html` 与 `xxx/` 视为两个 URL 造成重复页面。禁止 `href="/..."` 绝对路径。
12. **敏感字样**：禁止出现 "SEO-optimized"、"free" 等自曝/合规敏感措辞（历史决策：曾全站移除）。标题/描述/正文都不允许。

## 2. 内容规则

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
6. `<title>`/`og:title`/`twitter:title` 三同步 + description **100-160 字符**（160 是 SERP 截断硬线，不是 170；mega 页与 name 页曾因 160+ 被点名。写法：完整关键词开头命中 + 只保留最核心差异化卖点，尾部功能罗列宁删勿超）
7. 正文 ≥800 词 + 内外链闭环；**正文软上限 ~1800 词**（超过不致命但会稀释主题，写正文时控制在 900-1700 区间；宁可句句扎实，不为凑数注水）
8. 移动端适配（汉堡导航、按钮触屏 ≥44px）
9. 禁原生弹窗（modal 风格）
10. **更新 README.md**：新页面必须同步进 README——"What's inside" 表格加一行（emoji + 页面名 + 主站绝对 URL dofollow 链接 + 一句话描述）+ 项目结构树补新目录；高优先级内容页另加独立小节介绍。README 是 GitHub 高权重域名指向全站子页的外链来源，漏更等于白丢外链。
11. 推送后验证：308 重定向 / **og-image 直接 curl 确认 200**（源码声明≠文件存在，分享封面 404 会白丢 Discord/Reddit/Twitter 的自然传播流量）/ 页面 200 / GSC 提交

- 提交信息用英文、语义化；推送后 Vercel 自动部署。
- 上线后验证线上：curl 检查 title/canonical/sitemap/重定向一致性。
- GSC 操作（人工）：sitemap 变更后重新提交 `https://www.random-pokemon-generator.co/sitemap.xml`。
- **FAQ 是金矿**：FAQ 里回答得扎实的"工具向搜索问题"（如 shiny 页的 "What are the odds of a real shiny Pokemon?" 覆盖 1/8192 → 1/4096 → Shiny Charm 1/1365 → Masuda 1/683 → 叠加 1/512）本身就是有搜索量的词。复盘时逐条审视 FAQ，凡能独立的都记入下方候选词清单。
- **内链姿势（已验证有效，继续保持）**：How It Works 收尾段 + footer 用精确锚文本把全站工具串成闭环。

## 5. 候选关键词池（复盘沉淀，未来可做独立页）

> 全站已上线页面的关键词基线见 `SEO-KEYWORDS.md`；新词上线后从本池移出并补进基线表。

- ~~`pokemon shiny odds` / `shiny odds`~~ —— ✅ 已上线：`/pokemon-shiny-odds/`（2026-09-03，内容页+交互计算器）。

### 2026-09-05 调研补充（SERP 实查，非工具估计）

- ~~`pokemon nature chart` / `pokemon natures`~~ —— ✅ 已上线：`/pokemon-nature-chart/`（2026-09-05，内容页+交互速查表+按宝可梦推荐性格）。上线依据（哥飞 KD 数据推翻原判断）：KD 25.5 容易、月搜 40.5K、前十有 crob.at DR 1 排 #2 / pokemoneros.com DR 2 排 #5，弱位可打。SERP 意图实查 = 性格（25 natures ±10%），**非属性克制**——属性克制内容刻意留给 type chart 页。
- ~~`birthday pokemon`~~ —— ❌ 放弃（KD 数据实锤，2026-09-05）：EMD 品牌站 birthdaypokemon.com（DR 39）卡 #1 享品牌位保护；可竞争位最弱对手 dragonflycave.com DR 52，DR=0 新站需 50~110 引用域预算；搜索量 27.1K→12.1K 走低（不排除 Pokémon Day 季节性，但前两条已足够否决）。原"WikiHow 缺口"判断作废。
- `pokemon type chart` —— 🥈 长线目标（非放弃）。月搜 201K、KD 37.2，但 #1 pokemondb DR 71 + #3 pkmn.help 强产品力镇守，201K 量级词 EEAT 门槛高。打法：先靠 nature chart 页攒流量外链把全站 DR 拉到 15~20，再做 `/pokemon-type-chart/`（18 属性克制矩阵 + 双属性计算器，内容与 nature 页零重叠）。
- `pokemon would you rather` —— ❌ 放弃（2026-09-05 实查：月搜仅 260、KD 52.3，投入产出灾难级；原"内容成本高"判断不变）。
- `pokemon fusion generator` —— ❌ 放弃。Semrush 实测美区 8.1K/月，但融合立绘无合规素材来源，纯前端无法实现。（KD 33、前十有 DR 2 弱站，数据上本可做，版权红线绕不过。）
- `full odds shiny` —— ❌ 放弃（KD 过高，pokemon.com / pokemondb / marriland 垄断，同 shiny odds 页备注结论）。
- `pokemon randomizer` —— ❌ 放弃。量虽大但意图是 ROM 修改器下载，与网页工具错配，高跳出。
