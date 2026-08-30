/* ============================================================
   Who's That Pokemon — silhouette / pixel / cry guessing game
   Faithful re-implementation of the reference game logic:
   - 3 attempts per round, state machine SETUP/PLAYING/CORRECT/INCORRECT/GIVEUP
   - 4 difficulty modes: easy / normal (silhouette) / hard (pixel) / elite (cry only)
   - progressive hints: type -> generation+first letter, gated by difficulty
   - Play Cry + auto-cry on elite start / round end, correct & incorrect SFX
   - Settings (difficulty, generation, sound) + Stats persisted in localStorage
   - first-visit How to Play modal
   ES5 IIFE, no dependencies. data.js + crymap.js must be loaded first.
   ============================================================ */
(function () {
  'use strict';

  var MAX_ATTEMPTS = 3;
  var DIFF_EASY = 'easy', DIFF_NORMAL = 'normal', DIFF_HARD = 'hard', DIFF_ELITE = 'elite';
  var LS_SETTINGS = 'rpg:wtp-settings';
  var LS_STATS = 'rpg:wtp-stats';
  var LS_HOWTO = 'rpg:wtp-howto-seen';
  var LS_DESC_PREFIX = 'rpg:wtp-desc-';
  var CRY_BASE = 'https://play.pokemonshowdown.com/audio/cries/';
  var FRONT_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
  var SFX_CORRECT = 'correct.wav';
  var SFX_INCORRECT = 'incorrect.wav';

  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function displayName(slug) {
    return slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function secureRandom() {
    if (window.crypto && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }
  function fmtTime(ms) { return (ms / 1000).toFixed(1) + 's'; }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var TYPE_COLORS = {
    bug: '#A8B820', dark: '#705848', dragon: '#7038F8', electric: '#F8D030',
    fairy: '#EE99AC', fighting: '#C03028', fire: '#F08030', flying: '#A890F0',
    ghost: '#705898', grass: '#78C850', ground: '#E0C068', ice: '#98D8D8',
    normal: '#A8A878', poison: '#A040A0', psychic: '#F85888', rock: '#B8A038',
    steel: '#B8B8D0', water: '#6890F0'
  };

  /* ---------------- state ---------------- */
  var state = {
    current: null,
    gameState: 'setup',          // setup | playing | correct | incorrect | giveup
    guessInput: '',
    startTime: 0,
    lastTimeTaken: 0,
    attemptsRemaining: MAX_ATTEMPTS,
    lastWrongGuess: '',
    settings: { generation: null, soundEnabled: true, difficulty: DIFF_NORMAL },
    stats: {
      correctGuesses: 0, incorrectGuesses: 0, totalCorrectTime: 0,
      averageTime: 0, fastestTime: 0, currentStreak: 0, bestStreak: 0
    }
  };

  var ENTRIES = [];          // built from POKEMON_DATA + CRY_NAMES
  var audioCry = null;       // Audio object for current cry
  var cryPlaying = false;
  var cryBroken = false;     // cry errored -> hide Play Cry
  var cryPlayedKey = '';     // dedupe: 'playing-<id>' / '<state>-<id>'
  var userUnlocked = false;  // first pointer/key interaction (autoplay policy)
  var descCacheChecked = false;

  /* ---------------- data build ---------------- */
  function buildEntries() {
    var data = window.POKEMON_DATA || [];
    var cryNames = window.CRY_NAMES || {};
    ENTRIES = data.map(function (p) {
      var c = cryNames[p.n];
      return {
        id: p.i,
        si: p.si || p.i,
        name: p.n,
        displayName: displayName(p.n),
        types: p.t,
        gen: p.g,
        official: p.sp,
        front: FRONT_BASE + p.i + '.png',
        cry: c ? CRY_BASE + c + '.mp3' : null
      };
    });
  }

  function poolFor() {
    var pool = ENTRIES;
    if (state.settings.generation) {
      pool = pool.filter(function (e) { return e.gen === state.settings.generation; });
    }
    if (state.settings.difficulty === DIFF_HARD) {
      pool = pool.filter(function (e) { return !!e.front; });
    }
    if (state.settings.difficulty === DIFF_ELITE) {
      pool = pool.filter(function (e) { return !!e.cry; });
    }
    return pool;
  }

  function pickEntry() {
    var pool = poolFor();
    if (!pool.length) pool = ENTRIES;
    var candidates = pool;
    if (state.current && pool.length > 1) {
      candidates = pool.filter(function (e) { return e.id !== state.current.id; });
      if (!candidates.length) candidates = pool;
    }
    return candidates[Math.floor(secureRandom() * candidates.length)];
  }

  /* ---------------- persistence ---------------- */
  function persistSettings() {
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(state.settings)); } catch (e) {}
  }
  function persistStats() {
    try { localStorage.setItem(LS_STATS, JSON.stringify(state.stats)); } catch (e) {}
  }
  function loadPersisted() {
    try {
      var s = localStorage.getItem(LS_SETTINGS);
      if (s) {
        var o = JSON.parse(s);
        if (o && typeof o === 'object') {
          if (o.difficulty === DIFF_EASY || o.difficulty === DIFF_NORMAL || o.difficulty === DIFF_HARD || o.difficulty === DIFF_ELITE) state.settings.difficulty = o.difficulty;
          state.settings.generation = (typeof o.generation === 'number') ? o.generation : null;
          state.settings.soundEnabled = o.soundEnabled !== false;
        }
      }
    } catch (e) {}
    try {
      var st = localStorage.getItem(LS_STATS);
      if (st) {
        var o = JSON.parse(st);
        if (o && typeof o === 'object') {
          for (var k in state.stats) {
            if (typeof o[k] === 'number') state.stats[k] = o[k];
          }
        }
      }
    } catch (e) {}
  }

  /* ---------------- sounds ---------------- */
  function playSfx(file, vol) {
    if (!state.settings.soundEnabled) return;
    try {
      var a = new Audio(file);
      a.volume = vol || 0.7;
      a.play().catch(function () {});
    } catch (e) {}
  }

  function playCry(playKey) {
    if (!state.current || !state.current.cry || !state.settings.soundEnabled || cryBroken) return;
    if (cryPlayedKey === playKey) return;
    if (!audioCry) {
      audioCry = new Audio();
      audioCry.addEventListener('ended', function () { cryPlaying = false; renderCryBtn(); });
      audioCry.addEventListener('error', function () {
        cryBroken = true;
        cryPlaying = false;
        audioCry = null;
        renderCryBtn();
      });
    }
    try {
      cryPlayedKey = playKey;
      audioCry.src = state.current.cry;
      audioCry.volume = 1;
      audioCry.currentTime = 0;
      cryPlaying = true;
      renderCryBtn();
      var p = audioCry.play();
      if (p && p.catch) p.catch(function (err) {
        cryPlaying = false;
        renderCryBtn();
        if (!(err && err.name === 'NotAllowedError')) {
          // real load error -> hide the button like the reference site
          cryBroken = true;
          renderCryBtn();
        }
      });
    } catch (e) {
      cryPlaying = false;
      renderCryBtn();
    }
  }

  function resetCryDedupe() { cryPlayedKey = ''; }

  /* ---------------- game flow ---------------- */
  function newRound() {
    var e = pickEntry();
    state.current = e;
    state.gameState = 'playing';
    state.startTime = Date.now();
    state.guessInput = '';
    state.attemptsRemaining = MAX_ATTEMPTS;
    state.lastWrongGuess = '';
    resetCryDedupe();
    renderAll();
    if (state.settings.difficulty === DIFF_ELITE && userUnlocked) {
      // auto-play the cry once per elite round (after first user interaction)
      playCry('playing-' + e.id);
    }
  }

  function finishRound(kind) {
    state.lastTimeTaken = Date.now() - state.startTime;
    if (kind === 'correct') {
      state.gameState = 'correct';
      var t = state.lastTimeTaken;
      state.stats.correctGuesses += 1;
      state.stats.totalCorrectTime += t;
      state.stats.averageTime = state.stats.totalCorrectTime / state.stats.correctGuesses;
      if (!state.stats.fastestTime || t < state.stats.fastestTime) state.stats.fastestTime = t;
      state.stats.currentStreak += 1;
      if (state.stats.currentStreak > state.stats.bestStreak) state.stats.bestStreak = state.stats.currentStreak;
      playSfx(SFX_CORRECT, 0.7);
    } else {
      state.gameState = kind; // 'incorrect' | 'giveup'
      state.stats.incorrectGuesses += 1;
      state.stats.currentStreak = 0;
      playSfx(SFX_INCORRECT, 0.7);
    }
    persistStats();
    renderAll();
    // round-end cry (once per round)
    if (state.settings.soundEnabled && state.current && state.current.cry) {
      playCry(state.gameState + '-' + state.current.id);
    }
    loadSpeciesDesc();
  }

  function checkGuess() {
    if (state.gameState !== 'playing' || !state.current || !state.guessInput.trim()) return;
    var guess = state.guessInput.trim().toLowerCase();
    if (guess === state.current.displayName.toLowerCase()) {
      finishRound('correct');
    } else {
      state.attemptsRemaining -= 1;
      if (state.attemptsRemaining <= 0) {
        state.attemptsRemaining = 0;
        state.lastWrongGuess = state.guessInput;
        finishRound('incorrect');
      } else {
        state.lastWrongGuess = state.guessInput;
        state.guessInput = '';
        renderAll();
      }
    }
  }

  function giveUp() {
    if (state.gameState !== 'playing' || !state.current) return;
    finishRound('giveup');
  }

  function nextRound() {
    if (state.gameState === 'playing') {
      giveUp(); // abandoning counts as a miss, like the reference site
    }
    state.current = null;
    state.gameState = 'setup';
    state.guessInput = '';
    state.startTime = 0;
    state.lastTimeTaken = 0;
    state.attemptsRemaining = MAX_ATTEMPTS;
    state.lastWrongGuess = '';
    newRound();
  }

  /* ---------------- species description (lazy + cached) ---------------- */
  function loadSpeciesDesc() {
    if (!state.current || state.gameState === 'playing' || state.gameState === 'setup') return;
    var si = state.current.si;
    var el = $('wtp-result-desc');
    try {
      var cached = localStorage.getItem(LS_DESC_PREFIX + si);
      if (cached) {
        el.textContent = cached;
        el.hidden = false;
        return;
      }
    } catch (e) {}
    if (!window.fetch) return;
    fetch('https://pokeapi.co/api/v2/pokemon-species/' + si)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var entries = (j && j.flavor_text_entries) || [];
        var en = null;
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].language && entries[i].language.name === 'en') { en = entries[i]; break; }
        }
        var text = en ? String(en.flavor_text).replace(/[\n\f\r]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
        if (text) {
          try { localStorage.setItem(LS_DESC_PREFIX + si, text); } catch (e2) {}
          if (state.current && state.current.si === si) {
            el.textContent = text;
            el.hidden = false;
          }
        }
      })
      .catch(function () {});
  }

  /* ---------------- hints ---------------- */
  function hintFlags() {
    var playing = state.gameState === 'playing';
    var shown = !!(playing && state.lastWrongGuess && state.attemptsRemaining < MAX_ATTEMPTS);
    var used = MAX_ATTEMPTS - state.attemptsRemaining;
    var diff = state.settings.difficulty;
    var showType = false, showGen = false;
    if (shown) {
      switch (diff) {
        case DIFF_EASY:
        case DIFF_NORMAL:
          showType = used >= 1; break;
        case DIFF_HARD:
          showType = used >= 2; break;
        case DIFF_ELITE:
          showType = used >= 1; break;
      }
      switch (diff) {
        case DIFF_EASY:
          showGen = used >= 1; break;
        case DIFF_NORMAL:
          showGen = used >= 2; break;
        case DIFF_HARD:
          showGen = false; break;
        case DIFF_ELITE:
          showGen = used >= 2; break;
      }
    }
    return { shown: shown, showType: showType, showGen: showGen, used: used };
  }

  function makeTypeTag(type) {
    var s = document.createElement('span');
    s.className = 'type-tag';
    s.style.setProperty('--tag', TYPE_COLORS[type] || '#A8A878');
    s.style.setProperty('--tag-text', type === 'ice' || type === 'electric' || type === 'normal' || type === 'ground' ? '#121212' : '#fff');
    s.textContent = type;
    return s;
  }

  /* ---------------- render ---------------- */
  function renderAll() {
    renderArt();
    renderCryBtn();
    renderWrongHints();
    renderSuggestions(true);
    renderGuessButtons();
    renderResult();
    renderSettings();
    renderStats();
  }

  function renderArt() {
    var img = $('wtp-img');
    var eliteBox = $('wtp-elite');
    var loader = $('wtp-loader');
    var e = state.current;
    if (!e) {
      img.hidden = true;
      eliteBox.hidden = true;
      loader.hidden = false;
      loader.textContent = 'Loading…';
      return;
    }
    var diff = state.settings.difficulty;
    var revealed = state.gameState !== 'playing' && state.gameState !== 'setup';
    // src: elite shows official only once revealed; hard uses pixel front; else official
    var src = (diff === DIFF_HARD && !revealed && e.front) ? e.front : e.official;
    if (!revealed && diff === DIFF_ELITE) {
      // no image at all — just the cry icon
      img.hidden = true;
      eliteBox.hidden = false;
      loader.hidden = true;
      return;
    }
    img.hidden = false;
    eliteBox.hidden = true;
    loader.hidden = true;
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    img.alt = revealed ? e.displayName : "Who's that Pokemon?";
    // silhouette: normal & hard while hidden
    var silhouette = !revealed && (diff === DIFF_NORMAL || diff === DIFF_HARD);
    img.style.filter = silhouette ? 'brightness(0)' : 'none';
    img.style.transition = 'filter 0.5s';
  }

  function renderCryBtn() {
    var btn = $('wtp-cry');
    var e = state.current;
    var elite = state.settings.difficulty === DIFF_ELITE;
    var visible = !!e && !!e.cry && state.settings.soundEnabled && !cryBroken;
    if (!visible) { btn.hidden = true; return; }
    btn.hidden = false;
    var span = btn.querySelector('span');
    if (cryPlaying) {
      span.textContent = '🔊 Playing...';
    } else if (elite && state.gameState === 'playing') {
      span.textContent = '🔊 Replay Cry';
      btn.classList.add('wtp-cry-center');
    } else {
      span.textContent = '🔊 Play Cry';
      btn.classList.remove('wtp-cry-center');
    }
    btn.disabled = cryPlaying;
  }

  function renderWrongHints() {
    var wrongEl = $('wtp-wrong');
    var hintEl = $('wtp-hints');
    var flags = hintFlags();
    if (flags.shown && state.attemptsRemaining > 0) {
      wrongEl.hidden = false;
      wrongEl.textContent = 'Wrong! ' + state.attemptsRemaining + (state.attemptsRemaining === 1 ? ' attempt' : ' attempts') + ' remaining';
    } else {
      wrongEl.hidden = true;
    }
    if (flags.shown && (flags.showType || flags.showGen)) {
      hintEl.hidden = false;
      var typeBox = $('wtp-hint-type');
      typeBox.innerHTML = '';
      if (flags.showType && state.current) {
        var lbl = document.createElement('span');
        lbl.textContent = 'Type: ';
        typeBox.appendChild(lbl);
        for (var i = 0; i < state.current.types.length; i++) {
          typeBox.appendChild(makeTypeTag(state.current.types[i]));
        }
      }
      var genBox = $('wtp-hint-gen');
      genBox.textContent = '';
      if (flags.showGen && state.current) {
        var parts = [];
        if (!state.settings.generation) parts.push('Gen ' + state.current.gen);
        parts.push('Starts with "' + state.current.displayName.charAt(0) + '"');
        var sep = document.createElement('span');
        sep.className = 'wtp-hint-sep';
        sep.textContent = ' · ';
        genBox.appendChild(sep);
        genBox.appendChild(document.createTextNode(parts.join(' · ')));
      }
    } else {
      hintEl.hidden = true;
    }
  }

  function suggestionsList() {
    var input = state.guessInput.toLowerCase();
    if (input.length < 2) return [];
    var seen = {};
    var out = [];
    for (var i = 0; i < ENTRIES.length; i++) {
      var dn = ENTRIES[i].displayName.toLowerCase();
      if (dn.indexOf(input) !== -1 && !seen[dn]) {
        seen[dn] = true;
        out.push(ENTRIES[i].displayName);
        if (out.length >= 5) break;
      }
    }
    return out;
  }

  function renderSuggestions(forceHide) {
    var list = $('wtp-suggestions');
    var inputEl = $('wtp-input');
    var suggestions = suggestionsList();
    var open = state.gameState === 'playing' && !forceHide && !!state.guessInput && suggestions.length > 0;
    if (!open) {
      list.hidden = true;
      inputEl.setAttribute('aria-expanded', 'false');
      return;
    }
    list.hidden = false;
    list.innerHTML = '';
    for (var i = 0; i < suggestions.length; i++) {
      var li = document.createElement('li');
      li.className = 'wtp-suggestion';
      li.setAttribute('role', 'option');
      li.id = 'wtp-suggestion-' + i;
      li.textContent = suggestions[i];
      (function (idx, text) {
        li.addEventListener('mousedown', function (ev) {
          ev.preventDefault();
          chooseSuggestion(text);
        });
        li.addEventListener('mouseenter', function () { selectSuggestion(idx); });
      })(i, suggestions[i]);
      list.appendChild(li);
    }
    inputEl.setAttribute('aria-expanded', 'true');
  }

  var selectedSuggestion = -1;
  var currentSuggestions = [];

  function selectSuggestion(idx) {
    selectedSuggestion = idx;
    currentSuggestions = suggestionsList();
    var items = qsa('.wtp-suggestion');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('wtp-suggestion-selected', i === idx);
      items[i].setAttribute('aria-selected', i === idx ? 'true' : 'false');
    }
    if (idx >= 0) {
      $('wtp-input').setAttribute('aria-activedescendant', 'wtp-suggestion-' + idx);
    } else {
      $('wtp-input').removeAttribute('aria-activedescendant');
    }
  }

  function chooseSuggestion(text) {
    state.guessInput = text;
    $('wtp-input').value = text;
    selectedSuggestion = -1;
    renderSuggestions(true);
    checkGuess();
  }

  function renderGuessButtons() {
    var inputEl = $('wtp-input');
    var guessBtn = $('wtp-guess');
    var giveupBtn = $('wtp-giveup');
    var playing = state.gameState === 'playing';
    inputEl.disabled = !playing;
    guessBtn.disabled = !playing || !state.guessInput.trim();
    giveupBtn.disabled = !playing;
    var span = guessBtn.querySelector('span');
    span.textContent = 'Guess! (' + state.attemptsRemaining + '/3)';
    if (playing) {
      try { inputEl.focus(); } catch (e) {}
    }
  }

  function renderResult() {
    var box = $('wtp-result');
    var e = state.current;
    if (!e || state.gameState === 'playing' || state.gameState === 'setup') {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    var title = $('wtp-result-title');
    var ok = state.gameState === 'correct';
    title.textContent = ok ? '✅ Correct!' : '❌ Not quite!';
    $('wtp-result-time').textContent = '⏱ ' + fmtTime(state.lastTimeTaken);
    $('wtp-result-name').textContent = "It's " + e.displayName + '!';
    var typesBox = $('wtp-result-types');
    typesBox.innerHTML = '';
    for (var i = 0; i < e.types.length; i++) {
      typesBox.appendChild(makeTypeTag(e.types[i]));
    }
    var desc = $('wtp-result-desc');
    desc.hidden = true;
    desc.textContent = '';
  }

  /* ---------------- settings ---------------- */
  var DIFF_META = [
    { value: DIFF_EASY, label: 'Easy', desc: 'Full image' },
    { value: DIFF_NORMAL, label: 'Normal', desc: 'Silhouette' },
    { value: DIFF_HARD, label: 'Hard', desc: 'Pixel silhouette' },
    { value: DIFF_ELITE, label: 'Elite', desc: 'Cry only' }
  ];

  function makeChip(parent, label, pressed, onClick, single) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-btn';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.textContent = label;
    b.addEventListener('click', function () {
      onClick();
      // onClick may have re-rendered the whole chip row (settings rebuild) —
      // in that case the new DOM already reflects state; skip manual aria flipping.
      if (!b.isConnected) return;
      if (single) {
        qsa('[aria-pressed="true"]', parent).forEach(function (sib) {
          sib.setAttribute('aria-pressed', 'false');
        });
        b.setAttribute('aria-pressed', 'true');
      } else {
        b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      }
    });
    parent.appendChild(b);
    return b;
  }

  function renderSettings() {
    var diffBox = $('wtp-difficulty');
    diffBox.innerHTML = '';
    for (var i = 0; i < DIFF_META.length; i++) {
      (function (meta) {
        makeChip(diffBox, meta.label, state.settings.difficulty === meta.value, function () {
          var diff = meta.value;
          if (diff === DIFF_ELITE && !state.settings.soundEnabled) {
            state.settings.soundEnabled = true;
            $('wtp-sound').checked = true;
          }
          if (state.settings.difficulty !== diff) {
            state.settings.difficulty = diff;
            persistSettings();
            restartForSettings();
          }
        }, true);
      })(DIFF_META[i]);
    }
    var desc = $('wtp-difficulty-desc');
    var meta = null;
    for (var j = 0; j < DIFF_META.length; j++) {
      if (DIFF_META[j].value === state.settings.difficulty) meta = DIFF_META[j];
    }
    desc.textContent = meta ? meta.desc : '';

    var genBox = $('wtp-generation');
    genBox.innerHTML = '';
    // All Gens
    makeChip(genBox, 'All Gens', state.settings.generation === null, function () {
      setGeneration(null);
    }, true);
    for (var g = 1; g <= 9; g++) {
      (function (gen) {
        makeChip(genBox, 'Gen ' + gen, state.settings.generation === gen, function () {
          setGeneration(gen);
        }, true);
      })(g);
    }

    $('wtp-sound').checked = state.settings.soundEnabled;
    var label = qs('.wtp-switch-label');
    if (label) label.textContent = state.settings.soundEnabled ? 'On' : 'Off';
  }

  function setGeneration(gen) {
    if (state.settings.generation !== gen) {
      state.settings.generation = gen;
      persistSettings();
      restartForSettings();
    }
  }

  function restartForSettings() {
    // changing settings restarts the round, same as reference site
    state.current = null;
    state.gameState = 'setup';
    state.guessInput = '';
    state.lastTimeTaken = 0;
    state.attemptsRemaining = MAX_ATTEMPTS;
    state.lastWrongGuess = '';
    newRound();
  }

  /* ---------------- stats ---------------- */
  function renderStats() {
    var st = state.stats;
    var played = st.correctGuesses + st.incorrectGuesses;
    var pct = played ? Math.round(st.correctGuesses / played * 100) : 0;
    $('st-played').textContent = String(played);
    $('st-correct').textContent = pct + '%';
    $('st-avg').textContent = st.averageTime ? fmtTime(st.averageTime) : '-';
    $('st-fastest').textContent = st.fastestTime ? fmtTime(st.fastestTime) : '-';
    $('st-streak').textContent = String(st.currentStreak);
    $('st-best').textContent = String(st.bestStreak);
  }

  /* ---------------- share (site convention: direct copy + manual modal fallback) ---------------- */
  function shareUrl() {
    return location.origin && location.origin !== 'null' ? location.origin + location.pathname : location.href;
  }
  function copyToClipboard(text, done) {
    function legacyCopy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
      return ok;
    }
    function showManual() {
      $('share-modal-text').value = text;
      openModal('share-modal');
      var ta = $('share-modal-text');
      ta.focus();
      ta.select();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); })
        .catch(function () {
          if (legacyCopy()) done(true);
          else { done(false); showManual(); }
        });
    } else {
      if (legacyCopy()) done(true);
      else { done(false); showManual(); }
    }
  }
  function flashLabel(btn, ok, base) {
    var span = btn.querySelector('span');
    span.textContent = ok ? '✅ Copied!' : '🔗 Link ready';
    setTimeout(function () { span.textContent = base; }, 1800);
  }
  function shareResult() {
    var e = state.current;
    if (!e || state.gameState === 'playing' || state.gameState === 'setup') return;
    var time = fmtTime(state.lastTimeTaken);
    var text = state.gameState === 'correct'
      ? 'I guessed ' + e.displayName + ' in ' + time + ' on Who\'s That Pokemon! Can you beat me? 🔍 ' + shareUrl()
      : 'Who\'s That Pokemon tricked me — it was ' + e.displayName + '! Name it in 3 tries: ' + shareUrl();
    copyToClipboard(text, function (ok) { flashLabel($('wtp-share-result'), ok, '📣 Share'); });
  }
  function shareStats() {
    var st = state.stats;
    var played = st.correctGuesses + st.incorrectGuesses;
    var pct = played ? Math.round(st.correctGuesses / played * 100) : 0;
    var text = 'I\'m ' + pct + '% accurate on Who\'s That Pokemon (' + st.correctGuesses + '/' + played + ' correct, best streak ' + st.bestStreak + '). Think you can beat me? ' + shareUrl();
    copyToClipboard(text, function (ok) { flashLabel($('wtp-share-stats'), ok, '📣 Share My Stats'); });
  }

  /* ---------------- modals ---------------- */
  var activeModal = null;
  function openModal(id) {
    var m = $(id);
    if (!m) return;
    activeModal = id;
    m.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!activeModal) return;
    $(activeModal).hidden = true;
    document.body.style.overflow = '';
    activeModal = null;
  }
  function bindModal(id, closeIds) {
    var m = $(id);
    if (!m) return;
    for (var i = 0; i < closeIds.length; i++) {
      var b = $(closeIds[i]);
      if (b) b.addEventListener('click', closeModal);
    }
    m.addEventListener('click', function (ev) {
      if (ev.target === m) closeModal();
    });
  }

  /* ---------------- tabs ---------------- */
  function switchTab(name) {
    var panels = { play: 'panel-play', settings: 'panel-settings', stats: 'panel-stats' };
    for (var k in panels) {
      $('panel-' + k).hidden = (k !== name);
      $('tab-' + k).setAttribute('aria-selected', k === name ? 'true' : 'false');
      $('tab-' + k).classList.toggle('btn-primary', k === name);
      $('tab-' + k).classList.toggle('btn-secondary', k !== name);
    }
    if (name === 'stats') renderStats();
    if (name === 'settings') renderSettings();
  }

  /* ---------------- wire up ---------------- */
  function init() {
    buildEntries();
    loadPersisted();

    // tabs
    $('tab-play').addEventListener('click', function () { switchTab('play'); });
    $('tab-settings').addEventListener('click', function () { switchTab('settings'); });
    $('tab-stats').addEventListener('click', function () { switchTab('stats'); });

    // input
    var input = $('wtp-input');
    input.addEventListener('input', function () {
      state.guessInput = input.value;
      selectedSuggestion = -1;
      renderSuggestions(false);
      renderGuessButtons();
    });
    input.addEventListener('keydown', function (ev) {
      var suggestions = suggestionsList();
      var open = suggestions.length > 0;
      if (ev.key === 'ArrowDown' && open) {
        ev.preventDefault();
        selectedSuggestion = selectedSuggestion < suggestions.length - 1 ? selectedSuggestion + 1 : 0;
        selectSuggestion(selectedSuggestion);
      } else if (ev.key === 'ArrowUp' && open) {
        ev.preventDefault();
        selectedSuggestion = selectedSuggestion > 0 ? selectedSuggestion - 1 : suggestions.length - 1;
        selectSuggestion(selectedSuggestion);
      } else if (ev.key === 'Escape' && open) {
        renderSuggestions(true);
        selectedSuggestion = -1;
      } else if (ev.key === 'Enter') {
        if (selectedSuggestion >= 0 && open) {
          chooseSuggestion(suggestions[selectedSuggestion]);
        } else if (state.guessInput.trim()) {
          renderSuggestions(true);
          selectedSuggestion = -1;
          checkGuess();
        }
        ev.preventDefault();
      }
    });
    // blur hides suggestions
    input.addEventListener('blur', function () {
      setTimeout(function () { renderSuggestions(true); selectedSuggestion = -1; }, 150);
    });

    // buttons
    $('wtp-guess').addEventListener('click', function () {
      renderSuggestions(true);
      selectedSuggestion = -1;
      checkGuess();
    });
    $('wtp-giveup').addEventListener('click', function () {
      renderSuggestions(true);
      selectedSuggestion = -1;
      giveUp();
    });
    $('wtp-new').addEventListener('click', nextRound);
    $('wtp-next').addEventListener('click', nextRound);
    $('wtp-cry').addEventListener('click', function () {
      cryPlayedKey = '';
      playCry('manual');
    });

    // settings
    $('wtp-sound').addEventListener('change', function () {
      var on = $('wtp-sound').checked;
      if (!on && state.settings.difficulty === DIFF_ELITE) {
        // turning sound off while in Elite forces Normal (reference behaviour)
        state.settings.difficulty = DIFF_NORMAL;
      }
      state.settings.soundEnabled = on;
      persistSettings();
      renderSettings();
      if (state.settings.difficulty === DIFF_NORMAL && !on) restartForSettings();
    });

    // share (result card + stats)
    $('wtp-share-result').addEventListener('click', shareResult);
    $('wtp-share-stats').addEventListener('click', shareStats);
    bindModal('share-modal', ['sm-close']);

    // stats reset
    $('wtp-reset-stats').addEventListener('click', function () { openModal('reset-modal'); });
    bindModal('reset-modal', ['reset-cancel']);
    $('reset-confirm').addEventListener('click', function () {
      state.stats = {
        correctGuesses: 0, incorrectGuesses: 0, totalCorrectTime: 0,
        averageTime: 0, fastestTime: 0, currentStreak: 0, bestStreak: 0
      };
      persistStats();
      renderStats();
      closeModal();
    });

    // howto modal (first visit)
    bindModal('howto-modal', ['howto-close']);
    var seen = false;
    try { seen = localStorage.getItem(LS_HOWTO) === '1'; } catch (e) {}
    if (!seen) {
      openModal('howto-modal');
      try { localStorage.setItem(LS_HOWTO, '1'); } catch (e) {}
    }

    // Esc closes modals / suggestions
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        if (activeModal) closeModal();
      }
    });

    // autoplay unlock: first user interaction enables elite auto-cry
    function unlock() {
      userUnlocked = true;
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
      if (state.gameState === 'playing' && state.settings.difficulty === DIFF_ELITE &&
          state.current && state.current.cry) {
        playCry('playing-' + state.current.id);
      }
    }
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('touchstart', unlock);

    // first render
    renderAll();
    // auto-start like the reference site: deal a round immediately
    newRound();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
