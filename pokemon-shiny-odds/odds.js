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
    charm:    { label: 'Shiny Charm', note: 'complete the Pokedex' },
    masuda:   { label: 'Masuda Method', note: 'cross-language breeding' },
    dex10:    { label: 'Research Lv. 10', note: 'species research level 10' },
    perfect:  { label: 'Perfect Dex Entry', note: 'perfect research page' },
    outbreak: { label: 'Mass Outbreak', note: 'outbreak spawn' },
    massive:  { label: 'Massive Mass Outbreak', note: 'map-wide outbreak' },
    combo:    { label: 'Catch Combo 31+', note: 'same-species chain' },
    lure:     { label: 'Lure', note: 'lure item active' },
    sandwich: { label: 'Sparkling Power Lv. 3', note: 'Herba Mystica sandwich' },
    outbreak60: { label: 'Outbreak 60+ defeated', note: 'mass outbreak cleared' },
    sparkling1: { label: 'Sparkling Power Lv. 1', note: 'Sparkling Power donut' },
    sparkling2: { label: 'Sparkling Power Lv. 2', note: 'Sparkling Power donut' },
    sparkling3: { label: 'Sparkling Power Lv. 3', note: 'Sparkling Power donut' }
  };

  var GAMES = {
    gen6: {
      label: 'Gen 6+ (X/Y onward)',
      base: 4096,
      note: 'X/Y, ORAS, Sun/Moon, Sword/Shield, Scarlet/Violet base rate: 1 in 4,096.',
      boosts: [
        { id: 'charm', adds: 2 },
        { id: 'masuda', adds: 5 }
      ]
    },
    za: {
      label: 'Legends: Z-A',
      base: 4096,
      note: 'Base 1 in 4,096 (community datamine). The Shiny Charm adds three rolls here, and Sparkling Power donuts stack on top — a full stack reaches about 1 in 585.',
      boosts: [
        { id: 'charm', adds: 3, note: 'Z-A charm adds three rolls' },
        { id: 'sparkling1', adds: 1, group: 'sparkling' },
        { id: 'sparkling2', adds: 2, group: 'sparkling' },
        { id: 'sparkling3', adds: 3, group: 'sparkling' }
      ]
    },
    gen25: {
      label: 'Gen 2–5 (Gold/Silver – B2W2)',
      base: 8192,
      note: 'Classic era base rate: 1 in 8,192. The Shiny Charm only exists in Black 2/White 2.',
      boosts: [
        { id: 'charm', adds: 2, note: 'Black 2/White 2 only' },
        { id: 'masuda', adds: 4, note: 'Gen 4 onward' }
      ]
    },
    arceus: {
      label: 'Legends: Arceus',
      base: 4096,
      note: 'Base 1 in 4,096. Research pages, the Charm and outbreaks all stack — fully stacked mass outbreaks reach the series-best 1 in 128.',
      boosts: [
        { id: 'dex10', adds: 1, group: 'research' },
        { id: 'perfect', adds: 3, group: 'research' },
        { id: 'charm', adds: 3 },
        { id: 'outbreak', adds: 25, group: 'outbreak' },
        { id: 'massive', adds: 12, group: 'outbreak' }
      ]
    },
    letsgo: {
      label: "Let's Go Pikachu/Eevee",
      base: 4096,
      note: 'Base 1 in 4,096. Catch combos of the same species are the main lever: 31+ reaches 1 in 341.',
      boosts: [
        { id: 'combo', adds: 11 },
        { id: 'charm', adds: 2 },
        { id: 'lure', adds: 1 }
      ]
    },
    sv: {
      label: 'Scarlet & Violet',
      base: 4096,
      note: 'Base 1 in 4,096. Charm + Lv. 3 sandwich + 60-defeated outbreak stack to 1 in 512.',
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
    if (mins < 1) return 'under a minute';
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (h >= 48) return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
    if (h >= 1) return h + 'h ' + m + 'm';
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
    fractionEl.textContent = '1 in ' + fmtInt(r.oneIn);
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
      ? 'Active boosts: ' + names.join(' + ')
      : 'No boosts — this is the full-odds base rate';

    var n = Math.max(1, Math.min(1000000, encounters));
    var pNone = Math.pow(1 - r.p, n);
    var pAny = 1 - pNone;
    nResult.textContent = 'In ' + fmtInt(n) + ' encounters at 1 in ' + fmtInt(r.oneIn) + ': '
      + fmtPct(pAny) + ' chance of at least one shiny · ' + fmtPct(pNone) + ' chance of none.';

    var rate = Math.max(1, ratePerHour);
    var median = medianEncounters(r.p);
    medianEl.textContent = 'Median hunt (50%): ' + fmtInt(median) + ' encounters — about '
      + fmtDuration(median / rate) + ' at ' + fmtInt(rate) + ' encounters per hour.';
    milestonesEl.textContent = 'Chance milestones: 25% by ' + fmtInt(encountersFor(0.25, r.p))
      + ' · 50% by ' + fmtInt(median)
      + ' · 75% by ' + fmtInt(encountersFor(0.75, r.p))
      + ' · 90% by ' + fmtInt(encountersFor(0.9, r.p))
      + ' · 99% by ' + fmtInt(encountersFor(0.99, r.p)) + ' encounters.';
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
