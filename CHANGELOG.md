# Changelog

## 2026-11-13 — 三个工具页的日文版

- 新增 `/ja/pokemon-type-coverage-calculator/`：ポケモン タイプ相性チェッカー（6匹の攻撃範囲・抜け・共通の弱点）
- 新增 `/ja/pokemon-go-cp-calculator/`：ポケモンGO CP計算ツール（レベルと個体値からCP・実数値・リーグ上限）
- 新增 `/ja/pokemon-breeding-calculator/`：ポケモン 卵相性チェッカー（預かり屋の組み合わせ・孵化歩数）
- 关键词按日文实际搜索说法定名：タイプ相性チェッカー／CP計算ツール／卵相性（「繁殖」不是日文搜索词）
- 1,025 只宝可梦名、18 属性名、15 タマゴグループ 全部换日文；工具界面、结果、问答均为日文
- 日文站 34 页导航 + 34 页页脚加三个入口；sitemap 155 → 158（含 ja 三条 hreflang）
- 三张日文 OG 分享图（1200×630，Meiryo 字体）
- 正文、问答、标题全部重写为人工日文（不用机翻）：修正 Levitate→ふゆう、Flame Body→ほのおのからだ、Everstone→かたいいし、Talonflame→ファイアロー 等术语；补回被机翻漏掉的宝可梦名（ウリムー/ズルッグ）
## 2026-11-13 — Pokemon Type Coverage Calculator

- 新工具页 `/pokemon-type-coverage-calculator/`：选最多 6 只，实时算 18 个防御属性的 2 倍覆盖、缺口清单、全队共同弱点。
- 数据：1,025 只物种属性 + 18×18 克制表（与 PokeAPI damage_relations 逐条对拍，18/18 一致）。
- 页面内所有数字由生成脚本现算：Charizard 覆盖 5 种、一般属性只 73 只可 2 倍打、岩石 463 只、四只可覆盖全 18 种（Swinub/Scraggy/Zubat/Bulbasaur）。
- 接线：英文站 76 页导航 + 78 页页脚、首页工具卡、sitemap 153→155、6 处正文内链。
- OG 分享图 1200×630（同繁殖/GO 版式，右侧 18 属性点阵 16 实心 2 空心）。
- 修 `styles.css` 缺段落间距（全局 margin:0 重置吃掉了正文段间距），补 `.bc-prose` 规则；样式表版本号 `20261023a`→`20261113a`（155 页）。
## 2026-11-12 - Pokemon GO CP Calculator (new tool page)

- New page `/pokemon-go-cp-calculator/`: pick any of the 1,025 species, set Attack/Defense/Stamina
  IVs and drag the level from 1 to 50; it returns the exact CP, the real stats at that level, the
  level 40 and level 50 caps and the best level under both PvP caps. Formula and CPM table validated
  against PvPoke's gamemaster (1,738 / 1,753 species match level-25 CP exactly; the misses are Megas).
- Adds an evolution table (level 30, perfect IVs) and a top-15 level-50 CP table, both generated from
  the same dataset instead of typed by hand.
- Wired: nav + footer on all 76 English pages, homepage rec-card, sitemap (154 URLs), body links from
  Pokemon IV Calculator, Random Pokemon Picker, Pokemon Shiny Odds, Pokemon Team Picker, Pokemon Type
  Chart and Pokemon Breeding Calculator.

## 2026-11-12 - Pokemon Breeding Calculator: species sprites in the pickers

- Replaced the native `<select>` (which cannot show images) with a searchable listbox showing the
  official 96x96 sprite, name and dex number. 1,025 sprites downloaded to `assets/sprites/` (~1 MB),
  loaded lazily, no external image host.
- Share links switched from name slugs to dex numbers, which fixes Nidoran and other names with
  symbols that used to break the round trip.

## 2026-11-12 - Pokemon Breeding Calculator (new tool page)

- New page `/pokemon-breeding-calculator/`: pick two of the 1,025 species and it returns the
  breeding verdict, both egg groups, the gender split and the hatch step count. Data comes from the
  PokeAPI CSV dump (species, egg groups, gender rate, hatch counter), shipped inline so the tool
  runs with no fetch.
- 4 structured data blocks (SoftwareApplication + FAQPage + BreadcrumbList + Organization), 10 FAQ
  entries mirrored between the visible HTML and the JSON-LD.
