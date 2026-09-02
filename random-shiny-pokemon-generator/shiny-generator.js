/* ============================================================
   Random Shiny Pokemon Generator — vanilla JS engine
   Flow: 9 filters + per-roll count (1-6) -> roll shiny Pokemon
   from the full Gen 1-9 pool -> full dex cards with shiny
   artwork, a regular-art compare switch, stats, abilities and
   type coverage. History reloads whole rolls. Share links
   restore filters + the current roll.
   Data: window.POKEMON_DATA (data.js)
   ============================================================ */
(function () {
  'use strict';

  var POKEMON = window.POKEMON_DATA || [];
  var BY_ID = {};
  POKEMON.forEach(function (p) { BY_ID[p.i] = p; });

  /* shiny pool = every species and form that has shiny artwork */
  var POOL = POKEMON.filter(function (p) { return !!p.sps; });

  var TYPES = {
    fire: { label: 'Fire', color: '#FF9D55', light: false }, water: { label: 'Water', color: '#6890F0', light: true },
    grass: { label: 'Grass', color: '#78C850', light: false }, electric: { label: 'Electric', color: '#F8D030', light: false },
    ice: { label: 'Ice', color: '#98D8D8', light: false }, fighting: { label: 'Fighting', color: '#C03028', light: true },
    poison: { label: 'Poison', color: '#A040A0', light: true }, ground: { label: 'Ground', color: '#E0C068', light: false },
    flying: { label: 'Flying', color: '#A890F0', light: true }, psychic: { label: 'Psychic', color: '#F85888', light: true },
    bug: { label: 'Bug', color: '#A8B820', light: false }, rock: { label: 'Rock', color: '#B8A038', light: true },
    ghost: { label: 'Ghost', color: '#705898', light: true }, dark: { label: 'Dark', color: '#705848', light: true },
    dragon: { label: 'Dragon', color: '#7038F8', light: true }, steel: { label: 'Steel', color: '#B8B8D0', light: false },
    fairy: { label: 'Fairy', color: '#EE99AC', light: false }, normal: { label: 'Normal', color: '#A8A878', light: false }
  };

  /* type effectiveness chart (attacker -> defender multipliers) */
  var TYPE_CHART = {
    normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
    fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
    dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5, steel: 0.5 },
    steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
  };

  function typeCoverage(types) {
    var weak = [], resist = [], immune = [];
    Object.keys(TYPE_CHART).forEach(function (atk) {
      var eff = 1;
      types.forEach(function (t) {
        var row = TYPE_CHART[atk];
        if (row && row[t] != null) eff *= row[t];
      });
      if (eff >= 2) weak.push(atk);
      else if (eff === 0) immune.push(atk);
      else if (eff < 1) resist.push(atk);
    });
    return { weak: weak, resist: resist, immune: immune };
  }

  var REGIONS = { 1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unova', 6: 'Kalos', 7: 'Alola', 8: 'Galar', 9: 'Paldea' };
  var STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
  var COUNT_OPTIONS = [1, 2, 3, 4, 5, 6];
  var BST_CAP = 780;

  function capWords(s) {
    return s.split(' ').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function displayName(slug) { return capWords(slug.split('-').join(' ')); }
  function pad4(n) { return String(n).padStart(4, '0'); }

  function secureRandom() {
    if (window.crypto && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }

  /* ---------------- state ---------------- */
  var settings = {
    gens: [], regions: [], types: [], rarity: [], stages: [], habitats: [], colors: [],
    bstMin: 0, bstMax: BST_CAP, count: 1, noRepeat: false, filtersOpen: true
  };
  var seenIds = {};           /* no-repeat deck memory */
  var history = [];           /* [{ picks: [{ i }] }] newest last, max 12 */
  var current = [];           /* [{ i, compare }] compare=true shows regular art */
  var HISTORY_MAX = 12;
  var LS_SETTINGS = 'rpg:shiny-settings';
  var LS_HISTORY = 'rpg:shiny-history';
  var LS_CURRENT = 'rpg:shiny-current';

  /* ---------------- DOM refs ---------------- */
  function $(id) { return document.getElementById(id); }
  var genChipsEl = $('shiny-gen-chips'), regionChipsEl = $('shiny-region-chips'), typeChipsEl = $('shiny-type-chips');
  var rarityChipsEl = $('shiny-rarity-chips'), stageChipsEl = $('shiny-stage-chips');
  var habitatChipsEl = $('shiny-habitat-chips'), colorChipsEl = $('shiny-color-chips');
  var countChipsEl = $('shiny-count-chips'), bstMinEl = $('shiny-bst-min'), bstMaxEl = $('shiny-bst-max');
  var gensNote = $('shiny-gens-note'), regionsNote = $('shiny-regions-note'), typesNote = $('shiny-types-note');
  var rarityNote = $('shiny-rarity-note'), stagesNote = $('shiny-stages-note');
  var habitatsNote = $('shiny-habitats-note'), colorsNote = $('shiny-colors-note');
  var bstNote = $('shiny-bst-note'), countNote = $('shiny-count-note'), poolCountEl = $('shiny-pool-count');
  var noRepeatEl = $('shiny-norepeat'), noRepeatLabel = $('shiny-norepeat-label');
  var generateBtn = $('shiny-generate-btn'), copyBtn = $('shiny-copy-btn'), shareBtn = $('shiny-share-btn'), resetBtn = $('shiny-reset-btn');
  var emptyEl = $('shiny-empty'), cardsEl = $('shiny-cards');
  var historyPanel = $('shiny-history-panel'), historyList = $('shiny-history-list');
  var analysisEl = $('shiny-analysis');
  var modal = $('shiny-modal'), modalText = $('shiny-modal-text'), modalClose = $('shiny-modal-close');
  var emptyModal = $('shiny-empty-modal'), emptyReset = $('shiny-empty-reset'), emptyClose = $('shiny-empty-close');
  var filtersEl = $('shiny-filters'), filtersToggle = $('shiny-filters-toggle');
  var filtersCaret = $('shiny-filters-caret'), filtersSummary = $('shiny-filters-summary');

  var HABITAT_MAP = { cave: 'Cave', forest: 'Forest', grassland: 'Grassland', mountain: 'Mountain', rare: 'Rare', 'rough-terrain': 'Rough Terrain', sea: 'Sea', urban: 'Urban', 'waters-edge': 'Waters Edge' };
  var POKEDEX_COLORS = { red: 'Red', blue: 'Blue', yellow: 'Yellow', green: 'Green', black: 'Black', brown: 'Brown', purple: 'Purple', gray: 'Gray', white: 'White', pink: 'Pink' };
  var RARITY_MAP = { standard: 'Standard', legendary: 'Legendary', mythical: 'Mythical' };
  var STAGE_MAP = { initial: 'Base', middle: 'Middle', final: 'Final' };

  function rarityOf(p) { return p.lg ? 'legendary' : (p.my ? 'mythical' : 'standard'); }

  /* ---------------- pool + filters ---------------- */
  function poolGens() {
    var gens = [];
    POOL.forEach(function (p) { if (gens.indexOf(p.g) === -1) gens.push(p.g); });
    return gens.sort(function (a, b) { return a - b; });
  }
  function poolHabitats() {
    var hs = [];
    POOL.forEach(function (p) { if (p.h && hs.indexOf(p.h) === -1) hs.push(p.h); });
    return hs.sort();
  }
  function poolColors() {
    var cs = [];
    POOL.forEach(function (p) { if (p.c && cs.indexOf(p.c) === -1) cs.push(p.c); });
    return cs.sort();
  }

  function activePool() {
    return POOL.filter(function (p) {
      if (settings.gens.length && settings.gens.indexOf(p.g) === -1) return false;
      if (settings.regions.length && settings.regions.indexOf(p.g) === -1) return false;
      if (settings.types.length) {
        var hit = false;
        p.t.forEach(function (t) { if (settings.types.indexOf(t) !== -1) hit = true; });
        if (!hit) return false;
      }
      if (settings.rarity.length && settings.rarity.indexOf(rarityOf(p)) === -1) return false;
      if (settings.stages.length && settings.stages.indexOf(p.ev) === -1) return false;
      if (settings.habitats.length && (!p.h || settings.habitats.indexOf(p.h) === -1)) return false;
      if (settings.colors.length && settings.colors.indexOf(p.c) === -1) return false;
      if (settings.bstMin > 0 && p.tt < settings.bstMin) return false;
      if (settings.bstMax < BST_CAP && p.tt > settings.bstMax) return false;
      return true;
    });
  }

  function makeChip(label, pressed, onToggle, colorVars) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn' + (colorVars ? ' type-chip' : '');
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    if (colorVars) {
      btn.style.setProperty('--chip', colorVars.color);
      btn.style.setProperty('--chip-text', colorVars.light ? '#fff' : '#121212');
    }
    btn.textContent = label;
    btn.addEventListener('click', function () { onToggle(btn); });
    return btn;
  }

  function toggleIn(arr, v) {
    var i = arr.indexOf(v);
    if (i === -1) arr.push(v); else arr.splice(i, 1);
  }

  function chipToggle(arr, v, btn) {
    toggleIn(arr, v);
    btn.setAttribute('aria-pressed', arr.indexOf(v) !== -1 ? 'true' : 'false');
    afterFilterChange();
  }

  function renderChips() {
    genChipsEl.innerHTML = '';
    poolGens().forEach(function (g) {
      genChipsEl.appendChild(makeChip('Gen ' + g, settings.gens.indexOf(g) !== -1, function (btn) {
        chipToggle(settings.gens, g, btn);
      }));
    });
    regionChipsEl.innerHTML = '';
    poolGens().forEach(function (g) {
      regionChipsEl.appendChild(makeChip(REGIONS[g], settings.regions.indexOf(g) !== -1, function (btn) {
        chipToggle(settings.regions, g, btn);
      }));
    });
    typeChipsEl.innerHTML = '';
    Object.keys(TYPES).forEach(function (t) {
      var m = TYPES[t];
      typeChipsEl.appendChild(makeChip(m.label, settings.types.indexOf(t) !== -1, function (btn) {
        chipToggle(settings.types, t, btn);
      }, m));
    });
    rarityChipsEl.innerHTML = '';
    Object.keys(RARITY_MAP).forEach(function (r) {
      rarityChipsEl.appendChild(makeChip(RARITY_MAP[r], settings.rarity.indexOf(r) !== -1, function (btn) {
        chipToggle(settings.rarity, r, btn);
      }));
    });
    stageChipsEl.innerHTML = '';
    Object.keys(STAGE_MAP).forEach(function (s) {
      stageChipsEl.appendChild(makeChip(STAGE_MAP[s], settings.stages.indexOf(s) !== -1, function (btn) {
        chipToggle(settings.stages, s, btn);
      }));
    });
    habitatChipsEl.innerHTML = '';
    poolHabitats().forEach(function (h) {
      habitatChipsEl.appendChild(makeChip(HABITAT_MAP[h] || displayName(h), settings.habitats.indexOf(h) !== -1, function (btn) {
        chipToggle(settings.habitats, h, btn);
      }));
    });
    colorChipsEl.innerHTML = '';
    poolColors().forEach(function (c) {
      colorChipsEl.appendChild(makeChip(POKEDEX_COLORS[c] || displayName(c), settings.colors.indexOf(c) !== -1, function (btn) {
        chipToggle(settings.colors, c, btn);
      }));
    });
    countChipsEl.innerHTML = '';
    COUNT_OPTIONS.forEach(function (n) {
      countChipsEl.appendChild(makeChip(String(n), settings.count === n, function () {
        settings.count = n;
        Array.prototype.forEach.call(countChipsEl.children, function (c) {
          c.setAttribute('aria-pressed', c.textContent === String(n) ? 'true' : 'false');
        });
        updateNotes();
        persistSettings();
      }));
    });
  }

  function updateNotes() {
    var pool = activePool();
    gensNote.textContent = settings.gens.length
      ? 'Showing shinies from ' + settings.gens.map(function (g) { return 'Gen ' + g; }).join(', ')
      : 'Showing shinies from all generations';
    regionsNote.textContent = settings.regions.length
      ? 'Showing shinies from ' + settings.regions.map(function (g) { return REGIONS[g]; }).join(', ')
      : 'Showing shinies from all regions';
    typesNote.textContent = settings.types.length
      ? 'Showing shinies matching ' + settings.types.map(function (t) { return TYPES[t].label; }).join(' or ')
      : 'Showing shinies of all types';
    rarityNote.textContent = settings.rarity.length
      ? 'Showing ' + settings.rarity.map(function (r) { return RARITY_MAP[r].toLowerCase(); }).join(' and ') + ' shinies only'
      : 'Showing standard, legendary and mythical shinies';
    stagesNote.textContent = settings.stages.length
      ? 'Showing ' + settings.stages.map(function (s) { return STAGE_MAP[s].toLowerCase(); }).join(' and ') + ' stages only'
      : 'Showing base, middle and final stages';
    habitatsNote.textContent = settings.habitats.length
      ? 'Showing shinies from ' + settings.habitats.map(function (h) { return (HABITAT_MAP[h] || h).toLowerCase(); }).join(', ') + ' — species without habitat data stay hidden'
      : 'Showing shinies from all habitats';
    colorsNote.textContent = settings.colors.length
      ? 'Showing ' + settings.colors.map(function (c) { return (POKEDEX_COLORS[c] || c).toLowerCase(); }).join(', ') + ' shinies'
      : 'Showing every Pokédex color';
    if (settings.bstMin > 0 || settings.bstMax < BST_CAP) {
      bstNote.textContent = 'Showing shinies with base stat total ' + settings.bstMin + ' – ' + settings.bstMax;
    } else {
      bstNote.textContent = 'No BST limits';
    }
    countNote.textContent = settings.count === 1
      ? 'Each roll deals 1 shiny Pokemon'
      : 'Each roll deals ' + settings.count + ' shiny Pokemon — no duplicates inside a roll';
    var emptyPool = pool.length === 0;
    poolCountEl.classList.toggle('pool-empty', emptyPool);
    poolCountEl.textContent = emptyPool
      ? 'Active pool: 0 of ' + POOL.length + ' shiny variants — nothing matches this combination, loosen a filter to roll'
      : 'Active pool: ' + pool.length + ' of ' + POOL.length + ' shiny variants';
    renderFiltersBar();
  }

  function afterFilterChange() {
    seenIds = {};           /* filters changed -> reshuffle the deck */
    updateNotes();
    persistSettings();
  }

  /* ---------------- collapsible filter panel ---------------- */
  function filterSummaryText() {
    var parts = [];
    if (settings.gens.length) parts.push(settings.gens.map(function (g) { return 'Gen ' + g; }).join(', '));
    if (settings.regions.length) parts.push(settings.regions.map(function (g) { return REGIONS[g]; }).join(', '));
    if (settings.types.length) parts.push(settings.types.map(function (t) { return TYPES[t].label; }).join(' or '));
    if (settings.rarity.length) parts.push(settings.rarity.map(function (r) { return RARITY_MAP[r]; }).join(' + '));
    if (settings.stages.length) parts.push(settings.stages.map(function (s) { return STAGE_MAP[s]; }).join(' + '));
    if (settings.habitats.length) parts.push(settings.habitats.map(function (h) { return HABITAT_MAP[h] || h; }).join(', '));
    if (settings.colors.length) parts.push(settings.colors.map(function (c) { return (POKEDEX_COLORS[c] || c); }).join(', ') + ' only');
    if (settings.bstMin > 0 || settings.bstMax < BST_CAP) parts.push('BST ' + settings.bstMin + '–' + settings.bstMax);
    if (settings.count > 1) parts.push(settings.count + ' per roll');
    if (settings.noRepeat) parts.push('No repeats on');
    return parts.length ? 'Active: ' + parts.join(' · ') : 'No filters active — full shiny pool';
  }

  function renderFiltersBar() {
    var open = settings.filtersOpen !== false;
    filtersEl.hidden = !open;
    filtersToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    filtersCaret.textContent = open ? '▾' : '▸';
    filtersSummary.hidden = open;
    if (!open) filtersSummary.textContent = filterSummaryText();
  }

  /* ---------------- roll ---------------- */
  var EMPTY_DEFAULT = 'Press 🎲 Generate Shiny Pokemon to roll your first shiny.';
  var EMPTY_NO_MATCH = 'No shinies match this filter combination — loosen a filter or hit ↺ Reset Filters.';

  function showModalCopy(text) {
    modalText.value = text;
    modal.hidden = false;
    modalText.focus();
    modalText.select();
  }

  function roll() {
    var pool = activePool();
    if (!pool.length) {
      /* never fail silently: dedicated modal + inline note explain the empty pool */
      current = [];
      cardsEl.innerHTML = '';
      emptyEl.textContent = EMPTY_NO_MATCH;
      emptyEl.hidden = false;
      copyBtn.disabled = true;
      shareBtn.disabled = true;
      emptyModal.hidden = false;
      return;
    }
    var want = Math.min(settings.count, pool.length);
    var picks = [];
    var pickedThisRoll = {};
    while (picks.length < want) {
      var candidates = pool.filter(function (p) {
        if (pickedThisRoll[p.i]) return false;
        if (settings.noRepeat && seenIds[p.i]) return false;
        return true;
      });
      if (!candidates.length) {
        if (!settings.noRepeat) break;
        seenIds = {};       /* deck exhausted mid-roll -> reshuffle and continue */
        continue;
      }
      var pick = candidates[Math.floor(secureRandom() * candidates.length)];
      pickedThisRoll[pick.i] = true;
      if (settings.noRepeat) seenIds[pick.i] = true;
      picks.push({ i: pick.i, compare: false });
    }
    if (!picks.length) return;
    current = picks;
    history.push({ picks: picks.map(function (p) { return { i: p.i }; }) });
    if (history.length > HISTORY_MAX) history = history.slice(history.length - HISTORY_MAX);
    renderCurrent();
    renderHistory();
    persistAll();
  }

  /* ---------------- card ---------------- */
  function dexRow(label, valueEl) {
    var row = document.createElement('div');
    row.className = 'dexdata-row';
    var dt = document.createElement('dt');
    dt.textContent = label;
    var dd = document.createElement('dd');
    dd.appendChild(valueEl);
    row.appendChild(dt);
    row.appendChild(dd);
    return row;
  }

  function valSpan(text) {
    var s = document.createElement('span');
    s.className = 'dexdata-val';
    s.textContent = text;
    return s;
  }

  function buildCard(pick) {
    var p = BY_ID[pick.i];

    var card = document.createElement('div');
    card.className = 'mega-card shiny-card cornered';

    /* top row: dex number + compare switch */
    var top = document.createElement('div');
    top.className = 'mega-card-top';
    var num = document.createElement('span');
    num.className = 'dex-num';
    var compareLabel = document.createElement('label');
    compareLabel.className = 'wtp-switch mega-shiny-switch';
    var compareInput = document.createElement('input');
    compareInput.type = 'checkbox';
    compareInput.checked = !!pick.compare;
    var compareTrack = document.createElement('span');
    compareTrack.className = 'wtp-switch-track';
    compareTrack.setAttribute('aria-hidden', 'true');
    var compareText = document.createElement('span');
    compareText.className = 'wtp-switch-label';
    compareText.textContent = '✨ Compare regular';
    compareLabel.appendChild(compareInput);
    compareLabel.appendChild(compareTrack);
    compareLabel.appendChild(compareText);
    top.appendChild(num);
    top.appendChild(compareLabel);
    card.appendChild(top);

    /* split: artwork + data */
    var split = document.createElement('div');
    split.className = 'mega-split';
    var art = document.createElement('span');
    art.className = 'mega-art shiny-art';
    art.style.setProperty('--aura', TYPES[p.t[0]] ? TYPES[p.t[0]].color : '#A8A878');
    var img = document.createElement('img');
    img.width = 475; img.height = 475;
    art.appendChild(img);
    /* sparkle stars over the shiny artwork */
    var sparkles = document.createElement('span');
    sparkles.className = 'shiny-sparkles';
    sparkles.setAttribute('aria-hidden', 'true');
    sparkles.innerHTML = '<i></i><i></i><i></i><i></i>';
    art.appendChild(sparkles);
    split.appendChild(art);

    var data = document.createElement('div');
    data.className = 'mega-data';
    var name = document.createElement('div');
    name.className = 'mega-name';
    name.textContent = displayName(p.n);
    data.appendChild(name);

    var dexdata = document.createElement('dl');
    dexdata.className = 'dexdata';

    dexdata.appendChild(dexRow('National №', valSpan('#' + pad4(p.si))));

    dexdata.appendChild(dexRow('Type', (function () {
      var wrap = document.createElement('div');
      wrap.className = 'chip-row';
      p.t.forEach(function (t) {
        var m = TYPES[t];
        var chip = document.createElement('span');
        chip.className = 'type-tag';
        chip.style.setProperty('--tag', m ? m.color : '#A8A878');
        chip.style.setProperty('--tag-text', m && m.light ? '#fff' : '#121212');
        chip.textContent = m ? m.label : t;
        wrap.appendChild(chip);
      });
      return wrap;
    })()));

    dexdata.appendChild(dexRow('Generation', valSpan('Gen ' + p.g + ' · ' + (REGIONS[p.g] || ''))));

    dexdata.appendChild(dexRow('Rarity', valSpan(p.lg ? 'Legendary' : (p.my ? 'Mythical' : 'Standard'))));

    dexdata.appendChild(dexRow('Evolution stage', valSpan(STAGE_MAP[p.ev] || 'Final')));

    if (p.h) {
      dexdata.appendChild(dexRow('Habitat', valSpan(HABITAT_MAP[p.h] || displayName(p.h))));
    }

    if (p.c) {
      dexdata.appendChild(dexRow('Pokédex color', valSpan(POKEDEX_COLORS[p.c] || displayName(p.c))));
    }

    dexdata.appendChild(dexRow('Shiny odds', (function () {
      var s = document.createElement('span');
      s.className = 'dexdata-val shiny-odds';
      s.textContent = '1/4,096 in modern games · 1/8,192 in Gen 2–5';
      return s;
    })()));

    dexdata.appendChild(dexRow('Base stat total', valSpan(String(p.tt))));

    dexdata.appendChild(dexRow('Abilities', (function () {
      var list = document.createElement('ol');
      list.className = 'dexdata-abilities';
      p.ab.forEach(function (a, i) {
        var li = document.createElement('li');
        li.textContent = (i + 1) + '. ' + displayName(a);
        list.appendChild(li);
      });
      return list;
    })()));

    dexdata.appendChild(dexRow('Type coverage', (function () {
      var wrap = document.createElement('div');
      wrap.className = 'cov-wrap';
      var cov = typeCoverage(p.t);
      [['Weak to', cov.weak], ['Resists', cov.resist], ['Immune', cov.immune]].forEach(function (pair) {
        var row = document.createElement('div');
        row.className = 'cov-row';
        var lab = document.createElement('span');
        lab.className = 'cov-label';
        lab.textContent = pair[0];
        row.appendChild(lab);
        if (!pair[1].length) {
          var none = document.createElement('span');
          none.className = 'cov-none';
          none.textContent = '—';
          row.appendChild(none);
        } else {
          pair[1].forEach(function (t) {
            var tag = document.createElement('span');
            tag.className = 'type-tag cov-tag';
            tag.textContent = TYPES[t].label.toUpperCase();
            tag.style.background = TYPES[t].color;
            tag.style.color = TYPES[t].light ? '#121212' : '#fff';
            row.appendChild(tag);
          });
        }
        wrap.appendChild(row);
      });
      return wrap;
    })()));

    data.appendChild(dexdata);

    /* stat bars */
    var stats = document.createElement('div');
    stats.className = 'stats';
    p.st.forEach(function (v, idx) {
      var row = document.createElement('div');
      row.className = 'stat-row';
      var dt = document.createElement('dt');
      dt.textContent = STAT_LABELS[idx];
      var dd = document.createElement('dd');
      dd.textContent = String(v);
      var track = document.createElement('div');
      track.className = 'stat-track';
      var fill = document.createElement('div');
      fill.className = 'stat-fill';
      fill.style.width = Math.min(100, Math.round((v / 255) * 100)) + '%';
      track.appendChild(fill);
      row.appendChild(dt);
      row.appendChild(dd);
      row.appendChild(track);
      stats.appendChild(row);
    });
    data.appendChild(stats);
    split.appendChild(data);
    card.appendChild(split);

    /* artwork state (shiny / regular compare) */
    function paintArt() {
      var fallbackUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + p.i + '.png';
      img.onerror = null;
      img.src = pick.compare ? p.sp : p.sps;
      img.alt = displayName(p.n) + (pick.compare ? ' regular artwork' : ' shiny artwork');
      img.onerror = function () {
        /* some forms miss shiny artwork -> fall back to regular art, then sprite */
        if (img.src === p.sps && p.sp) { img.src = p.sp; return; }
        if (img.src !== fallbackUrl) img.src = fallbackUrl;
        else img.onerror = null;
      };
      num.textContent = '#' + pad4(p.si) + (pick.compare ? ' · REGULAR' : ' · ✨ SHINY');
      art.classList.toggle('shiny-art-active', !pick.compare);
    }
    compareInput.addEventListener('change', function () {
      pick.compare = compareInput.checked;
      paintArt();
      persistAll();
    });
    paintArt();

    return card;
  }

  function renderCurrent() {
    cardsEl.innerHTML = '';
    if (!current.length) {
      emptyEl.textContent = EMPTY_DEFAULT;
      emptyEl.hidden = false;
      copyBtn.disabled = true;
      shareBtn.disabled = true;
      return;
    }
    cardsEl.classList.toggle('mega-cards-multi', current.length > 1);
    current.forEach(function (pick) {
      var p = BY_ID[pick.i];
      if (p) cardsEl.appendChild(buildCard(pick));
    });
    emptyEl.hidden = true;
    copyBtn.disabled = false;
    shareBtn.disabled = false;
  }

  /* ---------------- history ---------------- */
  function renderHistory() {
    historyList.innerHTML = '';
    historyPanel.hidden = history.length === 0;
    history.slice().reverse().forEach(function (entry) {
      if (!entry || !entry.picks || !entry.picks.length) return;
      var first = BY_ID[entry.picks[0].i];
      if (!first) return;
      var li = document.createElement('li');
      li.className = 'history-row';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item';
      btn.setAttribute('aria-label', 'Reload this roll');
      var label = document.createElement('span');
      label.className = 'history-label';
      label.textContent = displayName(first.n)
        + (entry.picks.length > 1 ? ' +' + (entry.picks.length - 1) : '')
        + ' ✨';
      btn.appendChild(label);
      var thumbs = document.createElement('span');
      thumbs.className = 'history-thumbs';
      entry.picks.forEach(function (pk) {
        var pkP = BY_ID[pk.i];
        if (!pkP) return;
        var img = document.createElement('img');
        img.src = pkP.sps;
        img.alt = displayName(pkP.n) + ' shiny';
        img.width = 40; img.height = 40; img.loading = 'lazy';
        img.onerror = function () {
          if (pkP.sp && img.src !== pkP.sp) { img.src = pkP.sp; return; }
          var fb = img.src.replace('/other/official-artwork/shiny', '').replace('/shiny/', '/');
          if (fb !== img.src) img.src = fb; else img.onerror = null;
        };
        thumbs.appendChild(img);
      });
      btn.appendChild(thumbs);
      btn.addEventListener('click', function () {
        current = entry.picks.map(function (pk) { return { i: pk.i, compare: false }; });
        renderCurrent();
        persistAll();
        cardsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      li.appendChild(btn);
      historyList.appendChild(li);
    });
    renderAnalysis();
  }

  /* ---------------- history analysis ---------------- */
  function analysisBox(numHtml, label) {
    var box = document.createElement('div');
    box.className = 'mega-stat-box';
    var num = document.createElement('div');
    num.className = 'mega-stat-num';
    num.innerHTML = numHtml;
    var lab = document.createElement('div');
    lab.className = 'mega-stat-label';
    lab.textContent = label;
    box.appendChild(num);
    box.appendChild(lab);
    return box;
  }

  function renderAnalysis() {
    analysisEl.innerHTML = '';
    if (!history.length) return;

    var all = [];
    history.forEach(function (entry) {
      if (entry && entry.picks) all = all.concat(entry.picks);
    });
    if (!all.length) return;

    /* headline */
    var title = document.createElement('h3');
    title.className = 'mega-analysis-title';
    title.textContent = '📊 History Analysis';
    analysisEl.appendChild(title);

    var grid = document.createElement('div');
    grid.className = 'mega-analysis-grid';

    /* rolls + total picks */
    grid.appendChild(analysisBox(
      String(history.length) + ' <span class="mega-stat-sub">· ' + all.length + ' shinies</span>',
      'Rolls logged'));

    /* unique pool coverage with progress bar */
    var unique = {};
    all.forEach(function (pk) { unique[pk.i] = true; });
    var uniqueCount = Object.keys(unique).length;
    var pct = Math.round((uniqueCount / POOL.length) * 100);
    var covBox = analysisBox(uniqueCount + ' <span class="mega-stat-sub">of ' + POOL.length + '</span>', 'Shiny pool seen');
    var barRow = document.createElement('div');
    barRow.className = 'mega-analysis-bar';
    var track = document.createElement('div');
    track.className = 'stat-track';
    var fill = document.createElement('div');
    fill.className = 'stat-fill';
    fill.style.width = Math.max(3, pct) + '%';
    track.appendChild(fill);
    var pctEl = document.createElement('span');
    pctEl.className = 'mega-analysis-pct';
    pctEl.textContent = pct + '%';
    barRow.appendChild(track);
    barRow.appendChild(pctEl);
    covBox.appendChild(barRow);
    grid.appendChild(covBox);

    /* average BST */
    var bstSum = 0;
    all.forEach(function (pk) { if (BY_ID[pk.i]) bstSum += BY_ID[pk.i].tt; });
    grid.appendChild(analysisBox(String(Math.round(bstSum / all.length)), 'Average base stat total'));

    /* rarity pulls */
    var rare = 0;
    all.forEach(function (pk) { var p = BY_ID[pk.i]; if (p && (p.lg || p.my)) rare++; });
    grid.appendChild(analysisBox(String(rare), 'Legendary / Mythical shinies'));

    /* equivalent real-world encounters at 1/4096 */
    grid.appendChild(analysisBox(
      (all.length * 4096).toLocaleString('en-US'),
      'Encounters saved at 1/4,096 odds'));

    /* most repeated shiny */
    var counts = {};
    all.forEach(function (pk) { counts[pk.i] = (counts[pk.i] || 0) + 1; });
    var topId = null, topN = 0;
    Object.keys(counts).forEach(function (id) {
      if (counts[id] > topN) { topN = counts[id]; topId = id; }
    });
    grid.appendChild(analysisBox(
      topN > 1 ? displayName(BY_ID[topId].n) + ' <span class="mega-stat-sub">×' + topN + '</span>' : '—',
      topN > 1 ? 'Most repeated' : 'No repeats yet'));

    analysisEl.appendChild(grid);

    /* type spread across every rolled shiny */
    var typeCounts = {};
    all.forEach(function (pk) {
      var p = BY_ID[pk.i];
      if (!p) return;
      p.t.forEach(function (t) { typeCounts[t] = (typeCounts[t] || 0) + 1; });
    });
    var sortedTypes = Object.keys(typeCounts).sort(function (a, b) { return typeCounts[b] - typeCounts[a]; });
    if (sortedTypes.length) {
      var typeRow = document.createElement('div');
      typeRow.className = 'mega-analysis-types';
      var lab = document.createElement('span');
      lab.className = 'cov-label';
      lab.textContent = 'Type spread';
      typeRow.appendChild(lab);
      sortedTypes.forEach(function (t) {
        var m = TYPES[t];
        var chip = document.createElement('span');
        chip.className = 'mega-type-count';
        chip.style.background = m ? m.color : '#A8A878';
        chip.style.color = m && m.light ? '#fff' : '#121212';
        chip.textContent = (m ? m.label : t) + ' ×' + typeCounts[t];
        typeRow.appendChild(chip);
      });
      analysisEl.appendChild(typeRow);
    }

    /* luck note: strongest pull by BST */
    var best = null;
    all.forEach(function (pk) {
      var p = BY_ID[pk.i];
      if (p && (!best || p.tt > BY_ID[best.i].tt)) best = pk;
    });
    if (best) {
      var note = document.createElement('p');
      note.className = 'mega-analysis-note';
      note.textContent = 'Strongest shiny so far: ' + displayName(BY_ID[best.i].n) + ' (BST ' + BY_ID[best.i].tt + ')';
      analysisEl.appendChild(note);
    }
  }

  /* ---------------- copy + share ---------------- */
  function shareUrl() {
    var q = new URLSearchParams();
    if (settings.gens.length) q.set('gens', settings.gens.slice().sort(function (a, b) { return a - b; }).join(','));
    if (settings.regions.length) q.set('regions', settings.regions.slice().sort(function (a, b) { return a - b; }).join(','));
    if (settings.types.length) q.set('types', settings.types.join(','));
    if (settings.rarity.length) q.set('rarity', settings.rarity.join(','));
    if (settings.stages.length) q.set('stages', settings.stages.join(','));
    if (settings.habitats.length) q.set('habitats', settings.habitats.join(','));
    if (settings.colors.length) q.set('colors', settings.colors.join(','));
    if (settings.bstMin > 0 || settings.bstMax < BST_CAP) q.set('bst', settings.bstMin + '-' + settings.bstMax);
    if (settings.count !== 1) q.set('count', String(settings.count));
    if (settings.noRepeat) q.set('norepeat', '1');
    if (current.length) q.set('picks', current.map(function (pk) { return pk.i; }).join('.'));
    var s = q.toString();
    return 'https://www.random-pokemon-generator.co/random-shiny-pokemon-generator/' + (s ? '?' + s : '');
  }

  function resultText() {
    if (!current.length) return '';
    var lines = [];
    if (current.length > 1) lines.push('Rolled ' + current.length + ' shiny Pokemon:');
    current.forEach(function (pick) {
      var p = BY_ID[pick.i];
      if (!p) return;
      var types = p.t.map(function (t) { return TYPES[t] ? TYPES[t].label : t; }).join('/');
      lines.push(
        '✨ ' + displayName(p.n) + ' (Shiny) — #' + pad4(p.si)
        + ' · ' + types + ' · Gen ' + p.g + ' (' + (REGIONS[p.g] || '') + ')'
        + ' · BST ' + p.tt
        + ' · Abilities: ' + p.ab.map(displayName).join(', ')
      );
    });
    lines.push('Rolled on the Random Shiny Pokemon Generator: ' + shareUrl());
    return lines.join('\n');
  }

  function copyText(text, btn, doneLabel) {
    function fallback() {
      showModalCopy(text);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        var span = btn.querySelector('span');
        var old = span.textContent;
        span.textContent = doneLabel;
        setTimeout(function () { span.textContent = old; }, 1600);
      }, fallback);
    } else {
      fallback();
    }
  }

  function copyResult() {
    var text = resultText();
    if (text) copyText(text, copyBtn, '✅ Copied!');
  }

  function shareResult() {
    if (!current.length) return;
    var url = shareUrl();
    var first = BY_ID[current[0].i];
    var text = current.length > 1
      ? 'I rolled ' + current.length + ' shiny Pokemon — ' + displayName(first.n) + ' and more!'
      : 'I rolled a shiny ' + displayName(first.n) + '!';
    if (navigator.share) {
      navigator.share({ title: 'Random Shiny Pokemon Generator', text: text, url: url }).then(null, function () {
        /* user cancelled or share failed -> fall back to copying the link */
      });
    } else {
      copyText(url, shareBtn, '✅ Link copied!');
    }
  }

  /* restore filters + current roll from a share link */
  function parseList(v) {
    if (!v) return [];
    return v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function restoreFromUrl() {
    var params = new URLSearchParams(location.search);
    if (!params.get('picks')) return false;
    var picks = params.get('picks').split('.').map(Number).filter(function (i) { return BY_ID[i]; });
    if (!picks.length) return false;
    settings.gens = parseList(params.get('gens')).map(Number).filter(function (g) { return poolGens().indexOf(g) !== -1; });
    settings.regions = parseList(params.get('regions')).map(Number).filter(function (g) { return poolGens().indexOf(g) !== -1; });
    settings.types = parseList(params.get('types')).filter(function (t) { return TYPES[t]; });
    settings.rarity = parseList(params.get('rarity')).filter(function (r) { return RARITY_MAP[r]; });
    settings.stages = parseList(params.get('stages')).filter(function (s) { return STAGE_MAP[s]; });
    settings.habitats = parseList(params.get('habitats')).filter(function (h) { return HABITAT_MAP[h]; });
    settings.colors = parseList(params.get('colors')).filter(function (c) { return POKEDEX_COLORS[c]; });
    var bst = params.get('bst');
    if (bst) {
      var parts = bst.split('-').map(Number);
      if (isFinite(parts[0])) settings.bstMin = Math.max(0, Math.min(BST_CAP, parts[0]));
      if (isFinite(parts[1])) settings.bstMax = Math.max(0, Math.min(BST_CAP, parts[1]));
      if (settings.bstMin > settings.bstMax) {
        var t = settings.bstMin; settings.bstMin = settings.bstMax; settings.bstMax = t;
      }
    }
    var count = Number(params.get('count'));
    if (COUNT_OPTIONS.indexOf(count) !== -1) settings.count = count;
    settings.noRepeat = params.get('norepeat') === '1';
    current = picks.map(function (i) { return { i: i, compare: false }; });
    return true;
  }

  /* ---------------- persistence ---------------- */
  function persistSettings() {
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }
  function persistAll() {
    persistSettings();
    try {
      localStorage.setItem(LS_HISTORY, JSON.stringify(history));
      localStorage.setItem(LS_CURRENT, JSON.stringify(current));
    } catch (e) { /* ignore */ }
  }
  function restore() {
    try {
      var s = localStorage.getItem(LS_SETTINGS);
      if (s) {
        var parsed = JSON.parse(s);
        if (parsed && typeof parsed === 'object') {
          settings.gens = Array.isArray(parsed.gens) ? parsed.gens : [];
          settings.regions = Array.isArray(parsed.regions) ? parsed.regions : [];
          settings.types = Array.isArray(parsed.types) ? parsed.types : [];
          settings.rarity = Array.isArray(parsed.rarity) ? parsed.rarity : [];
          settings.stages = Array.isArray(parsed.stages) ? parsed.stages : [];
          settings.habitats = Array.isArray(parsed.habitats) ? parsed.habitats : [];
          settings.colors = Array.isArray(parsed.colors) ? parsed.colors : [];
          settings.bstMin = typeof parsed.bstMin === 'number' && parsed.bstMin >= 0 ? parsed.bstMin : 0;
          settings.bstMax = typeof parsed.bstMax === 'number' && parsed.bstMax > 0 ? Math.min(parsed.bstMax, BST_CAP) : BST_CAP;
          settings.noRepeat = !!parsed.noRepeat;
          settings.filtersOpen = parsed.filtersOpen !== false;
          if (typeof parsed.count === 'number' && COUNT_OPTIONS.indexOf(parsed.count) !== -1) {
            settings.count = parsed.count;
          }
        }
      }
      var h = localStorage.getItem(LS_HISTORY);
      if (h) {
        var ph = JSON.parse(h);
        if (Array.isArray(ph)) {
          history = ph.filter(function (entry) {
            return entry && entry.picks && entry.picks.length && entry.picks.every(function (pk) { return BY_ID[pk.i]; });
          }).slice(-HISTORY_MAX);
        }
      }
      var c = localStorage.getItem(LS_CURRENT);
      if (c) {
        var pc = JSON.parse(c);
        if (pc && !Array.isArray(pc) && BY_ID[pc.i]) pc = [{ i: pc.i, compare: false }];
        if (Array.isArray(pc)) {
          current = pc.filter(function (pk) { return pk && BY_ID[pk.i]; });
        }
      }
    } catch (e) { /* corrupted storage -> start fresh */ }
  }

  /* ---------------- events ---------------- */
  generateBtn.addEventListener('click', roll);
  copyBtn.addEventListener('click', copyResult);
  shareBtn.addEventListener('click', shareResult);
  function bstChanged() {
    settings.bstMin = Number(bstMinEl.value) || 0;
    settings.bstMax = Number(bstMaxEl.value) || BST_CAP;
    if (settings.bstMin > settings.bstMax) {
      /* keep the range valid: move the other slider along */
      if (document.activeElement === bstMinEl) {
        settings.bstMax = settings.bstMin;
        bstMaxEl.value = String(settings.bstMax);
      } else {
        settings.bstMin = settings.bstMax;
        bstMinEl.value = String(settings.bstMin);
      }
    }
    afterFilterChange();
  }
  bstMinEl.addEventListener('input', bstChanged);
  bstMaxEl.addEventListener('input', bstChanged);
  function resetFilters() {
    settings.gens = [];
    settings.regions = [];
    settings.types = [];
    settings.rarity = [];
    settings.stages = [];
    settings.habitats = [];
    settings.colors = [];
    settings.bstMin = 0;
    settings.bstMax = BST_CAP;
    bstMinEl.value = '0';
    bstMaxEl.value = String(BST_CAP);
    renderChips();
    afterFilterChange();
  }
  resetBtn.addEventListener('click', resetFilters);
  filtersToggle.addEventListener('click', function () {
    settings.filtersOpen = filtersEl.hidden;
    renderFiltersBar();
    persistSettings();
  });
  noRepeatEl.addEventListener('change', function () {
    settings.noRepeat = noRepeatEl.checked;
    noRepeatLabel.textContent = noRepeatEl.checked ? 'On' : 'Off';
    seenIds = {};
    persistSettings();
  });
  $('shiny-history-clear').addEventListener('click', function () {
    history = [];
    renderHistory();
    persistAll();
  });
  modalClose.addEventListener('click', function () { modal.hidden = true; });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true; });
  /* empty-pool modal: close, or reset all filters and roll right away */
  emptyClose.addEventListener('click', function () { emptyModal.hidden = true; });
  emptyModal.addEventListener('click', function (e) { if (e.target === emptyModal) emptyModal.hidden = true; });
  emptyReset.addEventListener('click', function () {
    emptyModal.hidden = true;
    resetFilters();
    roll();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!modal.hidden) modal.hidden = true;
      if (!emptyModal.hidden) emptyModal.hidden = true;
    }
  });

  /* ---------------- init ---------------- */
  var fromShare = restoreFromUrl();
  if (!fromShare) restore();
  renderChips();
  updateNotes();
  noRepeatEl.checked = settings.noRepeat;
  noRepeatLabel.textContent = settings.noRepeat ? 'On' : 'Off';
  bstMinEl.value = String(settings.bstMin);
  bstMaxEl.value = String(settings.bstMax);
  renderCurrent();
  renderHistory();
  if (fromShare) {
    history.push({ picks: current.map(function (pk) { return { i: pk.i }; }) });
    if (history.length > HISTORY_MAX) history = history.slice(history.length - HISTORY_MAX);
    renderHistory();
    persistAll();
  }
})();
