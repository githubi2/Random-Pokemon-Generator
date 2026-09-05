/* Pokemon Nature Chart — interactive chart + best-nature finder (ES5 IIFE) */
(function () {
  'use strict';

  var STAT_NAMES = ['Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
  var STAT_SHORT = ['Atk', 'Def', 'SpA', 'SpD', 'Spe'];
  var ATK = 0, DEF = 1, SPA = 2, SPD = 3, SPE = 4;

  /* up/down: index into STAT_NAMES, -1 = neutral. Order matches the in-game chart. */
  var NATURES = [
    { n: 'Hardy',   up: -1, down: -1, best: 'No stat change' },
    { n: 'Lonely',  up: ATK, down: DEF, best: 'Physical glass cannons' },
    { n: 'Brave',   up: ATK, down: SPE, best: 'Trick Room physical attackers' },
    { n: 'Adamant', up: ATK, down: SPA, best: 'Physical attackers' },
    { n: 'Naughty', up: ATK, down: SPD, best: 'Mixed physical attackers' },
    { n: 'Bold',    up: DEF, down: ATK, best: 'Physically defensive supporters' },
    { n: 'Docile',  up: -1, down: -1, best: 'No stat change' },
    { n: 'Relaxed', up: DEF, down: SPE, best: 'Trick Room physical walls' },
    { n: 'Impish',  up: DEF, down: SPA, best: 'Physical walls' },
    { n: 'Lax',     up: DEF, down: SPD, best: 'Physical walls (mixed bulk)' },
    { n: 'Timid',   up: SPE, down: ATK, best: 'Fast special attackers' },
    { n: 'Hasty',   up: SPE, down: DEF, best: 'Fast mixed attackers' },
    { n: 'Jolly',   up: SPE, down: SPA, best: 'Fast physical attackers' },
    { n: 'Naive',   up: SPE, down: SPD, best: 'Fast mixed attackers' },
    { n: 'Modest',  up: SPA, down: ATK, best: 'Special attackers' },
    { n: 'Mild',    up: SPA, down: DEF, best: 'Special glass cannons' },
    { n: 'Quiet',   up: SPA, down: SPE, best: 'Trick Room special attackers' },
    { n: 'Rash',    up: SPA, down: SPD, best: 'Mixed special attackers' },
    { n: 'Calm',    up: SPD, down: ATK, best: 'Specially defensive supporters' },
    { n: 'Gentle',  up: SPD, down: DEF, best: 'Specially defensive pivots' },
    { n: 'Sassy',   up: SPD, down: SPE, best: 'Trick Room special walls' },
    { n: 'Careful', up: SPD, down: SPA, best: 'Special walls' },
    { n: 'Bashful', up: -1, down: -1, best: 'No stat change' },
    { n: 'Quirky',  up: -1, down: -1, best: 'No stat change' },
    { n: 'Serious', up: -1, down: -1, best: 'No stat change' }
  ];

  function $(id) { return document.getElementById(id); }

  function findNature(up, down) {
    for (var i = 0; i < NATURES.length; i++) {
      if (NATURES[i].up === up && NATURES[i].down === down) { return NATURES[i]; }
    }
    return null;
  }

  function displayName(slug) {
    return slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }

  /* ---------------- chart: filter + sort ---------------- */

  var tbody = $('pnc-tbody');
  var rows = [];
  if (tbody) {
    var trs = tbody.getElementsByTagName('tr');
    for (var r = 0; r < trs.length; r++) { rows.push(trs[r]); }
  }

  function applyFilter(filterVal) {
    for (var i = 0; i < rows.length; i++) {
      var up = rows[i].getAttribute('data-up');
      var show = (filterVal === 'all') ||
        (filterVal === 'neutral' && up === '-1') ||
        (filterVal !== 'neutral' && up === filterVal);
      rows[i].className = show ? '' : 'pnc-hide';
    }
  }

  var chips = $('pnc-filter-chips');
  if (chips) {
    var chipBtns = chips.getElementsByTagName('button');
    for (var c = 0; c < chipBtns.length; c++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          for (var k = 0; k < chipBtns.length; k++) { chipBtns[k].setAttribute('aria-pressed', 'false'); }
          btn.setAttribute('aria-pressed', 'true');
          applyFilter(btn.getAttribute('data-filter'));
        });
      })(chipBtns[c]);
    }
  }

  var sortState = { key: 'name', dir: 1 };
  function sortRows(key) {
    if (sortState.key === key) { sortState.dir = -sortState.dir; } else { sortState = { key: key, dir: 1 }; }
    rows.sort(function (a, b) {
      var av, bv;
      if (key === 'name') {
        av = a.getAttribute('data-nature'); bv = b.getAttribute('data-nature');
        return sortState.dir * (av < bv ? -1 : (av > bv ? 1 : 0));
      }
      av = parseInt(a.getAttribute('data-' + key), 10);
      bv = parseInt(b.getAttribute('data-' + key), 10);
      if (av === bv) {
        var an = a.getAttribute('data-nature'), bn = b.getAttribute('data-nature');
        return an < bn ? -1 : (an > bn ? 1 : 0);
      }
      return sortState.dir * (av - bv);
    });
    for (var i = 0; i < rows.length; i++) { tbody.appendChild(rows[i]); }
  }

  var sortHeads = document.querySelectorAll('#pnc-table th[data-sort]');
  for (var h = 0; h < sortHeads.length; h++) {
    (function (th) {
      th.addEventListener('click', function () { sortRows(th.getAttribute('data-sort')); });
    })(sortHeads[h]);
  }

  /* ---------------- best-nature finder ---------------- */

  var searchInput = $('pnc-search');
  var suggestBox = $('pnc-suggest');
  var resultBox = $('pnc-result');
  var dex = window.POKEMON_DATA || [];
  var current = null;

  function statAt(p, natureStatIdx) {
    /* nature stat index 0..4 -> POKEMON_DATA st index 1..5 */
    return p.st[natureStatIdx + 1];
  }

  function lv50(base) {
    return Math.floor((2 * base + 31) * 50 / 100) + 5;
  }

  function roleText(role, p) {
    if (role === 'physical') {
      return 'base ' + p.st[1] + ' Attack vs base ' + p.st[3] + ' Sp. Atk — a physical attacker, so Sp. Atk is the safe drop';
    }
    if (role === 'special') {
      return 'base ' + p.st[3] + ' Sp. Atk vs base ' + p.st[1] + ' Attack — a special attacker, so Attack is the safe drop';
    }
    return 'base ' + p.st[1] + ' Attack and base ' + p.st[3] + ' Sp. Atk are close — a mixed attacker, so the drop comes from its weaker defense';
  }

  function pickRecs(p) {
    var atk = p.st[1], def = p.st[2], spa = p.st[3], spd = p.st[4], spe = p.st[5];
    var role = atk >= spa * 1.15 ? 'physical' : (spa >= atk * 1.15 ? 'special' : 'mixed');
    var atkStat = role === 'special' ? SPA : (role === 'physical' ? ATK : (atk >= spa ? ATK : SPA));
    var wall = (def + spd) > (atk + spa) * 1.15;
    var dump;
    if (wall) {
      dump = atk <= spa ? ATK : SPA;
    } else {
      dump = role === 'physical' ? SPA : (role === 'special' ? ATK : (def <= spd ? DEF : SPD));
    }

    var recs = [];
    var primary, primaryWhy, alt, altWhy;

    if (wall) {
      var upD = def >= spd ? DEF : SPD;
      primary = findNature(upD, dump);
      primaryWhy = 'Base ' + def + ' Defense and base ' + spd + ' Sp. Def outweigh both attack stats — this species wins by outlasting, so boost its stronger defense and drop the offense it barely uses (' + roleText(role, p).split('—')[1].trim() + ').';
      alt = findNature(upD === DEF ? SPD : DEF, dump);
      altWhy = 'The other defensive option: boost ' + STAT_NAMES[upD === DEF ? SPD : DEF] + ' instead when your team already covers ' + STAT_NAMES[upD] + ' threats.';
    } else if (spe >= 85) {
      primary = findNature(SPE, dump);
      primaryWhy = 'Base ' + spe + ' Speed is worth boosting — the extra 10% flips real matchups — and ' + roleText(role, p) + '.';
      alt = findNature(atkStat, dump);
      altWhy = 'Trade the Speed boost for harder hits: pick this when your team already controls speed with Tailwind, Sticky Web or priority.';
    } else {
      primary = findNature(atkStat, dump);
      primaryWhy = 'Base ' + spe + ' Speed is not worth the boost, so invest in damage — ' + roleText(role, p) + '.';
      alt = findNature(SPE, dump);
      altWhy = 'The speed-first alternative: worth it if you fully invest in Speed EVs and need to win a specific speed tie.';
    }
    recs.push({ nature: primary, label: 'Recommended', why: primaryWhy });
    recs.push({ nature: alt, label: 'Alternative', why: altWhy });

    if (spe <= 55) {
      var trick = findNature(atkStat, SPE);
      if (trick) {
        recs.push({ nature: trick, label: 'Trick Room', why: 'Base ' + spe + ' Speed is slow enough to thrive under Trick Room — lowering Speed further makes it move earlier while the room is up.' });
      }
    }
    return recs;
  }

  function impactLine(nat, p) {
    var upBase = statAt(p, nat.up), downBase = statAt(p, nat.down);
    var upNeutral = lv50(upBase), downNeutral = lv50(downBase);
    return 'Lv. 50 (31 IVs, no EVs): ' + STAT_NAMES[nat.up] + ' ' + upNeutral + ' → ' + Math.floor(upNeutral * 1.1) +
      ', ' + STAT_NAMES[nat.down] + ' ' + downNeutral + ' → ' + Math.floor(downNeutral * 0.9) + '.';
  }

  function findBySlug(slug) {
    for (var i = 0; i < dex.length; i++) {
      if (dex[i].n === slug) { return dex[i]; }
    }
    return null;
  }

  function saveLast(slug) {
    try { window.localStorage.setItem('pnc-last-pokemon', slug); } catch (e) { /* private mode */ }
  }

  function loadLast() {
    try { return window.localStorage.getItem('pnc-last-pokemon'); } catch (e) { return null; }
  }

  function renderResult(p) {
    if (!resultBox) { return; }
    var recs = pickRecs(p);
    var top = recs[0].nature;
    var statChips = '';
    var labels = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
    for (var i = 0; i < 6; i++) {
      var cls = 'pnc-stat';
      if (i > 0 && (i - 1) === top.up) { cls += ' pnc-stat-up'; }
      if (i > 0 && (i - 1) === top.down) { cls += ' pnc-stat-down'; }
      statChips += '<span class="' + cls + '">' + labels[i] + ' ' + p.st[i] + '</span>';
    }
    var types = (p.t || []).map(function (t) { return t.charAt(0).toUpperCase() + t.slice(1); }).join(' · ');
    var recHtml = '';
    for (var j = 0; j < recs.length; j++) {
      var nat = recs[j].nature;
      recHtml += '<div class="pnc-rec">' +
        '<p class="pnc-rec-head"><span class="pnc-rec-label">' + recs[j].label + '</span> ' +
        '<strong>' + nat.n + '</strong> <span class="pnc-up">+' + STAT_NAMES[nat.up] + '</span> / ' +
        '<span class="pnc-down">−' + STAT_NAMES[nat.down] + '</span></p>' +
        '<p class="pnc-rec-why">' + recs[j].why + '</p>' +
        '<p class="pnc-rec-impact">' + impactLine(nat, p) + '</p></div>';
    }
    resultBox.innerHTML =
      '<div class="pnc-card cornered">' +
      '<div class="pnc-id"><img class="pnc-sprite" src="' + p.sp + '" alt="' + displayName(p.n) + ' official artwork" width="180" height="180" loading="lazy" />' +
      '<p class="pnc-dexno">#' + p.i + '</p></div>' +
      '<div class="pnc-body">' +
      '<p class="pnc-name">' + displayName(p.n) + '</p>' +
      '<p class="pnc-types">' + types + ' · Base stat total ' + p.tt + '</p>' +
      '<div class="pnc-stats">' + statChips + '</div>' +
      recHtml +
      '<p class="tool-note">Heuristic from base stats only — abilities, movesets and your team composition can shift the right call. Neutral natures are never recommended: a well-chosen +10% is effectively a bonus with no real cost when the dropped stat is unused.</p>' +
      '</div></div>';
  }

  function closeSuggest() {
    if (suggestBox) { suggestBox.className = 'pnc-suggest'; suggestBox.innerHTML = ''; }
  }

  function openSuggest(matches) {
    suggestBox.innerHTML = '';
    for (var i = 0; i < matches.length; i++) {
      (function (p) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.innerHTML = '<span>' + displayName(p.n) + '</span><span class="pnc-suggest-no">#' + p.i + '</span>';
        li.addEventListener('click', function () {
          searchInput.value = displayName(p.n);
          closeSuggest();
          saveLast(p.n);
          renderResult(p);
        });
        suggestBox.appendChild(li);
      })(matches[i]);
    }
    suggestBox.className = 'pnc-suggest pnc-open';
  }

  if (searchInput && suggestBox) {
    searchInput.addEventListener('input', function () {
      var q = searchInput.value.toLowerCase().replace(/[^a-z-]/g, '');
      if (q.length < 2) { closeSuggest(); return; }
      var matches = [];
      for (var i = 0; i < dex.length && matches.length < 8; i++) {
        if (dex[i].n.indexOf(q) === 0) { matches.push(dex[i]); }
      }
      for (var j = 0; j < dex.length && matches.length < 8; j++) {
        if (dex[j].n.indexOf(q) > 0) { matches.push(dex[j]); }
      }
      if (matches.length) { openSuggest(matches); } else { closeSuggest(); }
    });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var first = suggestBox.getElementsByTagName('li')[0];
        if (first) { e.preventDefault(); first.click(); }
      }
    });
    document.addEventListener('click', function (e) {
      if (e.target !== searchInput && !suggestBox.contains(e.target)) { closeSuggest(); }
    });
  }

  /* On load restore the visitor's last lookup; fall back to Garchomp */
  if (dex.length) {
    var saved = loadLast();
    if (saved) { current = findBySlug(saved); }
    if (!current) { current = findBySlug('garchomp') || dex[0]; }
    if (saved && current && searchInput) { searchInput.value = displayName(current.n); }
    renderResult(current);
  }
})();
