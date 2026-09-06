# SEO 关键词基线（Baseline）

> 建站以来全部页面的目标关键词与 On-page 现状快照。用途：排名追踪基线、新页规划参照、回归检查对照表。
> 快照日期：2026-09-06（站点共 15 页：11 工具页 + 博客列表 + 3 篇博客文章）。数据来源：各页面实际 HTML 提取，非记忆。

## 达标线（AGENTS.md）

- Title ≤ 60 字符，主词前置，og/twitter 三同步
- Description 100–160 字符
- 正文（`<main>`）≥ 800 词
- H1 恰好 1 个，含完整目标关键词
- 每页 JSON-LD：SoftwareApplication + FAQPage（+ 子页 BreadcrumbList）
- 10×10 正文互链矩阵闭环（新页上线后 11×11）

## 页面清单

| # | URL | 目标关键词 | Title（长度） | H1 | Desc 长度 | 正文词数 | 类型 |
|---|-----|-----------|--------------|-----|----------|---------|------|
| 1 | `/` | random pokemon generator | Random Pokemon Generator - Team Builder (Gen 1-9)（49） | Random Pokemon Generator | 145 | 1598 | 工具 |
| 2 | `/nuzlocke-generator/` | nuzlocke generator | Nuzlocke Generator - Pokemon Team Builder（41） | Nuzlocke Generator & Team Builder | 140 | 1620 | 工具 |
| 3 | `/pokemon-smash-or-pass/` | pokemon smash or pass | Pokemon Smash or Pass – Judge 1,025 Pokémon & Share Your Score（62）⚠️ | Pokemon Smash or Pass | 156 | 1486 | 游戏 |
| 4 | `/pokemon-team-picker/` | pokemon team picker | Pokemon Team Picker – Build a 6-Pokémon Squad with Type Matchups（64）⚠️ | Pokemon Team Picker | 133 | 1363 | 工具 |
| 5 | `/random-mega-pokemon-generator/` | random mega pokemon generator | Random Mega Pokemon Generator – Every Mega Evolution, Stat Gains Included（73）⚠️ | Random Mega Pokemon Generator | 155 | 1679 | 工具 |
| 6 | `/random-pokemon-generator-wheel/` | pokemon wheel spinner ⚠️ | Pokemon Wheel Spinner - Random Pokemon Generator Wheel（54） | Pokemon Wheel Spinner | 158 | 1417 | 工具 |
| 7 | `/random-pokemon-name-generator/` | random pokemon name generator | Random Pokemon Name Generator - Pokemon Nickname Ideas（54） | Random Pokemon Name Generator | 141 | 1329 | 工具 |
| 8 | `/random-shiny-pokemon-generator/` | random shiny pokemon generator | Random Shiny Pokemon Generator - Shiny Pokemon Picker（53） | Random Shiny Pokemon Generator | 144 | 1889 | 工具 |
| 9 | `/whos-that-pokemon/` | who's that pokemon | Who's That Pokemon - Guess the Pokemon Game（43） | Who's That Pokemon | 156 | 1411 | 游戏 |
| 10 | `/pokemon-shiny-odds/` | pokemon shiny odds | Pokemon Shiny Odds: Complete Shiny Rates & Chances（54） | Pokemon Shiny Odds & Rates — Every Method Explained | 142 | 1745 | 内容+工具 |
| 11 | `/pokemon-nature-chart/` | pokemon nature chart | Pokemon Nature Chart – All 25 Natures & Stat Effects（52） | Pokemon Nature Chart | 150 | 1518 | 内容+工具 |
| 12 | `/blog/` | pokemon blog（枢纽页） | Pokemon Blog — Guides, Odds & Strategy（38） | Random Pokemon Generator Blog | 156 | 920 | 博客列表 |
| 13 | `/blog/shiny-odds-explained/` | pokemon shiny odds explained | Pokemon Shiny Odds Explained: 1/8192 to 1/512（45） | Pokemon Shiny Odds Explained | 134 | 1271 | 博客文章 |
| 14 | `/blog/pokemon-smash-or-pass-tier-list/` | pokemon smash or pass tier list | Pokemon Smash or Pass Tier List: The Ultimate Ranking（53） | Pokemon Smash or Pass Tier List | 157 | 1216 | 博客文章 |
| 15 | `/blog/what-is-a-nuzlocke-challenge/` | what is nuzlocke | What Is a Nuzlocke Challenge? Rules & Beginner Tips（55） | What Is a Nuzlocke Challenge? | 154 | 1298 | 博客文章 |

