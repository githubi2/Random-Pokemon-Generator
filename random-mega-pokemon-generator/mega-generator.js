/* ============================================================
   Random Mega Pokemon Generator — vanilla JS engine
   Flow: optional gen/type filters + per-roll count (1-6)
   -> roll Mega Evolutions from the mega-only pool -> full dex
   cards with stat gains vs the base form, abilities and type
   coverage. History reloads whole rolls.
   Data: window.POKEMON_DATA (data.js)
   ============================================================ */
(function () {
  'use strict';

  var POKEMON = window.POKEMON_DATA || [];
  var BY_ID = {};
  POKEMON.forEach(function (p) { BY_ID[p.i] = p; });

  /* mega-only pool: "-mega" / "-mega-x" / "-mega-y" / "-mega-z" suffixes
     (excludes plain species like meganium and yanmega) */
  var MEGAS = POKEMON.filter(function (p) { return /(^|-)mega($|-)/.test(p.n); });

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

  function capWords(s) {
    return s.split(' ').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function displayName(slug) { return capWords(slug.split('-').join(' ')); }
  function pad4(n) { return String(n).padStart(4, '0'); }

  /* base species entry for a mega form (si = species dex id) */
  function baseOf(p) { return BY_ID[p.si] || null; }

  /* "charizard-mega-x" -> "Mega Charizard X"
     "meowstic-female-mega" -> "Mega Meowstic (Female)" */
  function megaDisplay(p) {
    var base = baseOf(p);
    var baseSlug = base ? base.n : p.n.split('-mega')[0];
    var baseLen = baseSlug.split('-').length;
    var parts = p.n.split('-');
    var mi = parts.indexOf('mega');
    var before = parts.slice(0, mi);
    var after = parts.slice(mi + 1);
    var extra = before.slice(baseLen);
    var label = displayName(baseSlug);
    if (extra.length) label += ' (' + capWords(extra.join(' ')) + ')';
    if (after.length) label += ' ' + after.join(' ').toUpperCase();
    return 'Mega ' + label;
  }

  function secureRandom() {
    if (window.crypto && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }

  /* ---------------- state ---------------- */
  var settings = { gens: [], regions: [], types: [], rarity: [], habitats: [], colors: [], bstMin: 0, count: 1, noRepeat: false, filtersOpen: true };
  var seenIds = {};           /* no-repeat deck memory */
  var history = [];           /* [{ picks: [{ i, shiny }] }] newest last, max 12 */
  var current = [];           /* [{ i, shiny }] */
  var HISTORY_MAX = 12;
  var LS_SETTINGS = 'rpg:mega-settings';
  var LS_HISTORY = 'rpg:mega-history';
  var LS_CURRENT = 'rpg:mega-current';

  /* ---------------- DOM refs ---------------- */
  function $(id) { return document.getElementById(id); }
  var genChipsEl = $('mega-gen-chips'), regionChipsEl = $('mega-region-chips'), typeChipsEl = $('mega-type-chips');
  var rarityChipsEl = $('mega-rarity-chips'), habitatChipsEl = $('mega-habitat-chips'), colorChipsEl = $('mega-color-chips');
  var countChipsEl = $('mega-count-chips'), bstEl = $('mega-bst-min');
  var gensNote = $('mega-gens-note'), regionsNote = $('mega-regions-note'), typesNote = $('mega-types-note');
  var rarityNote = $('mega-rarity-note'), habitatsNote = $('mega-habitats-note'), colorsNote = $('mega-colors-note');
  var bstNote = $('mega-bst-note'), countNote = $('mega-count-note'), poolCountEl = $('mega-pool-count');
  var noRepeatEl = $('mega-norepeat'), noRepeatLabel = $('mega-norepeat-label');
  var generateBtn = $('mega-generate-btn'), copyBtn = $('mega-copy-btn'), resetBtn = $('mega-reset-btn');
  var emptyEl = $('mega-empty'), cardsEl = $('mega-cards');
  var historyPanel = $('mega-history-panel'), historyList = $('mega-history-list');
  var analysisEl = $('mega-analysis');
  var modal = $('mega-modal'), modalText = $('mega-modal-text'), modalClose = $('mega-modal-close');
  var filtersEl = $('mega-filters'), filtersToggle = $('mega-filters-toggle');
  var filtersCaret = $('mega-filters-caret'), filtersSummary = $('mega-filters-summary');

  var HABITAT_MAP = { cave: 'Cave', forest: 'Forest', grassland: 'Grassland', mountain: 'Mountain', rare: 'Rare', 'rough-terrain': 'Rough Terrain', sea: 'Sea', urban: 'Urban', 'waters-edge': 'Waters Edge' };
  var POKEDEX_COLORS = { red: 'Red', blue: 'Blue', yellow: 'Yellow', green: 'Green', black: 'Black', brown: 'Brown', purple: 'Purple', gray: 'Gray', white: 'White', pink: 'Pink' };
  var RARITY_MAP = { standard: 'Standard', legendary: 'Legendary', mythical: 'Mythical' };

  function rarityOf(p) { return p.lg ? 'legendary' : (p.my ? 'mythical' : 'standard'); }

  /* ---------------- pool + filters ---------------- */
  function poolGens() {
    var gens = [];
    MEGAS.forEach(function (p) { if (gens.indexOf(p.g) === -1) gens.push(p.g); });
    return gens.sort(function (a, b) { return a - b; });
  }
  function poolHabitats() {
    var hs = [];
    MEGAS.forEach(function (p) { if (p.h && hs.indexOf(p.h) === -1) hs.push(p.h); });
    return hs.sort();
  }
  function poolColors() {
    var cs = [];
    MEGAS.forEach(function (p) { if (p.c && cs.indexOf(p.c) === -1) cs.push(p.c); });
    return cs.sort();
  }

  function activePool() {
    return MEGAS.filter(function (p) {
      if (settings.gens.length && settings.gens.indexOf(p.g) === -1) return false;
      if (settings.regions.length && settings.regions.indexOf(p.g) === -1) return false;
      if (settings.types.length) {
        var hit = false;
        p.t.forEach(function (t) { if (settings.types.indexOf(t) !== -1) hit = true; });
        if (!hit) return false;
      }
      if (settings.rarity.length && settings.rarity.indexOf(rarityOf(p)) === -1) return false;
      if (settings.habitats.length && (!p.h || settings.habitats.indexOf(p.h) === -1)) return false;
      if (settings.colors.length && settings.colors.indexOf(p.c) === -1) return false;
      if (settings.bstMin > 0 && p.tt < settings.bstMin) return false;
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

  function renderChips() {
    genChipsEl.innerHTML = '';
    poolGens().forEach(function (g) {
      genChipsEl.appendChild(makeChip('Gen ' + g, settings.gens.indexOf(g) !== -1, function (btn) {
        toggleIn(settings.gens, g);
        btn.setAttribute('aria-pressed', settings.gens.indexOf(g) !== -1 ? 'true' : 'false');
        afterFilterChange();
      }));
    });
    regionChipsEl.innerHTML = '';
    poolGens().forEach(function (g) {
      regionChipsEl.appendChild(makeChip(REGIONS[g], settings.regions.indexOf(g) !== -1, function (btn) {
        toggleIn(settings.regions, g);
        btn.setAttribute('aria-pressed', settings.regions.indexOf(g) !== -1 ? 'true' : 'false');
        afterFilterChange();
      }));
    });
    typeChipsEl.innerHTML = '';
    Object.keys(TYPES).forEach(function (t) {
      var m = TYPES[t];
      typeChipsEl.appendChild(makeChip(m.label, settings.types.indexOf(t) !== -1, function (btn) {
        toggleIn(settings.types, t);
        btn.setAttribute('aria-pressed', settings.types.indexOf(t) !== -1 ? 'true' : 'false');
        afterFilterChange();
      }, m));
    });
    rarityChipsEl.innerHTML = '';
    Object.keys(RARITY_MAP).forEach(function (r) {
      rarityChipsEl.appendChild(makeChip(RARITY_MAP[r], settings.rarity.indexOf(r) !== -1, function (btn) {
        toggleIn(settings.rarity, r);
        btn.setAttribute('aria-pressed', settings.rarity.indexOf(r) !== -1 ? 'true' : 'false');
        afterFilterChange();
      }));
    });
    habitatChipsEl.innerHTML = '';
    poolHabitats().forEach(function (h) {
      habitatChipsEl.appendChild(makeChip(HABITAT_MAP[h] || displayName(h), settings.habitats.indexOf(h) !== -1, function (btn) {
        toggleIn(settings.habitats, h);
        btn.setAttribute('aria-pressed', settings.habitats.indexOf(h) !== -1 ? 'true' : 'false');
        afterFilterChange();
      }));
    });
    colorChipsEl.innerHTML = '';
    poolColors().forEach(function (c) {
      colorChipsEl.appendChild(makeChip(POKEDEX_COLORS[c] || displayName(c), settings.colors.indexOf(c) !== -1, function (btn) {
        toggleIn(settings.colors, c);
        btn.setAttribute('aria-pressed', settings.colors.indexOf(c) !== -1 ? 'true' : 'false');
        afterFilterChange();
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
      ? 'Showing megas from ' + settings.gens.map(function (g) { return 'Gen ' + g; }).join(', ')
      : 'Showing megas from all generations';
    regionsNote.textContent = settings.regions.length
      ? 'Showing megas from ' + settings.regions.map(function (g) { return REGIONS[g]; }).join(', ')
      : 'Showing megas from all regions';
    typesNote.textContent = settings.types.length
      ? 'Showing megas matching ' + settings.types.map(function (t) { return TYPES[t].label; }).join(' or ')
      : 'Showing megas of all types';
    rarityNote.textContent = settings.rarity.length
      ? 'Showing ' + settings.rarity.map(function (r) { return RARITY_MAP[r].toLowerCase(); }).join(' and ') + ' megas only'
      : 'Showing standard, legendary and mythical megas';
    habitatsNote.textContent = settings.habitats.length
      ? 'Showing megas from ' + settings.habitats.map(function (h) { return (HABITAT_MAP[h] || h).toLowerCase(); }).join(', ') + ' — megas without habitat data stay hidden'
      : 'Showing megas from all habitats';
    colorsNote.textContent = settings.colors.length
      ? 'Showing ' + settings.colors.map(function (c) { return (POKEDEX_COLORS[c] || c).toLowerCase(); }).join(', ') + ' megas'
      : 'Showing every Pokédex color';
    bstNote.textContent = settings.bstMin > 0
      ? 'Showing megas with base stat total ≥ ' + settings.bstMin
      : 'No BST minimum';
    countNote.textContent = settings.count === 1
      ? 'Each roll deals 1 Mega Pokemon'
      : 'Each roll deals ' + settings.count + ' Mega Pokemon — no duplicates inside a roll';
    poolCountEl.textContent = 'Active pool: ' + pool.length + ' of ' + MEGAS.length + ' Mega Evolutions';
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
    if (settings.habitats.length) parts.push(settings.habitats.map(function (h) { return HABITAT_MAP[h] || h; }).join(', '));
    if (settings.colors.length) parts.push(settings.colors.map(function (c) { return (POKEDEX_COLORS[c] || c); }).join(', ') + ' only');
    if (settings.bstMin > 0) parts.push('BST ≥ ' + settings.bstMin);
    if (settings.count > 1) parts.push(settings.count + ' per roll');
    if (settings.noRepeat) parts.push('No repeats on');
    return parts.length ? 'Active: ' + parts.join(' · ') : 'No filters active — full mega pool';
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
  function roll() {
    var pool = activePool();
    if (!pool.length) return;
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
      picks.push({ i: pick.i, shiny: false });
    }
    if (!picks.length) return;
    current = picks;
    history.push({ picks: picks.map(function (p) { return { i: p.i, shiny: p.shiny }; }) });
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
    var base = baseOf(p);

    var card = document.createElement('div');
    card.className = 'mega-card cornered';

    /* top row: dex number + shiny switch */
    var top = document.createElement('div');
    top.className = 'mega-card-top';
    var num = document.createElement('span');
    num.className = 'dex-num';
    var shinyLabel = document.createElement('label');
    shinyLabel.className = 'wtp-switch mega-shiny-switch';
    var shinyInput = document.createElement('input');
    shinyInput.type = 'checkbox';
    shinyInput.checked = !!pick.shiny;
    var shinyTrack = document.createElement('span');
    shinyTrack.className = 'wtp-switch-track';
    shinyTrack.setAttribute('aria-hidden', 'true');
    var shinyText = document.createElement('span');
    shinyText.className = 'wtp-switch-label';
    shinyText.textContent = '✨ Shiny';
    shinyLabel.appendChild(shinyInput);
    shinyLabel.appendChild(shinyTrack);
    shinyLabel.appendChild(shinyText);
    top.appendChild(num);
    top.appendChild(shinyLabel);
    card.appendChild(top);

    /* split: artwork + data */
    var split = document.createElement('div');
    split.className = 'mega-split';
    var art = document.createElement('span');
    art.className = 'mega-art';
    art.style.setProperty('--aura', TYPES[p.t[0]] ? TYPES[p.t[0]].color : '#A8A878');
    var img = document.createElement('img');
    img.width = 475; img.height = 475;
    art.appendChild(img);
    split.appendChild(art);

    var data = document.createElement('div');
    data.className = 'mega-data';
    var name = document.createElement('div');
    name.className = 'mega-name';
    name.textContent = megaDisplay(p);
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

    if (base) {
      dexdata.appendChild(dexRow('Mega Evolution of', valSpan(displayName(base.n))));
    }

    dexdata.appendChild(dexRow('Base stat total', (function () {
      var wrap = document.createElement('span');
      wrap.className = 'dexdata-val';
      wrap.textContent = String(p.tt);
      if (base && base.tt != null && base.tt !== p.tt) {
        var delta = document.createElement('span');
        delta.className = 'mega-delta';
        var diff = p.tt - base.tt;
        delta.textContent = ' (was ' + base.tt + ', ' + (diff > 0 ? '+' : '') + diff + ')';
        wrap.appendChild(delta);
      }
      return wrap;
    })()));

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

    /* stat bars with per-stat deltas vs the base form */
    var stats = document.createElement('div');
    stats.className = 'stats';
    p.st.forEach(function (v, idx) {
      var row = document.createElement('div');
      row.className = 'stat-row';
      var dt = document.createElement('dt');
      dt.textContent = STAT_LABELS[idx];
      var dd = document.createElement('dd');
      dd.textContent = String(v);
      if (base && base.st && base.st[idx] != null && base.st[idx] !== v) {
        var d = document.createElement('span');
        d.className = 'mega-delta';
        var diff = v - base.st[idx];
        d.textContent = ' ' + (diff > 0 ? '+' : '') + diff;
        dd.appendChild(d);
      }
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

    /* artwork state (regular / shiny) */
    function paintArt() {
      var fallbackUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + p.i + '.png';
      img.onerror = null;
      img.src = pick.shiny ? p.sps : p.sp;
      img.alt = megaDisplay(p) + (pick.shiny ? ' (shiny)' : '') + ' artwork';
      img.onerror = function () {
        if (img.src !== fallbackUrl) img.src = fallbackUrl;
        else img.onerror = null;
      };
      num.textContent = '#' + pad4(p.si) + (pick.shiny ? ' · ✨ SHINY' : '');
    }
    shinyInput.addEventListener('change', function () {
      pick.shiny = shinyInput.checked;
      /* keep the latest history entry in sync with the toggle */
      var last = history[history.length - 1];
      if (last && last.picks) {
        last.picks.forEach(function (hp) {
          if (hp.i === pick.i) hp.shiny = pick.shiny;
        });
      }
      paintArt();
      renderHistory();
      persistAll();
    });
    paintArt();

    return card;
  }

  function renderCurrent() {
    cardsEl.innerHTML = '';
    if (!current.length) {
      emptyEl.hidden = false;
      copyBtn.disabled = true;
      return;
    }
    cardsEl.classList.toggle('mega-cards-multi', current.length > 1);
    current.forEach(function (pick) {
      var p = BY_ID[pick.i];
      if (p) cardsEl.appendChild(buildCard(pick));
    });
    emptyEl.hidden = true;
    copyBtn.disabled = false;
  }

  /* ---------------- history ---------------- */
  function renderHistory() {
    historyList.innerHTML = '';
    historyPanel.hidden = history.length === 0;
    history.slice().reverse().forEach(function (entry) {
      if (!entry || !entry.picks || !entry.picks.length) return;
      var first = BY_ID[entry.picks[0].i];
      if (!first) return;
      var anyShiny = entry.picks.some(function (pk) { return pk.shiny; });
      var li = document.createElement('li');
      li.className = 'history-row';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item';
      btn.setAttribute('aria-label', 'Reload this roll');
      var label = document.createElement('span');
      label.className = 'history-label';
      label.textContent = megaDisplay(first)
        + (entry.picks.length > 1 ? ' +' + (entry.picks.length - 1) : '')
        + (anyShiny ? ' ✨' : '');
      btn.appendChild(label);
      var thumbs = document.createElement('span');
      thumbs.className = 'history-thumbs';
      entry.picks.forEach(function (pk) {
        var pkP = BY_ID[pk.i];
        if (!pkP) return;
        var img = document.createElement('img');
        img.src = pk.shiny ? pkP.sps : pkP.sp;
        img.alt = megaDisplay(pkP);
        img.width = 40; img.height = 40; img.loading = 'lazy';
        img.onerror = function () {
          var fb = img.src.replace('/other/official-artwork', '');
          if (fb !== img.src) img.src = fb; else img.onerror = null;
        };
        thumbs.appendChild(img);
      });
      btn.appendChild(thumbs);
      btn.addEventListener('click', function () {
        current = entry.picks.map(function (pk) { return { i: pk.i, shiny: pk.shiny }; });
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
      String(history.length) + ' <span class="mega-stat-sub">· ' + all.length + ' megas</span>',
      'Rolls logged'));

    /* unique pool coverage with progress bar */
    var unique = {};
    all.forEach(function (pk) { unique[pk.i] = true; });
    var uniqueCount = Object.keys(unique).length;
    var pct = Math.round((uniqueCount / MEGAS.length) * 100);
    var covBox = analysisBox(uniqueCount + ' <span class="mega-stat-sub">of ' + MEGAS.length + '</span>', 'Mega pool seen');
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
    grid.appendChild(analysisBox(String(rare), 'Legendary / Mythical pulls'));

    /* shinies toggled */
    var shinies = all.filter(function (pk) { return pk.shiny; }).length;
    grid.appendChild(analysisBox(String(shinies), 'Shiny artwork viewed'));

    /* most repeated mega */
    var counts = {};
    all.forEach(function (pk) { counts[pk.i] = (counts[pk.i] || 0) + 1; });
    var topId = null, topN = 0;
    Object.keys(counts).forEach(function (id) {
      if (counts[id] > topN) { topN = counts[id]; topId = id; }
    });
    grid.appendChild(analysisBox(
      topN > 1 ? megaDisplay(BY_ID[topId]) + ' <span class="mega-stat-sub">×' + topN + '</span>' : '—',
      topN > 1 ? 'Most repeated' : 'No repeats yet'));

    analysisEl.appendChild(grid);

    /* type spread across every rolled mega */
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

    /* luck note: rarest pull by BST */
    var best = null;
    all.forEach(function (pk) {
      var p = BY_ID[pk.i];
      if (p && (!best || p.tt > BY_ID[best.i].tt)) best = pk;
    });
    if (best) {
      var note = document.createElement('p');
      note.className = 'mega-analysis-note';
      note.textContent = 'Strongest pull so far: ' + megaDisplay(BY_ID[best.i]) + ' (BST ' + BY_ID[best.i].tt + ')';
      analysisEl.appendChild(note);
    }
  }

  /* ---------------- copy ---------------- */
  function resultText() {
    if (!current.length) return '';
    var lines = [];
    if (current.length > 1) lines.push('Rolled ' + current.length + ' Mega Pokemon:');
    current.forEach(function (pick) {
      var p = BY_ID[pick.i];
      if (!p) return;
      var base = baseOf(p);
      var types = p.t.map(function (t) { return TYPES[t] ? TYPES[t].label : t; }).join('/');
      lines.push(
        megaDisplay(p) + (pick.shiny ? ' (Shiny)' : '') + ' — #' + pad4(p.si)
        + ' · ' + types + ' · Gen ' + p.g + ' (' + (REGIONS[p.g] || '') + ')'
        + ' · BST ' + p.tt + (base && base.tt !== p.tt ? ' (was ' + base.tt + ', +' + (p.tt - base.tt) + ')' : '')
        + ' · Abilities: ' + p.ab.map(displayName).join(', ')
      );
    });
    lines.push('Rolled on the Random Mega Pokemon Generator: https://www.random-pokemon-generator.co/random-mega-pokemon-generator/');
    return lines.join('\n');
  }

  function copyResult() {
    var text = resultText();
    if (!text) return;
    function fallback() {
      modalText.value = text;
      modal.hidden = false;
      modalText.focus();
      modalText.select();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        var span = copyBtn.querySelector('span');
        var old = span.textContent;
        span.textContent = '✅ Copied!';
        setTimeout(function () { span.textContent = old; }, 1600);
      }, fallback);
    } else {
      fallback();
    }
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
          settings.habitats = Array.isArray(parsed.habitats) ? parsed.habitats : [];
          settings.colors = Array.isArray(parsed.colors) ? parsed.colors : [];
          settings.bstMin = typeof parsed.bstMin === 'number' && parsed.bstMin >= 0 ? parsed.bstMin : 0;
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
          history = ph.map(function (entry) {
            /* migrate old single-pick format { i, shiny } */
            if (entry && entry.picks && Array.isArray(entry.picks)) return entry;
            if (entry && BY_ID[entry.i]) return { picks: [{ i: entry.i, shiny: !!entry.shiny }] };
            return null;
          }).filter(function (entry) {
            return entry && entry.picks.length && entry.picks.every(function (pk) { return BY_ID[pk.i]; });
          }).slice(-HISTORY_MAX);
        }
      }
      var c = localStorage.getItem(LS_CURRENT);
      if (c) {
        var pc = JSON.parse(c);
        /* migrate old single-pick format { i, shiny } */
        if (pc && !Array.isArray(pc) && BY_ID[pc.i]) pc = [{ i: pc.i, shiny: !!pc.shiny }];
        if (Array.isArray(pc)) {
          current = pc.filter(function (pk) {
            return pk && BY_ID[pk.i] && /(^|-)mega($|-)/.test(BY_ID[pk.i].n);
          });
        }
      }
    } catch (e) { /* corrupted storage -> start fresh */ }
  }

  /* ---------------- events ---------------- */
  generateBtn.addEventListener('click', roll);
  copyBtn.addEventListener('click', copyResult);
  bstEl.addEventListener('input', function () {
    settings.bstMin = Number(bstEl.value) || 0;
    afterFilterChange();
  });
  resetBtn.addEventListener('click', function () {
    settings.gens = [];
    settings.regions = [];
    settings.types = [];
    settings.rarity = [];
    settings.habitats = [];
    settings.colors = [];
    settings.bstMin = 0;
    bstEl.value = '0';
    renderChips();
    afterFilterChange();
  });
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
  $('mega-history-clear').addEventListener('click', function () {
    history = [];
    renderHistory();
    persistAll();
  });
  modalClose.addEventListener('click', function () { modal.hidden = true; });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) modal.hidden = true;
  });

  /* ---------------- init ---------------- */
  restore();
  renderChips();
  updateNotes();
  noRepeatEl.checked = settings.noRepeat;
  noRepeatLabel.textContent = settings.noRepeat ? 'On' : 'Off';
  bstEl.value = String(settings.bstMin);
  renderCurrent();
  renderHistory();
})();
