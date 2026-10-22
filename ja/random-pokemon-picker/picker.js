/* ============================================================
   Random Pokemon Picker — one-click random Pokemon picker
   ES5 IIFE, no build step. Mirrors the house design system.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var DATA = window.POKEMON_DATA || [];
  var CRY_NAMES = window.CRY_NAMES || {};
  var CRY_BASE = 'https://play.pokemonshowdown.com/audio/cries/';

  /* ---------------- constants ---------------- */
  var TYPES = [
    { slug: 'fire', label: 'ほのお', color: '#FF9D55', light: false },
    { slug: 'water', label: 'みず', color: '#6890F0', light: true },
    { slug: 'grass', label: 'くさ', color: '#78C850', light: false },
    { slug: 'electric', label: 'でんき', color: '#F8D030', light: false },
    { slug: 'ice', label: 'こおり', color: '#98D8D8', light: false },
    { slug: 'fighting', label: 'かくとう', color: '#C03028', light: true },
    { slug: 'poison', label: 'どく', color: '#A040A0', light: true },
    { slug: 'ground', label: 'じめん', color: '#E0C068', light: false },
    { slug: 'flying', label: 'ひこう', color: '#A890F0', light: true },
    { slug: 'psychic', label: 'エスパー', color: '#F85888', light: true },
    { slug: 'bug', label: 'むし', color: '#A8B820', light: false },
    { slug: 'rock', label: 'いわ', color: '#B8A038', light: true },
    { slug: 'ghost', label: 'ゴースト', color: '#705898', light: true },
    { slug: 'dark', label: 'あく', color: '#705848', light: true },
    { slug: 'dragon', label: 'ドラゴン', color: '#7038F8', light: true },
    { slug: 'steel', label: 'はがね', color: '#B8B8D0', light: false },
    { slug: 'fairy', label: 'フェアリー', color: '#EE99AC', light: false },
    { slug: 'normal', label: 'ノーマル', color: '#A8A878', light: false }
  ];
  var TYPE_MAP = {};
  TYPES.forEach(function (t) { TYPE_MAP[t.slug] = t; });

  var GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var REGIONS = { 1: 'カントー', 2: 'ジョウト', 3: 'ホウエン', 4: 'シンオウ', 5: 'イッシュ', 6: 'カロス', 7: 'アローラ', 8: 'ガラル', 9: 'パルデア' };

  var BY_ID = {};
  DATA.forEach(function (p) { BY_ID[p.i] = p; });

  var DEFAULTS = { gens: [], types: [], legendary: 'include', mythical: 'include', count: 1, shiny: 'normal', cries: true };
  var filters = { gens: [], types: [], legendary: 'include', mythical: 'include', count: 1, shiny: 'normal', cries: true };
  var picks = [];          // [{p: species, shiny: bool}]
  var lastAudio = null;

  /* ---------------- helpers ---------------- */
  function pad4(n) { return String(n).padStart(4, '0'); }

  function displayName(slug) {
    if (window.JA_POKE_NAMES && window.JA_POKE_NAMES[slug]) return window.JA_POKE_NAMES[slug];
    return (slug.charAt(0).toUpperCase() + slug.slice(1)).split('-')[0];
  }

  function reroll() { return Math.random(); }

  function parseList(v) {
    if (!v) return [];
    return v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /* ---------------- filters / pool ---------------- */
  function applyFilters(f) {
    return DATA.filter(function (p) {
      if (f.gens.length && f.gens.indexOf(p.g) < 0) return false;
      if (f.types.length && !p.t.some(function (t) { return f.types.indexOf(t) >= 0; })) return false;
      if (f.legendary === 'exclude' && p.lg) return false;
      if (f.legendary === 'only' && !p.lg) return false;
      if (f.mythical === 'exclude' && p.my) return false;
      if (f.mythical === 'only' && !p.my) return false;
      return true;
    });
  }

  /* ---------------- UI construction ---------------- */
  function buildToggleButtons(container, items, current, onToggle) {
    container.innerHTML = '';   /* clear first: the chips are already in the HTML (fast first paint, no layout shift) */
    items.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn';
      b.textContent = item.label;
      b.setAttribute('data-v', String(item.value));
      b.setAttribute('aria-pressed', current.indexOf(item.value) >= 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        var i = current.indexOf(item.value);
        if (i >= 0) current.splice(i, 1); else current.push(item.value);
        b.setAttribute('aria-pressed', current.indexOf(item.value) >= 0 ? 'true' : 'false');
        onToggle();
      });
      container.appendChild(b);
    });
  }

  function buildRadioButtons(container, items, value, onPick) {
    container.innerHTML = '';   /* clear first: the chips are already in the HTML (fast first paint, no layout shift) */
    items.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn';
      b.textContent = item.label;
      b.setAttribute('data-v', String(item.value));
      b.setAttribute('aria-pressed', value === item.value ? 'true' : 'false');
      b.addEventListener('click', function () {
        onPick(item.value);
      });
      container.appendChild(b);
    });
  }

  function syncRadioButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('#shiny-buttons .chip-btn'), function (b) {
      b.setAttribute('aria-pressed', filters.shiny === b.getAttribute('data-v') ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('#cry-buttons .chip-btn'), function (b) {
      b.setAttribute('aria-pressed', (filters.cries ? 'on' : 'off') === b.getAttribute('data-v') ? 'true' : 'false');
    });
  }

  function syncToggleButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('#gen-buttons .chip-btn'), function (b) {
      var v = Number(b.getAttribute('data-v'));
      var on = filters.gens.indexOf(v) >= 0;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('#type-buttons .chip-btn'), function (b) {
      var v = b.getAttribute('data-v');
      var on = filters.types.indexOf(v) >= 0;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* ---------------- pick & render ---------------- */
  function doPick() {
    var pool = applyFilters(filters);
    if (!pool.length) {
      $('results-empty').textContent = '条件に合うポケモンがいません — 条件をゆるめてみてください！';
      $('results-empty').hidden = false;
      $('results-grid').innerHTML = '';
      $('results-meta').textContent = '';
      picks = [];
      return;
    }
    var n = Math.min(filters.count, pool.length);
    var chosen = [];
    var pool2 = pool.slice();
    for (var i = 0; i < n; i++) {
      var idx = Math.floor(reroll() * pool2.length);
      var p = pool2.splice(idx, 1)[0];
      var shiny = false;
      if (filters.shiny === 'shiny') shiny = true;
      else if (filters.shiny === 'random') shiny = reroll() < 0.08;
      chosen.push({ p: p, shiny: shiny });
    }
    picks = chosen;
    renderPicks(chosen);
    if (filters.cries && chosen.length && chosen[0].p) playCry(chosen[0].p.n);
  }

  function playCry(slug) {
    var cry = CRY_NAMES[slug];
    if (!cry) return;
    try {
      if (lastAudio) { lastAudio.pause(); lastAudio = null; }
      var a = new Audio(CRY_BASE + encodeURIComponent(cry) + '.mp3');
      a.volume = 0.6;
      a.play().catch(function () { /* autoplay blocked: ignore */ });
      lastAudio = a;
    } catch (e) { /* ignore */ }
  }

  function renderPicks(rolls) {
    var grid = $('results-grid');
    grid.innerHTML = '';
    $('results-empty').hidden = rolls.length > 0;
    rolls.forEach(function (r) { grid.appendChild(buildCard(r)); });
    var pool = applyFilters(filters);
    $('results-meta').textContent = rolls.length + (rolls.length === 1 ? '匹を選びました' : '匹を選びました') +
      '· 候補' + pool.length + '匹 / 全' + DATA.length + '匹';
  }

  function buildCard(r) {
    var p = r.p;
    var aura = TYPE_MAP[p.t[0]] ? TYPE_MAP[p.t[0]].color : '#A8A878';

    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dex-card cornered';
    btn.style.setProperty('--aura', aura);
    btn.setAttribute('aria-label', '詳細を見る：' + displayName(p.n) + (r.shiny ? '（色違い）' : ''));
    btn.addEventListener('click', function () { openModal(r); });

    var top = document.createElement('span');
    top.className = 'dex-top';
    var num = document.createElement('span');
    num.className = 'dex-num';
    num.textContent = '#' + pad4(p.si);
    top.appendChild(num);
    if (r.shiny) {
      var s = document.createElement('span');
      s.textContent = '';
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
    img.alt = displayName(p.n) + (r.shiny ? '（色違い）' : '') + 'のアートワーク';
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
    sub.textContent = '第' + p.g + ' · ' + (REGIONS[p.g] || '') + ' · #' + pad4(p.si);
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
    bst.innerHTML = '合計 <strong>' + p.tt + '</strong>';
    btn.appendChild(bst);

    li.appendChild(btn);
    return li;
  }

  /* ---------------- share (same param format as the generator) ---------------- */
  function filtersToQuery(f) {
    var q = new URLSearchParams();
    if (f.gens.length) q.set('gens', f.gens.slice().sort(function (a, b) { return a - b; }).join(','));
    if (f.types.length) q.set('types', f.types.join(','));
    if (f.count !== DEFAULTS.count) q.set('count', String(f.count));
    if (f.legendary !== DEFAULTS.legendary) q.set('legendary', f.legendary);
    if (f.mythical !== DEFAULTS.mythical) q.set('mythical', f.mythical);
    if (f.shiny !== DEFAULTS.shiny) q.set('shiny', f.shiny);
    var s = q.toString();
    return s ? '?' + s : '';
  }

  function teamToParam(rolls) {
    return rolls.map(function (r) { return r.p.i + (r.shiny ? '.s' : ''); }).join(',');
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
      try { window.prompt('選択リンクをコピー:', url); }
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

  function filtersFromParams(params) {
    var f = { gens: [], types: [], legendary: 'include', mythical: 'include', count: 1, shiny: 'normal', cries: true };
    f.gens = parseList(params.get('gens')).map(Number).filter(function (g) { return GENERATIONS.indexOf(g) >= 0; });
    f.types = parseList(params.get('types')).filter(function (t) { return TYPE_MAP[t]; });
    var count = Number(params.get('count'));
    if (isFinite(count) && count >= 1 && count <= 12) f.count = count;
    var leg = params.get('legendary');
    if (['include', 'exclude', 'only'].indexOf(leg) >= 0) f.legendary = leg;
    var my = params.get('mythical');
    if (['include', 'exclude', 'only'].indexOf(my) >= 0) f.mythical = my;
    var shiny = params.get('shiny');
    if (['normal', 'shiny', 'random'].indexOf(shiny) >= 0) f.shiny = shiny;
    return f;
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

  /* ---------------- init ---------------- */
  function init() {
    var params = new URLSearchParams(location.search);
    for (var k in DEFAULTS) if (DEFAULTS.hasOwnProperty(k)) filters[k] = DEFAULTS[k];
    var f = filtersFromParams(params);
    filters = f;

    /* gen buttons */
    buildToggleButtons($('gen-buttons'), GENERATIONS.map(function (g) {
      return { value: g, label: '第' + g };
    }), filters.gens, function () { syncToggleButtons(); updatePool(); });
    /* type buttons */
    buildToggleButtons($('type-buttons'), TYPES.map(function (t) {
      return { value: t.slug, label: t.label };
    }), filters.types, function () { syncToggleButtons(); updatePool(); });

    /* store data-v for gen buttons */

    $('count-slider').value = filters.count;
    $('count-output').textContent = String(filters.count);
    $('legendary-select').value = filters.legendary;
    $('mythical-select').value = filters.mythical;

    buildRadioButtons($('shiny-buttons'), [
      { value: 'normal', label: '通常色' },
      { value: 'random', label: '8% ランダム' },
      { value: 'shiny', label: '色違い' }
    ], filters.shiny, function (v) { filters.shiny = v; syncRadioButtons(); updatePool(); });
    buildRadioButtons($('cry-buttons'), [
      { value: 'on', label: '鳴き声' },
      { value: 'off', label: 'ミュート' }
    ], filters.cries ? 'on' : 'off', function (v) { filters.cries = v === 'on'; syncRadioButtons(); });
    syncRadioButtons();

    $('count-slider').addEventListener('input', function () {
      filters.count = Number(this.value);
      $('count-output').textContent = String(filters.count);
      updatePool();
    });
    $('legendary-select').addEventListener('change', function () {
      filters.legendary = this.value; updatePool();
    });
    $('mythical-select').addEventListener('change', function () {
      filters.mythical = this.value; updatePool();
    });

    $('pick-btn').addEventListener('click', doPick);
    $('copy-btn').addEventListener('click', function () {
      copyToClipboard(buildShareUrl(filters, picks), function (ok) {
        var label = $('copy-label');
        label.textContent = ok ? 'リンクをコピーしました' : '準備完了';
        setTimeout(function () { label.textContent = 'リンクをコピー'; }, 1800);
      });
    });
    $('reset-btn').addEventListener('click', function () {
      filters.gens.length = 0;
      filters.types.length = 0;
      filters.legendary = 'include';
      filters.mythical = 'include';
      filters.count = 1;
      filters.shiny = 'normal';
      $('count-slider').value = 1;
      $('count-output').textContent = '1';
      $('legendary-select').value = 'include';
      $('mythical-select').value = 'include';
      $('results-grid').innerHTML = '';
      $('results-empty').hidden = false;
      $('results-empty').textContent = '「ポケモンをランダムに選ぶ」を押すと選択されます。選び直すまで結果は変わりません。';
      picks = [];
      syncToggleButtons();
      syncRadioButtons();
      updatePool();
    });

    updatePool();
    bindModal();

    var sharedTeam = teamFromParams(params);
    if (sharedTeam.length) {
      picks = sharedTeam;
      renderPicks(sharedTeam);
      $('results-meta').textContent = '共有リンクから読み込みました — 「ポケモンをランダムに選ぶ」で選び直せます';
    }
  }

  function updatePool() {
    var pool = applyFilters(filters);
    $('pool-count').textContent = pool.length.toLocaleString('en-US') + '匹が候補（' + DATA.length + '匹）';
    $('results-empty').textContent = '「ポケモンをランダムに選ぶ」を押してください —' + pool.length + '匹が対象です。';
  }

  /* ---------------- detail modal ---------------- */
  var modal = $('pk-modal');
  var modalCard = $('pk-modal-card');
  var currentRoll = null;
  var STAT_NAMES = ['HP', 'こうげき', 'ぼうぎょ', 'とくこう', 'とくぼう', 'すばやさ'];

  function prettyAbility(slug) {
    return String(slug).split('-').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  function openModal(r) {
    var p = r.p;
    currentRoll = r;
    var aura = TYPE_MAP[p.t[0]] ? TYPE_MAP[p.t[0]].color : '#A8A878';
    modalCard.style.setProperty('--aura', aura);

    $('pk-modal-meta').innerHTML = '<span class="mnum">#' + pad4(p.si) + '</span> · Gen ' + p.g +
      ' · ' + (REGIONS[p.g] || '') + ' · ' + ({initial: '進化前', middle: '中間進化', final: '最終進化'}[p.ev] || '') +
      (p.lg ? '· 伝説' : '') + (p.my ? ' · 幻' : '');
    $('pk-modal-name').textContent = displayName(p.n);

    var mt = $('pk-modal-types');
    mt.innerHTML = '';
    p.t.forEach(function (t) {
      var meta = TYPE_MAP[t];
      var chip = document.createElement('span');
      chip.className = 'type-tag';
      chip.style.setProperty('--tag', meta ? meta.color : '#A8A878');
      chip.textContent = meta ? meta.label : t;
      mt.appendChild(chip);
    });

    var img = $('pk-modal-img');
    img.src = r.shiny ? p.sps : p.sp;
    img.alt = displayName(p.n) + 'のアートワーク';
    img.onerror = function () {
      var fb = img.src.replace('/other/official-artwork', '');
      if (fb !== img.src) img.src = fb; else img.onerror = null;
    };

    $('pk-modal-bst').textContent = p.tt;
    var stats = $('pk-modal-stats');
    stats.innerHTML = '';
    p.st.forEach(function (v, idx) {
      var row = document.createElement('div');
      row.className = 'stat-row';
      var dt = document.createElement('dt');
      dt.textContent = STAT_NAMES[idx];
      var dd = document.createElement('dd');
      dd.textContent = v;
      var track = document.createElement('div');
      track.className = 'stat-track';
      var fill = document.createElement('div');
      fill.className = 'stat-fill';
      fill.style.width = Math.min(100, (v / 255) * 100) + '%';
      track.appendChild(fill);
      row.appendChild(dt);
      row.appendChild(dd);
      row.appendChild(track);
      stats.appendChild(row);
    });

    var ab = $('pk-modal-abilities');
    ab.innerHTML = '';
    (p.ab || []).forEach(function (a) {
      var li = document.createElement('li');
      li.textContent = prettyAbility(a);
      ab.appendChild(li);
    });

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('pk-modal-close').focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function bindModal() {
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    $('pk-modal-close').addEventListener('click', closeModal);
    $('pk-modal-cry').addEventListener('click', function () {
      if (currentRoll) playCry(currentRoll.p.n);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