- Wired: nav + footer on all 75 English pages, homepage rec-card, sitemap (153 URLs), body links
  from Pokemon IV Calculator, Pokemon Nature Chart, Pokemon Shiny Odds and Random Pokemon Picker.
- Japanese version not built yet; hreflang kept to en + x-default until it lands.



Site updates, newest first.

## November 2026

- **11-12** — Four more species join the Pokedex, English and Japanese: Tyranitar (600 total, Sand Stream's 1.5x Special Defense, the 4x Fighting hole and Mega Tyranitar's 700 spread), Metagross (135 Attack, Clear Body blocking Intimidate, four weaknesses, Tough Claws on the Mega), Togepi (245 total, the friendship step into Togetic and the Shiny Stone into Togekiss) and Ceruledge (525 total, Bitter Blade healing half its damage, Weak Armor's Speed trade). Every page carries the full matchup grid and a FAQ built from the queries people actually search. The hub now covers thirty-five species.

- **11-12** — Minior joins the Pokedex in English and Japanese. Both forms sit on the page side by side — Meteor at 440 and the exposed core at 500 — with five weaknesses, the Ground immunity, the half-HP Shields Down switch and the 2026 meteor shower dates taken from the official Pokemon GO announcement. The hub now covers thirty-one species.
- **11-02** — Smash or Pass shares the actual verdict list now. The Share button copies a link that reopens your smash and pass cards, your smash rate and your streak on the receiver's screen; Verdict History exports the same list as a CSV file. The Japanese page has both.
- **11-02** — Titles, descriptions and H1s rewritten on six pages, English and Japanese: the shiny odds calculator, the guide behind it, Legends: Z-A, the type generator, Smash or Pass and the homepage.

## October 2026

- **10-25** — Eevee evolutions page rebuilt around artwork and data: a nine-card form grid up top, plus new tables for per-game availability, friendship thresholds, Pokemon GO conditions and type matchups. The Eevee Pokedex page gained a dex-facts table.
- **10-25** — The Japanese versions of both Eevee pages carry the same rebuild: the nine-form grid, the new reference tables and the added FAQ answers.
- **10-20** — Wording pass on nine pages, matching the exact phrasing players search with: searcher, game picker, shiny maker, Platinum nature chart, wheel of names, smash or pass edition, 1/4096 as a percentage, Mew's alternate forms and Mewtwo's Pokedex entry.
- **10-20** — Ten more species pages complete the wave-2 batch — Raichu, Zygarde, Espeon, Gyarados, Venusaur, Darkrai, Magikarp, Meowth, Onix and Psyduck; the hub now covers thirty species.
- **10-20** — Five more species pages join the Pokedex — Snorlax, Sylveon, Gardevoir, Blastoise and Garchomp; the hub now covers twenty species.
- **10-07** — Five new species pages join the Pokedex — Mew, Arceus, Umbreon, Dragonite and Rayquaza; the hub now covers fifteen species.
- **10-07** — Who's That Pokemon page: FAQ additions on the names the game goes by, and where the name comes from.

## September 2026

- **09-29** — Analytics update: Microsoft Clarity added across the site; privacy policy, about page and terms of use updated to cover it.
- **09-26** — Wording updates on the Favorite Pokemon of Each Type and Champions Team Builder pages.
- **09-26** — New page: Pokemon Release Dates — every TCG set date for 2025-2026 on one calendar, with a countdown to the next set.
- **09-26** — New tool: Favorite Pokemon of Each Type — pick one favorite per type on an 18-slot grid, then export all eighteen as a single image.
- **09-26** — New tool: Pokemon Champions Team Builder — Regulation M-C roster squad builder with items, Mega stones and Showdown export.
- **09-24** — Description, cross-link and FAQ wording updates on the new species pages.
- **09-24** — Seven new species pages join the Pokedex — Charmander, Squirtle, Eevee, Gengar, Mewtwo, Lucario and Greninja; the hub now covers ten species.
- **09-24** — Trainer Card and IV Calculator pages updated.
- **09-15** — Site update: navigation and footer slimmed to 12 links each, plus new sections on the Pokedex hub, IV Calculator, Who's That Pokemon, Smash or Pass and Team Picker pages.
- **09-14** — Shiny Odds hub expanded: per-game and per-method rates (including Legends: Z-A), median and milestone calculators, and Shiny Charm and shiny-lock notes.
- **09-12** — New tools: Random Pokemon Type Generator and Random Legendary Pokemon Generator.
- **09-10** — Pokedex goes live: the hub plus Bulbasaur, Charizard and Pikachu species pages.
