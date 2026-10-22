/* ============================================================
   Pokemon Shiny Odds — interactive odds calculator
   Model: every boost adds extra shiny rolls per encounter;
   odds = rolls / base-rate. Numbers verified against the
   documented datamined roll counts (Serebii / GameSpot).
   ============================================================ */
(function () {
  'use strict';

  /* boost definitions: rolls added on top of the base roll */
  var BOOSTS = {
    charm:    { label: 'ひかるおまもり', note: '図鑑を完成させる' },
    masuda:   { label: '国際孵化', note: '言語違いの交配' },
    dex10:    { label: 'リサーチLv.10', note: '種族リサーチレベル10' },
    perfect:  { label: '完璧な図鑑ページ', note: 'リサーチページを完璧に' },
    outbreak: { label: '大量発生', note: '大量発生でわき' },
    massive:  { label: '大規模大量発生', note: 'マップ全体の大量発生' },
    combo:    { label: '連続捕獲31+', note: '同種の連続捕獲' },
    lure:     { label: 'ルアー', note: 'ルアー使用中' },
    sandwich: { label: 'キラキラパワーLv.3', note: '秘伝スパイス入りサンドイッチ' },
    outbreak60: { label: '大量発生で60匹以上撃破', note: '大量発生をクリア' },
    sparkling1: { label: 'キラキラパワーLv.1', note: 'キラキラパワーのドーナツ' },
    sparkling2: { label: 'キラキラパワーLv.2', note: 'キラキラパワーのドーナツ' },
    sparkling3: { label: 'キラキラパワーLv.3', note: 'キラキラパワーのドーナツ' }
  };

  var GAMES = {
    gen6: {
      label: '第6世代以降（X・Yから）',
      base: 4096,
      note: 'X・Y、ORAS、サン・ムーン、ソード・シールド、スカーレット・バイオレットの基本は4,096分の1。',
      boosts: [
        { id: 'charm', adds: 2 },
        { id: 'masuda', adds: 5 }
      ]
    },
    za: {
      label: 'Pokémon LEGENDS Z-A',
      base: 4096,
      note: '基本は4,096分の1（有志の解析による）。ここではひかるおまもりで判定が3回に増え、キラキラパワーのドーナツも上乗せされる。フルに積むと約585分の1まで届く。',
      boosts: [
        { id: 'charm', adds: 3, note: 'Z-Aのおまもりは+3回' },
        { id: 'sparkling1', adds: 1, group: 'sparkling' },
        { id: 'sparkling2', adds: 2, group: 'sparkling' },
        { id: 'sparkling3', adds: 3, group: 'sparkling' }
      ]
    },
    gen25: {
      label: '第2〜5世代（金・銀〜BW2）',
      base: 8192,
      note: '旧作の基本は8,192分の1。ひかるおまもりがあるのはブラック2・ホワイト2だけ。',
      boosts: [
        { id: 'charm', adds: 2, note: 'ブラック2・ホワイト2のみ' },
        { id: 'masuda', adds: 4, note: '第4世代以降' }
      ]
    },
    arceus: {
      label: 'Pokémon LEGENDS アルセウス',
      base: 4096,
      note: '基本は4,096分の1。リサーチのページ数、ひかるおまもり、大量発生がすべて重なり、最大まで積んだ大量発生ならシリーズ最高の128分の1に届く。',
      boosts: [
        { id: 'dex10', adds: 1, group: 'research' },
        { id: 'perfect', adds: 3, group: 'research' },
        { id: 'charm', adds: 3 },
        { id: 'outbreak', adds: 25, group: 'outbreak' },
        { id: 'massive', adds: 12, group: 'outbreak' }
      ]
    },
    letsgo: {
      label: "Let's Go! ピカチュウ・イーブイ",
      base: 4096,
      note: '基本は4,096分の1。同じ種類を続けて捕まえる連鎖がカギで、31以上なら341分の1になる。',
      boosts: [
        { id: 'combo', adds: 11 },
        { id: 'charm', adds: 2 },
        { id: 'lure', adds: 1 }
      ]
    },
    sv: {
      label: 'スカーレット・バイオレット',
      base: 4096,
      note: '基本は4,096分の1。ひかるおまもり＋Lv.3のサンドイッチ＋60匹倒した大量発生で512分の1になる。',
      boosts: [
        { id: 'charm', adds: 2 },
        { id: 'sandwich', adds: 3 },
        { id: 'outbreak60', adds: 2 }
      ]
    }
  };
  var GAME_ORDER = ['gen6', 'za', 'gen25', 'arceus', 'letsgo', 'sv'];

  /* ---------------- state ---------------- */
  var game = 'gen6';
  var active = {};      /* boost id -> true */
  var encounters = 1000;
  var ratePerHour = 60;
  var LS_KEY = 'rpg:odds-settings';

  /* ---------------- DOM refs ---------------- */
  function $(id) { return document.getElementById(id); }
  var gameChipsEl = $('odds-game-chips'), boostChipsEl = $('odds-boost-chips');
  var gameNote = $('odds-game-note'), boostNote = $('odds-boost-note');
  var fractionEl = $('odds-fraction'), percentEl = $('odds-percent'), expectedEl = $('odds-expected');
  var nInput = $('odds-n-input'), nResult = $('odds-n-result');
  var rateInput = $('odds-rate-input');
  var medianEl = $('odds-median'), milestonesEl = $('odds-milestones');

  /* ---------------- math ---------------- */
  function totalRolls() {
    var g = GAMES[game];
    var rolls = 1;
    var grouped = {};
    g.boosts.forEach(function (b) {
      if (!active[b.id]) return;
      if (b.group) {
        /* same-group boosts never stack: keep the stronger one */
        if (!grouped[b.group] || grouped[b.group] < b.adds) grouped[b.group] = b.adds;
      } else {
        rolls += b.adds;
      }
    });
    Object.keys(grouped).forEach(function (k) { rolls += grouped[k]; });
    return rolls;
  }

  function fmtInt(n) {
    return Math.round(n).toLocaleString('en-US');
  }

  function fmtPct(p) {
    /* p is 0..1 */
    var v = p * 100;
    if (v >= 10) return v.toFixed(1) + '%';
    if (v >= 1) return v.toFixed(2) + '%';
    return v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '') + '%';
  }

  function medianEncounters(p) {
    return Math.ceil(Math.log(0.5) / Math.log(1 - p));
  }

  function encountersFor(target, p) {
    return Math.ceil(Math.log(1 - target) / Math.log(1 - p));
  }

  function fmtDuration(hours) {
    var mins = Math.round(hours * 60);
    if (mins < 1) return '1分以内';
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (h >= 48) return Math.floor(h / 24) + '日' + (h % 24) + 'h';
    if (h >= 1) return h + '時間' + m + 'm';
    return m + 'm';
  }

  function compute() {
    var g = GAMES[game];
    var rolls = totalRolls();
    var p = rolls / g.base;
    return { rolls: rolls, base: g.base, oneIn: g.base / rolls, p: p };
  }

  function render() {
    var g = GAMES[game];
    var r = compute();
    fractionEl.textContent = '1/' + fmtInt(r.oneIn);
    percentEl.textContent = fmtPct(r.p);
    expectedEl.textContent = fmtInt(r.oneIn);
    gameNote.textContent = g.note;

    var names = [];
    g.boosts.forEach(function (b) {
      if (active[b.id]) {
        var note = b.note || BOOSTS[b.id].note;
        names.push(BOOSTS[b.id].label + (note ? ' (' + note + ')' : ''));
      }
    });
    boostNote.textContent = names.length
      ? '有効なブースト：' + names.join(' + ')
      : 'ブーストなし — これが基本確率です';

    var n = Math.max(1, Math.min(1000000, encounters));
    var pNone = Math.pow(1 - r.p, n);
    var pAny = 1 - pNone;
    nResult.textContent = '遭遇回数' + fmtInt(n) + '回・確率1/' + fmtInt(r.oneIn) + ': '
      + fmtPct(pAny) + 'の確率で少なくとも1匹色違いが出ます ·' + fmtPct(pNone) + '。';

    var rate = Math.max(1, ratePerHour);
    var median = medianEncounters(r.p);
    medianEl.textContent = '中央値（50%）：' + fmtInt(median) + '回 — 約'
      + fmtDuration(median / rate) + '（1時間あたり' + fmtInt(rate) + '回）。';
    milestonesEl.textContent = '到達確率の目安：25%は' + fmtInt(encountersFor(0.25, r.p))
      + '回 · 50%は' + fmtInt(median)
      + '回 · 75%は' + fmtInt(encountersFor(0.75, r.p))
      + '回 · 90%は' + fmtInt(encountersFor(0.9, r.p))
      + '回 · 99%は' + fmtInt(encountersFor(0.99, r.p)) + '回で到達。';
  }

  /* ---------------- chips ---------------- */
  function makeChip(label, pressed, onClick, title) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn';
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    if (title) btn.title = title;
    btn.textContent = label;
    btn.addEventListener('click', function () { onClick(btn); });
    return btn;
  }

  function renderGameChips() {
    gameChipsEl.innerHTML = '';
    GAME_ORDER.forEach(function (id) {
      gameChipsEl.appendChild(makeChip(GAMES[id].label, game === id, function () {
        game = id;
        /* drop boosts that do not exist in the new game */
        var valid = {};
        GAMES[game].boosts.forEach(function (b) { valid[b.id] = true; });
        Object.keys(active).forEach(function (k) { if (!valid[k]) delete active[k]; });
        renderGameChips();
        renderBoostChips();
        render();
        persist();
      }));
    });
  }

  function renderBoostChips() {
    boostChipsEl.innerHTML = '';
    GAMES[game].boosts.forEach(function (b) {
      var note = b.note || BOOSTS[b.id].note;
      boostChipsEl.appendChild(makeChip(BOOSTS[b.id].label, !!active[b.id], function (btn) {
        if (active[b.id]) {
          delete active[b.id];
        } else {
          /* mutual exclusion inside a group (outbreak vs massive, dex10 vs perfect) */
          if (b.group) {
            GAMES[game].boosts.forEach(function (other) {
              if (other.group === b.group) delete active[other.id];
            });
          }
          active[b.id] = true;
        }
        renderBoostChips();
        render();
        persist();
      }, note));
    });
  }

  /* ---------------- persistence ---------------- */
  function persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        game: game,
        active: Object.keys(active),
        encounters: encounters,
        rate: ratePerHour
      }));
    } catch (e) { /* ignore */ }
  }

  function restore() {
    try {
      var s = localStorage.getItem(LS_KEY);
      if (!s) return;
      var parsed = JSON.parse(s);
      if (parsed && typeof parsed === 'object') {
        if (GAMES[parsed.game]) game = parsed.game;
        if (Array.isArray(parsed.active)) {
          var valid = {};
          GAMES[game].boosts.forEach(function (b) { valid[b.id] = true; });
          parsed.active.forEach(function (k) { if (valid[k]) active[k] = true; });
        }
        if (typeof parsed.encounters === 'number' && parsed.encounters >= 1) {
          encounters = Math.min(1000000, Math.round(parsed.encounters));
        }
        if (typeof parsed.rate === 'number' && parsed.rate >= 1) {
          ratePerHour = Math.min(100000, Math.round(parsed.rate));
        }
      }
    } catch (e) { /* corrupted storage -> defaults */ }
  }

  /* ---------------- events ---------------- */
  nInput.addEventListener('input', function () {
    var v = Number(nInput.value);
    if (isFinite(v) && v >= 1) {
      encounters = Math.round(v);
      render();
      persist();
    }
  });

  rateInput.addEventListener('input', function () {
    var v = Number(rateInput.value);
    if (isFinite(v) && v >= 1) {
      ratePerHour = Math.min(100000, Math.round(v));
      render();
      persist();
    }
  });

  /* ---------------- init ---------------- */
  restore();
  renderGameChips();
  renderBoostChips();
  nInput.value = String(encounters);
  rateInput.value = String(ratePerHour);
  render();
})();