## 备注

- ⚠️ **#6 wheel 页**：URL slug（`random-pokemon-generator-wheel/`）与目标关键词（`pokemon wheel spinner`）不一致，是 commit `16a1f93` 的**有意重定向**——URL 已上线不能轻易改，关键词重定到搜索意图更好的 "pokemon wheel spinner"。属规则第 7 条的已知例外，勿"修复"回退。
- ⚠️ **#3/#4/#5 Title 超 60 字符（62/64/73）**：2026-09-05 P0 CTR 改造实验（三页排名 7.7-9.7、CTR 0-1.7%），刻意用长标题塞卖点钩子，违反规则 2 的 ≤60 软线属**有意为之**。验证口径：改后 1 周 GSC 看 CTR（team-picker 0%→≥2%、smash 1.7%→≥3%、mega 首次点击）；无效则回退到 ≤60 版本。#4 team-picker 的 H1 同步去掉 "& Generator"。#5 mega 已备 60 字符回退版：`Random Mega Pokemon Generator – Every Mega Evolution + Stat Gains`（丢 "Included" 填充词，桌面端完整显示）——CTR 仍为 0% 时切换。
- **首页 FAQ 区**（2026-09-05）：`<h2>` 前新增 `p.faq-intro` 段落覆盖 `pokemon random pokemon generator` / `random generator pokemon` 两个变体词（GSC 各 47-49 名），不改 Title。
- **#10 shiny odds 页**：内容页 + 交互计算器混合体，承接 `pokemon shiny odds` / `shiny odds` / `chance of shiny pokemon` 意图；明确不做 `full odds shiny` 单页（KD 过高）。
- **#11 nature chart 页**（2026-09-05 上线）：SERP 实查确认 `pokemon nature chart` 意图 = 性格（25 natures ±10%），非属性克制——属性克制矩阵/双属性计算器**刻意不做进本页**，留给未来 `/pokemon-type-chart/` 避免自相残杀；本页差异化 = 可筛选/排序交互表 + 按宝可梦推荐性格（读 base stats，含 Trick Room 低速例外）。选型依据：KD 25.5 容易、月搜 40.5K、前十有 DR 1/DR 2 弱站（crob.at #2）。
- 全部 15 页当前快照均达达标线（title/desc/词数/H1/JSON-LD/互链）。
- **#12/#13 博客区**（2026-09-06 上线）：博客页 JSON-LD 用 `Blog`/`BlogPosting`（非 SoftwareApplication/FAQPage——文章页无 FAQ 区，按规则"FAQPage 必须与可见 FAQ 一致"自然不适用）；正文互链矩阵对博客页的口径 = 博客页正文链全部工具页+互链，工具页 nav/footer 链 `/blog/`、正文在相关页（首页/shiny-odds/shiny-generator）链到文章。用户原标题 71 字符超 60 硬线，落地为 45 字符版。
- **#14/#15 博客 Week 2**（2026-09-06 上线）：#14 承接 GSC 主线 2（smash or pass 排名 7.1 但 CTR 低，导流补 CTR），#15 承接主线 3（nuzlocke 位置 18.3 有潜力，攻 "what is nuzlocke" 头部词）。同日 #13/#14/#15 三篇按外部评审意见二次去 AI 味：删伪造第一人称经历、过渡短语每篇 ≤1、金句每篇 ≤2、段落长短交错、CTA 每篇只留 1 个且融入正文（#13 的 "Calculate Your Own" 独立节已并入 Shiny Charm 节尾，generator 二次推广删除）、数据加来源感（Bulbapedia / 游戏代码 / 社区实测标注）。新增数学事实已用脚本复核（50%@5,678 / 90%@18,862 / at-N 63.2%）。

