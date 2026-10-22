/* Pokemon Nature Chart — interactive chart + best-nature finder (ES5 IIFE) */
(function () {
  'use strict';

  var STAT_NAMES = ['こうげき', 'ぼうぎょ', 'とくこう', 'とくぼう', 'すばやさ'];
  var STAT_SHORT = ['Atk', 'Def', 'SpA', 'SpD', 'Spe'];
  var ATK = 0, DEF = 1, SPA = 2, SPD = 3, SPE = 4;

  /* up/down: index into STAT_NAMES, -1 = neutral. Order matches the in-game chart. */
  var NATURES = [
    { n: 'がんばりや',   up: -1, down: -1, best: '能力の変化なし（ニュートラル）' },
    { n: 'さみしがり',  up: ATK, down: DEF, best: '物理の紙耐久アタッカー' },
    { n: 'ゆうかん',   up: ATK, down: SPE, best: 'トリックルーム向けの物理アタッカー' },
    { n: 'いじっぱり', up: ATK, down: SPA, best: '物理アタッカー' },
    { n: 'やんちゃ', up: ATK, down: SPD, best: '物理寄りの両刀アタッカー' },
    { n: 'ずぶとい',    up: DEF, down: ATK, best: '物理受けのサポーター' },
    { n: 'すなお',  up: -1, down: -1, best: '能力の変化なし（ニュートラル）' },
    { n: 'のんき', up: DEF, down: SPE, best: 'トリックルーム向けの物理受け' },
    { n: 'わんぱく',  up: DEF, down: SPA, best: '物理受け' },
    { n: 'のうてんき',     up: DEF, down: SPD, best: '物理受け（両耐久型）' },
    { n: 'おくびょう',   up: SPE, down: ATK, best: '速い特殊アタッカー' },
    { n: 'せっかち',   up: SPE, down: DEF, best: '速い両刀アタッカー' },
    { n: 'ようき',   up: SPE, down: SPA, best: '速い物理アタッカー' },
    { n: 'むじゃき',   up: SPE, down: SPD, best: '速い両刀アタッカー' },
    { n: 'ひかえめ',  up: SPA, down: ATK, best: '特殊アタッカー' },
    { n: 'おっとり',    up: SPA, down: DEF, best: '特殊の紙耐久アタッカー' },
    { n: 'れいせい',   up: SPA, down: SPE, best: 'トリックルーム向けの特殊アタッカー' },
    { n: 'うっかりや',    up: SPA, down: SPD, best: '特殊寄りの両刀アタッカー' },
    { n: 'おだやか',    up: SPD, down: ATK, best: '特殊受けのサポーター' },
    { n: 'おとなしい',  up: SPD, down: DEF, best: '特殊受けの交代要員' },
    { n: 'なまいき',   up: SPD, down: SPE, best: 'トリックルーム向けの特殊受け' },
    { n: 'しんちょう', up: SPD, down: SPA, best: '特殊受け' },
    { n: 'てれや', up: -1, down: -1, best: '能力の変化なし（ニュートラル）' },
    { n: 'きまぐれ',  up: -1, down: -1, best: '能力の変化なし（ニュートラル）' },
    { n: 'まじめ', up: -1, down: -1, best: '能力の変化なし（ニュートラル）' }
  ];

  function $(id) { return document.getElementById(id); }

  function findNature(up, down) {
    for (var i = 0; i < NATURES.length; i++) {
      if (NATURES[i].up === up && NATURES[i].down === down) { return NATURES[i]; }
    }
    return null;
  }

  function displayName(slug) {
    /*JA_LOOKUP*/var _T=window.JA_POKE_NAMES||{},_A=window.JA_ABILITY_NAMES||{},_M=window.JA_MOVE_NAMES||{},_N=window.JA_NATURE_NAMES||{};if(_T[slug])return _T[slug];if(_A[slug])return _A[slug];if(_M[slug])return _M[slug];if(_N[slug])return _N[slug];return slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
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
      return '種族値' + p.st[1] + 'のこうげき 対 種族値' + p.st[3] + 'のとくこう — 物理アタッカーなので、とくこうを下げるのが安全です';
    }
    if (role === 'special') {
      return '種族値' + p.st[3] + 'とくこう 対 種族値' + p.st[1] + ' Attack — a special attacker, so Attack is the safe drop';
    }
    return '種族値' + p.st[1] + 'こうげき と 種族値' + p.st[3] + ' Sp. Atk are close — a mixed attacker, so the drop comes from its weaker defense';
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
      primaryWhy = '防御 ' + def + '・特防 ' + spd + ' が攻撃2種を上回っています。長く生き残るタイプなので、高いほうの防御に振って、ほとんど使わない攻撃は切りましょう（' + roleText(role, p).split('—')[1].trim() + '）。';
      alt = findNature(upD === DEF ? SPD : DEF, dump);
      altWhy = 'もう一方の耐久型の選択肢：' + STAT_NAMES[upD === DEF ? SPD : DEF] + 'に振る手もあります。パーティがすでに' + STAT_NAMES[upD] + 'の対策を担っている場合に有効です。';
    } else if (spe >= 85) {
      primary = findNature(SPE, dump);
      primaryWhy = '種族値' + spe + 'は伸ばす価値があります。10%の差は実際の対面をひっくり返します。なお、' + roleText(role, p) + '.';
      alt = findNature(atkStat, dump);
      altWhy = 'すばやさの上昇を捨てて火力を取る選択：おいかぜ、ねばりのねっと、先制技などでチームがすでにすばやさを確保できている場合に選びましょう。';
    } else {
      primary = findNature(atkStat, dump);
      primaryWhy = '素早さ ' + spe + ' は伸ばす価値が薄いので、火力に振りましょう — ' + roleText(role, p) + '.';
      alt = findNature(SPE, dump);
      altWhy = '素早さ優先の代替案：すばやさに努力値を最大まで振り、特定の同速対決を制したい場合に有効です。';
    }
    recs.push({ nature: primary, label: 'おすすめ', why: primaryWhy });
    recs.push({ nature: alt, label: 'Alternative', why: altWhy });

    if (spe <= 55) {
      var trick = findNature(atkStat, SPE);
      if (trick) {
        recs.push({ nature: trick, label: 'トリックルーム', why: '種族値' + spe + 'はトリックルームで十分に活きる遅さなので、さらにすばやさを下げるとトリックルーム中は先に動けます。' });
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
    var _TJ={normal:'ノーマル',fire:'ほのお',water:'みず',electric:'でんき',grass:'くさ',ice:'こおり',fighting:'かくとう',poison:'どく',ground:'じめん',flying:'ひこう',psychic:'エスパー',bug:'むし',rock:'いわ',ghost:'ゴースト',dragon:'ドラゴン',dark:'あく',steel:'はがね',fairy:'フェアリー'};var types = (p.t || []).map(function (t) { return _TJ[t] || t; }).join(' · ');
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
      '<div class="pnc-id"><img class="pnc-sprite" src="' + p.sp + '" alt="' + displayName(p.n) + 'の公式イラスト" width="180" height="180" loading="lazy" />' +
      '<p class="pnc-dexno">#' + p.i + '</p></div>' +
      '<div class="pnc-body">' +
      '<p class="pnc-name">' + displayName(p.n) + '</p>' +
      '<p class="pnc-types">' + types + '・種族値合計' + p.tt + '</p>' +
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
