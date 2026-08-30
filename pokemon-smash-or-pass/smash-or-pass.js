/* ============================================================
   Pokemon Smash or Pass — vanilla JS engine
   Data: window.POKEMON_DATA (data.js, 1351 entries)
   ============================================================ */
(function () {
  'use strict';

  var POKEMON = window.POKEMON_DATA || [];
  var BY_ID = {};
  POKEMON.forEach(function (p) { BY_ID[p.i] = p; });

  var TYPES = {
    fire: { label: 'Fire', color: '#FF9D55', light: false }, water: { label: 'Water', color: '#6890F0', light: true },
    grass: { label: 'Grass', color: '#78C850', light: false }, electric: { label: 'Electric', color: '#F8D030', light: false },
    ice: { label: 'Ice', color: '#98D8D8', light: false }, fighting: { label: 'Fighting', color: '#C03028', light: true },
    poison: { label: 'Poison', color: '#A040A0', light: true },  ground: { label: 'Ground', color: '#E0C068', light: false },
    flying: { label: 'Flying', color: '#A890F0', light: true },  psychic: { label: 'Psychic', color: '#F85888', light: true },
    bug: { label: 'Bug', color: '#A8B820', light: false }, rock: { label: 'Rock', color: '#B8A038', light: true },
    ghost: { label: 'Ghost', color: '#705898', light: true },  dark: { label: 'Dark', color: '#705848', light: true },
    dragon: { label: 'Dragon', color: '#7038F8', light: true },  steel: { label: 'Steel', color: '#B8B8D0', light: false },
    fairy: { label: 'Fairy', color: '#EE99AC', light: false }, normal: { label: 'Normal', color: '#A8A878', light: false }
  };
  var TYPE_MAP = TYPES;

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
    dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
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

  var GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var REGIONS = { 1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unova', 6: 'Kalos', 7: 'Alola', 8: 'Galar', 9: 'Paldea' };
  var SHINY_ODDS = 0.08;

  function displayName(slug) {
    return slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function pad4(n) { return String(n).padStart(4, '0'); }

  function secureRandom() {
    if (window.crypto && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(secureRandom() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /* ---------------- state ---------------- */
  var settings = { mode: 'random', types: [], gens: [], regions: [], habitats: [], stages: [], colors: [], bstMin: 0, includeLegendary: true };
  var deck = [];
  var deckIdx = 0;
  var results = []; // { i, verdict: 'smash'|'pass', shiny }
  var LS_RESULTS = 'rpg:smash-results';
  var current = null;
  var running = false;

  /* ---------------- DOM refs ---------------- */
  function $(id) { return document.getElementById(id); }
  var card = $('smash-card'), emptyEl = $('smash-empty'), verdictBtns = $('smash-verdicts'), statsEl = $('smash-stats');
  var imgEl = $('smash-img'), numEl = $('smash-num'), nameEl = $('smash-name');
  var statSmash = $('stat-smash'), statPass = $('stat-pass'), statRate = $('stat-rate'), statStreak = $('stat-streak');
  var historyPanel = $('history-panel'), historyList = $('history-list');
  var cardEl = $('smash-card'), stampEl = $('swipe-stamp'), stampText = $('swipe-stamp-text'), swipeHint = $('smash-swipe-hint');

  /* ---------------- Game Settings (display mode / types / gens / regions / rarity) ---------------- */
  var TYPE_ORDER = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
  var HABITAT_MAP = { cave: 'Cave', forest: 'Forest', grassland: 'Grassland', mountain: 'Mountain', rare: 'Rare', 'rough-terrain': 'Rough Terrain', sea: 'Sea', urban: 'Urban', 'waters-edge': 'Waters Edge' };
  var POKEDEX_COLORS = { red: 'Red', blue: 'Blue', yellow: 'Yellow', green: 'Green', black: 'Black', brown: 'Brown', purple: 'Purple', gray: 'Gray', white: 'White', pink: 'Pink' };

  function makeChip(parent, label, pressed, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-btn';
    b.textContent = label;
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.addEventListener('click', function () {
      onClick();
      /* parent may be re-rendered by resetGame? (it isn't, but keep current-state flip) */
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
    parent.appendChild(b);
    return b;
  }

  function toggleIn(arr, v) {
    var i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1); else arr.push(v);
  }

  function renderSettings() {
    /* Display Mode radios */
    var radios = document.querySelectorAll('input[name="smash-mode"]');
    for (var ri = 0; ri < radios.length; ri++) {
      radios[ri].checked = radios[ri].value === settings.mode;
    }

    /* Types (multi-select) */
    var tw = $('smash-types');
    tw.innerHTML = '';
    TYPE_ORDER.forEach(function (t) {
      makeChip(tw, TYPE_MAP[t].label, settings.types.indexOf(t) >= 0, function () {
        toggleIn(settings.types, t);
        updateNotes();
        resetGame();
      });
    });

    /* Generation (multi-select) */
    var gw = $('gen-buttons');
    gw.innerHTML = '';
    GENERATIONS.forEach(function (g) {
      makeChip(gw, 'Gen ' + g, settings.gens.indexOf(g) >= 0, function () {
        toggleIn(settings.gens, g);
        updateNotes();
        resetGame();
      });
    });

    /* Region (multi-select, region = generation index) */
    var rw = $('region-buttons');
    rw.innerHTML = '';
    GENERATIONS.forEach(function (g) {
      makeChip(rw, REGIONS[g], settings.regions.indexOf(g) >= 0, function () {
        toggleIn(settings.regions, g);
        updateNotes();
        resetGame();
      });
    });

    /* Habitat (multi-select) */
    var hw = $('smash-habitats');
    hw.innerHTML = '';
    Object.keys(HABITAT_MAP).forEach(function (h) {
      makeChip(hw, HABITAT_MAP[h], settings.habitats.indexOf(h) >= 0, function () {
        toggleIn(settings.habitats, h);
        updateNotes();
        resetGame();
      });
    });

    /* Evolution stage (multi-select) */
    var sw = $('smash-stages');
    sw.innerHTML = '';
    ['initial', 'middle', 'final'].forEach(function (s) {
      makeChip(sw, s.charAt(0).toUpperCase() + s.slice(1), settings.stages.indexOf(s) >= 0, function () {
        toggleIn(settings.stages, s);
        updateNotes();
        resetGame();
      });
    });

    /* Pokédex color (multi-select) */
    var cw = $('smash-colors');
    cw.innerHTML = '';
    Object.keys(POKEDEX_COLORS).forEach(function (c) {
      makeChip(cw, POKEDEX_COLORS[c], settings.colors.indexOf(c) >= 0, function () {
        toggleIn(settings.colors, c);
        updateNotes();
        resetGame();
      });
    });

    /* Min BST slider */
    var bst = $('smash-bst-min');
    bst.value = settings.bstMin;
    bst.addEventListener('input', function () {
      settings.bstMin = Number(bst.value);
      updateNotes();
      resetGame();
    });

    /* Legendary & Mythical switch */
    $('smash-legendary').checked = settings.includeLegendary;
    var lbl = $('smash-legendary-label');
    if (lbl) lbl.textContent = settings.includeLegendary ? 'On' : 'Off';

    updateNotes();
  }

  function updateNotes() {
    $('smash-mode-note').textContent = settings.mode === 'pokedex'
      ? 'Showing Pokémon in Pokédex order'
      : 'Showing Pokémon in random order';
    $('smash-types-note').textContent = settings.types.length
      ? 'Showing Pokémon of ' + settings.types.length + ' type' + (settings.types.length > 1 ? 's' : '')
      : 'Showing Pokémon of all types';
    $('smash-gens-note').textContent = settings.gens.length
      ? 'Showing Pokémon from ' + settings.gens.length + (settings.gens.length > 1 ? ' generations' : ' generation')
      : 'Showing Pokémon from all generations';
    $('smash-regions-note').textContent = settings.regions.length
      ? 'Showing Pokémon from ' + settings.regions.map(function (g) { return REGIONS[g]; }).join(', ')
      : 'Showing Pokémon from all regions';
    $('smash-habitats-note').textContent = settings.habitats.length
      ? 'Showing Pokémon from ' + settings.habitats.map(function (h) { return HABITAT_MAP[h]; }).join(', ')
      : 'Showing Pokémon from all habitats';
    $('smash-stages-note').textContent = settings.stages.length
      ? 'Showing ' + settings.stages.length + ' evolution stage' + (settings.stages.length > 1 ? 's' : '')
      : 'Showing every evolution stage';
    $('smash-colors-note').textContent = settings.colors.length
      ? 'Showing ' + settings.colors.length + ' color' + (settings.colors.length > 1 ? 's' : '')
      : 'Showing every color';
    $('smash-bst-note').textContent = settings.bstMin > 0
      ? 'BST ' + settings.bstMin + ' or higher'
      : 'No BST minimum';
  }

  /* ---------------- core game ---------------- */
  function poolFor() {
    return POKEMON.filter(function (p) {
      if (settings.types.length) {
        var hit = false;
        for (var i = 0; i < p.t.length; i++) {
          if (settings.types.indexOf(p.t[i]) >= 0) { hit = true; break; }
        }
        if (!hit) return false;
      }
      if (settings.gens.length && settings.gens.indexOf(p.g) < 0) return false;
      if (settings.regions.length && settings.regions.indexOf(p.g) < 0) return false;
      if (settings.habitats.length && (p.h === null || p.h === undefined || settings.habitats.indexOf(p.h) < 0)) return false;
      if (settings.stages.length && settings.stages.indexOf(p.ev) < 0) return false;
      if (settings.colors.length && settings.colors.indexOf(p.c) < 0) return false;
      if (settings.bstMin > 0 && p.tt < settings.bstMin) return false;
      if (!settings.includeLegendary && (p.lg || p.my)) return false;
      return true;
    });
  }

  function buildDeck() {
    var pool = poolFor();
    if (settings.mode === 'pokedex') {
      /* Pokédex order: low national № first, wraps around when finished */
      deck = pool.slice().sort(function (a, b) { return a.si - b.si; });
    } else {
      deck = shuffle(pool);
    }
    deckIdx = 0;
  }

  function nextPokemon() {
    if (!deck.length) buildDeck();
    if (deckIdx >= deck.length) {
      if (settings.mode === 'pokedex') deckIdx = 0; /* cycle back to the start */
      else buildDeck();                             /* reshuffle when pool exhausted */
    }
    var p = deck[deckIdx++];
    var shiny = secureRandom() < SHINY_ODDS;
    return { p: p, shiny: shiny };
  }

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

  function renderCurrent() {
    if (!current) return;
    var p = current.p;
    var siUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + p.si + '.png';
    imgEl.onerror = null;
    imgEl.src = current.shiny ? p.sps : p.sp;
    imgEl.alt = displayName(p.n) + (current.shiny ? ' (shiny)' : '') + ' artwork';
    imgEl.onerror = function () {
      if (imgEl.src !== siUrl) imgEl.src = siUrl;
      else imgEl.onerror = null;
    };
    numEl.textContent = '#' + pad4(p.si) + (current.shiny ? ' · ✨ SHINY' : '');
    nameEl.textContent = displayName(p.n);
    /* type-tinted aura behind the artwork (home-card style) */
    var artWrap = imgEl.parentNode;
    artWrap.style.setProperty('--aura', TYPE_MAP[p.t[0]] ? TYPE_MAP[p.t[0]].color : '#A8A878');

    /* Pokédex data table (left art / right data, bulba-style) */
    var data = $('smash-data');
    data.innerHTML = '';

    /* National № */
    data.appendChild(dexRow('National №', (function () {
      var s = document.createElement('span');
      s.className = 'dexdata-val';
      s.textContent = '#' + pad4(p.si);
      return s;
    })()));

    /* Type */
    data.appendChild(dexRow('Type', (function () {
      var wrap = document.createElement('div');
      wrap.className = 'chip-row';
      wrap.style.justifyContent = 'flex-start';
      wrap.style.marginTop = '0';
      p.t.forEach(function (t) {
        var m = TYPE_MAP[t];
        var chip = document.createElement('span');
        chip.className = 'type-tag';
        chip.style.setProperty('--tag', m ? m.color : '#A8A878');
        chip.style.setProperty('--tag-text', m && m.light ? '#fff' : '#121212');
        chip.textContent = m ? m.label : t;
        wrap.appendChild(chip);
      });
      return wrap;
    })()));

    /* Generation */
    data.appendChild(dexRow('Generation', (function () {
      var s = document.createElement('span');
      s.className = 'dexdata-val';
      s.textContent = 'Gen ' + p.g + ' · ' + (REGIONS[p.g] || '');
      return s;
    })()));

    /* Rarity */
    data.appendChild(dexRow('Rarity', (function () {
      var s = document.createElement('span');
      s.className = 'dexdata-val';
      s.textContent = p.lg ? 'Legendary' : (p.my ? 'Mythical' : 'Standard');
      return s;
    })()));

    /* Evolution stage */
    data.appendChild(dexRow('Evolution', (function () {
      var s = document.createElement('span');
      s.className = 'dexdata-val';
      s.textContent = p.ev === 'initial' ? 'Initial' : (p.ev === 'middle' ? 'Middle' : 'Final');
      return s;
    })()));

    /* BST */
    data.appendChild(dexRow('Base stats', (function () {
      var s = document.createElement('span');
      s.className = 'dexdata-val';
      s.textContent = p.tt + ' total';
      return s;
    })()));

    /* Abilities */
    data.appendChild(dexRow('Abilities', (function () {
      var list = document.createElement('ol');
      list.className = 'dexdata-abilities';
      p.ab.forEach(function (a, i) {
        var li = document.createElement('li');
        li.textContent = (i + 1) + '. ' + displayName(a);
        list.appendChild(li);
      });
      return list;
    })()));
    data.appendChild(dexRow('Type coverage', (function () {
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
            tag.textContent = TYPE_MAP[t].label.toUpperCase();
            tag.style.background = TYPE_MAP[t].color;
            tag.style.color = TYPE_MAP[t].light ? '#121212' : '#fff';
            row.appendChild(tag);
          });
        }
        wrap.appendChild(row);
      });
      return wrap;
    })()));
  }

  function updateStats() {
    var smash = results.filter(function (r) { return r.verdict === 'smash'; }).length;
    var pass = results.length - smash;
    var rate = results.length ? Math.round((smash / results.length) * 100) : 0;
    var streak = 0;
    for (var i = results.length - 1; i >= 0 && results[i].verdict === 'smash'; i--) streak++;
    statSmash.textContent = '💖 ' + smash;
    statPass.textContent = '🚫 ' + pass;
    statRate.textContent = rate + '% smash rate';
    statStreak.textContent = '🔥 streak ' + streak;
  }

  function persist() {
    try { localStorage.setItem(LS_RESULTS, JSON.stringify(results)); }
    catch (e) { /* private mode — ignore */ }
  }

  function renderHistory() {
    historyList.innerHTML = '';
    historyPanel.hidden = results.length === 0;
    results.slice().reverse().forEach(function (r) {
      var p = BY_ID[r.i];
      if (!p) return;
      var li = document.createElement('li');
      li.className = 'history-row';
      var btn = document.createElement('div');
      btn.className = 'history-item';
      btn.style.cursor = 'default';
      var label = document.createElement('span');
      label.className = 'history-label';
      label.textContent = (r.verdict === 'smash' ? '💖 Smash' : '🚫 Pass');
      btn.appendChild(label);
      var thumbs = document.createElement('span');
      thumbs.className = 'history-thumbs';
      var img = document.createElement('img');
      img.src = r.shiny ? p.sps : p.sp;
      img.alt = displayName(p.n);
      img.width = 40; img.height = 40; img.loading = 'lazy';
      img.onerror = function () {
        var fb = img.src.replace('/other/official-artwork', '');
        if (fb !== img.src) img.src = fb; else img.onerror = null;
      };
      thumbs.appendChild(img);
      btn.appendChild(thumbs);
      li.appendChild(btn);
      historyList.appendChild(li);
    });
  }

  function judge(verdict) {
    if (!current || swipe.lock) return;
    results.push({ i: current.p.i, verdict: verdict, shiny: current.shiny });
    persist();
    current = nextPokemon();
    renderCurrent();
    updateStats();
    renderHistory();
  }

  /* ---------------- swipe (tinder-style: drag left = pass, right = smash) ---------------- */
  var swipe = { active: false, lock: false, startX: 0, startY: 0, lastDx: 0 };

  function swipeThreshold() {
    return Math.max(70, cardEl.offsetWidth * 0.22);
  }
  function setStamp(verdict) {
    if (!verdict) { stampEl.hidden = true; return; }
    stampEl.hidden = false;
    stampEl.className = 'swipe-stamp ' + verdict;
    stampText.textContent = verdict === 'smash' ? 'SMASH' : 'PASS';
  }
  function swipeCancel() {
    cardEl.style.transition = 'transform 0.25s ease';
    cardEl.style.transform = '';
    setTimeout(function () { cardEl.style.transition = ''; }, 260);
    setStamp(null);
  }
  function swipeResolve(verdict) {
    swipe.lock = true;
    cardEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    var outX = (verdict === 'smash' ? 1 : -1) * Math.max(window.innerWidth * 1.1, 640);
    var rot = verdict === 'smash' ? 18 : -18;
    cardEl.style.transform = 'translateX(' + outX + 'px) rotate(' + rot + 'deg)';
    cardEl.style.opacity = '0';
    setTimeout(function () {
      swipe.lock = false;
      judge(verdict);
      cardEl.style.transition = '';
      cardEl.style.transform = '';
      cardEl.style.opacity = '';
      setStamp(null);
    }, 290);
  }

  cardEl.addEventListener('pointerdown', function (e) {
    if (swipe.lock || !running || !current) return;
    swipe.active = true;
    swipe.startX = e.clientX;
    swipe.startY = e.clientY;
    swipe.lastDx = 0;
    cardEl.style.transition = 'none';
  });
  document.addEventListener('pointermove', function (e) {
    if (!swipe.active) return;
    var dx = e.clientX - swipe.startX;
    var dy = e.clientY - swipe.startY;
    if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy) * 1.4) return; /* vertical scroll wins */
    swipe.lastDx = dx;
    cardEl.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx * 0.045) + 'deg)';
    setStamp(dx > 0 ? 'smash' : 'pass');
  });
  function swipeEnd() {
    if (!swipe.active) return;
    swipe.active = false;
    var th = swipeThreshold();
    if (swipe.lastDx >= th) swipeResolve('smash');
    else if (swipe.lastDx <= -th) swipeResolve('pass');
    else swipeCancel();
  }
  document.addEventListener('pointerup', swipeEnd);
  document.addEventListener('pointercancel', swipeEnd);

  function verdictSummary() {
    var smash = results.filter(function (r) { return r.verdict === 'smash'; }).length;
    var rate = results.length ? Math.round((smash / results.length) * 100) : 0;
    var label = rate >= 80 ? 'Certified Pokémon lover' : rate >= 50 ? 'Balanced taste, honestly' : rate >= 20 ? 'Seriously picky' : 'Certified Pokémon hater';
    return {
      text: 'I smashed ' + smash + '/' + results.length + ' Pokémon (' + rate + '%) on Random Pokemon Generator — ' + label + '. How picky are you? ' + location.origin + location.pathname,
      label: label
    };
  }

  function shareVerdicts() {
    var label = $('share-label');
    if (!results.length) {
      label.textContent = '📣 Judge some first!';
      setTimeout(function () { label.textContent = '📣 Share My Verdicts'; }, 1800);
      return;
    }
    var s = verdictSummary();
    copyToClipboard(s.text, function (ok) {
      label.textContent = ok ? '✅ Copied!' : '🔗 Link ready';
      setTimeout(function () { label.textContent = '📣 Share My Verdicts'; }, 1800);
    });
  }

  function copyToClipboard(text, done) {
    function legacyCopy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
      return ok;
    }
    /* last resort: manual-copy modal (app browsers block clipboard APIs) */
    function showManual() {
      var m = $('share-modal');
      $('share-modal-text').value = text;
      m.hidden = false;
      document.body.style.overflow = 'hidden';
      var ta = $('share-modal-text');
      ta.focus();
      ta.select();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); })
        .catch(function () {
          if (legacyCopy()) done(true);
          else { done(false); showManual(); }
        });
    } else {
      if (legacyCopy()) done(true);
      else { done(false); showManual(); }
    }
  }

  $('sm-close').addEventListener('click', function () {
    $('share-modal').hidden = true;
    document.body.style.overflow = '';
  });
  $('share-modal').addEventListener('click', function (e) {
    if (e.target === $('share-modal')) {
      $('share-modal').hidden = true;
      document.body.style.overflow = '';
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('share-modal').hidden) {
      $('share-modal').hidden = true;
      document.body.style.overflow = '';
    }
  });

  function startGame() {
    running = true;
    /* keep existing verdict history — only CLEAR wipes it */
    buildDeck();
    current = nextPokemon();
    card.hidden = false;
    emptyEl.hidden = true;
    statsEl.hidden = false;
    swipeHint.hidden = false;
    verdictBtns.hidden = false;
    cardEl.style.transform = '';
    cardEl.style.opacity = '';
    setStamp(null);
    renderCurrent();
    updateStats();
    renderHistory();
  }

  function resetGame() {
    if (!running) return;
    startGame();
  }

  /* ---------------- dex details modal (home-style) ---------------- */
  var STAT_LABELS = ['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE'];
  var modal = $('modal');

  function findBySlug(slug) {
    for (var i = 0; i < POKEMON.length; i++) {
      if (POKEMON[i].n === slug) return POKEMON[i];
    }
    return null;
  }

  function openModal(p) {
    var aura = TYPE_MAP[p.t[0]] ? TYPE_MAP[p.t[0]].color : '#A8A878';
    $('modal-card').style.setProperty('--aura', aura);

    $('modal-meta').innerHTML = '<span class="mnum">#' + pad4(p.si) + '</span> · Gen ' + p.g + ' · ' +
      (REGIONS[p.g] || '') + ' · ' + p.ev + (p.lg ? ' · Legendary' : '') + (p.my ? ' · Mythical' : '');
    $('modal-name').textContent = displayName(p.n);

    var mt = $('modal-types');
    mt.innerHTML = '';
    p.t.forEach(function (t) {
      var meta = TYPE_MAP[t];
      var chip = document.createElement('span');
      chip.className = 'type-tag';
      chip.style.setProperty('--tag', meta ? meta.color : '#A8A878');
      chip.style.setProperty('--tag-text', meta && meta.light ? '#fff' : '#121212');
      chip.textContent = meta ? meta.label : t;
      mt.appendChild(chip);
    });

    var img = $('modal-img');
    img.src = p.sp;
    img.alt = displayName(p.n) + ' artwork';
    var siUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + p.si + '.png';
    img.onerror = function () {
      if (img.src !== siUrl) img.src = siUrl;
      else img.onerror = null;
    };

    $('modal-bst').textContent = p.tt;
    var stats = $('modal-stats');
    stats.innerHTML = '';
    p.st.forEach(function (v, idx) {
      var row = document.createElement('div');
      row.className = 'stat-row';
      var dt = document.createElement('dt');
      dt.textContent = STAT_LABELS[idx];
      var dd = document.createElement('dd');
      dd.textContent = v;
      var track = document.createElement('div');
      track.className = 'stat-track';
      var fill = document.createElement('div');
      fill.className = 'stat-fill';
      fill.style.width = Math.min(100, (v / 255) * 100) + '%';
      track.appendChild(fill);
      row.appendChild(dt); row.appendChild(dd); row.appendChild(track);
      stats.appendChild(row);
    });

    var ab = $('modal-abilities');
    ab.innerHTML = '';
    p.ab.forEach(function (a) {
      var li = document.createElement('li');
      li.textContent = displayName(a);
      ab.appendChild(li);
    });

    var evo = $('modal-evo');
    evo.innerHTML = '';
    if (p.pre) {
      evo.appendChild(evoLink(p.pre));
      evo.appendChild(document.createTextNode('→'));
    }
    var cur = document.createElement('span');
    cur.className = 'evo-current';
    cur.textContent = displayName(p.n);
    evo.appendChild(cur);
    p.nxt.forEach(function (n) {
      evo.appendChild(document.createTextNode('→'));
      evo.appendChild(evoLink(n));
    });
    if (!p.pre && p.nxt.length === 0) {
      var none = document.createElement('span');
      none.className = 'evo-none';
      none.textContent = 'Does not evolve';
      evo.appendChild(none);
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('modal-close').focus();
  }

  function evoLink(slug) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'evo-link';
    b.textContent = displayName(slug);
    b.addEventListener('click', function () {
      var p = findBySlug(slug);
      if (p) openModal(p);
    });
    return b;
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  $('modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  /* ---------------- verdict cards modal ---------------- */
  var hmModal = $('history-modal');

  function openVerdictCards() {
    if (!results.length) return;
    var grid = $('hm-cards');
    grid.innerHTML = '';
    $('hm-meta').textContent = results.length + ' verdicts — click a card for full details';
    results.slice().reverse().forEach(function (r) {
      var p = BY_ID[r.i];
      if (!p) return;
      var card = document.createElement('div');
      card.className = 'v-card';
      card.style.cursor = 'pointer';
      card.title = 'Click for full details';
      card.addEventListener('click', function () { openModal(p); });
      var v = document.createElement('span');
      v.className = 'v-verdict ' + r.verdict;
      v.textContent = r.verdict === 'smash' ? '💖 Smash' : '🚫 Pass';
      card.appendChild(v);
      var img = document.createElement('img');
      img.src = r.shiny ? p.sps : p.sp;
      img.alt = displayName(p.n);
      img.width = 72;
      img.height = 72;
      img.loading = 'lazy';
      img.onerror = function () {
        var fb = img.src.replace('/other/official-artwork', '');
        if (fb !== img.src) img.src = fb; else img.onerror = null;
      };
      card.appendChild(img);
      var nm = document.createElement('span');
      nm.className = 'v-name';
      nm.textContent = displayName(p.n);
      card.appendChild(nm);
      var bst = document.createElement('span');
      bst.className = 'v-bst';
      bst.textContent = 'BST ' + p.tt;
      card.appendChild(bst);
      grid.appendChild(card);
    });
    hmModal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('hm-close').focus();
  }

  function closeVerdictCards() {
    hmModal.hidden = true;
    document.body.style.overflow = '';
  }

  $('history-cards-btn').addEventListener('click', openVerdictCards);
  $('hm-close').addEventListener('click', closeVerdictCards);
  hmModal.addEventListener('click', function (e) { if (e.target === hmModal) closeVerdictCards(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !hmModal.hidden) closeVerdictCards();
  });

  /* ---------------- events ---------------- */
  $('start-btn').addEventListener('click', startGame);
  $('smash-btn').addEventListener('click', function () { judge('smash'); });
  $('pass-btn').addEventListener('click', function () { judge('pass'); });
  $('share-btn').addEventListener('click', shareVerdicts);
  /* Display Mode radios */
  (function () {
    var radios = document.querySelectorAll('input[name="smash-mode"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener('change', function () {
        settings.mode = this.value;
        updateNotes();
        resetGame();
      });
    }
  })();
  /* Legendary & Mythical switch */
  $('smash-legendary').addEventListener('change', function () {
    settings.includeLegendary = this.checked;
    var lbl = $('smash-legendary-label');
    if (lbl) lbl.textContent = this.checked ? 'On' : 'Off';
    resetGame();
  });
  $('history-clear').addEventListener('click', function () {
    results = [];
    persist();
    /* reset the deck to the full original pool (restart from scratch) */
    buildDeck();
    updateStats();
    renderHistory();
  });

  document.addEventListener('keydown', function (e) {
    if (!running || !current) return;
    var k = e.key.toLowerCase();
    if (k === 's') judge('smash');
    else if (k === 'p') judge('pass');
  });

  /* ---------------- init ---------------- */
  renderSettings();
  /* restore persisted verdicts (survive refresh) */
  try { results = JSON.parse(localStorage.getItem(LS_RESULTS) || '[]'); }
  catch (e) { results = []; }
  updateStats();
  renderHistory();
})();
