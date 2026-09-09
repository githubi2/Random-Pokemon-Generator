/* ============================================================
   Pokemon IV Calculator — reverse-engineer IVs from shown stats
   ES5 IIFE, no build step. Mirrors the house design system.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var DATA = window.POKEMON_DATA || [];

  var ATK = 0, DEF = 1, SPA = 2, SPD = 3, SPE = 4;
  var NATURES = [
    { n: 'Hardy',   up: -1, down: -1 }, { n: 'Lonely',  up: ATK, down: DEF },
    { n: 'Brave',   up: ATK, down: SPE }, { n: 'Adamant', up: ATK, down: SPA },
    { n: 'Naughty', up: ATK, down: SPD }, { n: 'Bold',    up: DEF, down: ATK },
    { n: 'Docile',  up: -1, down: -1 }, { n: 'Relaxed', up: DEF, down: SPE },
    { n: 'Impish',  up: DEF, down: SPA }, { n: 'Lax',     up: DEF, down: SPD },
    { n: 'Timid',   up: SPE, down: ATK }, { n: 'Hasty',   up: SPE, down: DEF },
    { n: 'Jolly',   up: SPE, down: SPA }, { n: 'Naive',   up: SPE, down: SPD },
    { n: 'Modest',  up: SPA, down: ATK }, { n: 'Mild',    up: SPA, down: DEF },
    { n: 'Quiet',   up: SPA, down: SPE }, { n: 'Rash',    up: SPA, down: SPD },
    { n: 'Calm',    up: SPD, down: ATK }, { n: 'Gentle',  up: SPD, down: DEF },
    { n: 'Sassy',   up: SPD, down: SPE }, { n: 'Careful', up: SPD, down: SPA },
    { n: 'Bashful', up: -1, down: -1 }, { n: 'Quirky',  up: -1, down: -1 },
    { n: 'Serious', up: -1, down: -1 }
  ];
  /* nature index i -> POKEMON stat column for multiplier (st = [HP,ATK,DEF,SPA,SPD,SPE]) */
  var NAT_COL = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5 };

  var STAT_NAMES = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
  var STAT_SHORT = ['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE'];

  var selected = null;
  var lastResult = null;

  function displayName(slug) {
    return (slug.charAt(0).toUpperCase() + slug.slice(1)).split('-')[0];
  }
  function pad4(n) { return String(n).padStart(4, '0'); }

  /* stat at level lv, given base/iv/ev/nature (nature only for non-HP) */
  function calcStat(col, base, lv, iv, ev, nature) {
    var raw = Math.floor((2 * base + iv + Math.floor(ev / 4)) * lv / 100);
    if (col === 0) return raw + lv + 10;
    var v = raw + 5;
    var mult = 1;
    if (nature.up === col - 1) mult = 1.1;
    else if (nature.down === col - 1) mult = 0.9;
    return Math.floor(v * mult);
  }

  /* brute-force IV 0..31 for one stat column */
  function findIVs(col, base, lv, ivTarget, ev, nature) {
    var out = [];
    for (var iv = 0; iv <= 31; iv++) {
      if (calcStat(col, base, lv, iv, ev, nature) === ivTarget) out.push(iv);
    }
    return out;
  }

  /* ---------------- species picker ---------------- */
  function buildSpecies() {
    var input = $('ivc-species');
    var dl = $('ivc-datalist');
    DATA.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = displayName(p.n) + ' (#' + pad4(p.si) + ')';
      dl.appendChild(opt);
    });
    input.addEventListener('input', function () {
      var v = input.value.replace(/\s*\(#\d+\)\s*$/, '').toLowerCase();
      var hit = null;
      for (var i = 0; i < DATA.length; i++) {
        if (displayName(DATA[i].n).toLowerCase() === v || DATA[i].n === v) { hit = DATA[i]; break; }
      }
      selected = hit;
      $('ivc-meta').textContent = hit ? (displayName(hit.n) + ' · BST ' + hit.tt + ' · types: ' + hit.t.join(', ')) : 'Type a Pokemon name to select it.';
    });
  }

  /* ---------------- nature sel ---------------- */
  function buildNature() {
    var sel = $('ivc-nature');
    NATURES.forEach(function (nt, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = nt.n + (nt.up === -1 ? ' (neutral)' : ' (+' + STAT_SHORT[NAT_COL[nt.up]] + ' −' + STAT_SHORT[NAT_COL[nt.down]] + ')');
      sel.appendChild(o);
    });
  }

  /* ---------------- calculate ---------------- */
  function doCalc() {
    if (!selected) {
      $('ivc-out').innerHTML = '<p class="tool-note">Pick a Pokemon first, then enter the stats you see on screen.</p>';
      return;
    }
    var lv = Number($('ivc-level').value) || 100;
    if (lv < 1 || lv > 100) lv = 100;
    var nature = NATURES[Number($('ivc-nature').value) || 0];
    var stats = [];
    for (var c = 0; c < 6; c++) {
      var iv = $('ivc-' + STAT_SHORT[c].toLowerCase());
      stats.push(Number(iv.value));
    }
    var rows = '';
    for (var c2 = 0; c2 < 6; c2++) {
      var shown = stats[c2];
      if (!isFinite(shown) || shown <= 0) { rows += '<tr><td class="ivc-pick">' + STAT_SHORT[c2] + '</td><td>—</td></tr>'; continue; }
      var base = selected.st[c2];
      var ev = Number($('ivc-ev-' + STAT_SHORT[c2].toLowerCase()).value) || 0;
      var found = findIVs(c2, base, lv, shown, ev, nature);
      var txt = found.length === 0 ? 'Impossible for this level & nature — check the stats'
               : (found.length === 1 ? String(found[0]) : found[0] + ' – ' + found[found.length - 1]);
      if (found.length === 32) txt = '0 – 31 (any IV matches)';
      rows += '<tr><td class="ivc-pick">' + STAT_SHORT[c2] + '</td><td class="ivc-range">' + txt + '</td></tr>';
    }
    lastResult = { lv: lv, nature: nature.n, st: stats.slice() };
    $('ivc-out').innerHTML =
      '<table class="ivc-result-table"><thead><tr><th>Stat</th><th>Possible IV range</th></tr></thead><tbody>' + rows +
      '</tbody></table>' +
      '<p class="tool-note">Calculated at Lv ' + lv + ' with ' + nature.n + ' nature. IVs are hidden values from 0 to 31 — a perfect IV is 31. If the range is wide, raise the Pokemon level or add trained EV totals for a tighter result.</p>';
  }

  function init() {
    buildSpecies();
    buildNature();
    $('ivc-calc-btn').addEventListener('click', doCalc);
    ['ivc-level'].forEach(function (id) {
      $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') doCalc(); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
