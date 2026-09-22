/* ============================================================
   Pokemon Brilliant Diamond & Shining Pearl - mini shiny odds
   calculator (locked to this game). Four hunt types, each with
   its own math: wild grass, Grand Underground (Diglett bonus),
   eggs (Charm / Masuda) and the Poke Radar chain table 0-40.
   Numbers match the community datamine used on this page.
   ============================================================ */
(function () {
  'use strict';

  var BASE = 4096;
  var RADAR = [4096, 3855, 3640, 3449, 3277, 3121, 2979, 2849, 2731, 2621, 2521, 2427, 2341, 2259, 2185, 2114, 2048, 1986, 1927, 1872, 1820, 1771, 1724, 1680, 1638, 1598, 1560, 1524, 1489, 1456, 1310, 1285, 1260, 1236, 1213, 1192, 993, 799, 400, 200, 99];

  var HUNTS = [
    { id: 'wild', label: 'Wild grass' },
    { id: 'underground', label: 'Grand Underground' },
    { id: 'egg', label: 'Eggs' },
    { id: 'radar', label: 'Poke Radar' }
  ];
  var state = { hunt: 'wild', diglett: false, eggCharm: false, eggMasuda: false, chain: 40 };
  var encounters = 1000;
  var ratePerHour = 60;
  var LS_KEY = 'rpg:odds-bdsp';

  function $(id) { return document.getElementById(id); }
  var chipsEl = $('odds-boost-chips');
  var extraEl = $('odds-extra-chips') || null;
  var chainRow = $('odds-chain-row'), chainInput = $('odds-chain-input');
  var boostNote = $('odds-boost-note');
  var fractionEl = $('odds-fraction'), percentEl = $('odds-percent'), expectedEl = $('odds-expected');
  var nInput = $('odds-n-input'), nResult = $('odds-n-result');
  var rateInput = $('odds-rate-input');
  var medianEl = $('odds-median'), milestonesEl = $('odds-milestones');

  function rollPair(rolls) {
    var p = rolls / BASE;
    return { rolls: rolls, oneIn: BASE / rolls, p: p };
  }

  function compute() {
    if (state.hunt === 'radar') {
      var c = Math.max(0, Math.min(40, Math.round(state.chain)));
      var den = RADAR[c];
      return { rolls: null, oneIn: den, p: 1 / den, chain: c };
    }
    if (state.hunt === 'egg') {
      var rolls = 1;
      if (state.eggMasuda) rolls = state.eggCharm ? 8 : 6;
      else if (state.eggCharm) rolls = 2;
      return rollPair(rolls);
    }
    if (state.hunt === 'underground') {
      return rollPair(state.diglett ? 2 : 1);
    }
    return rollPair(1);
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

  function render() {
    var r = compute();
    fractionEl.textContent = '1 in ' + fmtInt(r.oneIn);
    percentEl.textContent = fmtPct(r.p);
    expectedEl.textContent = fmtInt(r.oneIn);

    if (state.hunt === 'wild') {
      boostNote.textContent = 'Wild grass: the plain 1 in 4,096 base - the Shiny Charm does not reach these encounters.';
    } else if (state.hunt === 'underground') {
      boostNote.textContent = state.diglett
        ? 'Grand Underground with the Diglett bonus active: one extra roll, 1 in 2,048 while the bonus lasts.'
        : 'Grand Underground, no bonus: 1 in 4,096 per encounter.';
    } else if (state.hunt === 'egg') {
      var bits = [];
      if (state.eggMasuda) bits.push('Masuda Method (six rolls on its own)');
      if (state.eggCharm) bits.push('Shiny Charm');
      boostNote.textContent = bits.length
        ? 'Eggs with ' + bits.join(' + ') + '.'
        : 'Eggs with no boosts: 1 in 4,096 per egg.';
    } else {
      var c = r.chain;
      boostNote.textContent = 'Poke Radar at chain ' + c + ': each shiny patch rolls 1 in ' + fmtInt(r.oneIn) + '. Chain 40 is the ceiling.';
    }

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

  function makeChip(label, pressed, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn';
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    btn.textContent = label;
    btn.addEventListener('click', function () { onClick(); });
    return btn;
  }

  function renderChips() {
    chipsEl.innerHTML = '';
    HUNTS.forEach(function (h) {
      chipsEl.appendChild(makeChip(h.label, state.hunt === h.id, function () {
        state.hunt = h.id;
        renderChips();
        render();
        persist();
      }));
    });
    if (extraEl) {
      extraEl.innerHTML = '';
      if (state.hunt === 'underground') {
        extraEl.appendChild(makeChip('Diglett bonus active', state.diglett, function () {
          state.diglett = !state.diglett;
          renderChips();
          render();
          persist();
        }));
      } else if (state.hunt === 'egg') {
        extraEl.appendChild(makeChip('Shiny Charm', state.eggCharm, function () {
          state.eggCharm = !state.eggCharm;
          renderChips();
          render();
          persist();
        }));
        extraEl.appendChild(makeChip('Masuda Method', state.eggMasuda, function () {
          state.eggMasuda = !state.eggMasuda;
          renderChips();
          render();
          persist();
        }));
      }
    }
    chainRow.hidden = state.hunt !== 'radar';
  }

  function persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        hunt: state.hunt, diglett: state.diglett, eggCharm: state.eggCharm,
        eggMasuda: state.eggMasuda, chain: state.chain,
        encounters: encounters, rate: ratePerHour
      }));
    } catch (e) { /* ignore */ }
  }

  function restore() {
    try {
      var s = localStorage.getItem(LS_KEY);
      if (!s) return;
      var parsed = JSON.parse(s);
      if (parsed && typeof parsed === 'object') {
        HUNTS.forEach(function (h) { if (parsed.hunt === h.id) state.hunt = h.id; });
        state.diglett = !!parsed.diglett;
        state.eggCharm = !!parsed.eggCharm;
        state.eggMasuda = !!parsed.eggMasuda;
        if (typeof parsed.chain === 'number') state.chain = Math.max(0, Math.min(40, Math.round(parsed.chain)));
        if (typeof parsed.encounters === 'number' && parsed.encounters >= 1) {
          encounters = Math.min(1000000, Math.round(parsed.encounters));
        }
        if (typeof parsed.rate === 'number' && parsed.rate >= 1) {
          ratePerHour = Math.min(100000, Math.round(parsed.rate));
        }
      }
    } catch (e) { /* corrupted storage -> defaults */ }
  }

  chainInput.addEventListener('input', function () {
    var v = Number(chainInput.value);
    if (isFinite(v)) {
      state.chain = Math.max(0, Math.min(40, Math.round(v)));
      render();
      persist();
    }
  });

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
  renderChips();
  chainInput.value = String(state.chain);
  nInput.value = String(encounters);
  rateInput.value = String(ratePerHour);
  render();
})();
