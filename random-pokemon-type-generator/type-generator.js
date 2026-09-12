/* ============================================================
   Random Pokemon Type Generator — spinning 18-type wheel + single/dual rolls
   ES5 IIFE, no build step. Shares the type data and the 18x18
   effectiveness matrix with /pokemon-type-chart/ (injected below).
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* --- type list & effectiveness matrix (same data as /pokemon-type-chart/) --- */
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

  var TYPE_MAP = {};
  for (var ti = 0; ti < TYPES.length; ti++) TYPE_MAP[TYPES[ti].slug] = TYPES[ti];

  function effectiveness(att, def) {
    var row = TYPE_CHART[att];
    if (!row) return 1;
    var v = row[def];
    return typeof v === 'number' ? v : 1;
  }

  var DATA = window.POKEMON_DATA || [];
  var TOTAL = DATA.length;

  function displayName(n) {
    return String(n).split('-').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  /* ---------- wheel ---------- */
  var CX = 180, CY = 180, R_OUT = 170, R_LABEL = 150, SLICE = 20;
  var rotor = $('tw-rotor');
  var spinning = false;
  var currentAngle = 0;
  var winIndex = -1;

  function polar(deg, r) {
    var a = (deg - 90) * Math.PI / 180;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  }

  function buildWheel() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 360 360');
    for (var k = 0; k < TYPES.length; k++) {
      var t = TYPES[k];
      var a0 = k * SLICE, a1 = a0 + SLICE;
      var p0 = polar(a0, R_OUT), p1 = polar(a1, R_OUT);
      var g = document.createElementNS(ns, 'g');
      g.setAttribute('id', 'tw-slice-' + k);
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d',
        'M' + CX + ' ' + CY +
        ' L' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) +
        ' A' + R_OUT + ' ' + R_OUT + ' 0 0 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + ' Z');
      path.setAttribute('fill', t.color);
      path.setAttribute('stroke', '#ffffff');
      path.setAttribute('stroke-width', '1.6');
      g.appendChild(path);

      var mid = a0 + SLICE / 2;
      var pos = polar(mid, R_LABEL);
      var flip = (mid > 90 && mid < 270);
      var text = document.createElementNS(ns, 'text');
      text.setAttribute('x', pos[0].toFixed(2));
      text.setAttribute('y', pos[1].toFixed(2));
      text.setAttribute('transform',
        'rotate(' + (flip ? mid + 90 : mid - 90) + ' ' + pos[0].toFixed(2) + ' ' + pos[1].toFixed(2) + ')');
      text.setAttribute('text-anchor', flip ? 'start' : 'end');
      text.setAttribute('font-size', '10.5');
      text.setAttribute('font-weight', '800');
      text.setAttribute('font-family', 'ui-monospace, Menlo, Consolas, monospace');
      text.setAttribute('letter-spacing', '0.05em');
      text.setAttribute('fill', t.light ? '#ffffff' : '#121212');
      text.textContent = String(t.label).toUpperCase();
      g.appendChild(text);
      svg.appendChild(g);
    }

    var ring = document.createElementNS(ns, 'circle');
    ring.setAttribute('cx', CX); ring.setAttribute('cy', CY); ring.setAttribute('r', R_OUT);
    ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#121212'); ring.setAttribute('stroke-width', '5');
    svg.appendChild(ring);

    var disc = document.createElementNS(ns, 'circle');
    disc.setAttribute('cx', CX); disc.setAttribute('cy', CY); disc.setAttribute('r', '64');
    disc.setAttribute('fill', '#ffffff'); disc.setAttribute('stroke', '#121212'); disc.setAttribute('stroke-width', '4');
    svg.appendChild(disc);

    rotor.innerHTML = '';
    rotor.appendChild(svg);
  }

  function spinWheel(onDone) {
    if (spinning) return;
    spinning = true;
    $('tw-hub').disabled = true;

    if (winIndex >= 0) {
      var prev = $('tw-slice-' + winIndex);
      if (prev) prev.classList.remove('tw-win');
    }
    winIndex = -1;

    var k = Math.floor(Math.random() * TYPES.length);
    var jitter = Math.random() * 12 - 6;
    var want = ((360 - (k * SLICE + SLICE / 2)) % 360 + 360) % 360;
    var cur = currentAngle % 360;
    if (cur < 0) cur += 360;
    var delta = ((want - cur) % 360 + 360) % 360;
    currentAngle += 360 * 5 + delta + jitter;
    rotor.style.transform = 'rotate(' + currentAngle + 'deg)';

    setTimeout(function () {
      spinning = false;
      $('tw-hub').disabled = false;
      winIndex = k;
      var g = $('tw-slice-' + k);
      if (g) g.classList.add('tw-win');
      onDone(k);
    }, 4400);
  }

  /* ---------- data helpers ---------- */
  function membersOf(t1, t2) {
    var out = [];
    for (var i = 0; i < DATA.length; i++) {
      var p = DATA[i];
      if (p.t.indexOf(t1) >= 0 && (t2 === null || p.t.indexOf(t2) >= 0)) out.push(p);
    }
    return out;
  }

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function chipHtml(slug) {
    var t = TYPE_MAP[slug];
    if (!t) return '';
    return '<span class="type-chip" style="--chip:' + t.color + ';--chip-text:' + (t.light ? '#ffffff' : '#121212') + '">' + t.label + '</span>';
  }

  function multChipHtml(slug, mult) {
    var t = TYPE_MAP[slug];
    var label = t ? t.label : slug;
    var num = mult === 0.5 ? '0.5' : (mult === 0.25 ? '0.25' : String(mult));
    return '<span class="tw-mult" style="--c:' + t.color + ';--tc:' + (t.light ? '#ffffff' : '#121212') + '">' + label + ' ×' + num + '</span>';
  }

  function matchupRows(t1, t2) {
    var weak = [], resist = [], immune = [];
    for (var i = 0; i < TYPES.length; i++) {
      var att = TYPES[i].slug;
      var m = effectiveness(att, t1);
      if (t2 !== null) m *= effectiveness(att, t2);
      if (m > 1) weak.push([att, m]);
      else if (m === 0) immune.push([att, m]);
      else if (m < 1) resist.push([att, m]);
    }
    weak.sort(function (a, b) { return b[1] - a[1]; });
    resist.sort(function (a, b) { return a[1] - b[1]; });

    var html = '';
    function row(label, items) {
      if (!items.length) return '';
      var chips = items.map(function (it) { return multChipHtml(it[0], it[1]); }).join('');
      return '<li class="tw-row"><span class="tw-row-label">' + label + '</span><span class="tw-mults">' + chips + '</span></li>';
    }
    html += row('Weak to', weak);
    html += row('Resists', resist);
    html += row('Immune', immune);
    if (!html) html = '<li class="tw-row"><span class="tw-row-label">Matchups</span><span class="tw-mults">Nothing special — this type breaks even across the chart.</span></li>';
    return html;
  }

  function examplesHtml(list, caption, cap) {
    if (!list.length) return '';
    var picks = list.slice(0, cap);
    var figs = picks.map(function (p) {
      return '<figure class="tw-ex"><img src="' + p.sp + '" width="72" height="72" loading="lazy" alt="' + displayName(p.n) + ' artwork" /><figcaption>' + displayName(p.n) + '</figcaption></figure>';
    }).join('');
    return '<p class="tw-row-label">' + caption + '</p><div class="tw-examples">' + figs + '</div>';
  }

  var lastShareText = '';
  var history = [];

  function renderCard(t1, t2) {
    var t1meta = TYPE_MAP[t1];
    var label1 = t1meta ? t1meta.label : t1;
    var label2 = '';
    if (t2 !== null) {
      var t2meta = TYPE_MAP[t2];
      label2 = t2meta ? t2meta.label : t2;
    }

    var members = membersOf(t1, t2);
    var rarity;
    if (t2 === null) {
      rarity = members.length + ' of ' + TOTAL + ' Pokemon share the ' + label1 + ' type';
    } else if (members.length === 0) {
      rarity = 'No Pokemon has ever carried the ' + label1 + '/' + label2 + ' pairing';
    } else if (members.length === 1) {
      rarity = 'Only 1 Pokemon carries this pairing — ' + displayName(members[0].n);
    } else {
      rarity = members.length + ' Pokemon carry this pairing';
    }

    var chips = chipHtml(t1) + (t2 !== null ? chipHtml(t2) : '');
    var rows = matchupRows(t1, t2);

    var exList = members;
    var exCaption = t2 === null ? 'Pokemon with this type' : 'Pokemon with this combination';
    if (!exList.length) {
      exList = shuffled(membersOf(t1, null));
      exCaption = label1 + '-type examples';
    }
    if (t2 === null) exList = shuffled(exList);
    var examples = examplesHtml(exList, exCaption, 5);

    var el = $('tw-result');
    el.innerHTML =
      '<div class="tw-card">' +
        '<div class="tw-card-head">' + chips + '<span class="tw-rarity">' + rarity + '</span></div>' +
        '<ul class="tw-rows">' + rows + '</ul>' +
        examples +
      '</div>';
    el.hidden = false;
    $('result-bar').hidden = false;

    var short;
    if (t2 === null) short = '';
    else if (members.length === 0) short = ' — no Pokemon carries it';
    else if (members.length === 1) short = ' — only ' + displayName(members[0].n) + ' carries it';
    else short = ' — ' + members.length + ' Pokemon share it';
    lastShareText = (t2 === null)
      ? 'The type wheel landed on ' + label1.toUpperCase() + '! Roll your own random Pokemon type: ' + location.origin + location.pathname
      : 'Random type roll: ' + label1 + ' / ' + label2 + short + '. Roll yours: ' + location.origin + location.pathname;
  }

  function pushHistory(t1, t2) {
    history.unshift({ t1: t1, t2: t2 });
    if (history.length > 12) history.length = 12;
    var list = $('history-list');
    list.innerHTML = '';
    for (var i = 0; i < history.length; i++) {
      var h = history[i];
      var a = TYPE_MAP[h.t1], b = h.t2 !== null ? TYPE_MAP[h.t2] : null;
      var label = a.label + (b ? ' / ' + b.label : '');
      var li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML =
        '<span class="tw-hdot" style="--c:' + a.color + '"></span>' +
        (b ? '<span class="tw-hdot" style="--c:' + b.color + '"></span>' : '') +
        '<span class="tw-hname">' + label + '</span>';
      list.appendChild(li);
    }
    $('history-panel').hidden = history.length === 0;
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
    var label = $('tw-share-label');
    if (!lastShareText) {
      label.textContent = '🎡 Spin first!';
      setTimeout(function () { label.textContent = '📣 Share Result'; }, 1800);
      return;
    }
    copyToClipboard(lastShareText, function (ok) {
      label.textContent = ok ? '✅ Copied!' : '📝 Copy manually';
      setTimeout(function () { label.textContent = '📣 Share Result'; }, 1800);
    });
  }

  /* ---------- events ---------- */
  var mode = 'single';
  var modeButtons = document.querySelectorAll('#mode-buttons .chip-btn');
  for (var mb = 0; mb < modeButtons.length; mb++) {
    modeButtons[mb].addEventListener('click', function () {
      if (spinning) return;
      mode = this.getAttribute('data-mode');
      for (var q = 0; q < modeButtons.length; q++) {
        modeButtons[q].setAttribute('aria-pressed', modeButtons[q].getAttribute('data-mode') === mode ? 'true' : 'false');
      }
    });
  }

  function doSpin() {
    if (spinning) return;
    var modeAtSpin = mode;
    spinWheel(function (k) {
      if (modeAtSpin === 'dual') {
        var k2 = k;
        while (k2 === k) k2 = Math.floor(Math.random() * TYPES.length);
        renderCard(TYPES[k].slug, TYPES[k2].slug);
        pushHistory(TYPES[k].slug, TYPES[k2].slug);
      } else {
        renderCard(TYPES[k].slug, null);
        pushHistory(TYPES[k].slug, null);
      }
    });
  }

  $('tw-hub').addEventListener('click', doSpin);
  $('tw-spin').addEventListener('click', doSpin);
  $('tw-share').addEventListener('click', shareResult);

  $('history-clear').addEventListener('click', function () {
    history = [];
    $('history-list').innerHTML = '';
    $('history-panel').hidden = true;
  });

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && !spinning) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'BUTTON' || tag === 'TEXTAREA' || tag === 'INPUT') return;
      e.preventDefault();
      doSpin();
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
  buildWheel();
}());
