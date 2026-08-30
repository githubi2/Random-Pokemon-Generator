/* ============================================================
   Pokemon Draw — vanilla JS engine
   Data: window.POKEMON_DATA (data.js, 1351 entries)
   Draw deck: a row of 5 visible cards, center card is selected;
   spin slides the whole strip left (gacha card-flip feel)
   ============================================================ */
(function () {
  'use strict';

  var POKEMON = window.POKEMON_DATA || [];

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

  /* color helpers (Pokemon-card style) */
  function mixHex(hex, k, toWhite) {
    var h = hex.replace('#', '');
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    var t = toWhite ? 255 : 0;
    r = Math.round(r + (t - r) * k);
    g = Math.round(g + (t - g) * k);
    b = Math.round(b + (t - b) * k);
    return '#' + [r, g, b].map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  function typeColor(p, idx) {
    var m = TYPE_MAP[p.t[idx]];
    return m ? m.color : '#A8A878';
  }
  function glowCss(p) {
    return 'radial-gradient(circle, ' + mixHex(typeColor(p, 0), 0.5, true) + ' 0%, #ffffff 100%)';
  }
  function artUrls(p) {
    var urls = [p.sp];
    var siUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + p.si + '.png';
    if (p.sp !== siUrl) urls.push(siUrl);
    return urls;
  }

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
  var gens = [], types = [];
  var deck = [];            // drawn cards (each item = Pokémon data)
  var focusIdx = 2;         // index of the centered/selected card
  var spinning = false;
  var lastResult = null;
  var results = [];         // spin history (persisted)
  var draws = [];           // accumulated result cards (persisted, cap 12)
  var LS_RESULTS = 'rpg:wheel-results';
  var LS_DRAWS = 'rpg:wheel-draws';

  /* ---------------- DOM refs ---------------- */
  function $(id) { return document.getElementById(id); }
  var viewEl = $('wheel'), spinBtn = $('spin-btn');
  var historyPanel = $('history-panel'), historyList = $('history-list');
  var strip = null;

  /* ---------------- filters ---------------- */
  function renderFilterRow(id, items, state, labelFn, onToggle) {
    var wrap = $(id);
    wrap.innerHTML = '';
    items.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn';
      b.textContent = labelFn(item);
      b.setAttribute('aria-pressed', state.indexOf(item) >= 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        var i = state.indexOf(item);
        if (i >= 0) state.splice(i, 1); else state.push(item);
        b.setAttribute('aria-pressed', state.indexOf(item) >= 0 ? 'true' : 'false');
        rebuildDeck();
      });
      wrap.appendChild(b);
    });
  }

  function pool() {
    return POKEMON.filter(function (p) {
      if (gens.length && gens.indexOf(p.g) < 0) return false;
      if (types.length && !p.t.some(function (t) { return types.indexOf(t) >= 0; })) return false;
      return true;
    });
  }

  /* ---------------- deck rendering ---------------- */
  var frame = null;
  function cardEl(p) {
    var li = document.createElement('div');
    li.className = 'draw-card';
    li.style.setProperty('--aura', typeColor(p, 0));
    var top = document.createElement('div');
    top.className = 'draw-num';
    top.textContent = '#' + pad4(p.si);
    var art = document.createElement('div');
    art.className = 'draw-art';
    art.style.background = glowCss(p);
    var img = document.createElement('img');
    img.src = p.sp;
    img.alt = displayName(p.n);
    img.loading = 'lazy';
    var urls = artUrls(p);
    var uIdx = 0;
    img.onerror = function () {
      uIdx++;
      if (uIdx < urls.length) img.src = urls[uIdx];
      else img.style.display = 'none';
    };
    art.appendChild(img);
    var name = document.createElement('div');
    name.className = 'draw-name';
    name.textContent = displayName(p.n);
    var sub = document.createElement('div');
    sub.className = 'dex-sub';
    sub.textContent = 'Gen ' + p.g + ' · ' + (REGIONS[p.g] || '');
    var dots = document.createElement('div');
    dots.className = 'chip-row';
    p.t.forEach(function (t) {
      var m = TYPE_MAP[t];
      var chip = document.createElement('span');
      chip.className = 'type-tag';
      chip.style.setProperty('--tag', m ? m.color : '#A8A878');
      chip.style.setProperty('--tag-text', m && m.light ? '#fff' : '#121212');
      chip.textContent = m ? m.label : t;
      dots.appendChild(chip);
    });
    var bst = document.createElement('div');
    bst.className = 'bst-line';
    bst.innerHTML = 'BST <strong>' + p.tt + '</strong>';
    li.appendChild(top);
    li.appendChild(art);
    li.appendChild(name);
    li.appendChild(sub);
    li.appendChild(dots);
    li.appendChild(bst);
    return li;
  }

  function renderStrip() {
    if (!strip) {
      strip = document.createElement('div');
      strip.id = 'wheel-strip';
      viewEl.innerHTML = '';
      viewEl.appendChild(strip);
    }
    strip.innerHTML = '';
    deck.forEach(function (p) { strip.appendChild(cardEl(p)); });
    highlightFocus();
  }

  function highlightFocus() {
    var cards = strip ? strip.children : [];
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle('selected', i === focusIdx);
    }
  }

  function cardStep() {
    var first = strip.children[0];
    if (!first) return 164;
    return first.offsetWidth + 14; /* card width + gap */
  }

  function layoutStrip(animate) {
    if (!strip) return;
    strip.style.transition = animate ? 'transform 0.8s cubic-bezier(0.17, 0.67, 0.35, 1)' : 'none';
    var step = cardStep();
    var first = strip.children[0];
    var cardW = first ? first.offsetWidth : step;
    /* center the focus card exactly on the view center */
    var x = (viewEl.clientWidth - cardW) / 2 - focusIdx * step;
    strip.style.transform = 'translateX(' + x + 'px)';
    /* keep the frame still during the slide; re-fit it after (no-anim calls) */
    if (!animate) positionFrame();
  }

  /* fixed golden slot-window: refit to the current focus card (scaled 1.05) */
  function positionFrame() {
    if (!frame) {
      frame = document.createElement('div');
      frame.className = 'draw-frame';
      viewEl.appendChild(frame);
    }
    var sel = strip.children[focusIdx];
    if (!sel) { frame.style.display = 'none'; return; }
    frame.style.display = '';
    /* layout values (transform-free) x 1.05: immune to the scale transition */
    var w = Math.round(sel.offsetWidth * 1.05) + 8;
    var h = Math.round(sel.offsetHeight * 1.05) + 8;
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    frame.style.left = ((viewEl.clientWidth - sel.offsetWidth) / 2 - (w - sel.offsetWidth) / 2) + 'px';
    /* cards align flex-end: strip bottom = padding-top + tallest card.
       Frame center = focus card center computed from that fixed baseline. */
    var maxH = 0;
    for (var i = 0; i < strip.children.length; i++) {
      maxH = Math.max(maxH, strip.children[i].offsetHeight);
    }
    var bottom = 14 + maxH;
    frame.style.top = (bottom - sel.offsetHeight / 2 - h / 2) + 'px';
  }

  function rebuildDeck() {
    var list = pool();
    if (list.length < 5) {
      viewEl.innerHTML = '<p class="wheel-note">Not enough Pokémon match these filters — loosen them up!</p>';
      strip = null;
      deck = [];
      return;
    }
    deck = shuffle(list.slice()).slice(0, 12);
    focusIdx = 2;
    renderStrip();
    layoutStrip(false);
  }

  /* ---------------- spin (smooth rAF cascade: fast, decays, random stop) ----------- */
  function spin() {
    if (spinning || deck.length < 5) return;
    spinning = true;
    spinBtn.disabled = true;

    var list = pool();
    var N = 15 + Math.floor(secureRandom() * 16);   /* 15-30 cards roll by */
    while (deck.length < focusIdx + N + 10) {
      deck.push(list[Math.floor(secureRandom() * list.length)]);
    }
    focusIdx = 2;
    renderStrip();
    layoutStrip(false);
    var targetP = deck[focusIdx + N];               /* card the window stops on */
    var step = cardStep();
    var cardW = strip.children[0].offsetWidth;
    var x0 = (viewEl.clientWidth - cardW) / 2 - focusIdx * step;

    /* preheat artwork so the cascade never shows blank cards */
    deck.forEach(function (p) { var im = new Image(); im.src = p.sp; });

    var Nsteps = N * step;
    var duration = N * 150;                         /* 2.25-4.5s */
    var startT = null;
    var x = x0;
    var recycled = 0;
    var raf = 0;

    function frame(now) {
      if (startT === null) startT = now;
      var t = Math.min(1, (now - startT) / duration);
      var e = 1 - Math.pow(1 - t, 3);               /* ease-out: fast, then slow */
      var raw = x0 - Nsteps * e;                    /* ideal scroll position */
      /* recycle one node per card-width scrolled (monotonic) */
      var target = Math.floor((x0 - raw) / step);
      while (recycled < target) {
        strip.appendChild(strip.children[0]);
        recycled++;
      }
      var x = raw + recycled * step;                /* compensated position */
      strip.style.transition = 'none';
      strip.style.transform = 'translateX(' + x + 'px)';
      if (t < 1) raf = requestAnimationFrame(frame);
      else finish();
    }
    raf = requestAnimationFrame(frame);

    function finish() {
      cancelAnimationFrame(raf);
      /* exact grid alignment (no visual jump) + winner */
      layoutStrip(false);
      highlightFocus();
      var p = targetP;
      lastResult = p;
      showResult(p);
      spinning = false;
      spinBtn.disabled = false;
    }
  }

  /* ---------------- result ---------------- */
  function persist() {
    try {
      localStorage.setItem(LS_RESULTS, JSON.stringify(results));
      localStorage.setItem(LS_DRAWS, JSON.stringify(draws));
    } catch (e) { /* private mode — ignore */ }
  }

  function appendResultCard(p, isNew) {
    var card = $('result-card');
    card.hidden = false;
    $('result-bar').hidden = false;
    $('result-tip').hidden = false;
    var el = cardEl(p);
    el.classList.add('result-big');
    /* click a result card -> full dex details (home-style modal) */
    el.addEventListener('click', function () { openModal(p); });
    el.style.cursor = 'pointer';
    /* the newest draw is highlighted with the gold ring */
    for (var i = 0; i < card.children.length; i++) {
      card.children[i].classList.remove('selected');
    }
    /* only keep the latest draw on screen — clear previous card(s) first */
    while (card.children.length > 0) card.removeChild(card.children[0]);
    el.classList.add('selected');
    card.appendChild(el);
    if (isNew) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showResult(p) {
    results.push(p.i);
    draws = [p.i];           /* keep only the latest draw (no accumulation) */
    persist();
    appendResultCard(p, true);
    renderHistory();
    updateAnalysis();
    $('result-tip').hidden = false;
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

  /* ---------------- draw tactical analysis (home-style) ---------------- */
  var TYPES_LIST = Object.keys(TYPES).map(function (k) {
    return { slug: k, label: TYPES[k].label, color: TYPES[k].color, light: TYPES[k].light };
  });

  /* Attacking type -> defending type multiplier (only non-1 entries) */
  var TYPE_CHART = {
    normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
    fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
    dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
  };

  function effectiveness(atkType, defTypes) {
    var mult = 1;
    var row = TYPE_CHART[atkType] || {};
    defTypes.forEach(function (d) {
      if (row[d] !== undefined) mult *= row[d];
    });
    return mult;
  }

  function roleOf(p) {
    var atk = p.st[1], def = p.st[2], spa = p.st[3], spd = p.st[4], spe = p.st[5];
    var physBulk = p.st[0] * 0.5 + def;
    var specBulk = p.st[0] * 0.5 + spd;
    if (atk >= 110 && spe >= 100 && atk >= spa) return 'Physical Sweeper';
    if (spa >= 110 && spe >= 100 && spa > atk) return 'Special Sweeper';
    if (physBulk >= 130 && physBulk >= specBulk + 15) return 'Physical Wall';
    if (specBulk >= 130 && specBulk > physBulk + 15) return 'Special Wall';
    if (spe >= 110) return 'Speedster';
    if (atk >= spa && atk >= 90) return 'Physical Attacker';
    if (spa > atk && spa >= 90) return 'Special Attacker';
    if (physBulk >= 110 || specBulk >= 110) return 'Tank';
    return 'Balanced';
  }

  var GRADES = [
    { min: 85, g: 'S', color: '#FFCB05', light: false },
    { min: 70, g: 'A', color: '#78C850', light: false },
    { min: 55, g: 'B', color: '#6890F0', light: true },
    { min: 40, g: 'C', color: '#FF9D55', light: false },
    { min: 0,  g: 'D', color: '#C03028', light: true }
  ];

  function analyzeTeam(rolls) {
    var members = rolls.map(function (r) { return r.p; });
    var n = members.length;

    var defense = TYPES_LIST.map(function (t) {
      var weak = 0, resist = 0, immune = 0;
      members.forEach(function (p) {
        var m = effectiveness(t.slug, p.t);
        if (m === 0) immune++;
        else if (m > 1) weak++;
        else if (m < 1) resist++;
      });
      return { type: t, weak: weak, resist: resist, immune: immune };
    });

    var stab = {};
    members.forEach(function (p) { p.t.forEach(function (t) { stab[t] = true; }); });
    var stabKeys = Object.keys(stab);
    var offense = TYPES_LIST.map(function (t) {
      var covered = stabKeys.some(function (s) {
        var row = TYPE_CHART[s];
        return row && row[t.slug] >= 2;
      });
      return { type: t, covered: covered };
    });
    var coveredCount = offense.filter(function (o) { return o.covered; }).length;

    var avg = [0, 0, 0, 0, 0, 0], avgBst = 0;
    members.forEach(function (p) {
      p.st.forEach(function (v, i) { avg[i] += v; });
      avgBst += p.tt;
    });
    avg = avg.map(function (v) { return Math.round(v / n); });
    avgBst = Math.round(avgBst / n);

    var offFrac = coveredCount / 18;
    var defFrac = defense.filter(function (d) { return d.weak < 2; }).length / 18;
    var bstFrac = Math.max(0, Math.min(1, (avgBst - 200) / 480));
    var score = Math.round(offFrac * 35 + defFrac * 35 + bstFrac * 30);
    var grade = GRADES.filter(function (g) { return score >= g.min; })[0];

    var warnings = [];
    defense.slice().sort(function (a, b) { return b.weak - a.weak; }).forEach(function (d) {
      if (d.weak >= 2) {
        warnings.push({
          level: 'danger',
          text: d.weak + ' of ' + n + ' members are weak to ' + d.type.label + ' — one strong ' + d.type.label + ' attacker could punch through the squad.',
          tip: d.immune > 0 ? 'You do have ' + d.immune + ' immunity — switch into it on ' + d.type.label + ' moves.' : 'Consider re-rolling a member that resists or is immune to ' + d.type.label + '.'
        });
      }
    });
    var typeCount = {};
    members.forEach(function (p) { p.t.forEach(function (t) { typeCount[t] = (typeCount[t] || 0) + 1; }); });
    Object.keys(typeCount).forEach(function (t) {
      if (typeCount[t] >= 3) {
        warnings.push({
          level: 'warn',
          text: typeCount[t] + ' members share the ' + (TYPE_MAP[t] ? TYPE_MAP[t].label : t) + ' type — offensive coverage overlaps heavily.',
          tip: 'Diversify types to widen your STAB coverage.'
        });
      }
    });
    members.forEach(function (p) {
      if (p.ev !== 'final' && p.nxt.length) {
        warnings.push({
          level: 'info',
          text: displayName(p.n) + ' is ' + (p.ev === 'initial' ? 'an unevolved' : 'a mid-stage') + ' Pokémon — it drags the team BST down.',
          tip: 'Set the Evolution Stage filter to Final and re-roll for a stronger pick.'
        });
      }
    });
    var rareCount = rolls.filter(function (r) { return r.p.lg || r.p.my; }).length;
    if (rareCount >= 2) {
      warnings.push({
        level: 'info',
        text: rareCount + ' Legendary/Mythical members — banned under many Nuzlocke and draft rulesets.',
        tip: 'Use the Rarity filters to exclude them if your rules require it.'
      });
    }
    if (avg[5] < 60) {
      warnings.push({
        level: 'warn',
        text: 'Average Speed is only ' + avg[5] + ' — this squad is slow and will often move second.',
        tip: 'Raise the BST minimum or re-roll for faster picks.'
      });
    }

    var worst = defense.filter(function (d) { return d.weak >= 2; })
      .sort(function (a, b) { return b.weak - a.weak; })[0];
    var summary = 'Grade ' + grade.g + ' (' + score + '/100) — STAB coverage hits ' + coveredCount +
      '/18 types super-effectively' +
      (worst ? '; biggest hole: ' + worst.weak + ' members weak to ' + worst.type.label + '.' : '; no shared weaknesses detected.');

    return {
      defense: defense, offense: offense, coveredCount: coveredCount,
      avg: avg, avgBst: avgBst, score: score, grade: grade,
      warnings: warnings, summary: summary
    };
  }

  function typeChipEl(t) {
    var chip = document.createElement('span');
    chip.className = 'type-tag';
    chip.style.setProperty('--tag', t.color);
    chip.style.setProperty('--tag-text', t.light ? '#fff' : '#121212');
    chip.textContent = t.label;
    return chip;
  }

  function analysisSection(title) {
    var sec = document.createElement('section');
    sec.className = 'analysis-sec';
    var h = document.createElement('h3');
    h.className = 'analysis-sec-title';
    h.textContent = title;
    sec.appendChild(h);
    return sec;
  }

  function renderAnalysis(rolls) {
    var panel = $('analysis-panel');
    if (!rolls || !rolls.length) { panel.hidden = true; return; }
    panel.hidden = false;
    var a = analyzeTeam(rolls);

    var badge = $('analysis-grade');
    badge.textContent = a.grade.g + ' · ' + a.score + '/100';
    badge.style.background = a.grade.color;
    badge.style.color = a.grade.light ? '#fff' : '#121212';
    $('analysis-summary').textContent = a.summary;

    var body = $('analysis-body');
    body.innerHTML = '';

    /* 1 — defensive matrix */
    var defSec = analysisSection('🛡 Defensive Coverage');
    var table = document.createElement('table');
    table.className = 'def-matrix';
    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    ['Attacking type', 'Weak', 'Resist', 'Immune'].forEach(function (h) {
      var th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    var tbody = document.createElement('tbody');
    a.defense.forEach(function (d) {
      var tr = document.createElement('tr');
      if (d.weak >= 2) tr.className = 'def-danger';
      else if (d.weak === 0 && d.immune > 0) tr.className = 'def-safe';
      var tdT = document.createElement('td');
      tdT.appendChild(typeChipEl(d.type));
      tr.appendChild(tdT);
      [d.weak, d.resist, d.immune].forEach(function (v, i) {
        var td = document.createElement('td');
        td.textContent = v;
        if (i === 0 && v >= 2) td.className = 'num-danger';
        if (i === 2 && v > 0) td.className = 'num-safe';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    defSec.appendChild(table);
    body.appendChild(defSec);

    /* 2 — STAB offensive coverage */
    var offSec = analysisSection('⚔ STAB Offensive Coverage · ' + a.coveredCount + '/18');
    var offGrid = document.createElement('div');
    offGrid.className = 'off-grid';
    a.offense.forEach(function (o) {
      var chip = typeChipEl(o.type);
      if (!o.covered) chip.classList.add('off-miss');
      chip.title = o.covered ? 'Covered by your STAB types' : 'Blind spot — no STAB hits this super-effectively';
      offGrid.appendChild(chip);
    });
    offSec.appendChild(offGrid);
    var offNote = document.createElement('p');
    offNote.className = 'analysis-note';
    offNote.textContent = 'Defending types your squad hits super-effectively with same-type (STAB) moves. Grayed chips are blind spots.';
    offSec.appendChild(offNote);
    body.appendChild(offSec);

    /* 3 — stats & roles */
    var statSec = analysisSection('📈 Stats & Roles · avg BST ' + a.avgBst);
    var dl = document.createElement('dl');
    dl.className = 'stats analysis-stats';
    a.avg.forEach(function (v, i) {
      var row = document.createElement('div');
      row.className = 'stat-row';
      var dt = document.createElement('dt');
      dt.textContent = STAT_LABELS[i];
      var dd = document.createElement('dd');
      dd.textContent = v;
      var track = document.createElement('div');
      track.className = 'stat-track';
      var fill = document.createElement('div');
      fill.className = 'stat-fill';
      fill.style.width = Math.min(100, (v / 255) * 100) + '%';
      track.appendChild(fill);
      row.appendChild(dt); row.appendChild(dd); row.appendChild(track);
      dl.appendChild(row);
    });
    statSec.appendChild(dl);

    var roleList = document.createElement('ul');
    roleList.className = 'role-list';
    rolls.forEach(function (r) {
      var p = r.p;
      var li = document.createElement('li');
      li.className = 'role-item';

      var img = document.createElement('img');
      img.src = p.sp;
      img.alt = displayName(p.n);
      img.width = 44; img.height = 44;
      img.loading = 'lazy';
      var siUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + p.si + '.png';
      img.onerror = function () {
        if (img.src !== siUrl) img.src = siUrl;
        else img.onerror = null;
      };
      li.appendChild(img);

      var nm = document.createElement('span');
      nm.className = 'role-name';
      nm.textContent = displayName(p.n);
      li.appendChild(nm);

      var role = document.createElement('span');
      role.className = 'role-tag';
      role.textContent = roleOf(p);
      li.appendChild(role);

      var bst = document.createElement('span');
      bst.className = 'role-bst';
      bst.textContent = 'BST ' + p.tt;
      li.appendChild(bst);

      var weakWrap = document.createElement('span');
      weakWrap.className = 'role-weak';
      TYPES_LIST.map(function (t) { return { t: t, m: effectiveness(t.slug, p.t) }; })
        .filter(function (x) { return x.m >= 2; })
        .sort(function (x, y) { return y.m - x.m; })
        .slice(0, 3)
        .forEach(function (x) {
          var wc = document.createElement('span');
          wc.className = 'weak-chip';
          wc.textContent = x.t.label + ' ×' + x.m;
          weakWrap.appendChild(wc);
        });
      li.appendChild(weakWrap);
      roleList.appendChild(li);
    });
    statSec.appendChild(roleList);
    body.appendChild(statSec);

    /* 4 — warnings & tips */
    var warnSec = analysisSection('⚠ Warnings & Tips');
    var warnList = document.createElement('ul');
    warnList.className = 'warn-list';
    if (!a.warnings.length) {
      var ok = document.createElement('li');
      ok.className = 'warn-item warn-ok';
      ok.textContent = '✅ No major weaknesses detected — solid, well-balanced squad!';
      warnList.appendChild(ok);
    }
    a.warnings.forEach(function (w) {
      var li = document.createElement('li');
      li.className = 'warn-item warn-' + w.level;
      var txt = document.createElement('span');
      txt.textContent = w.text;
      li.appendChild(txt);
      if (w.tip) {
        var tip = document.createElement('em');
        tip.textContent = 'Tip: ' + w.tip;
        li.appendChild(tip);
      }
      warnList.appendChild(li);
    });
    warnSec.appendChild(warnList);
    body.appendChild(warnSec);
  }

  /* (re)generate the report from persisted draws */
  function updateAnalysis() {
    var rolls = [];
    draws.forEach(function (id) {
      var p = null;
      for (var i = 0; i < POKEMON.length; i++) { if (POKEMON[i].i === id) { p = POKEMON[i]; break; } }
      if (p) rolls.push({ p: p });
    });
    renderAnalysis(rolls);
  }

  /* ---------------- history ---------------- */
  function renderHistory() {
    historyList.innerHTML = '';
    historyPanel.hidden = results.length === 0;
    results.slice().reverse().slice(0, 30).forEach(function (id) {
      var p = POKEMON.filter(function (x) { return x.i === id; })[0];
      if (!p) return;
      var li = document.createElement('li');
      li.className = 'history-row';
      var btn = document.createElement('div');
      btn.className = 'history-item';
      btn.style.cursor = 'default';
      var label = document.createElement('span');
      label.className = 'history-label';
      label.textContent = '🎡 ' + displayName(p.n);
      btn.appendChild(label);
      var thumbs = document.createElement('span');
      thumbs.className = 'history-thumbs';
      var img = document.createElement('img');
      img.src = p.sp;
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

  /* ---------------- share ---------------- */
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
      var m = $('share-modal');
      $('share-modal-text').value = text;
      m.hidden = false;
      document.body.style.overflow = 'hidden';
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

  $('sm-close').addEventListener('click', function () {
    $('share-modal').hidden = true;
    document.body.style.overflow = '';
  });
  $('share-modal').addEventListener('click', function (e) {
    if (e.target === $('share-modal')) {
      $('share-modal').hidden = true;
      document.body.style.overflow = '';
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('share-modal').hidden) {
      $('share-modal').hidden = true;
      document.body.style.overflow = '';
    }
  });

  function shareResult() {
    var label = $('wheel-share-label');
    if (!lastResult) {
      label.textContent = '🎡 Spin first!';
      setTimeout(function () { label.textContent = '📣 Share Result'; }, 1800);
      return;
    }
    var text = 'The Pokémon wheel decided: ' + displayName(lastResult.n) + '! Spin yours: ' + location.origin + location.pathname;
    copyToClipboard(text, function (ok) {
      label.textContent = ok ? '✅ Copied!' : '🔗 Link ready';
      setTimeout(function () { label.textContent = '📣 Share Result'; }, 1800);
    });
  }

  /* ---------------- events ---------------- */
  function clearAll() {
    results = [];
    draws = [];
    persist();
    $('result-card').innerHTML = '';
    $('result-card').hidden = true;
    $('result-bar').hidden = true;
    $('result-tip').hidden = true;
    $('analysis-panel').hidden = true;
    renderHistory();
  }

  spinBtn.addEventListener('click', spin);
  $('wheel-share-btn').addEventListener('click', shareResult);
  $('history-clear').addEventListener('click', clearAll);
  $('result-clear').addEventListener('click', clearAll);
  window.addEventListener('resize', function () { layoutStrip(false); });

  /* ---------------- init ---------------- */
  renderFilterRow('gen-buttons', GENERATIONS, gens, function (g) { return 'Gen ' + g; });
  renderFilterRow('type-buttons', Object.keys(TYPES), types, function (t) { return TYPE_MAP[t].label; });
  rebuildDeck();
  /* restore persisted draws & history (survive refresh) — show only the latest draw */
  try {
    results = JSON.parse(localStorage.getItem(LS_RESULTS) || '[]');
    draws = JSON.parse(localStorage.getItem(LS_DRAWS) || '[]');
    draws = draws.slice(-1);   /* legacy data may hold many; keep the newest only */
  } catch (e) { results = []; draws = []; }
  renderHistory();
  draws.forEach(function (id) {
    var p = null;
    for (var i = 0; i < POKEMON.length; i++) { if (POKEMON[i].i === id) { p = POKEMON[i]; break; } }
    if (p) appendResultCard(p, false);
  });
  updateAnalysis();
})();
