/* ============================================================
   Pokemon Radical Red - mini shiny odds calculator (locked to this hack)
   Model: the hack rolls 2 shiny checks per wild encounter out of 4096
   (v4.1 changelog: "Shiny odds updated from 1/4096->2/4096"), and the
   Shiny Charm adds four more rolls on top (3/4096 -> 6/4096).
   odds = rolls / 4096, same rolls model as the calculator on
   /pokemon-shiny-odds/.
   ============================================================ */
(function () {
  'use strict';

  var BASE = 4096;
  var BASE_ROLLS = 2;
  var BOOSTS = [
    { id: "charm", label: "ひかるおまもり", note: "ヤマブキジムでナツメを倒す", adds: 4, group: null }
  ];

  var active = {};
  var encounters = 1000;
  var ratePerHour = 120;
  var LS_KEY = 'rpg:odds-radical-red';

  function $(id) { return document.getElementById(id); }
  var boostChipsEl = $('odds-boost-chips');
  var boostNote = $('odds-boost-note');
  var fractionEl = $('odds-fraction'), percentEl = $('odds-percent'), expectedEl = $('odds-expected');
  var nInput = $('odds-n-input'), nResult = $('odds-n-result');
  var rateInput = $('odds-rate-input');
  var medianEl = $('odds-median'), milestonesEl = $('odds-milestones');

  function totalRolls() {
    var rolls = BASE_ROLLS;
    var grouped = {};
    BOOSTS.forEach(function (b) {
      if (!active[b.id]) return;
      if (b.group) {
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
    var rolls = totalRolls();
    var p = rolls / BASE;
    return { rolls: rolls, oneIn: BASE / rolls, p: p };
  }

  function render() {
    var r = compute();
    fractionEl.textContent = '1/' + fmtInt(r.oneIn);
    percentEl.textContent = fmtPct(r.p);
    expectedEl.textContent = fmtInt(r.oneIn);

    var names = [];
    BOOSTS.forEach(function (b) {
      if (active[b.id]) names.push(b.label + (b.note ? ' (' + b.note + ')' : ''));
    });
    boostNote.textContent = names.length
      ? '有効なブースト：' + names.join(' + ') + ' - ' + r.rolls + ' shiny rolls out of 4,096 per encounter.'
      : 'ブーストなし — これは通常の野生遭遇での確率で、4,096分の2回判定です。';

    var n = Math.max(1, Math.min(1000000, encounters));
    var pNone = Math.pow(1 - r.p, n);
    var pAny = 1 - pNone;
    nResult.textContent = '遭遇回数' + fmtInt(n) + '回・確率1/' + fmtInt(r.oneIn) + ': '
      + fmtPct(pAny) + ' で色違いが1匹以上出る確率 | 1匹も出ない確率 ' + fmtPct(pNone) + '。';

    var rate = Math.max(1, ratePerHour);
    var median = medianEncounters(r.p);
    medianEl.textContent = '中央値（50%）：' + fmtInt(median) + '回 — 約'
      + fmtDuration(median / rate) + '（1時間あたり' + fmtInt(rate) + '回）。';
    milestonesEl.textContent = '到達確率の目安：25%は' + fmtInt(encountersFor(0.25, r.p))
      + ' | 50% by ' + fmtInt(median)
      + ' | 75% by ' + fmtInt(encountersFor(0.75, r.p))
      + ' | 90% by ' + fmtInt(encountersFor(0.9, r.p))
      + ' | 99% by ' + fmtInt(encountersFor(0.99, r.p)) + '回で到達。';
  }

  function makeChip(label, pressed, onClick, title) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn';
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    if (title) btn.title = title;
    btn.textContent = label;
    btn.addEventListener('click', function () { onClick(); });
    return btn;
  }

  function renderBoostChips() {
    boostChipsEl.innerHTML = '';
    BOOSTS.forEach(function (b) {
      boostChipsEl.appendChild(makeChip(b.label, !!active[b.id], function () {
        if (active[b.id]) {
          delete active[b.id];
        } else {
          active[b.id] = true;
        }
        renderBoostChips();
        render();
        persist();
      }, b.note));
    });
  }

  function persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
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
        if (Array.isArray(parsed.active)) {
          var valid = {};
          BOOSTS.forEach(function (b) { valid[b.id] = true; });
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

  restore();
  renderBoostChips();
  nInput.value = String(encounters);
  rateInput.value = String(ratePerHour);
  render();
})();
