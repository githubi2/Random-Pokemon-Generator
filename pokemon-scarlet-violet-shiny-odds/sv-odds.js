/* ============================================================
   Pokemon Scarlet & Violet - mini shiny odds calculator (locked to this game)
   Model: every boost adds extra shiny rolls per encounter;
   odds = rolls / base rate. Same rolls model as the full
   calculator on /pokemon-shiny-odds/.
   ============================================================ */
(function () {
  'use strict';

  var BASE = 4096;
  var BOOSTS = [
    { id: "charm", label: "Shiny Charm", note: "complete the Paldea Pokedex", adds: 2, group: null },
    { id: "sandwich1", label: "Sparkling Power Lv. 1", note: "Herba Mystica sandwich", adds: 1, group: "sandwich" },
    { id: "sandwich2", label: "Sparkling Power Lv. 2", note: "Herba Mystica sandwich", adds: 2, group: "sandwich" },
    { id: "sandwich3", label: "Sparkling Power Lv. 3", note: "Herba Mystica sandwich", adds: 3, group: "sandwich" },
    { id: "outbreak30", label: "Outbreak: 30-59 cleared", note: "mass outbreak progress", adds: 1, group: "outbreak" },
    { id: "outbreak60", label: "Outbreak: 60+ cleared", note: "mass outbreak progress", adds: 2, group: "outbreak" }
  ];

  var active = {};
  var encounters = 1000;
  var ratePerHour = 60;
  var LS_KEY = 'rpg:odds-sv';

  function $(id) { return document.getElementById(id); }
  var boostChipsEl = $('odds-boost-chips');
  var boostNote = $('odds-boost-note');
  var fractionEl = $('odds-fraction'), percentEl = $('odds-percent'), expectedEl = $('odds-expected');
  var nInput = $('odds-n-input'), nResult = $('odds-n-result');
  var rateInput = $('odds-rate-input');
  var medianEl = $('odds-median'), milestonesEl = $('odds-milestones');

  function totalRolls() {
    var rolls = 1;
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
    if (mins < 1) return 'under a minute';
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (h >= 48) return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
    if (h >= 1) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  function compute() {
    var rolls = totalRolls();
    var p = rolls / BASE;
    return { rolls: rolls, oneIn: BASE / rolls, p: p };
  }

  function render() {
    var r = compute();
    fractionEl.textContent = '1 in ' + fmtInt(r.oneIn);
    percentEl.textContent = fmtPct(r.p);
    expectedEl.textContent = fmtInt(r.oneIn);

    var names = [];
    BOOSTS.forEach(function (b) {
      if (active[b.id]) names.push(b.label + (b.note ? ' (' + b.note + ')' : ''));
    });
    boostNote.textContent = names.length
      ? 'Active boosts: ' + names.join(' + ')
      : 'No boosts - this is the full-odds base rate';

    var n = Math.max(1, Math.min(1000000, encounters));
    var pNone = Math.pow(1 - r.p, n);
    var pAny = 1 - pNone;
    nResult.textContent = 'In ' + fmtInt(n) + ' encounters at 1 in ' + fmtInt(r.oneIn) + ': '
      + fmtPct(pAny) + ' chance of at least one shiny | ' + fmtPct(pNone) + ' chance of none.';

    var rate = Math.max(1, ratePerHour);
    var median = medianEncounters(r.p);
    medianEl.textContent = 'Median hunt (50%): ' + fmtInt(median) + ' encounters - about '
      + fmtDuration(median / rate) + ' at ' + fmtInt(rate) + ' encounters per hour.';
    milestonesEl.textContent = 'Chance milestones: 25% by ' + fmtInt(encountersFor(0.25, r.p))
      + ' | 50% by ' + fmtInt(median)
      + ' | 75% by ' + fmtInt(encountersFor(0.75, r.p))
      + ' | 90% by ' + fmtInt(encountersFor(0.9, r.p))
      + ' | 99% by ' + fmtInt(encountersFor(0.99, r.p)) + ' encounters.';
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
          if (b.group) {
            BOOSTS.forEach(function (other) {
              if (other.group === b.group) delete active[other.id];
            });
          }
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
