# SEO 关键词基线（Baseline）

> 建站以来全部页面的目标关键词与 On-page 现状快照。用途：排名追踪基线、新页规划参照、回归检查对照表。
> 快照日期：2026-09-03（站点共 10 页）。数据来源：各页面实际 HTML 提取，非记忆。

## 达标线（AGENTS.md）

- Title ≤ 60 字符，主词前置，og/twitter 三同步
- Description 100–160 字符
- 正文（`<main>`）≥ 800 词
- H1 恰好 1 个，含完整目标关键词
- 每页 JSON-LD：SoftwareApplication + FAQPage（+ 子页 BreadcrumbList）
- 10×10 正文互链矩阵闭环

## 页面清单

| # | URL | 目标关键词 | Title（长度） | H1 | Desc 长度 | 正文词数 | 类型 |
|---|-----|-----------|--------------|-----|----------|---------|------|
| 1 | `/` | random pokemon generator | Random Pokemon Generator - Team Builder (Gen 1-9)（49） | Random Pokemon Generator | 145 | 1598 | 工具 |
| 2 | `/nuzlocke-generator/` | nuzlocke generator | Nuzlocke Generator - Pokemon Team Builder（41） | Nuzlocke Generator & Team Builder | 140 | 1620 | 工具 |
| 3 | `/pokemon-smash-or-pass/` | pokemon smash or pass | Pokemon Smash or Pass - Random Pokemon Game（43） | Pokemon Smash or Pass | 131 | 1486 | 游戏 |
| 4 | `/pokemon-team-picker/` | pokemon team picker | Pokemon Team Picker & Generator（31） | Pokemon Team Picker & Generator | 158 | 1363 | 工具 |
| 5 | `/random-mega-pokemon-generator/` | random mega pokemon generator | Random Mega Pokemon Generator - Mega Evolution Picker（53） | Random Mega Pokemon Generator | 131 | 1679 | 工具 |
| 6 | `/random-pokemon-generator-wheel/` | pokemon wheel spinner ⚠️ | Pokemon Wheel Spinner - Random Pokemon Generator Wheel（54） | Pokemon Wheel Spinner | 158 | 1417 | 工具 |
| 7 | `/random-pokemon-name-generator/` | random pokemon name generator | Random Pokemon Name Generator - Pokemon Nickname Ideas（54） | Random Pokemon Name Generator | 141 | 1329 | 工具 |
| 8 | `/random-shiny-pokemon-generator/` | random shiny pokemon generator | Random Shiny Pokemon Generator - Shiny Pokemon Picker（53） | Random Shiny Pokemon Generator | 144 | 1889 | 工具 |
| 9 | `/whos-that-pokemon/` | who's that pokemon | Who's That Pokemon - Guess the Pokemon Game（43） | Who's That Pokemon | 156 | 1411 | 游戏 |
| 10 | `/pokemon-shiny-odds/` | pokemon shiny odds | Pokemon Shiny Odds: Complete Shiny Rates & Chances（54） | Pokemon Shiny Odds & Rates — Every Method Explained | 142 | 1745 | 内容+工具 |

## 备注

- ⚠️ **#6 wheel 页**：URL slug（`random-pokemon-generator-wheel/`）与目标关键词（`pokemon wheel spinner`）不一致，是 commit `16a1f93` 的**有意重定向**——URL 已上线不能轻易改，关键词重定到搜索意图更好的 "pokemon wheel spinner"。属规则第 7 条的已知例外，勿"修复"回退。
- **#10 shiny odds 页**：内容页 + 交互计算器混合体，承接 `pokemon shiny odds` / `shiny odds` / `chance of shiny pokemon` 意图；明确不做 `full odds shiny` 单页（KD 过高）。
- 全部 10 页当前快照均达达标线（title/desc/词数/H1/JSON-LD/互链）。

## Description 存档（压缩改写留痕）

- #4 team-picker：`Build a competitive squad with this Pokemon team picker and generator: six slots, type matchups, moves and items. Filter 1,025 Pokemon and export to Showdown.`（158）
- #6 wheel：`Spin a Pokemon wheel spinner for a random pick: Gen 1-9 and type filters, instant draws, shareable results. Part of the Random Pokemon Generator Wheel family.`（158）
- #8 shiny：`Random shiny pokemon generator — roll shiny Pokemon from Gen 1–9 with generation, type, rarity and BST filters, plus a shiny-vs-regular compare.`（144）

## 追踪建议

- GSC 里按页面分组监控各自主词的 impressions / clicks / 平均排名，每月对照本表。
- 新页上线后追加到本表，并把目标词从 AGENTS.md §5 候选池移出标记为已做。
