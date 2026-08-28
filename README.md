# Random Pokemon Generator

An SEO-optimized random Pokémon team generator built with vanilla HTML/CSS/JS — zero dependencies, no build step.

**Live: [https://www.random-pokemon-generator.co/](https://www.random-pokemon-generator.co/)**

## What's inside

| Page | URL | Purpose |
|---|---|---|
| 🎲 Main Generator | [/](https://www.random-pokemon-generator.co/) | Random team builder (1–12 Pokémon) with 10+ filter dimensions |
| 👣 Nuzlocke Generator | [/nuzlocke-generator/](https://www.random-pokemon-generator.co/nuzlocke-generator/) | Nuzlocke-specific roller: starter teams, first encounters, death replacements |

## Features

### Main Generator
- 🎲 Random team generation (1–12 Pokémon) from all 1,025 species across Gen 1–9
- 🔍 10+ filter dimensions: generation, type, count, shiny, rarity, form, evolution stage, BST range, Pokédex color
- 📊 Team Tactical Report: S–D grade, 18-type defensive matrix, STAB offensive coverage, roles, weakness warnings
- 🕘 Roll History (localStorage, up to 20 squads) with hover preview, detail modal, and per-squad share links
- 🔗 Shareable config + squad links (filters and exact team encoded in URL)

### Nuzlocke Generator
- 🎲 Three Nuzlocke modes: starter team (6), first encounter (1), death replacement (1)
- 🚫 Nuzlocke rule toggles: ban legendaries/mythicals (on by default), unevolved-only hardcore mode
- 📊 Nuzlocke Squad Report: S–D grade, defensive matrix, STAB coverage, role tags, shared-weakness warnings
- 🕘 Roll History with per-roll share links and state-restoring replay

### Both pages
- ⚡ Zero-dependency static site: `index.html` + `styles.css` + `app.js` / `nuzlocke.js` + `data.js` + `nav.js`
- 📱 Responsive: hamburger navigation and compact mobile layouts
- 🔎 SEO: semantic HTML, JSON-LD (SoftwareApplication + FAQPage + BreadcrumbList), OG/Twitter meta, canonical URLs, sitemap.xml

## Usage

Open `index.html` in a browser (works from `file://` too) or serve statically:

```bash
# any static server, e.g.
python -m http.server 8000
```

Data sourced from [PokeAPI](https://pokeapi.co/) (sprites via official artwork CDN).

## Project structure

```
├── index.html                  # main generator page
├── nuzlocke-generator/
│   ├── index.html              # nuzlocke generator page
│   └── nuzlocke.js             # nuzlocke engine (filters, analysis, history)
├── app.js                      # main generator engine
├── nav.js                      # hamburger nav toggle (shared)
├── data.js                     # Pokémon dataset (1,351 entries)
├── styles.css                  # all styles
├── sitemap.xml                 # XML sitemap for search engines
└── robots.txt
```

## License

Open source — see repository for details.
