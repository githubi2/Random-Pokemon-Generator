/* ============================================================
   Random Legendary Pokemon Generator — legendaries, mythicals and
   pseudo-legendaries drawn from the shared Gen 1-9 dataset.
   ES5 IIFE, no build step. Mirrors the house design system.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* --- type colors (same data as /pokemon-type-chart/) --- */
var TYPES = [
    { slug: 'normal', label: 'Normal', color: '#A8A878', light: false },
    { slug: 'fire', label: 'Fire', color: '#FF9D55', light: false },
    { slug: 'water', label: 'Water', color: '#6890F0', light: true },
    { slug: 'electric', label: 'Electric', color: '#F8D030', light: false },
    { slug: 'grass', label: 'Grass', color: '#78C850', light: false },
    { slug: 'ice', label: 'Ice', color: '#98D8D8', light: false },
    { slug: 'fighting', label: 'Fighting', color: '#C03028', light: true },
    { slug: 'poison', label: 'Poison', color: '#A040A0', light: true },
    { slug: 'ground', label: 'Ground', color: '#E0C068', light: false },
    { slug: 'flying', label: 'Flying', color: '#A890F0', light: true },
    { slug: 'psychic', label: 'Psychic', color: '#F85888', light: true },
    { slug: 'bug', label: 'Bug', color: '#A8B820', light: false },
    { slug: 'rock', label: 'Rock', color: '#B8A038', light: true },
    { slug: 'ghost', label: 'Ghost', color: '#705898', light: true },
    { slug: 'dragon', label: 'Dragon', color: '#7038F8', light: true },
    { slug: 'dark', label: 'Dark', color: '#705848', light: true },
    { slug: 'steel', label: 'Steel', color: '#B8B8D0', light: false },
    { slug: 'fairy', label: 'Fairy', color: '#EE99AC', light: false }
  ];

  var TYPE_MAP = {};
  for (var ti = 0; ti < TYPES.length; ti++) TYPE_MAP[TYPES[ti].slug] = TYPES[ti];

  var DATA = window.POKEMON_DATA || [];
  var PSEUDO = ['dragonite', 'tyranitar', 'salamence', 'metagross', 'garchomp', 'hydreigon', 'goodra', 'kommo-o', 'dragapult', 'baxcalibur'];

  var BASE = [];
  for (var bi = 0; bi < DATA.length; bi++) {
    if (DATA[bi].n.indexOf('-') < 0) BASE.push(DATA[bi]);
  }

  function pickPool(list, test) {
    var out = [];
    for (var i = 0; i < list.length; i++) if (test(list[i])) out.push(list[i]);
    return out;
  }

  var POOLS = {
    legendary: pickPool(BASE, function (p) { return p.lg === 1; }),
    mythical: pickPool(BASE, function (p) { return p.my === 1; }),
    pseudo: pickPool(BASE, function (p) { return PSEUDO.indexOf(p.n) >= 0; })
  };
  POOLS.all = POOLS.legendary.concat(POOLS.mythical, POOLS.pseudo);
  POOLS.all.sort(function (a, b) { return a.i - b.i; });

  function categoryOf(p) {
    if (p.lg === 1) return 'Legendary';
    if (p.my === 1) return 'Mythical';
    return 'Pseudo-legendary';
  }

  function displayName(n) {
    return String(n).split('-').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  function pad4(n) {
    n = String(n);
    while (n.length < 4) n = '0' + n;
    return n;
  }

  var pool = 'all';
  var current = null;
  var shinyOn = false;
  var lastShareText = '';
  var history = [];
  var rolling = false;

  function updatePoolNote() {
    var note = $('pool-note');
    if (pool === 'all') {
      note.textContent = 'Rolling from ' + POOLS.all.length + ' special Pokemon — ' +
        POOLS.legendary.length + ' legendary · ' + POOLS.mythical.length + ' mythical · ' +
        POOLS.pseudo.length + ' pseudo-legendary.';
    } else {
      var label = pool === 'legendary' ? 'legendary' : (pool === 'mythical' ? 'mythical' : 'pseudo-legendary');
      note.textContent = 'Rolling from ' + POOLS[pool].length + ' ' + label + ' Pokemon.';
    }
  }

  function render(p) {
    current = p;
    shinyOn = false;
    var cat = categoryOf(p);
    var t0 = TYPE_MAP[p.t[0]];
    var aura = t0 ? t0.color + '33' : '#f8f8f633';
    var chips = p.t.map(function (slug) {
      var t = TYPE_MAP[slug];
      if (!t) return '';
      return '<span class="type-chip" style="--chip:' + t.color + ';--chip-text:' + (t.light ? '#ffffff' : '#121212') + '">' + t.label + '</span>';
    }).join('');

    var statDefs = ['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE'];
    var statCells = '';
    for (var s = 0; s < statDefs.length; s++) {
      statCells += '<li><span>' + statDefs[s] + '</span><b>' + p.st[s] + '</b></li>';
    }
    statCells += '<li class="lgx-bst"><span>BST</span><b>' + p.tt + '</b></li>';

    var abilities = (p.ab || []).map(function (a) { return displayName(a); }).join(' · ');
    var name = displayName(p.n);

    var el = $('lg-result');
    el.innerHTML =
      '<div class="lgx-card" style="--aura:' + aura + '">' +
        '<div class="lgx-art"><img id="lgx-img" src="' + p.sp + '" width="200" height="200" alt="' + name + ' official artwork" /></div>' +
        '<div class="lgx-info">' +
          '<p class="lgx-meta">#' + pad4(p.si) + ' · Gen ' + p.g + ' · <span class="lgx-badge">' + cat + '</span></p>' +
          '<div class="lgx-name">' + name + '</div>' +
          '<div class="lgx-types">' + chips + '</div>' +
          '<ul class="lgx-stats">' + statCells + '</ul>' +
          '<p class="lgx-abilities">Abilities: ' + (abilities || '—') + '</p>' +
          '<div class="lgx-actions">' +
            '<button type="button" class="chip-btn" id="lgx-shiny" aria-pressed="false">✨ Shiny form</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    el.hidden = false;
    $('result-bar').hidden = false;

    var img = $('lgx-img');
    img.onerror = function () { img.src = p.sp; };
    $('lgx-shiny').addEventListener('click', function () {
      shinyOn = !shinyOn;
      this.setAttribute('aria-pressed', shinyOn ? 'true' : 'false');
      img.src = shinyOn ? p.sps : p.sp;
    });

    lastShareText = 'My random legendary: ' + name + ' (' + cat + ', #' + pad4(p.si) + ')! Roll yours: ' + location.origin + location.pathname;
    pushHistory(p, cat);
  }

  function pushHistory(p, cat) {
    history.unshift({ p: p, cat: cat });
    if (history.length > 10) history.length = 10;
    var list = $('history-list');
    list.innerHTML = '';
    for (var i = 0; i < history.length; i++) {
      var h = history[i];
      var li = document.createElement('li');
      li.className = 'history-item lgx-hitem';
      li.innerHTML = '<img src="' + h.p.sp + '" alt="" width="40" height="40" loading="lazy" />' +
        '<span class="lgx-hname">' + displayName(h.p.n) + '</span>' +
        '<span class="lgx-hmeta">' + h.cat + ' · Gen ' + h.p.g + '</span>';
      list.appendChild(li);
    }
    $('history-panel').hidden = history.length === 0;
  }

  function doRoll() {
    if (rolling) return;
    var p = POOLS[pool];
    if (!p.length) return;
    rolling = true;
    var btn = $('lg-roll');
    var label = btn.querySelector('span');
    var old = label.textContent;
    label.textContent = '🎲 Rolling…';
    btn.disabled = true;
    setTimeout(function () {
      rolling = false;
      btn.disabled = false;
      label.textContent = old;
      render(p[Math.floor(Math.random() * p.length)]);
    }, 240);
  }

  /* ---------- copy / share ---------- */
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

  function shareResult() {
    var label = $('lg-share-label');
    if (!lastShareText) {
      label.textContent = '🎲 Roll first!';
      setTimeout(function () { label.textContent = '📣 Share Result'; }, 1800);
      return;
    }
    copyToClipboard(lastShareText, function (ok) {
      label.textContent = ok ? '✅ Copied!' : '📝 Copy manually';
      setTimeout(function () { label.textContent = '📣 Share Result'; }, 1800);
    });
  }

  /* ---------- events ---------- */
  var poolButtons = document.querySelectorAll('#pool-buttons .chip-btn');
  for (var pb = 0; pb < poolButtons.length; pb++) {
    poolButtons[pb].addEventListener('click', function () {
      if (rolling) return;
      pool = this.getAttribute('data-pool');
      for (var q = 0; q < poolButtons.length; q++) {
        poolButtons[q].setAttribute('aria-pressed', poolButtons[q].getAttribute('data-pool') === pool ? 'true' : 'false');
      }
      updatePoolNote();
    });
  }

  $('lg-roll').addEventListener('click', doRoll);
  $('lg-share').addEventListener('click', shareResult);

  $('history-clear').addEventListener('click', function () {
    history = [];
    $('history-list').innerHTML = '';
    $('history-panel').hidden = true;
  });

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && !rolling) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'BUTTON' || tag === 'TEXTAREA' || tag === 'INPUT') return;
      e.preventDefault();
      doRoll();
    }
  });

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

  /* ---------- init ---------- */
  updatePoolNote();
  void current;
}());
