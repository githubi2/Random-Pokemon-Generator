/* ============================================================
   Pokemon Type Chart — 18x18 effectiveness matrix + dual-type calculator
   ES5 IIFE, no build step. Mirrors the house design system.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

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
  TYPES.forEach(function (t) { TYPE_MAP[t.slug] = t; });

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

  function multLabel(m) {
    if (m === 2) return '2\xd7 Super effective';
    if (m === 4) return '4\xd7 Double weakness';
    if (m === 0.5) return '½\xd7 Not very effective';
    if (m === 0.25) return '¼\xd7 Double resist';
    if (m === 0) return '0\xd7 Immune';
    return '1\xd7 Neutral';
  }

  function typeChip(slug) {
    var meta = TYPE_MAP[slug];
    var s = document.createElement('span');
    s.className = 'type-tag';
    s.style.setProperty('--tag', meta.color);
    s.style.setProperty('--tag-text', meta.light ? '#121212' : '#fff');
    s.textContent = meta.label;
    return s;
  }

  /* ---------------- matrix ---------------- */
  function buildMatrix() {
    var table = $('tc-table');
    var head = document.createElement('thead');
    var hr = document.createElement('tr');
    var empty = document.createElement('th');
    empty.className = 'tc-corner';
    empty.textContent = 'Atk \u2193 / Def \u2192';
    hr.appendChild(empty);
    TYPES.forEach(function (t) {
      var th = document.createElement('th');
      th.className = 'tc-col';
      th.textContent = t.label;
      th.setAttribute('data-type', t.slug);
      hr.appendChild(th);
    });
    head.appendChild(hr);
    table.appendChild(head);

    var body = document.createElement('tbody');
    TYPES.forEach(function (atk) {
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      th.className = 'tc-row';
      th.textContent = atk.label;
      th.setAttribute('data-type', atk.slug);
      tr.appendChild(th);
      TYPES.forEach(function (def) {
        var td = document.createElement('td');
        var m = effectiveness(atk.slug, [def.slug]);
        td.className = 'tc-cell tc-' + (m === 0 ? 'zero' : (m === 2 ? 'sup' : (m < 1 ? 'weak' : 'neut')));
        td.textContent = m === 2 ? '2\xd7' : (m === 0 ? '0\xd7' : (m < 1 ? '½\xd7' : ''));
        td.setAttribute('data-atk', atk.slug);
        td.setAttribute('data-def', def.slug);
        td.addEventListener('mouseenter', function (e) {
          highlightRowCol(atk.slug, def.slug);
          $('tc-readout').textContent = atk.label + ' move vs ' + def.label + ': ' + multLabel(m);
        });
        td.addEventListener('mouseleave', function () {
          $('tc-readout').textContent = 'Hover or tap any cell to read that matchup.';
          highlightRowCol(null, null);
        });
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);

    /* type detail cards */
    var detail = $('tc-details');
    TYPES.forEach(function (t) {
      var card = document.createElement('article');
      card.className = 'tc-type-card cornered';
      card.setAttribute('data-type', t.slug);
      var head2 = document.createElement('h3');
      head2.textContent = t.label + ' Type';
      card.appendChild(head2);

      function buildRow(label, arr) {
        if (!arr.length) return null;
        var row = document.createElement('p');
        row.className = 'tc-type-row';
        var lab = document.createElement('strong');
        lab.textContent = label + ': ';
        row.appendChild(lab);
        arr.forEach(function (s) { row.appendChild(typeChip(s)); });
        return row;
      }

      var weak = [], resist = [], immune = [];
      TYPES.forEach(function (other) {
        var m = effectiveness(other.slug, [t.slug]);
        if (m >= 2) weak.push(other.slug);
        else if (m === 0) immune.push(other.slug);
        else if (m < 1) resist.push(other.slug);
      });
      var rows = [buildRow('Weak to', weak), buildRow('Resists', resist), buildRow('Immune to', immune)];
      rows.forEach(function (r) { if (r) card.appendChild(r); });
      detail.appendChild(card);
    });
  }

  function highlightRowCol(atkSlug, defSlug) {
    Array.prototype.forEach.call(document.querySelectorAll('#tc-table td, #tc-table th'), function (el) {
      el.classList.remove('tc-hl');
    });
    if (!atkSlug || !defSlug) return;
    Array.prototype.forEach.call(document.querySelectorAll('#tc-table th[data-type="' + atkSlug + '"], #tc-table td[data-atk="' + atkSlug + '"]'), function (el) {
      el.classList.add('tc-hl');
    });
    Array.prototype.forEach.call(document.querySelectorAll('#tc-table th[data-type="' + defSlug + '"], #tc-table td[data-def="' + defSlug + '"]'), function (el) {
      el.classList.add('tc-hl');
    });
  }

  /* ---------------- dual-type calculator ---------------- */
  function buildCalculator() {
    var atkSel = $('tc-atk');
    var def1 = $('tc-def1');
    var def2 = $('tc-def2');
    TYPES.forEach(function (t) {
      [atkSel, def1, def2].forEach(function (sel) {
        var o = document.createElement('option');
        o.value = t.slug;
        o.textContent = t.label;
        sel.appendChild(o);
      });
    });
    def2.appendChild(new Option('(none)', 'none', false, true));
    def1.value = 'water';
    def2.value = 'none';
    atkSel.value = 'electric';

    function recompute() {
      var atk = atkSel.value;
      var defs = [def1.value];
      if (def2.value !== 'none') defs.push(def2.value);
      var m = effectiveness(atk, defs);
      var box = $('tc-result');
      box.innerHTML = '';
      box.appendChild(typeChip(atk));
      box.appendChild(document.createTextNode(' vs '));
      defs.forEach(function (d, i) {
        if (i) box.appendChild(document.createTextNode(' / '));
        box.appendChild(typeChip(d));
      });
      box.appendChild(document.createTextNode(' = '));
      var big = document.createElement('strong');
      big.className = 'tc-mult';
      big.textContent = ' ' + multLabel(m);
      box.appendChild(big);
    }
    [atkSel, def1, def2].forEach(function (sel) {
      sel.addEventListener('change', recompute);
    });
    recompute();
  }

  function init() {
    buildMatrix();
    buildCalculator();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
