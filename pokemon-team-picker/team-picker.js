/* ============================================================
   Pokemon Team Picker — competitive 6-slot team builder
   ES5 IIFE, no build step. Mirrors the house design system.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var DATA = window.POKEMON_DATA || [];
  var MOVESET = window.POKEMON_MOVESET || null;   // {si: [moveSlugs]} (may be missing)
  var MOVES = window.POKEMON_MOVES || {};         // {slug: {n,t,p,pp,a,c}}

  /* ---------------- constants ---------------- */
  var TYPES = [
    { slug: 'normal', label: 'Normal' }, { slug: 'fire', label: 'Fire' },
    { slug: 'water', label: 'Water' }, { slug: 'electric', label: 'Electric' },
    { slug: 'grass', label: 'Grass' }, { slug: 'ice', label: 'Ice' },
    { slug: 'fighting', label: 'Fighting' }, { slug: 'poison', label: 'Poison' },
    { slug: 'ground', label: 'Ground' }, { slug: 'flying', label: 'Flying' },
    { slug: 'psychic', label: 'Psychic' }, { slug: 'bug', label: 'Bug' },
    { slug: 'rock', label: 'Rock' }, { slug: 'ghost', label: 'Ghost' },
    { slug: 'dragon', label: 'Dragon' }, { slug: 'dark', label: 'Dark' },
    { slug: 'steel', label: 'Steel' }, { slug: 'fairy', label: 'Fairy' }
  ];
  var TYPE_MAP = {};
  TYPES.forEach(function (t) { TYPE_MAP[t.slug] = t; });

  /* Attacker -> defender multiplier (non-1 entries only); absent = 1. */
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

  /* natures: [name, raisedStatIdx|null, loweredStatIdx|null] */
  var NATURES = [
    ['Adamant', 1, 3], ['Bold', 2, 1], ['Brave', 1, 5], ['Calm', 4, 1],
    ['Careful', 4, 3], ['Gentle', 4, 2], ['Hasty', 5, 2], ['Impish', 2, 3],
    ['Jolly', 5, 3], ['Lax', 2, 4], ['Lonely', 1, 2], ['Mild', 3, 2],
    ['Modest', 3, 1], ['Naive', 5, 4], ['Naughty', 1, 4], ['Quiet', 3, 5],
    ['Rash', 3, 4], ['Relaxed', 2, 5], ['Sassy', 4, 5], ['Timid', 5, 1],
    ['Bashful', null, null], ['Docile', null, null], ['Hardy', null, null],
    ['Quirky', null, null], ['Serious', null, null]
  ];

  var ITEMS = [
    ['', 'No item'], ['leftovers', 'Leftovers'], ['choice-band', 'Choice Band'],
    ['choice-specs', 'Choice Specs'], ['choice-scarf', 'Choice Scarf'],
    ['life-orb', 'Life Orb'], ['focus-sash', 'Focus Sash'], ['assault-vest', 'Assault Vest'],
    ['rocky-helmet', 'Rocky Helmet'], ['light-clay', 'Light Clay'],
    ['heavy-duty-boots', 'Heavy-Duty Boots'], ['eviolite', 'Eviolite'],
    ['expert-belt', 'Expert Belt'], ['muscle-band', 'Muscle Band'],
    ['wise-glasses', 'Wise Glasses'], ['scope-lens', 'Scope Lens'],
    ['wide-lens', 'Wide Lens'], ['air-balloon', 'Air Balloon'],
    ['safety-goggles', 'Safety Goggles'], ['mental-herb', 'Mental Herb'],
    ['power-herb', 'Power Herb'], ['weakness-policy', 'Weakness Policy'],
    ['red-card', 'Red Card'], ['eject-button', 'Eject Button'],
    ['quick-claw', 'Quick Claw'], ['kings-rock', "King's Rock"],
    ['bright-powder', 'Bright Powder'], ['sitrus-berry', 'Sitrus Berry'],
    ['lum-berry', 'Lum Berry'], ['chesto-berry', 'Chesto Berry'],
    ['oran-berry', 'Oran Berry'], ['salac-berry', 'Salac Berry'],
    ['liechi-berry', 'Liechi Berry'], ['petaya-berry', 'Petaya Berry'],
    ['leftovers', 'Leftovers'], ['adrenaline-orb', 'Adrenaline Orb'],
    ['smoke-ball', 'Smoke Ball'], ['shed-shell', 'Shed Shell'],
    ['clear-amulet', 'Clear Amulet'], ['punching-glove', 'Punching Glove'],
    ['booster-energy', 'Booster Energy'], ['loaded-dice', 'Loaded Dice'],
    ['protective-pads', 'Protective Pads'], ['room-service', 'Room Service']
  ];
  var ITEM_MAP = {};
  ITEMS.forEach(function (it) { ITEM_MAP[it[0]] = it[1]; });

  var STAT_LABELS = ['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE'];
  var PAGE_SIZE = 15;

  var LS_TEAM = 'rpg:team-picker-team';
  var LS_TEAMS = 'rpg:team-picker-teams';
  var LS_LIBRARY = 'rpg:team-picker-my-pokemon';

  /* mega forms: si -> array of mega entries */
  var MEGA_MAP = {};
  DATA.forEach(function (p) {
    if (/-mega(-\w+)?$/.test(p.n)) {
      (MEGA_MAP[p.si] = MEGA_MAP[p.si] || []).push(p);
    }
  });

  /* ---------------- helpers ---------------- */
  function displayName(slug) {
    return slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function showdownName(p) {
    if (/mr-mime|mr-rime|mime-jr/.test(p.n)) return displayName(p.n);
    return displayName(p.n).replace(/ /g, '-');
  }
  function typeColor(slug) {
    var map = { normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030', grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0', ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820', rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848', steel: '#B8B8D0', fairy: '#EE99AC' };
    return map[slug] || '#A8A878';
  }
  function byId(i) {
    for (var j = 0; j < DATA.length; j++) { if (DATA[j].i === i) return DATA[j]; }
    return null;
  }
  function bySlug(slug) {
    for (var j = 0; j < DATA.length; j++) { if (DATA[j].n === slug) return DATA[j]; }
    return null;
  }
  function baseOf(si) {
    for (var j = 0; j < DATA.length; j++) { if (DATA[j].si === si && !/-mega/.test(DATA[j].n)) return DATA[j]; }
    for (var k = 0; k < DATA.length; k++) { if (DATA[k].si === si) return DATA[k]; }
    return null;
  }

  /* level-50 stat: IV 31, EV 0, neutral — then nature mult */
  function lvl50Stat(base, idx, nature) {
    var v = Math.floor((2 * base + 31) * 50 / 100);
    if (idx === 0) {
      v = Math.floor((2 * base + 31 + 100) * 50 / 100) + 10;
    } else {
      v = v + 5;
    }
    if (nature) {
      var raised = nature[1], lowered = nature[2];
      if (raised === idx) v = Math.floor(v * 1.1);
      else if (lowered === idx) v = Math.floor(v * 0.9);
    }
    return v;
  }

  function natureByName(name) {
    for (var j = 0; j < NATURES.length; j++) { if (NATURES[j][0] === name) return NATURES[j]; }
    return null;
  }

  /* ---------------- state ---------------- */
  function defaultSlot() { return null; }
  var state = {
    name: 'My team',
    slots: [null, null, null, null, null, null],
    selSlot: 0,
    filters: {
      reg: 'M-B', types: [], typeMode: 'or', moves: [], moveMode: 'or',
      abilities: [], gens: [], mega: null
    },
    search: '',
    statMode: 'lvl50',
    sortKey: 'dex',
    sortDir: 'asc',
    page: 1,
    editing: null,   // {slotIdx, draft} while modal open
    teams: [],
    library: []
  };

  var teamNameEl = $('tp-team-name');
  var tableBody = $('tp-table-body');
  var defenseBody = $('tp-defense-body');

  /* ---------------- slot helpers ---------------- */
  function effectivePokemon(slot) {
    if (!slot) return null;
    if (slot.mega) {
      var m = bySlug(slot.mega);
      if (m) return m;
    }
    return byId(slot.i);
  }
  function slotAbility(slot, eff) {
    var ab = eff ? eff.ab : [];
    if (!slot) return '';
    for (var j = 0; j < ab.length; j++) {
      if (ab[j] === slot.ability) return slot.ability;
    }
    return ab.length ? ab[0] : '';
  }
  function movesOf(slot, si) {
    if (!MOVESET || !MOVESET[String(si)]) return [];
    var all = MOVESET[String(si)] || [];
    return (slot.moves || []).filter(function (m) { return all.indexOf(m) !== -1; });
  }

  /* ---------------- persistence ---------------- */
  function saveTeam() {
    try { localStorage.setItem(LS_TEAM, JSON.stringify({ name: state.name, slots: state.slots })); } catch (e) {}
  }
  function loadTeam() {
    try {
      var raw = localStorage.getItem(LS_TEAM);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.name) state.name = d.name;
        if (d && d.slots && d.slots.length === 6) state.slots = d.slots;
      }
    } catch (e) {}
    try {
      var lib = JSON.parse(localStorage.getItem(LS_LIBRARY) || '[]');
      if (lib && lib.length !== undefined) state.library = lib;
    } catch (e) {}
  }
  function saveLibrary() {
    try { localStorage.setItem(LS_LIBRARY, JSON.stringify(state.library)); } catch (e) {}
  }
  function clearTeam() {
    state.slots = [null, null, null, null, null, null];
    state.name = 'My team';
    try { localStorage.removeItem(LS_TEAM); } catch (e) {}
    teamNameEl.value = state.name;
    renderSlots(); renderDefense();
  }

  /* ---------------- filters / pool ---------------- */
  function learnsetOf(p) {
    if (!MOVESET) return [];
    var list = MOVESET[String(p.si)];
    return list || [];
  }
  function poolMatches(p) {
    var f = state.filters;
    if (f.types.length) {
      var ok = false;
      if (f.typeMode === 'or') {
        for (var i = 0; i < f.types.length; i++) { if (p.t.indexOf(f.types[i]) !== -1) { ok = true; break; } }
      } else {
        ok = true;
        for (var j = 0; j < f.types.length; j++) { if (p.t.indexOf(f.types[j]) === -1) { ok = false; break; } }
      }
      if (!ok) return false;
    }
    if (f.moves.length) {
      var ls = learnsetOf(p);
      var any = false, all = true;
      for (var k = 0; k < f.moves.length; k++) {
        var has = ls.indexOf(f.moves[k]) !== -1 || p.mv && p.mv.indexOf(f.moves[k]) !== -1;
        if (has) any = true; else all = false;
      }
      if (f.moveMode === 'or' && !any) return false;
      if (f.moveMode === 'and' && !all) return false;
    }
    if (f.abilities.length) {
      var hasAb = false;
      for (var a = 0; a < f.abilities.length; a++) { if (p.ab.indexOf(f.abilities[a]) !== -1) { hasAb = true; break; } }
      if (!hasAb) return false;
    }
    if (f.gens.length && f.gens.indexOf(p.g) === -1) return false;
    if (f.mega === 'yes' && !/-mega/.test(p.n) && !MEGA_MAP[p.si]) return false;
    if (f.mega === 'no' && /-mega/.test(p.n)) return false;
    if (state.search) {
      var q = state.search.toLowerCase();
      var hay = (p.n + ' ' + displayName(p.n)).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function statOf(p, idx) {
    if (state.statMode === 'base') return p.st[idx];
    return lvl50Stat(p.st[idx], idx, null);
  }
  function sortPool(pool) {
    var key = state.sortKey, dir = state.sortDir === 'asc' ? 1 : -1;
    var idxMap = { hp: 0, atk: 1, def: 2, spa: 3, spd: 4, spe: 5 };
    pool = pool.slice();
    pool.sort(function (a, b) {
      var va, vb;
      if (key === 'dex') { va = a.si; vb = b.si; }
      else if (key === 'name') { va = displayName(a.n); vb = displayName(b.n); return va < vb ? -dir : va > vb ? dir : 0; }
      else { va = statOf(a, idxMap[key]); vb = statOf(b, idxMap[key]); }
      return (va - vb) * dir || (a.si - b.si);
    });
    return pool;
  }

  function currentPool() {
    var pool = [];
    for (var j = 0; j < DATA.length; j++) {
      if (poolMatches(DATA[j])) pool.push(DATA[j]);
    }
    return sortPool(pool);
  }

  /* ---------------- chips ---------------- */
  function makeChip(parent, label, pressed, onClick, extraClass, style) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-btn type-chip' + (extraClass ? ' ' + extraClass : '');
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    if (style) b.style.cssText = style;
    b.textContent = label;
    b.addEventListener('click', function () {
      onClick();
      if (!b.isConnected) return;
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
    parent.appendChild(b);
    return b;
  }

  /* ---------------- slots render ---------------- */
  function renderSlots() {
    var row = $('tp-slots');
    row.innerHTML = '';
    state.slots.forEach(function (slot, idx) {
      var cell = document.createElement('div');
      cell.className = 'tp-slot' + (idx === state.selSlot ? ' tp-slot-active' : '') + (slot ? ' tp-slot-filled' : '');
      cell.setAttribute('draggable', 'true');
      cell.setAttribute('aria-label', 'Slot ' + (idx + 1) + (slot ? ', ' + displayName(slot.n || '') : ', empty'));
      cell.dataset.slot = idx;

      if (slot) {
        var eff = effectivePokemon(slot);
        var art = document.createElement('img');
        art.className = 'tp-slot-art';
        art.src = eff ? eff.sp : '';
        art.alt = '';
        art.width = 56; art.height = 56;
        var nm = document.createElement('div');
        nm.className = 'tp-slot-name';
        nm.textContent = slot.nick || displayName(slot.n);
        var tg = document.createElement('div');
        tg.className = 'tp-slot-types';
        (eff ? eff.t : []).forEach(function (t) {
          var s = document.createElement('span');
          s.className = 'type-tag';
          s.style.setProperty('--tag', typeColor(t));
          s.textContent = t.charAt(0).toUpperCase() + t.slice(1);
          tg.appendChild(s);
        });
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'tp-slot-del';
        del.setAttribute('aria-label', 'Remove slot ' + (idx + 1));
        del.textContent = '✕';
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          state.slots[idx] = null;
          saveTeam(); renderSlots(); renderDefense();
        });
        cell.appendChild(art); cell.appendChild(nm); cell.appendChild(tg); cell.appendChild(del);
      } else {
        var plus = document.createElement('div');
        plus.className = 'tp-slot-empty';
        plus.textContent = '+ Slot ' + (idx + 1);
        cell.appendChild(plus);
      }

      cell.addEventListener('click', function () {
        state.selSlot = idx;
        renderSlots();
        if (state.slots[idx]) openSlotEditor(idx);
        else {
          var input = $('tp-search');
          if (input) { input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        }
      });

      /* drag reorder */
      cell.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', String(idx));
        cell.classList.add('tp-slot-dragging');
      });
      cell.addEventListener('dragend', function () {
        cell.classList.remove('tp-slot-dragging');
      });
      cell.addEventListener('dragover', function (e) {
        e.preventDefault();
        cell.classList.add('tp-slot-over');
      });
      cell.addEventListener('dragleave', function () {
        cell.classList.remove('tp-slot-over');
      });
      cell.addEventListener('drop', function (e) {
        e.preventDefault();
        var from = parseInt(e.dataTransfer.getData('text/plain'), 10);
        cell.classList.remove('tp-slot-over');
        if (isNaN(from) || from === idx) return;
        var tmp = state.slots[from];
        state.slots[from] = state.slots[idx];
        state.slots[idx] = tmp;
        saveTeam(); renderSlots(); renderDefense();
      });

      row.appendChild(cell);
    });
  }

  /* ---------------- table render ---------------- */
  function renderTable() {
    var pool = currentPool();
    var pages = Math.max(1, Math.ceil(pool.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;
    var start = (state.page - 1) * PAGE_SIZE;
    var slice = pool.slice(start, start + PAGE_SIZE);
    var rows = '';
    slice.forEach(function (p) {
      var hasMega = MEGA_MAP[p.si] ? true : false;
      rows += '<tr class="tp-row" data-i="' + p.i + '" tabindex="0">' +
        '<td class="tp-td-num">' + String(p.si).padStart(3, '0') + '</td>' +
        '<td class="tp-td-name"><img class="tp-row-art" src="' + p.sp + '" alt="" loading="lazy" width="32" height="32" />' +
        '<span class="tp-row-name">' + displayName(p.n) + '</span>' +
        (hasMega ? '<span class="tp-mega-badge">M</span>' : '') + '</td>' +
        '<td class="tp-td-stat">' + statOf(p, 0) + '</td>' +
        '<td class="tp-td-stat">' + statOf(p, 1) + '</td>' +
        '<td class="tp-td-stat">' + statOf(p, 2) + '</td>' +
        '<td class="tp-td-stat">' + statOf(p, 3) + '</td>' +
        '<td class="tp-td-stat">' + statOf(p, 4) + '</td>' +
        '<td class="tp-td-stat">' + statOf(p, 5) + '</td>' +
        '</tr>';
    });
    tableBody.innerHTML = rows;
    $('tp-page-info').textContent = 'Page ' + state.page + ' / ' + pages + ' · ' + pool.length + ' Pokémon';
    $('tp-page-prev').disabled = state.page <= 1;
    $('tp-page-next').disabled = state.page >= pages;

    /* row click -> place into selected slot */
    var trs = tableBody.querySelectorAll('.tp-row');
    for (var j = 0; j < trs.length; j++) {
      (function (tr) {
        function place() {
          var p = byId(parseInt(tr.getAttribute('data-i'), 10));
          if (!p) return;
          var first = state.slots[state.selSlot];
          state.slots[state.selSlot] = {
            i: p.i, si: p.si, n: p.n, nick: '', nature: 'Serious',
            ability: p.ab.length ? p.ab[0] : '', item: '', moves: [], mega: null
          };
          saveTeam(); renderSlots(); renderDefense();
          openSlotEditor(state.selSlot);
        }
        tr.addEventListener('click', place);
        tr.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') place();
        });
      })(trs[j]);
    }
  }

  /* ---------------- filter UI ---------------- */
  function renderFilterChips() {
    /* types */
    var wrap = $('tp-type-chips');
    wrap.innerHTML = '';
    TYPES.forEach(function (t) {
      makeChip(wrap, t.label, state.filters.types.indexOf(t.slug) !== -1, function () {
        var i = state.filters.types.indexOf(t.slug);
        if (i === -1) state.filters.types.push(t.slug); else state.filters.types.splice(i, 1);
        state.page = 1; renderTable();
      }, null, '--chip:' + typeColor(t.slug) + ';');
    });
    /* gens */
    var gw = $('tp-gen-chips');
    gw.innerHTML = '';
    for (var g = 1; g <= 9; g++) {
      (function (gen) {
        makeChip(gw, String(gen), state.filters.gens.indexOf(gen) !== -1, function () {
          var i = state.filters.gens.indexOf(gen);
          if (i === -1) state.filters.gens.push(gen); else state.filters.gens.splice(i, 1);
          state.page = 1; renderTable();
        });
      })(g);
    }
    /* mega yes/no single */
    var mw = $('tp-mega-chips');
    mw.innerHTML = '';
    makeChip(mw, 'Yes', state.filters.mega === 'yes', function () {
      state.filters.mega = state.filters.mega === 'yes' ? null : 'yes';
      state.page = 1; renderTable(); syncMegaChips();
    }, 'tp-single-chip');
    makeChip(mw, 'No', state.filters.mega === 'no', function () {
      state.filters.mega = state.filters.mega === 'no' ? null : 'no';
      state.page = 1; renderTable(); syncMegaChips();
    }, 'tp-single-chip');
  }
  function syncMegaChips() {
    var btns = $('tp-mega-chips').querySelectorAll('.chip-btn');
    var want = ['yes', 'no'];
    for (var j = 0; j < btns.length; j++) {
      var m = btns[j].textContent.toLowerCase().replace(/\s/g, '');
      btns[j].setAttribute('aria-pressed', state.filters.mega === want[j] ? 'true' : 'false');
    }
  }
  function syncModeChips() {
    var rows = document.querySelectorAll('.tp-mode-row');
    for (var r = 0; r < rows.length; r++) {
      var isType = (r === 0);
      var btns = rows[r].querySelectorAll('.chip-mode');
      for (var j = 0; j < btns.length; j++) {
        var mode = btns[j].getAttribute('data-mode');
        var active = isType ? (state.filters.typeMode === mode) : (state.filters.moveMode === mode);
        btns[j].setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    }
  }

  function fillMoveFilter() {
    var sel = $('tp-move-filter');
    var slugs = MOVES ? Object.keys(MOVES).sort() : [];
    sel.innerHTML = '';
    slugs.forEach(function (slug) {
      var o = document.createElement('option');
      o.value = slug;
      var m = MOVES[slug];
      o.textContent = (m.n || slug) + ' (' + (m.p || '—') + ' ' + (m.c ? m.c.charAt(0).toUpperCase() : '') + ')';
      sel.appendChild(o);
    });
  }
  function fillAbilityFilter() {
    var sel = $('tp-ability-filter');
    var set = {};
    DATA.forEach(function (p) { p.ab.forEach(function (a) { set[a] = true; }); });
    var ab = Object.keys(set).sort();
    sel.innerHTML = '';
    ab.forEach(function (a) {
      var o = document.createElement('option');
      o.value = a;
      o.textContent = displayAbilityName(a);
      sel.appendChild(o);
    });
  }
  function displayAbilityName(slug) {
    return slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }

  function updateFilterNote() {
    var f = state.filters;
    var bits = [];
    if (f.reg && f.reg !== 'all') bits.push('regulation ' + f.reg);
    if (f.types.length) bits.push(f.typeMode === 'or' ? 'any of ' + f.types.length + ' types' : 'all of ' + f.types.length + ' types');
    if (f.moves.length) bits.push(f.moveMode === 'or' ? 'any of ' + f.moves.length + ' moves' : 'all of ' + f.moves.length + ' moves');
    if (f.abilities.length) bits.push(f.abilities.length + ' abilities');
    if (f.gens.length) bits.push('Gen ' + f.gens.join('-'));
    if (f.mega) bits.push(f.mega === 'yes' ? 'Mega-capable' : 'non-Mega');
    if (state.search) bits.push('“' + state.search + '”');
    var note = bits.length ? 'Showing: ' + bits.join(' · ') : 'Showing the full dex';
    $('tp-filter-note').textContent = note;
    var inline = $('tp-filter-note-inline');
    if (inline) inline.textContent = note;
  }

  /* ---------------- filters collapse ---------------- */
  function setFiltersCollapsed(collapsed) {
    var panel = document.querySelector('.tp-filters');
    var btn = $('tp-filters-toggle');
    if (!panel || !btn) return;
    panel.classList.toggle('tp-collapsed', collapsed);
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  /* ---------------- team defense ---------------- */
  function effectiveness(atkType, defTypes, levitate) {
    var mult = 1;
    var row = TYPE_CHART[atkType] || {};
    for (var j = 0; j < defTypes.length; j++) {
      var d = defTypes[j];
      if (row[d] !== undefined) mult *= row[d];
    }
    if (levitate && atkType === 'ground') mult = 0;
    return mult;
  }
  function fmtMult(m) {
    if (m === 0) return 'x0';
    if (m === 0.25) return 'x0.25';
    if (m === 0.5) return 'x0.5';
    if (m === 1) return 'x1';
    if (m === 2) return 'x2';
    if (m === 4) return 'x4';
    return 'x' + String(Math.round(m * 100) / 100);
  }
  function renderDefense() {
    var members = [];
    state.slots.forEach(function (slot, idx) {
      if (!slot) return;
      var eff = effectivePokemon(slot);
      if (!eff) return;
      members.push({
        slotIndex: idx, name: slot.nick || displayName(slot.n),
        types: eff.t || [], levitate: (slot.ability === 'levitate') || (eff.ab.indexOf('levitate') !== -1)
      });
    });
    if (!members.length) {
      defenseBody.innerHTML = '<p class="tp-defense-empty">Add Pokémon to see defensive matchups.</p>';
      return;
    }
    var rows = '';
    var TYPE_ORDER = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
    TYPE_ORDER.forEach(function (atk) {
      var cells = '';
      var weak = 0, resist = 0;
      members.forEach(function (m) {
        var mult = effectiveness(atk, m.types, m.levitate);
        var cls = mult > 1 ? 'tp-cell-weak' : mult < 1 && mult > 0 ? 'tp-cell-resist' : mult === 0 ? 'tp-cell-immun' : 'tp-cell-neut';
        cells += '<td class="' + cls + '">' + fmtMult(mult) + '</td>';
        if (mult > 1) weak++;
        if (mult < 1) resist++;
      });
      rows += '<tr><th scope="row" class="tp-def-type"><span class="tp-def-dot" style="background:var(--type-' + atk + ')"></span>' + atk.charAt(0).toUpperCase() + atk.slice(1) + '</th>' + cells +
        '<td class="tp-def-total ' + (weak > 0 ? 'tp-cell-weak' : '') + '">' + weak + '</td>' +
        '<td class="tp-def-total ' + (resist > 0 ? 'tp-cell-resist' : '') + '">' + resist + '</td>' +
        '<td class="tp-def-total">' + (resist - weak) + '</td></tr>';
    });
    var head = '<div class="tp-def-scroll"><table class="tp-def-table"><thead><tr>' +
      '<th scope="col">Type</th>' +
      members.map(function (m) { return '<th scope="col" class="tp-def-member" title="' + m.name + '">' + m.name.replace(/\b\w/g, function (c) { return c.toUpperCase(); }).slice(0, 14) + '</th>'; }).join('') +
      '<th scope="col" class="tp-def-weak" title="Total Weak">W</th>' +
      '<th scope="col" class="tp-def-resist" title="Total Resist">R</th>' +
      '<th scope="col" class="tp-def-tot" title="Total (Resist − Weak)">T</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="tool-note">W = weaknesses, R = resists/immunities per attacking type · T = R − W</p>';
    defenseBody.innerHTML = head;
  }

  /* ---------------- slot editor ---------------- */
  function openSlotEditor(idx) {
    var slot = state.slots[idx];
    if (!slot) return;
    var eff = effectivePokemon(slot);
    state.editing = { slotIdx: idx, draft: JSON.parse(JSON.stringify(slot)) };
    renderSlotEditor();
    $('slot-modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeSlotEditor() {
    $('slot-modal').hidden = true;
    document.body.style.overflow = '';
    state.editing = null;
  }
  function renderSlotEditor() {
    var ed = state.editing;
    if (!ed) return;
    var d = ed.draft;
    var eff = effectivePokemon(d);
    var base = eff || byId(d.i);
    $('slot-edit-art').src = base ? base.sp : '';
    $('slot-edit-art').alt = base ? displayName(base.n) : '';
    $('slot-edit-name').textContent = (d.nick || displayName(d.n)) + (d.mega ? ' (Mega)' : '');
    var tg = $('slot-edit-types');
    tg.innerHTML = '';
    (base ? base.t : []).forEach(function (t) {
      var s = document.createElement('span');
      s.className = 'type-tag';
      s.style.setProperty('--tag', typeColor(t));
      s.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      tg.appendChild(s);
    });
    var bst = base ? 'BST ' + base.tt : '';
    if (state.statMode === 'base') {
      bst += ' · Base ' + base.st.join('/');
    }
    $('slot-edit-bst').textContent = bst;
    $('slot-edit-nick').value = d.nick || '';

    /* natures */
    var natSel = $('slot-edit-nature');
    natSel.innerHTML = '';
    NATURES.forEach(function (n) {
      var o = document.createElement('option');
      o.value = n[0];
      o.textContent = n[0] + (n[1] !== null ? ' (+' + STAT_LABELS[n[1]] + ' −' + STAT_LABELS[n[2]] + ')' : '');
      natSel.appendChild(o);
    });
    natSel.value = d.nature || 'Serious';

    /* abilities */
    var abSel = $('slot-edit-ability');
    abSel.innerHTML = '';
    (base ? base.ab : []).forEach(function (a) {
      var o = document.createElement('option');
      o.value = a;
      o.textContent = displayAbilityName(a);
      abSel.appendChild(o);
    });
    if (base && base.ab.length) {
      var cur = d.ability && base.ab.indexOf(d.ability) !== -1 ? d.ability : base.ab[0];
      abSel.value = cur;
    }

    /* moves */
    var mvWrap = $('slot-edit-moves');
    mvWrap.innerHTML = '';
    var learn = MOVESET ? (MOVESET[String(base ? base.si : d.si)] || []) : [];
    var chosen = (d.moves || []).slice(0, 4);
    for (var j = 0; j < 4; j++) {
      var row = document.createElement('div');
      row.className = 'tp-move-row';
      var sel = document.createElement('select');
      sel.className = 'tp-select tp-move-select';
      sel.setAttribute('aria-label', 'Move ' + (j + 1));
      var opts = '<option value="">— Move ' + (j + 1) + ' —</option>';
      learn.forEach(function (slug) {
        var m = MOVES[slug];
        opts += '<option value="' + slug + '">' + (m ? m.n : slug) + (m && m.p ? ' · ' + m.p + ' ' + (m.c === 'status' ? 'ST' : m.c === 'physical' ? 'PH' : 'SP') : '') + '</option>';
      });
      sel.innerHTML = opts;
      sel.value = chosen[j] || '';
      sel.addEventListener('change', function () {
        var v = sel.value;
        var arr = d.moves = d.moves || [];
        var oldIdx = arr.indexOf(chosen[j]);
        if (oldIdx !== -1) arr.splice(oldIdx, 1);
        if (v) arr.push(v);
        d.moves = dedupe4(arr);
        renderSlotEditorStats();
      });
      row.appendChild(sel);
      mvWrap.appendChild(row);
    }

    /* items */
    var itSel = $('slot-edit-item');
    itSel.innerHTML = '';
    ITEMS.forEach(function (it) {
      var o = document.createElement('option');
      o.value = it[0];
      o.textContent = it[1];
      itSel.appendChild(o);
    });
    itSel.value = d.item || '';

    /* mega */
    var megaWrap = $('slot-edit-mega-wrap');
    var megaOptions = MEGA_MAP[d.si] || [];
    if (megaOptions.length && !/mega/.test(eff ? eff.n : '')) {
      megaWrap.hidden = false;
      $('slot-edit-mega').checked = !!d.mega;
    } else {
      megaWrap.hidden = true;
    }

    renderSlotEditorStats();
  }
  function dedupe4(arr) {
    var out = [];
    arr.forEach(function (m) { if (m && out.indexOf(m) === -1 && out.length < 4) out.push(m); });
    return out;
  }
  function renderSlotEditorStats() {
    var ed = state.editing;
    if (!ed) return;
    var d = ed.draft;
    var eff = effectivePokemon(d);
    var base = eff || byId(d.i);
    if (!base) return;
    var nature = natureByName(d.nature) || NATURES[20];
    var total = 0;
    var html = '<table class="tp-stat-preview"><thead><tr>';
    STAT_LABELS.forEach(function (l) {
      var up = nature[1] !== null && nature[1] === STAT_LABELS.indexOf(l);
      var dn = nature[2] !== null && nature[2] === STAT_LABELS.indexOf(l);
      html += '<th class="' + (up ? 'tp-stat-up' : dn ? 'tp-stat-dn' : '') + '">' + l + '</th>';
    });
    html += '<th>Total</th></tr><tr>';
    for (var j = 0; j < 6; j++) {
      var v = lvl50Stat(base.st[j], j, nature);
      total += v;
      html += '<td>' + v + '</td>';
    }
    html += '<td>' + total + '</td></tr></table>';
    var wrap = $('slot-edit-stats');
    wrap.innerHTML = html;
  }

  /* ---------------- import / export ---------------- */
  function buildShowdown() {
    var out = '';
    state.slots.forEach(function (slot) {
      if (!slot) return;
      var eff = effectivePokemon(slot);
      if (!eff) return;
      var nat = natureByName(slot.nature) || NATURES[20];
      var ab = slotAbility(slot, eff);
      var item = slot.item && ITEM_MAP[slot.item] ? slot.item : '';
      out += showdownName(eff) + (item ? ' @ ' + ITEM_MAP[item] : '') + '\n';
      out += 'Level: 50\n';
      out += 'Ability: ' + (ab ? displayAbilityName(ab) : '') + '\n';
      if (nat[0] !== 'Serious') out += 'Nature: ' + nat[0] + '\n';
      (slot.moves || []).forEach(function (m) {
        var mm = MOVES[m];
        if (mm) out += '- ' + displayName(mm.n) + '\n';
      });
      out += '\n';
    });
    return out.trim();
  }
  function buildTeamJSON() {
    return JSON.stringify({
      name: state.name,
      slots: state.slots.map(function (slot) {
        if (!slot) return null;
        if (slot.item && !ITEM_MAP[slot.item]) slot.item = '';
        return slot;
      })
    });
  }
  function importShowdown(text) {
    var lines = text.split(/\r?\n/);
    var slots = [];
    var cur = null;
    var nameRe = /^([A-Za-z0-9 .'()-]+)(?: @ ([A-Za-z0-9 .'()-]+))?/;
    lines.forEach(function (line) {
      line = line.trim();
      if (!line) { if (cur) { slots.push(cur); cur = null; } return; }
      var hv = line.match(/^Level:\s*(\d+)/i);
      if (hv) { if (cur) cur.level = parseInt(hv[1], 10); return; }
      var av = line.match(/^Ability:\s*(.+)/i);
      if (av) { if (cur) cur.ability = slugifyAbility(av[1]); return; }
      var nv = line.match(/^Nature:\s*(.+)/i);
      if (nv) { if (cur) cur.nature = nv[1].trim(); return; }
      var mv = line.match(/^-\s*(.+)/);
      if (mv) { if (cur && cur.moves.length < 4) cur.moves.push(slugifyMove(mv[1].trim())); return; }
      var iv = line.match(/^([A-Z]+):\s*(.+)/);
      if (iv) { if (cur) cur.item = slugifyItem(iv[1].trim()); return; }
      /* species line */
      var spm = line.match(nameRe);
      if (spm) {
        var species = spm[1].trim();
        if (cur) slots.push(cur);
        var p = null;
        if (species === 'Mr. Mime' || species === 'Mr. Rime' || species === 'Mime Jr.') {
          p = bySlug(species.toLowerCase().replace(/ /g, '-'));
        } else {
          p = bySlug(species.toLowerCase().replace(/ /g, '-'));
        }
        cur = p ? { i: p.i, si: p.si, n: p.n, nick: '', nature: 'Serious', ability: p.ab.length ? p.ab[0] : '', item: '', moves: [], mega: null, level: 50 } : null;
      }
    });
    if (cur) slots.push(cur);
    return slots.filter(Boolean);
  }
  function slugifyAbility(name) {
    var slug = name.trim().toLowerCase().split(/[ -]+/).join('-');
    /* match against data abilities */
    for (var j = 0; j < DATA.length; j++) {
      for (var k = 0; k < DATA[j].ab.length; k++) {
        if (DATA[j].ab[k] === slug) return slug;
      }
    }
    return slug;
  }
  function slugifyMove(name) {
    var slug = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-');
    if (MOVES[slug]) return slug;
    /* fuzzy find */
    var keys = Object.keys(MOVES);
    for (var j = 0; j < keys.length; j++) {
      if (MOVES[keys[j]].n.toLowerCase() === name.trim().toLowerCase()) return keys[j];
    }
    return slug;
  }
  function slugifyItem(name) {
    var slug = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-');
    if (ITEM_MAP[slug] !== undefined) return slug;
    return '';
  }

  /* ---------------- share ---------------- */
  function buildShareUrl() {
    var params = '?team=' + encodeURIComponent(JSON.stringify({
      name: state.name,
      slots: state.slots.map(function (slot) {
        if (!slot) return null;
        if (slot.item && !ITEM_MAP[slot.item]) slot.item = '';
        return slot;
      })
    }));
    return location.origin + location.pathname + params;
  }
  function copyToClipboard(text, done) {
    function legacyCopy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '0';
      ta.style.width = '1px';
      ta.style.height = '1px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      return ok;
    }
    function showManual() {
      var ta = $('share-modal-text');
      ta.value = text;
      $('share-modal').hidden = false;
      document.body.style.overflow = 'hidden';
      ta.focus(); ta.select();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); })
        .catch(function () { if (legacyCopy()) done(true); else { done(false); showManual(); } });
    } else {
      if (legacyCopy()) done(true); else { done(false); showManual(); }
    }
  }
  function shareMenu(kind) {
    var text;
    if (kind === 'showdown') text = buildShowdown();
    else if (kind === 'json') text = buildTeamJSON();
    else text = 'I built a Pokemon team on Random Pokemon Generator — ' + (state.name || 'My team') + '! Pick yours: ' + buildShareUrl();
    copyToClipboard(text, function (ok) {
      if (ok) flashStatus('✅ Copied!');
    });
  }
  function flashStatus(msg) {
    var el = $('tp-status');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('tp-status-show');
    setTimeout(function () { el.classList.remove('tp-status-show'); }, 2200);
  }

  /* ---------------- URL restore ---------------- */
  function restoreFromUrl() {
    try {
      var m = location.search.match(/[?&]team=([^&]+)/);
      if (!m) return false;
      var d = JSON.parse(decodeURIComponent(m[1]).replace(/\+/g, ' '));
      if (d && d.name) state.name = d.name;
      if (d && d.slots && d.slots.length === 6) state.slots = d.slots;
      if (teamNameEl) teamNameEl.value = state.name;
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- init ---------------- */
  function init() {
    loadTeam();
    var restored = restoreFromUrl();
    if (teamNameEl) teamNameEl.value = state.name;

    renderFilterChips();
    fillMoveFilter();
    fillAbilityFilter();
    syncModeChips();
    renderTable();
    renderSlots();
    renderDefense();
    updateFilterNote();

    /* filters collapse: folded by default on small screens */
    var filtersToggle = $('tp-filters-toggle');
    if (filtersToggle) {
      filtersToggle.addEventListener('click', function () {
        var panel = document.querySelector('.tp-filters');
        setFiltersCollapsed(!(panel && panel.classList.contains('tp-collapsed')));
      });
      if (window.innerWidth <= 760) setFiltersCollapsed(true);
    }

    /* events */
    if (teamNameEl) {
      teamNameEl.addEventListener('input', function () {
        state.name = teamNameEl.value || 'My team';
        saveTeam();
      });
    }
    $('tp-name-clear').addEventListener('click', function () {
      state.name = 'My team';
      teamNameEl.value = 'My team';
      saveTeam();
    });

    $('tp-search').addEventListener('input', function () {
      state.search = this.value;
      state.page = 1;
      renderTable();
      updateFilterNote();
    });

    $('tp-tab-lvl50').addEventListener('click', function () {
      state.statMode = 'lvl50';
      $('tp-tab-lvl50').classList.add('tp-stat-tab-active');
      $('tp-tab-base').classList.remove('tp-stat-tab-active');
      $('tp-tab-lvl50').setAttribute('aria-selected', 'true');
      $('tp-tab-base').setAttribute('aria-selected', 'false');
      renderTable();
    });
    $('tp-tab-base').addEventListener('click', function () {
      state.statMode = 'base';
      $('tp-tab-base').classList.add('tp-stat-tab-active');
      $('tp-tab-lvl50').classList.remove('tp-stat-tab-active');
      $('tp-tab-base').setAttribute('aria-selected', 'true');
      $('tp-tab-lvl50').setAttribute('aria-selected', 'false');
      renderTable();
    });

    /* sort headers */
    var ths = document.querySelectorAll('.tp-sortable');
    for (var j = 0; j < ths.length; j++) {
      (function (th) {
        th.addEventListener('click', function () {
          var key = th.getAttribute('data-sort');
          if (state.sortKey === key) {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortKey = key;
            state.sortDir = key === 'name' ? 'asc' : 'desc';
          }
          state.page = 1;
          renderTable();
        });
      })(ths[j]);
    }

    /* pager */
    $('tp-page-prev').addEventListener('click', function () {
      if (state.page > 1) { state.page--; renderTable(); }
    });
    $('tp-page-next').addEventListener('click', function () {
      state.page++; renderTable();
    });

    /* filter modes — both buttons, driven by data-mode */
    var modeBtns = document.querySelectorAll('.chip-mode');
    for (var mi = 0; mi < modeBtns.length; mi++) {
      (function (b) {
        var group = b.id === 'tp-type-mode' || b.getAttribute('data-mode') === 'and' && b.parentNode.parentNode.querySelector('#tp-type-mode') ? 'type' : 'move';
        /* resolve group by proximity: first mode row is type, second is move */
        b.addEventListener('click', function () {
          var rows = document.querySelectorAll('.tp-mode-row');
          var inTypeRow = null;
          for (var r = 0; r < rows.length; r++) {
            if (rows[r].contains(b)) { inTypeRow = (r === 0); break; }
          }
          var mode = b.getAttribute('data-mode');
          if (inTypeRow) state.filters.typeMode = mode;
          else state.filters.moveMode = mode;
          state.page = 1;
          syncModeChips();
          renderTable();
          updateFilterNote();
        });
      })(modeBtns[mi]);
    }
    $('tp-move-filter').addEventListener('change', function () {
      var sel = this;
      state.filters.moves = Array.prototype.slice.call(sel.selectedOptions).map(function (o) { return o.value; });
      state.page = 1; renderTable(); updateFilterNote();
    });
    $('tp-ability-filter').addEventListener('change', function () {
      var sel = this;
      state.filters.abilities = Array.prototype.slice.call(sel.selectedOptions).map(function (o) { return o.value; });
      state.page = 1; renderTable(); updateFilterNote();
    });
    $('tp-reg-select').addEventListener('change', function () {
      state.filters.reg = this.value;
      state.page = 1; renderTable(); updateFilterNote();
    });

    /* share buttons */
    var shareBtn = document.getElementById('tp-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () { shareMenu('link'); });
    }
    var expBtn = document.getElementById('tp-export-showdown');
    if (expBtn) {
      expBtn.addEventListener('click', function () { shareMenu('showdown'); });
    }
    var jsonBtn = document.getElementById('tp-export-json');
    if (jsonBtn) {
      jsonBtn.addEventListener('click', function () { shareMenu('json'); });
    }
    $('share-modal-close').addEventListener('click', function () {
      $('share-modal').hidden = true;
      document.body.style.overflow = '';
    });
    $('share-modal').addEventListener('click', function (e) {
      if (e.target === $('share-modal')) { $('share-modal').hidden = true; document.body.style.overflow = ''; }
    });

    /* new/import */
    $('tp-new-btn').addEventListener('click', function () {
      $('import-modal').hidden = false;
      document.body.style.overflow = 'hidden';
      $('import-text').value = '';
    });
    $('import-cancel').addEventListener('click', function () {
      $('import-modal').hidden = true;
      document.body.style.overflow = '';
    });
    $('import-new-btn').addEventListener('click', function () {
      clearTeam();
      $('import-modal').hidden = true;
      document.body.style.overflow = '';
      flashStatus('Blank team ready');
    });
    $('import-apply').addEventListener('click', function () {
      var text = $('import-text').value.trim();
      var slots = null;
      if (text.charAt(0) === '{') {
        try {
          var d = JSON.parse(text);
          if (d && d.slots) slots = d.slots;
          if (d && d.name) state.name = d.name;
        } catch (e) { slots = null; }
      }
      if (!slots) slots = importShowdown(text);
      if (slots && slots.length) {
        state.slots = slots.concat([null, null, null, null, null, null]).slice(0, 6);
        saveTeam(); renderSlots(); renderDefense();
        $('import-modal').hidden = true;
        document.body.style.overflow = '';
        flashStatus('Team imported (' + slots.length + ' Pokémon)');
      } else {
        flashStatus('Could not parse that team text');
      }
    });

    /* slot editor */
    $('slot-edit-save').addEventListener('click', function () {
      var ed = state.editing;
      if (!ed) return;
      var d = ed.draft;
      d.nick = $('slot-edit-nick').value.trim();
      d.nature = $('slot-edit-nature').value;
      d.ability = $('slot-edit-ability').value;
      d.item = $('slot-edit-item').value;
      d.moves = dedupe4(d.moves || []);
      d.mega = $('slot-edit-mega').checked && !/-mega/.test(d.n) ? d.mega : null;
      if (d.mega) {
        /* keep mega; if user unchecked, clear */
      }
      state.slots[ed.slotIdx] = d;
      saveTeam(); renderSlots(); renderDefense();
      closeSlotEditor();
    });
    $('slot-edit-cancel').addEventListener('click', closeSlotEditor);
    $('slot-edit-remove').addEventListener('click', function () {
      var ed = state.editing;
      if (!ed) return;
      state.slots[ed.slotIdx] = null;
      saveTeam(); renderSlots(); renderDefense();
      closeSlotEditor();
    });
    $('slot-edit-library').addEventListener('click', function () {
      var ed = state.editing;
      if (!ed) return;
      var d = ed.draft;
      state.library.push(JSON.parse(JSON.stringify(d)));
      saveLibrary();
      flashStatus('Saved to My Pokemon');
    });

    /* mega toggle live */
    var megaChk = $('slot-edit-mega');
    megaChk.addEventListener('change', function () {
      var ed = state.editing;
      if (!ed) return;
      var d = ed.draft;
      if (megaChk.checked) {
        var opts = MEGA_MAP[d.si] || [];
        if (opts.length) d.mega = opts[0].n;
      } else {
        d.mega = null;
      }
      renderSlotEditor();
    });

    /* nature / ability / item changes -> live stats */
    $('slot-edit-nature').addEventListener('change', function () {
      var ed = state.editing;
      if (ed) { ed.draft.nature = this.value; renderSlotEditorStats(); }
    });
    $('slot-edit-ability').addEventListener('change', function () {
      var ed = state.editing;
      if (ed) { ed.draft.ability = this.value; }
    });
    $('slot-edit-item').addEventListener('change', function () {
      var ed = state.editing;
      if (ed) { ed.draft.item = this.value; }
    });

    /* escape closes modals */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('slot-modal').hidden) closeSlotEditor();
      if (!$('share-modal').hidden) { $('share-modal').hidden = true; document.body.style.overflow = ''; }
      if (!$('import-modal').hidden) { $('import-modal').hidden = true; document.body.style.overflow = ''; }
    });

    /* modal overlay click closes */
    ['slot-modal', 'import-modal'].forEach(function (id) {
      var ov = $(id);
      ov.addEventListener('click', function (e) {
        if (e.target === ov) {
          ov.hidden = true;
          document.body.style.overflow = '';
          if (id === 'slot-modal') state.editing = null;
        }
      });
    });

    if (!restored) saveTeam();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
