/* ============================================================
   Pokemon Smash or Pass — vanilla JS engine
   Data: window.POKEMON_DATA (data.js, 1351 entries)
   ============================================================ */
(function () {
  'use strict';

  var POKEMON = window.POKEMON_DATA || [];
  var BY_ID = {};
  POKEMON.forEach(function (p) { BY_ID[p.i] = p; });

  var TYPES = {
    fire: { label: 'Fire', color: '#FF9D55', light: false }, water: { label: 'Water', color: '#6890F0', light: true },
    grass: { label: 'Grass', color: '#78C850', light: false }, electric: { label: 'Electric', color: '#F8D030', light: false },
    ice: { label: 'Ice', color: '#98D8D8', light: false }, fighting: { label: 'Fighting', color: '#C03028', light: true },
    poison: { label: 'Poison', color: '#A040A0', light: true },  ground: { label: 'Ground', color: '#E0C068', light: false },
    flying: { label: 'Flying', color: '#A890F0', light: true },  psychic: { label: 'Psychic', color: '#F85888', light: true },
    bug: { label: 'Bug', color: '#A8B820', light: false }, rock: { label: 'Rock', color: '#B8A038', light: true },
    ghost: { label: 'Ghost', color: '#705898', light: true },  dark: { label: 'Dark', color: '#705848', light: true },
    dragon: { label: 'Dragon', color: '#7038F8', light: true },  steel: { label: 'Steel', color: '#B8B8D0', light: false },
    fairy: { label: 'Fairy', color: '#EE99AC', light: false }, normal: { label: 'Normal', color: '#A8A878', light: false }
  };
  var TYPE_MAP = TYPES;

  var GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var REGIONS = { 1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unova', 6: 'Kalos', 7: 'Alola', 8: 'Galar', 9: 'Paldea' };
  var SHINY_ODDS = 0.08;

  function displayName(slug) {
    return slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function pad4(n) { return String(n).padStart(4, '0'); }

  function secureRandom() {
    if (window.crypto && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(secureRandom() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /* ---------------- state ---------------- */
  var gens = [];
  var deck = [];
  var deckIdx = 0;
  var results = []; // { i, verdict: 'smash'|'pass', shiny }
  var LS_RESULTS = 'rpg:smash-results';
  var current = null;
  var running = false;

  /* ---------------- DOM refs ---------------- */
  function $(id) { return document.getElementById(id); }
  var card = $('smash-card'), emptyEl = $('smash-empty'), verdictBtns = $('smash-verdicts'), statsEl = $('smash-stats');
  var imgEl = $('smash-img'), numEl = $('smash-num'), nameEl = $('smash-name');
  var statSmash = $('stat-smash'), statPass = $('stat-pass'), statRate = $('stat-rate'), statStreak = $('stat-streak');
  var historyPanel = $('history-panel'), historyList = $('history-list');

  /* ---------------- generation chips ---------------- */
  function renderGenButtons() {
    var wrap = $('gen-buttons');
    wrap.innerHTML = '';
    GENERATIONS.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn';
      b.textContent = 'Gen ' + g;
      b.setAttribute('aria-pressed', gens.indexOf(g) >= 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        var i = gens.indexOf(g);
        if (i >= 0) gens.splice(i, 1); else gens.push(g);
        b.setAttribute('aria-pressed', gens.indexOf(g) >= 0 ? 'true' : 'false');
        resetGame();
      });
      wrap.appendChild(b);
    });
  }

  /* ---------------- core game ---------------- */
  function buildDeck() {
    var pool = POKEMON.filter(function (p) {
      return !gens.length || gens.indexOf(p.g) >= 0;
    });
    deck = shuffle(pool);
    deckIdx = 0;
  }

  function nextPokemon() {
    if (deckIdx >= deck.length) buildDeck(); // reshuffle when pool exhausted
    var p = deck[deckIdx++];
    var shiny = secureRandom() < SHINY_ODDS;
    return { p: p, shiny: shiny };
  }

  function dexRow(label, valueEl) {
    var row = document.createElement('div');
    row.className = 'dexdata-row';
    var dt = document.createElement('dt');
    dt.textContent = label;
    var dd = document.createElement('dd');
    dd.appendChild(valueEl);
    row.appendChild(dt);
    row.appendChild(dd);
    return row;
  }

  function renderCurrent() {
    if (!current) return;
    var p = current.p;
    var siUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + p.si + '.png';
    imgEl.onerror = null;
    imgEl.src = current.shiny ? p.sps : p.sp;
    imgEl.alt = displayName(p.n) + (current.shiny ? ' (shiny)' : '') + ' artwork';
    imgEl.onerror = function () {
      if (imgEl.src !== siUrl) imgEl.src = siUrl;
      else imgEl.onerror = null;
    };
    numEl.textContent = '#' + pad4(p.si) + (current.shiny ? ' · ✨ SHINY' : '');
    nameEl.textContent = displayName(p.n);
    /* type-tinted aura behind the artwork (home-card style) */
    var artWrap = imgEl.parentNode;
    artWrap.style.setProperty('--aura', TYPE_MAP[p.t[0]] ? TYPE_MAP[p.t[0]].color : '#A8A878');

    /* Pokédex data table (left art / right data, bulba-style) */
    var data = $('smash-data');
    data.innerHTML = '';

    /* National № */
    data.appendChild(dexRow('National №', (function () {
      var s = document.createElement('span');
      s.className = 'dexdata-val';
      s.textContent = '#' + pad4(p.si);
      return s;
    })()));

    /* Type */
    data.appendChild(dexRow('Type', (function () {
      var wrap = document.createElement('div');
      wrap.className = 'chip-row';
      wrap.style.justifyContent = 'flex-start';
      wrap.style.marginTop = '0';
      p.t.forEach(function (t) {
        var m = TYPE_MAP[t];
        var chip = document.createElement('span');
        chip.className = 'type-tag';
        chip.style.setProperty('--tag', m ? m.color : '#A8A878');
        chip.style.setProperty('--tag-text', m && m.light ? '#fff' : '#121212');
        chip.textContent = m ? m.label : t;
        wrap.appendChild(chip);
      });
      return wrap;
    })()));

    /* Generation */
    data.appendChild(dexRow('Generation', (function () {
      var s = document.createElement('span');
      s.className = 'dexdata-val';
      s.textContent = 'Gen ' + p.g + ' · ' + (REGIONS[p.g] || '');
      return s;
    })()));

    /* Rarity */
    data.appendChild(dexRow('Rarity', (function () {
      var s = document.createElement('span');
      s.className = 'dexdata-val';
      s.textContent = p.lg ? 'Legendary' : (p.my ? 'Mythical' : 'Standard');
      return s;
    })()));

    /* Evolution stage */
    data.appendChild(dexRow('Evolution', (function () {
      var s = document.createElement('span');
      s.className = 'dexdata-val';
      s.textContent = p.ev === 'initial' ? 'Initial' : (p.ev === 'middle' ? 'Middle' : 'Final');
      return s;
    })()));

    /* BST */
    data.appendChild(dexRow('Base stats', (function () {
      var s = document.createElement('span');
      s.className = 'dexdata-val';
      s.textContent = p.tt + ' total';
      return s;
    })()));

    /* Abilities */
    data.appendChild(dexRow('Abilities', (function () {
      var list = document.createElement('ol');
      list.className = 'dexdata-abilities';
      p.ab.forEach(function (a, i) {
        var li = document.createElement('li');
        li.textContent = (i + 1) + '. ' + displayName(a);
        list.appendChild(li);
      });
      return list;
    })()));
  }

  function updateStats() {
    var smash = results.filter(function (r) { return r.verdict === 'smash'; }).length;
    var pass = results.length - smash;
    var rate = results.length ? Math.round((smash / results.length) * 100) : 0;
    var streak = 0;
    for (var i = results.length - 1; i >= 0 && results[i].verdict === 'smash'; i--) streak++;
    statSmash.textContent = '💖 ' + smash;
    statPass.textContent = '🚫 ' + pass;
    statRate.textContent = rate + '% smash rate';
    statStreak.textContent = '🔥 streak ' + streak;
  }

  function persist() {
    try { localStorage.setItem(LS_RESULTS, JSON.stringify(results)); }
    catch (e) { /* private mode — ignore */ }
  }

  function renderHistory() {
    historyList.innerHTML = '';
    historyPanel.hidden = results.length === 0;
    results.slice().reverse().forEach(function (r) {
      var p = BY_ID[r.i];
      if (!p) return;
      var li = document.createElement('li');
      li.className = 'history-row';
      var btn = document.createElement('div');
      btn.className = 'history-item';
      btn.style.cursor = 'default';
      var label = document.createElement('span');
      label.className = 'history-label';
      label.textContent = (r.verdict === 'smash' ? '💖 Smash' : '🚫 Pass');
      btn.appendChild(label);
      var thumbs = document.createElement('span');
      thumbs.className = 'history-thumbs';
      var img = document.createElement('img');
      img.src = r.shiny ? p.sps : p.sp;
      img.alt = displayName(p.n);
      img.width = 40; img.height = 40; img.loading = 'lazy';
      img.onerror = function () {
        var fb = img.src.replace('/other/official-artwork', '');
        if (fb !== img.src) img.src = fb; else img.onerror = null;
      };
      thumbs.appendChild(img);
      btn.appendChild(thumbs);
      li.appendChild(btn);
      historyList.appendChild(li);
    });
  }

  function judge(verdict) {
    if (!current) return;
    results.push({ i: current.p.i, verdict: verdict, shiny: current.shiny });
    persist();
    current = nextPokemon();
    renderCurrent();
    updateStats();
    renderHistory();
  }

  function verdictSummary() {
    var smash = results.filter(function (r) { return r.verdict === 'smash'; }).length;
    var rate = results.length ? Math.round((smash / results.length) * 100) : 0;
    var label = rate >= 80 ? 'Certified Pokémon lover' : rate >= 50 ? 'Balanced taste, honestly' : rate >= 20 ? 'Seriously picky' : 'Certified Pokémon hater';
    return {
      text: 'I smashed ' + smash + '/' + results.length + ' Pokémon (' + rate + '%) on Random Pokemon Generator — ' + label + '. How picky are you? ' + location.origin + location.pathname,
      label: label
    };
  }

  function shareVerdicts() {
    var label = $('share-label');
    if (!results.length) {
      label.textContent = '📣 Judge some first!';
      setTimeout(function () { label.textContent = '📣 Share My Verdicts'; }, 1800);
      return;
    }
    var s = verdictSummary();
    copyToClipboard(s.text, function (ok) {
      label.textContent = ok ? '✅ Copied!' : '🔗 Link ready';
      setTimeout(function () { label.textContent = '📣 Share My Verdicts'; }, 1800);
    });
  }

  function copyToClipboard(text, done) {
    function legacyCopy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); })
        .catch(function () { done(legacyCopy()); });
    } else {
      done(legacyCopy());
    }
  }

  function startGame() {
    running = true;
    /* keep existing verdict history — only CLEAR wipes it */
    buildDeck();
    current = nextPokemon();
    card.hidden = false;
    emptyEl.hidden = true;
    verdictBtns.hidden = false;
    statsEl.hidden = false;
    renderCurrent();
    updateStats();
    renderHistory();
  }

  function resetGame() {
    if (!running) return;
    startGame();
  }

  /* ---------------- dex details modal (home-style) ---------------- */
  var STAT_LABELS = ['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE'];
  var modal = $('modal');

  function findBySlug(slug) {
    for (var i = 0; i < POKEMON.length; i++) {
      if (POKEMON[i].n === slug) return POKEMON[i];
    }
    return null;
  }

  function openModal(p) {
    var aura = TYPE_MAP[p.t[0]] ? TYPE_MAP[p.t[0]].color : '#A8A878';
    $('modal-card').style.setProperty('--aura', aura);

    $('modal-meta').innerHTML = '<span class="mnum">#' + pad4(p.si) + '</span> · Gen ' + p.g + ' · ' +
      (REGIONS[p.g] || '') + ' · ' + p.ev + (p.lg ? ' · Legendary' : '') + (p.my ? ' · Mythical' : '');
    $('modal-name').textContent = displayName(p.n);

    var mt = $('modal-types');
    mt.innerHTML = '';
    p.t.forEach(function (t) {
      var meta = TYPE_MAP[t];
      var chip = document.createElement('span');
      chip.className = 'type-tag';
      chip.style.setProperty('--tag', meta ? meta.color : '#A8A878');
      chip.style.setProperty('--tag-text', meta && meta.light ? '#fff' : '#121212');
      chip.textContent = meta ? meta.label : t;
      mt.appendChild(chip);
    });

    var img = $('modal-img');
    img.src = p.sp;
    img.alt = displayName(p.n) + ' artwork';
    var siUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + p.si + '.png';
    img.onerror = function () {
      if (img.src !== siUrl) img.src = siUrl;
      else img.onerror = null;
    };

    $('modal-bst').textContent = p.tt;
    var stats = $('modal-stats');
    stats.innerHTML = '';
    p.st.forEach(function (v, idx) {
      var row = document.createElement('div');
      row.className = 'stat-row';
      var dt = document.createElement('dt');
      dt.textContent = STAT_LABELS[idx];
      var dd = document.createElement('dd');
      dd.textContent = v;
      var track = document.createElement('div');
      track.className = 'stat-track';
      var fill = document.createElement('div');
      fill.className = 'stat-fill';
      fill.style.width = Math.min(100, (v / 255) * 100) + '%';
      track.appendChild(fill);
      row.appendChild(dt); row.appendChild(dd); row.appendChild(track);
      stats.appendChild(row);
    });

    var ab = $('modal-abilities');
    ab.innerHTML = '';
    p.ab.forEach(function (a) {
      var li = document.createElement('li');
      li.textContent = displayName(a);
      ab.appendChild(li);
    });

    var evo = $('modal-evo');
    evo.innerHTML = '';
    if (p.pre) {
      evo.appendChild(evoLink(p.pre));
      evo.appendChild(document.createTextNode('→'));
    }
    var cur = document.createElement('span');
    cur.className = 'evo-current';
    cur.textContent = displayName(p.n);
    evo.appendChild(cur);
    p.nxt.forEach(function (n) {
      evo.appendChild(document.createTextNode('→'));
      evo.appendChild(evoLink(n));
    });
    if (!p.pre && p.nxt.length === 0) {
      var none = document.createElement('span');
      none.className = 'evo-none';
      none.textContent = 'Does not evolve';
      evo.appendChild(none);
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('modal-close').focus();
  }

  function evoLink(slug) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'evo-link';
    b.textContent = displayName(slug);
    b.addEventListener('click', function () {
      var p = findBySlug(slug);
      if (p) openModal(p);
    });
    return b;
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  $('modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  /* ---------------- verdict cards modal ---------------- */
  var hmModal = $('history-modal');

  function openVerdictCards() {
    if (!results.length) return;
    var grid = $('hm-cards');
    grid.innerHTML = '';
    $('hm-meta').textContent = results.length + ' verdicts';
    results.slice().reverse().forEach(function (r) {
      var p = BY_ID[r.i];
      if (!p) return;
      var card = document.createElement('div');
      card.className = 'v-card';
      card.style.cursor = 'pointer';
      card.title = 'Click for full details';
      card.addEventListener('click', function () { openModal(p); });
      var v = document.createElement('span');
      v.className = 'v-verdict ' + r.verdict;
      v.textContent = r.verdict === 'smash' ? '💖 Smash' : '🚫 Pass';
      card.appendChild(v);
      var img = document.createElement('img');
      img.src = r.shiny ? p.sps : p.sp;
      img.alt = displayName(p.n);
      img.width = 72;
      img.height = 72;
      img.loading = 'lazy';
      img.onerror = function () {
        var fb = img.src.replace('/other/official-artwork', '');
        if (fb !== img.src) img.src = fb; else img.onerror = null;
      };
      card.appendChild(img);
      var nm = document.createElement('span');
      nm.className = 'v-name';
      nm.textContent = displayName(p.n);
      card.appendChild(nm);
      var bst = document.createElement('span');
      bst.className = 'v-bst';
      bst.textContent = 'BST ' + p.tt;
      card.appendChild(bst);
      grid.appendChild(card);
    });
    hmModal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('hm-close').focus();
  }

  function closeVerdictCards() {
    hmModal.hidden = true;
    document.body.style.overflow = '';
  }

  $('history-cards-btn').addEventListener('click', openVerdictCards);
  $('hm-close').addEventListener('click', closeVerdictCards);
  hmModal.addEventListener('click', function (e) { if (e.target === hmModal) closeVerdictCards(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !hmModal.hidden) closeVerdictCards();
  });

  /* ---------------- events ---------------- */
  $('start-btn').addEventListener('click', startGame);
  $('smash-btn').addEventListener('click', function () { judge('smash'); });
  $('pass-btn').addEventListener('click', function () { judge('pass'); });
  $('share-btn').addEventListener('click', shareVerdicts);
  $('history-clear').addEventListener('click', function () {
    results = [];
    persist();
    /* reset the deck to the full original pool (restart from scratch) */
    buildDeck();
    updateStats();
    renderHistory();
  });

  document.addEventListener('keydown', function (e) {
    if (!running || !current) return;
    var k = e.key.toLowerCase();
    if (k === 's') judge('smash');
    else if (k === 'p') judge('pass');
  });

  /* ---------------- init ---------------- */
  renderGenButtons();
  /* restore persisted verdicts (survive refresh) */
  try { results = JSON.parse(localStorage.getItem(LS_RESULTS) || '[]'); }
  catch (e) { results = []; }
  updateStats();
  renderHistory();
})();