## Description 存档（压缩改写留痕）

- #3 smash-or-pass（2026-09-05 P0）：`Smash or pass every Pokémon from Gen 1-9. Build your verdict list, track your smash rate, and share your score — filter by type, Gen, or region. No sign-up.`（156）
- #4 team-picker（2026-09-05 P0）：`Pick six Pokémon, check your team's defensive matchups, and export to Showdown. Search 1,025 Pokémon by type, Gen, move, and ability.`（133）—— 方案原文尾部 "— all free" 违反规则 12（禁 "free"），已剔除。
- #5 mega（2026-09-05 P0）：`Roll any Mega Evolution — see stat gains over the base form, abilities, and full type matchups. Filter by Gen, type, or rarity. Shiny toggle on every card.`（155）
- #4 team-picker：`Build a competitive squad with this Pokemon team picker and generator: six slots, type matchups, moves and items. Filter 1,025 Pokemon and export to Showdown.`（158）
- #6 wheel：`Spin a Pokemon wheel spinner for a random pick: Gen 1-9 and type filters, instant draws, shareable results. Part of the Random Pokemon Generator Wheel family.`（158）
- #8 shiny：`Random shiny pokemon generator — roll shiny Pokemon from Gen 1–9 with generation, type, rarity and BST filters, plus a shiny-vs-regular compare.`（144）

## 追踪建议

- GSC 里按页面分组监控各自主词的 impressions / clicks / 平均排名，每月对照本表。
- 新页上线后追加到本表，并把目标词从 AGENTS.md §5 候选池移出标记为已做。

## 锚文本轮换表（2026-09-07 P0，哥飞「内链锚文本带语义」）

> 原则：锚文本带描述/动作语义，不做清一色产品名；与首页 title 的 "Team Builder" 拉开的区分度（警惕谷歌把 team builder/team picker 混为一谈、子页词被算到首页）。

| 目标页 | 锚文本变体（轮换使用，禁全站同款） |
|---|---|
| pokemon-team-picker/ | Pokemon Team Picker / pokemon team builder / hand-pick a 6 Pokémon squad |
| pokemon-smash-or-pass/ | Pokemon Smash or Pass / smash or pass game / judge each Pokémon |

**当前落地（首页 How It Works 正文内链）**：
- article #1「Roll with real rules」→ smash-or-pass：`judge every Pokémon one verdict at a time with the Pokemon smash or pass game`（动作语义锚文本，2026-09-07）
- article #2「Filter down to the exact pool」→ team-picker：`hand-pick six Pokémon with the pokemon team picker`（动作语义锚文本，2026-09-07）
- article #4「Instant tactical report」→ team-picker：`Pokemon Team Picker`（产品名变体，保留）

## 2026-09-07 全站整改（P0/P1）

- **P0 whos-that-pokemon**（27,100 + 65 分）：Title → `Who's That Pokemon Game - Guess The Pokemon`（43，去稀释词）；H1 完整命中；lede 补完整词组（前 100 词点题）；正文字段计数 9 次。
- **P1 wheel**（95 分）：H1 → `Random Pokemon Generator Wheel`（完整词组）；lede + How It Works 正文补 `random pokemon wheel`（正文 2 次）。
- **P1 mega**：Title → `Random Mega Pokemon Generator – Every Mega & Stats`（50，≤60 达标；原 73 超线）。
- **P1 跳级**：实测全站 18 页无 h1→h3 跳级（严格口径 ascent≤1 全部通过；team-picker 上次已修）。体检「nuzlocke/wheel 等也跳级」与实测不符——未改动。
- **P2**（未动，留档）：博客 3 篇 H2/H3 命中低（权重低可后置）；random-shiny 1998 词 / pokemon-shiny-odds 1848 词略超 1800（不致命，勿稀释）。
