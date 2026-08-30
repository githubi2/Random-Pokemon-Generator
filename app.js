/* ============================================================
   Random Pokemon Generator — vanilla JS engine
   Data: window.POKEMON_DATA (data.js, 1351 entries)
   Entry: {i,si,n,t,g,st,tt,c,lg,my,ev,sp,sps,ab,pre,nxt}
   ============================================================ */
(function () {
  'use strict';

  var POKEMON = window.POKEMON_DATA || [];
  var BY_NAME = {};
  var BY_ID = {};
  POKEMON.forEach(function (p) { BY_NAME[p.n] = p; BY_ID[p.i] = p; });

  var TYPES = [
    { slug: 'fire', label: 'Fire', color: '#FF9D55', light: false },
    { slug: 'water', label: 'Water', color: '#6890F0', light: true },
    { slug: 'grass', label: 'Grass', color: '#78C850', light: false },
    { slug: 'electric', label: 'Electric', color: '#F8D030', light: false },
    { slug: 'ice', label: 'Ice', color: '#98D8D8', light: false },
    { slug: 'fighting', label: 'Fighting', color: '#C03028', light: true },
    { slug: 'poison', label: 'Poison', color: '#A040A0', light: true },
    { slug: 'ground', label: 'Ground', color: '#E0C068', light: false },
    { slug: 'flying', label: 'Flying', color: '#A890F0', light: true },
    { slug: 'psychic', label: 'Psychic', color: '#F85888', light: true },
    { slug: 'bug', label: 'Bug', color: '#A8B820', light: false },
    { slug: 'rock', label: 'Rock', color: '#B8A038', light: true },
    { slug: 'ghost', label: 'Ghost', color: '#705898', light: true },
    { slug: 'dark', label: 'Dark', color: '#705848', light: true },
    { slug: 'dragon', label: 'Dragon', color: '#7038F8', light: true },
    { slug: 'steel', label: 'Steel', color: '#B8B8D0', light: false },
    { slug: 'fairy', label: 'Fairy', color: '#EE99AC', light: false },
    { slug: 'normal', label: 'Normal', color: '#A8A878', light: false }
  ];
  var TYPE_MAP = {};
  TYPES.forEach(function (t) { TYPE_MAP[t.slug] = t; });

  var GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var REGIONS = { 1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unova', 6: 'Kalos', 7: 'Alola', 8: 'Galar', 9: 'Paldea' };

  var COLORS = [
    { slug: 'red', hex: '#E3350D' }, { slug: 'blue', hex: '#2A75BB' },
    { slug: 'yellow', hex: '#FFCB05' }, { slug: 'green', hex: '#4F9D4F' },
    { slug: 'black', hex: '#121212' }, { slug: 'brown', hex: '#8B5A2B' },
    { slug: 'purple', hex: '#8E44AD' }, { slug: 'gray', hex: '#9AA0A6' },
    { slug: 'white', hex: '#F5F5F5' }, { slug: 'pink', hex: '#F4A7C3' }
  ];

  var STAT_LABELS = ['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE'];
  var SHINY_RANDOM_ODDS = 0.08;
  var LS_CONFIG = 'rpg:config';
  var LS_HISTORY = 'rpg:history';

  var DEFAULTS = {
    gens: [], types: [], count: 6, shiny: 'normal',
    legendary: 'include', mythical: 'include',
    form: 'default', stage: 'all', bstMin: 0, bstMax: 780, colors: []
  };

  /* ---------------- helpers ---------------- */
  function displayName(slug) {
    return slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function displayAbility(slug) { return displayName(slug); }
  function pad4(n) { return String(n).padStart(4, '0'); }

  function secureRandom() {
    if (window.crypto && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }

  function parseList(v) {
    if (!v) return [];
    return v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function filtersFromParams(params) {
    var f = Object.assign({}, DEFAULTS);
    f.gens = parseList(params.get('gens')).map(Number).filter(function (g) { return GENERATIONS.indexOf(g) >= 0; });
    f.types = parseList(params.get('types')).filter(function (t) { return TYPE_MAP[t]; });
    var count = Number(params.get('count'));
    if (isFinite(count) && count >= 1 && count <= 12) f.count = count;
    var shiny = params.get('shiny');
    if (['normal', 'shiny', 'random'].indexOf(shiny) >= 0) f.shiny = shiny;
    var leg = params.get('legendary');
    if (['include', 'exclude', 'only'].indexOf(leg) >= 0) f.legendary = leg;
    var my = params.get('mythical');
    if (['include', 'exclude', 'only'].indexOf(my) >= 0) f.mythical = my;
    var form = params.get('form');
    if (['default', 'regional', 'all'].indexOf(form) >= 0) f.form = form;
    var stage = params.get('stage');
    if (['all', 'initial', 'middle', 'final'].indexOf(stage) >= 0) f.stage = stage;
    var bst = params.get('bst');
    if (bst) {
      var parts = bst.split('-').map(Number);
      if (isFinite(parts[0])) f.bstMin = Math.max(0, Math.min(780, parts[0]));
      if (isFinite(parts[1])) f.bstMax = Math.max(0, Math.min(780, parts[1]));
      if (f.bstMin > f.bstMax) { var t = f.bstMin; f.bstMin = f.bstMax; f.bstMax = t; }
    }
    f.colors = parseList(params.get('colors')).filter(function (c) {
      return COLORS.some(function (m) { return m.slug === c; });
    });
    return f;
  }

  function filtersToQuery(f) {
    var q = new URLSearchParams();
    if (f.gens.length) q.set('gens', f.gens.slice().sort(function (a, b) { return a - b; }).join(','));
    if (f.types.length) q.set('types', f.types.join(','));
    if (f.count !== DEFAULTS.count) q.set('count', String(f.count));
    if (f.shiny !== DEFAULTS.shiny) q.set('shiny', f.shiny);
    if (f.legendary !== DEFAULTS.legendary) q.set('legendary', f.legendary);
    if (f.mythical !== DEFAULTS.mythical) q.set('mythical', f.mythical);
    if (f.form !== DEFAULTS.form) q.set('form', f.form);
    if (f.stage !== DEFAULTS.stage) q.set('stage', f.stage);
    if (f.bstMin !== 0 || f.bstMax !== 780) q.set('bst', f.bstMin + '-' + f.bstMax);
    if (f.colors.length) q.set('colors', f.colors.join(','));
    var s = q.toString();
    return s ? '?' + s : '';
  }

  function applyFilters(f) {
    return POKEMON.filter(function (p) {
      if (f.gens.length && f.gens.indexOf(p.g) < 0) return false;
      if (f.types.length && !p.t.some(function (t) { return f.types.indexOf(t) >= 0; })) return false;
      if (f.legendary === 'exclude' && p.lg) return false;
      if (f.legendary === 'only' && !p.lg) return false;
      if (f.mythical === 'exclude' && p.my) return false;
      if (f.mythical === 'only' && !p.my) return false;
      if (f.form === 'default' && p.i > 1025) return false;
      if (f.form === 'regional' && p.i < 10000) return false;
      if (f.stage !== 'all' && p.ev !== f.stage) return false;
      if (p.tt < f.bstMin || p.tt > f.bstMax) return false;
      if (f.colors.length && f.colors.indexOf(p.c) < 0) return false;
      return true;
    });
  }

  function rollTeam(pool, count, shinyMode) {
    var arr = pool.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(secureRandom() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr.slice(0, Math.min(count, arr.length)).map(function (p) {
      return {
        p: p,
        shiny: shinyMode === 'shiny' ? true : shinyMode === 'normal' ? false : secureRandom() < SHINY_RANDOM_ODDS
      };
    });
  }

  /* ---------------- state ---------------- */
  var params = new URLSearchParams(location.search);
  var filters;
  if (params.get('team')) {
    /* full share link (team replay): restore filters + team */
    filters = filtersFromParams(params);
  } else {
    /* plain visit / refresh (or leftover filter-only URL): always defaults */
    filters = Object.assign({}, DEFAULTS);
  }

  var debounceTimer = null;
  var currentRolls = [];

  /* ---------------- DOM refs ---------------- */
  function $(id) { return document.getElementById(id); }
  var grid = $('results-grid'), emptyEl = $('results-empty'), metaEl = $('results-meta');
  var poolEl = $('pool-count'), countSlider = $('count-slider'), countOut = $('count-output');
  var bstMinEl = $('bst-min'), bstMaxEl = $('bst-max'), bstOut = $('bst-output');

  /* ---------------- render filter controls ---------------- */
  function makeChip(parent, label, pressed, onClick, extraClass, style, single) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-btn' + (extraClass ? ' ' + extraClass : '');
    b.textContent = label;
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    if (style) b.setAttribute('style', style);
    b.addEventListener('click', function () {
      onClick();
      /* keep the pressed state in sync (single = radio group) */
      if (single) {
        var sibs = parent.querySelectorAll('[aria-pressed="true"]');
        for (var i = 0; i < sibs.length; i++) sibs[i].setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-pressed', 'true');
      } else {
        b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      }
    });
    parent.appendChild(b);
    return b;
  }

  function renderGenButtons() {
    var wrap = $('gen-buttons');
    wrap.innerHTML = '';
    GENERATIONS.forEach(function (g) {
      makeChip(wrap, 'Gen ' + g, filters.gens.indexOf(g) >= 0, function () {
        toggleInArray(filters.gens, g);
        scheduleSync();
      });
    });
  }

  function renderTypeButtons() {
    var wrap = $('type-buttons');
    wrap.innerHTML = '';
    TYPES.forEach(function (t) {
      makeChip(wrap, t.label, filters.types.indexOf(t.slug) >= 0, function () {
        toggleInArray(filters.types, t.slug);
        scheduleSync();
      }, 'type-chip', '--chip:' + t.color + ';--chip-text:' + (t.light ? '#fff' : '#121212'));
    });
  }

  function renderToggleRow(id, options, current, onPick) {
    var wrap = $(id);
    wrap.innerHTML = '';
    options.forEach(function (opt) {
      makeChip(wrap, opt[1], current === opt[0], function () { onPick(opt[0]); }, null, null, true);
    });
  }

  function renderAdvancedControls() {
    renderToggleRow('shiny-buttons', [['normal', 'Normal'], ['shiny', 'Shiny'], ['random', 'Random']], filters.shiny, function (v) { filters.shiny = v; scheduleSync(); });
    renderToggleRow('form-buttons', [['default', 'Default'], ['regional', 'Regional'], ['all', 'All forms']], filters.form, function (v) { filters.form = v; scheduleSync(); });
    renderToggleRow('stage-buttons', [['all', 'All'], ['initial', 'Initial'], ['middle', 'Middle'], ['final', 'Final']], filters.stage, function (v) { filters.stage = v; scheduleSync(); });
    $('legendary-select').value = filters.legendary;
    $('mythical-select').value = filters.mythical;
    bstMinEl.value = filters.bstMin;
    bstMaxEl.value = filters.bstMax;
    updateBstOut();

    var wrap = $('color-buttons');
    wrap.innerHTML = '';
    COLORS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'color-dot';
      b.title = c.slug;
      b.setAttribute('aria-label', 'Filter color ' + c.slug);
      b.setAttribute('aria-pressed', filters.colors.indexOf(c.slug) >= 0 ? 'true' : 'false');
      b.style.background = c.hex;
      b.addEventListener('click', function () {
        toggleInArray(filters.colors, c.slug);
        b.setAttribute('aria-pressed', filters.colors.indexOf(c.slug) >= 0 ? 'true' : 'false');
        scheduleSync();
      });
      wrap.appendChild(b);
    });
  }

  function toggleInArray(arr, v) {
    var i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1); else arr.push(v);
  }

  function updateBstOut() { bstOut.textContent = filters.bstMin + ' – ' + filters.bstMax; }

  /* ---------------- results ---------------- */
  function renderControls() {
    renderGenButtons();
    renderTypeButtons();
    renderAdvancedControls();
    countSlider.value = filters.count;
    countOut.textContent = filters.count;
  }

  function updatePool() {
    var pool = applyFilters(filters);
    poolEl.textContent = pool.length.toLocaleString() + ' in pool';
    return pool;
  }

  /* Refresh should reset to defaults — no URL/localStorage persistence here.
     Sharing still works: COPY CONFIG LINK builds a query string manually,
     and opening such a link restores the filters via filtersFromParams. */
  function syncConfig() {
    updatePool();
  }

  function scheduleSync() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncConfig, 300);
  }

  function renderTeam(rolls) {
    grid.innerHTML = '';
    emptyEl.hidden = rolls.length > 0;
    if (rolls.length === 0) emptyEl.textContent = 'No Pokémon match these filters — loosen them up!';
    rolls.forEach(function (r) {
      grid.appendChild(buildCard(r));
    });
  }

  function roll() {
    renderControls();
    var pool = updatePool();
    var rolls = rollTeam(pool, filters.count, filters.shiny);
    currentRolls = rolls;
    renderTeam(rolls);
    metaEl.textContent = rolls.length
      ? 'Showing ' + rolls.length + ' of ' + pool.length.toLocaleString() + ' matching Pokémon'
      : '';
    renderAnalysis(rolls);
    syncConfig();
    if (rolls.length) pushHistory(rolls);
  }

  /* ---------------- roll history ---------------- */
  var HISTORY_MAX = 20;
  var rollHistory = loadHistory();

  function loadHistory() {
    try {
      var h = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
      if (!Array.isArray(h)) return [];
      return h.filter(function (e) {
        return e && Array.isArray(e.team) && e.team.length > 0 &&
          e.team.every(function (t) { return t && BY_ID[t.i]; });
      });
    } catch (e) { return []; }
  }

  function saveHistory() {
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(rollHistory)); } catch (e) { /* ignore */ }
  }

  function pushHistory(rolls) {
    rollHistory.unshift({
      ts: Date.now(),
      f: Object.assign({}, filters),
      team: rolls.map(function (r) { return { i: r.p.i, s: !!r.shiny }; })
    });
    if (rollHistory.length > HISTORY_MAX) rollHistory.length = HISTORY_MAX;
    saveHistory();
    renderHistory();
  }

  function formatTime(ts) {
    var d = new Date(ts);
    var p2 = function (n) { return String(n).padStart(2, '0'); };
    return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
  }

  function entryRolls(entry) {
    return entry.team.map(function (t) {
      var p = BY_ID[t.i];
      return p ? { p: p, shiny: !!t.s } : null;
    }).filter(Boolean);
  }

  function renderHistory() {
    var panel = $('history-panel'), list = $('history-list');
    list.innerHTML = '';
    panel.hidden = rollHistory.length === 0;
    rollHistory.forEach(function (entry, idx) {
      var num = rollHistory.length - idx;
      var li = document.createElement('li');
      li.className = 'history-row';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item';
      btn.setAttribute('aria-label', 'Load squad ' + num + ' rolled at ' + formatTime(entry.ts));

      var label = document.createElement('span');
      label.className = 'history-label';
      label.textContent = '#' + num + ' · ' + formatTime(entry.ts);
      btn.appendChild(label);

      var thumbs = document.createElement('span');
      thumbs.className = 'history-thumbs';
      entry.team.forEach(function (t) {
        var p = BY_ID[t.i];
        var img = document.createElement('img');
        img.src = t.s ? p.sps : p.sp;
        img.alt = displayName(p.n) + (t.s ? ' (shiny)' : '');
        img.width = 40; img.height = 40;
        img.loading = 'lazy';
        img.onerror = function () {
          var fb = img.src.replace('/other/official-artwork', '');
          if (fb !== img.src) img.src = fb; else img.onerror = null;
        };
        img.addEventListener('mouseenter', function () { showTip(img, p, t.s); });
        img.addEventListener('mouseleave', hideTip);
        img.addEventListener('click', function (e) {
          e.stopPropagation();
          hideTip();
          openModal({ p: p, shiny: !!t.s });
        });
        thumbs.appendChild(img);
      });
      btn.appendChild(thumbs);

      btn.addEventListener('click', function () { loadFromHistory(entry); });

      var share = document.createElement('button');
      share.type = 'button';
      share.className = 'history-share';
      share.textContent = '🔗 Share';
      share.setAttribute('aria-label', 'Copy share link for squad ' + num);
      share.addEventListener('click', function () {
        hideTip();
        var url = buildShareUrl(entry.f || filters, entryRolls(entry));
        copyToClipboard(url, function (ok) {
          share.textContent = ok ? '✅ Copied' : '🔗 Link ready';
          setTimeout(function () { share.textContent = '🔗 Share'; }, 1800);
        });
      });

      li.appendChild(btn);
      li.appendChild(share);
      list.appendChild(li);
    });
  }

  function loadFromHistory(entry) {
    var rolls = entryRolls(entry);
    currentRolls = rolls;
    renderTeam(rolls);
    renderAnalysis(rolls);
    metaEl.textContent = 'Loaded from Roll History — press 🎲 Generate to roll a new squad';
    grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------------- squad share links ---------------- */
  function teamToParam(rolls) {
    return rolls.map(function (r) { return r.p.i + (r.shiny ? '.s' : ''); }).join(',');
  }

  function teamFromParams(params) {
    var raw = params.get('team');
    if (!raw) return [];
    return raw.split(',').map(function (tok) {
      var parts = tok.split('.');
      var p = BY_ID[Number(parts[0])];
      return p ? { p: p, shiny: parts[1] === 's' } : null;
    }).filter(Boolean).slice(0, 12);
  }

  function buildShareUrl(f, rolls) {
    var q = filtersToQuery(f || filters);
    var t = rolls && rolls.length ? teamToParam(rolls) : '';
    if (t) q += (q ? '&' : '?') + 'team=' + t;
    return location.origin + location.pathname + q;
  }

  function copyToClipboard(url, done) {
    function legacyCopy() {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
      return ok;
    }
    function fallbackPrompt() {
      try { window.prompt('Copy your share link:', url); }
      catch (e) { window.alert(url); }
      done(false);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done(true); })
        .catch(function () { if (!legacyCopy()) fallbackPrompt(); else done(true); });
    } else {
      if (!legacyCopy()) fallbackPrompt(); else done(true);
    }
  }

  /* ---------------- hover tooltip ---------------- */
  var tipEl = null;

  function showTip(anchor, p, shiny) {
    hideTip();
    var tip = document.createElement('div');
    tip.className = 'poke-tip cornered';
    tip.setAttribute('role', 'tooltip');

    var art = document.createElement('img');
    art.src = shiny ? p.sps : p.sp;
    art.alt = displayName(p.n) + (shiny ? ' (shiny)' : '') + ' artwork';
    art.width = 96; art.height = 96;
    art.onerror = function () {
      var fb = art.src.replace('/other/official-artwork', '');
      if (fb !== art.src) art.src = fb; else art.onerror = null;
    };
    tip.appendChild(art);

    var name = document.createElement('span');
    name.className = 'poke-tip-name';
    name.textContent = displayName(p.n) + (shiny ? ' ✨' : '');
    tip.appendChild(name);

    var meta = document.createElement('span');
    meta.className = 'poke-tip-meta';
    meta.textContent = '#' + pad4(p.si) + ' · Gen ' + p.g + ' · ' + (REGIONS[p.g] || '') +
      (p.lg ? ' · Legendary' : '') + (p.my ? ' · Mythical' : '');
    tip.appendChild(meta);

    var chips = document.createElement('span');
    chips.className = 'chip-row';
    p.t.forEach(function (t) {
      var m = TYPE_MAP[t];
      var chip = document.createElement('span');
      chip.className = 'type-tag';
      chip.style.setProperty('--tag', m ? m.color : '#A8A878');
      chip.style.setProperty('--tag-text', m && m.light ? '#fff' : '#121212');
      chip.textContent = m ? m.label : t;
      chips.appendChild(chip);
    });
    tip.appendChild(chips);

    var bst = document.createElement('span');
    bst.className = 'poke-tip-bst';
    bst.innerHTML = 'BST <strong>' + p.tt + '</strong>';
    tip.appendChild(bst);

    document.body.appendChild(tip);
    tipEl = tip;

    var r = anchor.getBoundingClientRect();
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var left = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2));
    var top = r.top - th - 10;
    if (top < 8) top = r.bottom + 10;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function hideTip() {
    if (tipEl && tipEl.parentNode) tipEl.parentNode.removeChild(tipEl);
    tipEl = null;
  }

  document.addEventListener('scroll', hideTip, true);

  function buildCard(r) {
    var p = r.p;
    var aura = TYPE_MAP[p.t[0]] ? TYPE_MAP[p.t[0]].color : '#A8A878';

    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dex-card cornered';
    btn.style.setProperty('--aura', aura);
    btn.setAttribute('aria-label', 'View details for ' + displayName(p.n));

    var top = document.createElement('span');
    top.className = 'dex-top';
    var num = document.createElement('span');
    num.className = 'dex-num';
    num.textContent = '#' + pad4(p.si);
    top.appendChild(num);
    if (r.shiny) {
      var s = document.createElement('span');
      s.textContent = '✨';
      s.title = 'Shiny';
      top.appendChild(s);
    } else {
      var spacer = document.createElement('span');
      spacer.setAttribute('aria-hidden', 'true');
      top.appendChild(spacer);
    }
    btn.appendChild(top);

    var art = document.createElement('span');
    art.className = 'dex-art';
    var auraEl = document.createElement('span');
    auraEl.className = 'dex-aura';
    auraEl.setAttribute('aria-hidden', 'true');
    art.appendChild(auraEl);
    var img = document.createElement('img');
    img.src = r.shiny ? p.sps : p.sp;
    img.alt = displayName(p.n) + (r.shiny ? ' (shiny)' : '') + ' artwork';
    img.width = 475; img.height = 475;
    img.loading = 'lazy';
    img.onerror = function () {
      var fb = img.src.replace('/other/official-artwork', '');
      if (fb !== img.src) img.src = fb; else img.onerror = null;
    };
    art.appendChild(img);
    btn.appendChild(art);

    var name = document.createElement('span');
    name.className = 'dex-name';
    name.textContent = displayName(p.n);
    btn.appendChild(name);

    var sub = document.createElement('span');
    sub.className = 'dex-sub';
    sub.textContent = 'Gen ' + p.g + ' · ' + (REGIONS[p.g] || '');
    btn.appendChild(sub);

    var chips = document.createElement('span');
    chips.className = 'chip-row';
    p.t.forEach(function (t) {
      var meta = TYPE_MAP[t];
      var chip = document.createElement('span');
      chip.className = 'type-tag';
      chip.style.setProperty('--tag', meta ? meta.color : '#A8A878');
      chip.style.setProperty('--tag-text', meta && meta.light ? '#fff' : '#121212');
      chip.textContent = meta ? meta.label : t;
      chips.appendChild(chip);
    });
    btn.appendChild(chips);

    var bst = document.createElement('span');
    bst.className = 'bst-line';
    bst.innerHTML = 'BST <strong>' + p.tt + '</strong>';
    btn.appendChild(bst);

    btn.addEventListener('click', function () { openModal(r); });
    li.appendChild(btn);
    return li;
  }

  /* ---------------- modal ---------------- */
  var modal = $('modal'), modalCard = $('modal-card');
  var currentRoll = null;

  function openModal(r) {
    currentRoll = r;
    var p = r.p;
    var aura = TYPE_MAP[p.t[0]] ? TYPE_MAP[p.t[0]].color : '#A8A878';
    modalCard.style.setProperty('--aura', aura);

    $('modal-meta').innerHTML = '<span class="mnum">#' + pad4(p.si) + '</span> · Gen ' + p.g + ' · ' +
      (REGIONS[p.g] || '') + ' · ' + p.ev + (p.lg ? ' · Legendary' : '') + (p.my ? ' · Mythical' : '');
    $('modal-name').textContent = displayName(p.n) + (r.shiny ? ' ✨' : '');

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
    img.src = r.shiny ? p.sps : p.sp;
    img.alt = displayName(p.n) + ' artwork';
    img.onerror = function () {
      var fb = img.src.replace('/other/official-artwork', '');
      if (fb !== img.src) img.src = fb; else img.onerror = null;
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
      li.textContent = displayAbility(a);
      ab.appendChild(li);
    });

    /* type coverage: weak to / resists / immune (reuses TYPE_CHART + effectiveness) */
    var cov = { weak: [], resist: [], immune: [] };
    Object.keys(TYPE_CHART).forEach(function (atk) {
      var e = effectiveness(atk, p.t);
      if (e >= 2) cov.weak.push(atk);
      else if (e === 0) cov.immune.push(atk);
      else if (e < 1) cov.resist.push(atk);
    });
    var covEl = $('modal-cov');
    covEl.innerHTML = '';
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
          tag.textContent = (TYPE_MAP[t] && TYPE_MAP[t].label ? TYPE_MAP[t].label : t).toUpperCase();
          tag.style.background = TYPE_MAP[t] ? TYPE_MAP[t].color : '#888';
          tag.style.color = TYPE_MAP[t] && TYPE_MAP[t].light ? '#121212' : '#fff';
          row.appendChild(tag);
        });
      }
      covEl.appendChild(row);
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
      var p = BY_NAME[slug];
      if (p) openModal({ p: p, shiny: false });
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

  /* ---------------- tactical analysis ---------------- */
  /* Attacking type -> defending type multiplier (only non-1 entries) */
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

  function effectiveness(atkType, defTypes) {
    var mult = 1;
    var row = TYPE_CHART[atkType] || {};
    defTypes.forEach(function (d) {
      if (row[d] !== undefined) mult *= row[d];
    });
    return mult;
  }

  function roleOf(p) {
    var atk = p.st[1], def = p.st[2], spa = p.st[3], spd = p.st[4], spe = p.st[5];
    var physBulk = p.st[0] * 0.5 + def;
    var specBulk = p.st[0] * 0.5 + spd;
    if (atk >= 110 && spe >= 100 && atk >= spa) return 'Physical Sweeper';
    if (spa >= 110 && spe >= 100 && spa > atk) return 'Special Sweeper';
    if (physBulk >= 130 && physBulk >= specBulk + 15) return 'Physical Wall';
    if (specBulk >= 130 && specBulk > physBulk + 15) return 'Special Wall';
    if (spe >= 110) return 'Speedster';
    if (atk >= spa && atk >= 90) return 'Physical Attacker';
    if (spa > atk && spa >= 90) return 'Special Attacker';
    if (physBulk >= 110 || specBulk >= 110) return 'Tank';
    return 'Balanced';
  }

  var GRADES = [
    { min: 85, g: 'S', color: '#FFCB05', light: false },
    { min: 70, g: 'A', color: '#78C850', light: false },
    { min: 55, g: 'B', color: '#6890F0', light: true },
    { min: 40, g: 'C', color: '#FF9D55', light: false },
    { min: 0,  g: 'D', color: '#C03028', light: true }
  ];

  function analyzeTeam(rolls) {
    var members = rolls.map(function (r) { return r.p; });
    var n = members.length;

    var defense = TYPES.map(function (t) {
      var weak = 0, resist = 0, immune = 0;
      members.forEach(function (p) {
        var m = effectiveness(t.slug, p.t);
        if (m === 0) immune++;
        else if (m > 1) weak++;
        else if (m < 1) resist++;
      });
      return { type: t, weak: weak, resist: resist, immune: immune };
    });

    var stab = {};
    members.forEach(function (p) { p.t.forEach(function (t) { stab[t] = true; }); });
    var stabKeys = Object.keys(stab);
    var offense = TYPES.map(function (t) {
      var covered = stabKeys.some(function (s) {
        var row = TYPE_CHART[s];
        return row && row[t.slug] >= 2;
      });
      return { type: t, covered: covered };
    });
    var coveredCount = offense.filter(function (o) { return o.covered; }).length;

    var avg = [0, 0, 0, 0, 0, 0], avgBst = 0;
    members.forEach(function (p) {
      p.st.forEach(function (v, i) { avg[i] += v; });
      avgBst += p.tt;
    });
    avg = avg.map(function (v) { return Math.round(v / n); });
    avgBst = Math.round(avgBst / n);

    var offFrac = coveredCount / 18;
    var defFrac = defense.filter(function (d) { return d.weak < 2; }).length / 18;
    var bstFrac = Math.max(0, Math.min(1, (avgBst - 200) / 480));
    var score = Math.round(offFrac * 35 + defFrac * 35 + bstFrac * 30);
    var grade = GRADES.filter(function (g) { return score >= g.min; })[0];

    var warnings = [];
    defense.slice().sort(function (a, b) { return b.weak - a.weak; }).forEach(function (d) {
      if (d.weak >= 2) {
        warnings.push({
          level: 'danger',
          text: d.weak + ' of ' + n + ' members are weak to ' + d.type.label + ' — one strong ' + d.type.label + ' attacker could punch through the squad.',
          tip: d.immune > 0 ? 'You do have ' + d.immune + ' immunity — switch into it on ' + d.type.label + ' moves.' : 'Consider re-rolling a member that resists or is immune to ' + d.type.label + '.'
        });
      }
    });
    var typeCount = {};
    members.forEach(function (p) { p.t.forEach(function (t) { typeCount[t] = (typeCount[t] || 0) + 1; }); });
    Object.keys(typeCount).forEach(function (t) {
      if (typeCount[t] >= 3) {
        warnings.push({
          level: 'warn',
          text: typeCount[t] + ' members share the ' + (TYPE_MAP[t] ? TYPE_MAP[t].label : t) + ' type — offensive coverage overlaps heavily.',
          tip: 'Diversify types to widen your STAB coverage.'
        });
      }
    });
    members.forEach(function (p) {
      if (p.ev !== 'final' && p.nxt.length) {
        warnings.push({
          level: 'info',
          text: displayName(p.n) + ' is ' + (p.ev === 'initial' ? 'an unevolved' : 'a mid-stage') + ' Pokémon — it drags the team BST down.',
          tip: 'Set the Evolution Stage filter to Final and re-roll for a stronger pick.'
        });
      }
    });
    var rareCount = rolls.filter(function (r) { return r.p.lg || r.p.my; }).length;
    if (rareCount >= 2) {
      warnings.push({
        level: 'info',
        text: rareCount + ' Legendary/Mythical members — banned under many Nuzlocke and draft rulesets.',
        tip: 'Use the Rarity filters to exclude them if your rules require it.'
      });
    }
    if (avg[5] < 60) {
      warnings.push({
        level: 'warn',
        text: 'Average Speed is only ' + avg[5] + ' — this squad is slow and will often move second.',
        tip: 'Raise the BST minimum or re-roll for faster picks.'
      });
    }

    var worst = defense.filter(function (d) { return d.weak >= 2; })
      .sort(function (a, b) { return b.weak - a.weak; })[0];
    var summary = 'Grade ' + grade.g + ' (' + score + '/100) — STAB coverage hits ' + coveredCount +
      '/18 types super-effectively' +
      (worst ? '; biggest hole: ' + worst.weak + ' members weak to ' + worst.type.label + '.' : '; no shared weaknesses detected.');

    return {
      defense: defense, offense: offense, coveredCount: coveredCount,
      avg: avg, avgBst: avgBst, score: score, grade: grade,
      warnings: warnings, summary: summary
    };
  }

  function typeChipEl(t) {
    var chip = document.createElement('span');
    chip.className = 'type-tag';
    chip.style.setProperty('--tag', t.color);
    chip.style.setProperty('--tag-text', t.light ? '#fff' : '#121212');
    chip.textContent = t.label;
    return chip;
  }

  function analysisSection(title) {
    var sec = document.createElement('section');
    sec.className = 'analysis-sec';
    var h = document.createElement('h3');
    h.className = 'analysis-sec-title';
    h.textContent = title;
    sec.appendChild(h);
    return sec;
  }

  function renderAnalysis(rolls) {
    var panel = $('analysis-panel');
    if (!rolls || !rolls.length) { panel.hidden = true; return; }
    panel.hidden = false;
    var a = analyzeTeam(rolls);

    var badge = $('analysis-grade');
    badge.textContent = a.grade.g + ' · ' + a.score + '/100';
    badge.style.background = a.grade.color;
    badge.style.color = a.grade.light ? '#fff' : '#121212';
    $('analysis-summary').textContent = a.summary;

    var body = $('analysis-body');
    body.innerHTML = '';

    /* 1 — defensive matrix */
    var defSec = analysisSection('🛡 Defensive Coverage');
    var table = document.createElement('table');
    table.className = 'def-matrix';
    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    ['Attacking type', 'Weak', 'Resist', 'Immune'].forEach(function (h) {
      var th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    var tbody = document.createElement('tbody');
    a.defense.forEach(function (d) {
      var tr = document.createElement('tr');
      if (d.weak >= 2) tr.className = 'def-danger';
      else if (d.weak === 0 && d.immune > 0) tr.className = 'def-safe';
      var tdT = document.createElement('td');
      tdT.appendChild(typeChipEl(d.type));
      tr.appendChild(tdT);
      [d.weak, d.resist, d.immune].forEach(function (v, i) {
        var td = document.createElement('td');
        td.textContent = v;
        if (i === 0 && v >= 2) td.className = 'num-danger';
        if (i === 2 && v > 0) td.className = 'num-safe';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    defSec.appendChild(table);
    body.appendChild(defSec);

    /* 2 — STAB offensive coverage */
    var offSec = analysisSection('⚔ STAB Offensive Coverage · ' + a.coveredCount + '/18');
    var offGrid = document.createElement('div');
    offGrid.className = 'off-grid';
    a.offense.forEach(function (o) {
      var chip = typeChipEl(o.type);
      if (!o.covered) chip.classList.add('off-miss');
      chip.title = o.covered ? 'Covered by your STAB types' : 'Blind spot — no STAB hits this super-effectively';
      offGrid.appendChild(chip);
    });
    offSec.appendChild(offGrid);
    var offNote = document.createElement('p');
    offNote.className = 'analysis-note';
    offNote.textContent = 'Defending types your squad hits super-effectively with same-type (STAB) moves. Grayed chips are blind spots.';
    offSec.appendChild(offNote);
    body.appendChild(offSec);

    /* 3 — stats & roles */
    var statSec = analysisSection('📈 Stats & Roles · avg BST ' + a.avgBst);
    var dl = document.createElement('dl');
    dl.className = 'stats analysis-stats';
    a.avg.forEach(function (v, i) {
      var row = document.createElement('div');
      row.className = 'stat-row';
      var dt = document.createElement('dt');
      dt.textContent = STAT_LABELS[i];
      var dd = document.createElement('dd');
      dd.textContent = v;
      var track = document.createElement('div');
      track.className = 'stat-track';
      var fill = document.createElement('div');
      fill.className = 'stat-fill';
      fill.style.width = Math.min(100, (v / 255) * 100) + '%';
      track.appendChild(fill);
      row.appendChild(dt); row.appendChild(dd); row.appendChild(track);
      dl.appendChild(row);
    });
    statSec.appendChild(dl);

    var roleList = document.createElement('ul');
    roleList.className = 'role-list';
    rolls.forEach(function (r) {
      var p = r.p;
      var li = document.createElement('li');
      li.className = 'role-item';

      var img = document.createElement('img');
      img.src = r.shiny ? p.sps : p.sp;
      img.alt = displayName(p.n) + (r.shiny ? ' (shiny)' : '');
      img.width = 44; img.height = 44;
      img.loading = 'lazy';
      img.onerror = function () {
        var fb = img.src.replace('/other/official-artwork', '');
        if (fb !== img.src) img.src = fb; else img.onerror = null;
      };
      li.appendChild(img);

      var nm = document.createElement('span');
      nm.className = 'role-name';
      nm.textContent = displayName(p.n) + (r.shiny ? ' ✨' : '');
      li.appendChild(nm);

      var role = document.createElement('span');
      role.className = 'role-tag';
      role.textContent = roleOf(p);
      li.appendChild(role);

      var bst = document.createElement('span');
      bst.className = 'role-bst';
      bst.textContent = 'BST ' + p.tt;
      li.appendChild(bst);

      var weakWrap = document.createElement('span');
      weakWrap.className = 'role-weak';
      TYPES.map(function (t) { return { t: t, m: effectiveness(t.slug, p.t) }; })
        .filter(function (x) { return x.m >= 2; })
        .sort(function (x, y) { return y.m - x.m; })
        .slice(0, 3)
        .forEach(function (x) {
          var wc = document.createElement('span');
          wc.className = 'weak-chip';
          wc.textContent = x.t.label + ' ×' + x.m;
          weakWrap.appendChild(wc);
        });
      li.appendChild(weakWrap);
      roleList.appendChild(li);
    });
    statSec.appendChild(roleList);
    body.appendChild(statSec);

    /* 4 — warnings & tips */
    var warnSec = analysisSection('⚠ Warnings & Tips');
    var warnList = document.createElement('ul');
    warnList.className = 'warn-list';
    if (!a.warnings.length) {
      var ok = document.createElement('li');
      ok.className = 'warn-item warn-ok';
      ok.textContent = '✅ No major weaknesses detected — solid, well-balanced squad!';
      warnList.appendChild(ok);
    }
    a.warnings.forEach(function (w) {
      var li = document.createElement('li');
      li.className = 'warn-item warn-' + w.level;
      var txt = document.createElement('span');
      txt.textContent = w.text;
      li.appendChild(txt);
      if (w.tip) {
        var tip = document.createElement('em');
        tip.textContent = 'Tip: ' + w.tip;
        li.appendChild(tip);
      }
      warnList.appendChild(li);
    });
    warnSec.appendChild(warnList);
    body.appendChild(warnSec);
  }

  /* ---------------- control events ---------------- */
  countSlider.addEventListener('input', function () {
    filters.count = Number(countSlider.value);
    countOut.textContent = filters.count;
    scheduleSync();
  });
  bstMinEl.addEventListener('input', function () {
    filters.bstMin = Math.min(Number(bstMinEl.value), filters.bstMax);
    bstMinEl.value = filters.bstMin;
    updateBstOut();
    scheduleSync();
  });
  bstMaxEl.addEventListener('input', function () {
    filters.bstMax = Math.max(Number(bstMaxEl.value), filters.bstMin);
    bstMaxEl.value = filters.bstMax;
    updateBstOut();
    scheduleSync();
  });
  $('legendary-select').addEventListener('change', function () { filters.legendary = this.value; scheduleSync(); });
  $('mythical-select').addEventListener('change', function () { filters.mythical = this.value; scheduleSync(); });

  $('generate-btn').addEventListener('click', roll);

  $('copy-btn').addEventListener('click', function () {
    var url = buildShareUrl(filters, currentRolls);
    var label = $('copy-label');
    copyToClipboard(url, function (ok) {
      label.textContent = ok ? '✅ Copied!' : '🔗 Link ready';
      setTimeout(function () { label.textContent = '📋 Copy Config Link'; }, 1800);
    });
  });

  $('reset-btn').addEventListener('click', function () {
    filters = Object.assign({}, DEFAULTS);
    try { localStorage.removeItem(LS_CONFIG); } catch (e) { /* ignore */ }
    renderControls();
    syncConfig();
  });

  $('history-clear').addEventListener('click', function () {
    rollHistory = [];
    saveHistory();
    renderHistory();
  });

  $('generator-form').addEventListener('submit', function (e) {
    e.preventDefault();
    roll();
  });

  /* ---------------- init ---------------- */
  var sharedTeam = teamFromParams(params);
  renderControls();
  syncConfig();
  renderHistory();
  if (sharedTeam.length) {
    currentRolls = sharedTeam;
    renderTeam(sharedTeam);
    renderAnalysis(sharedTeam);
    metaEl.textContent = 'Shared squad — these exact Pokémon were rolled with this link. Press 🎲 Generate to roll your own!';
  }
})();
