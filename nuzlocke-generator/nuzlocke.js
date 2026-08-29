/* ============================================================
   Nuzlocke Generator — vanilla JS engine (subpage)
   Data: window.POKEMON_DATA (data.js, 1351 entries)
   Entry: {i,si,n,t,g,st,tt,c,lg,my,ev,sp,sps,ab,pre,nxt}
   ============================================================ */
(function () {
  'use strict';

  var POKEMON = window.POKEMON_DATA || [];
  var BY_ID = {};
  POKEMON.forEach(function (p) { BY_ID[p.i] = p; });

  var TYPES = [
    { slug: 'fire', label: 'Fire', color: '#FF9D55', light: false },
    { slug: 'water', label: 'Water', color: '#6890F0', light: true },
    { slug: 'grass', label: 'Grass', color: '#78C850', light: false },
    { slug: 'electric', label: 'Electric', color: '#F8D030', light: false },
    { slug: 'ice', label: 'Ice', color: '#98D8D8', light: false },
    { slug: 'fighting', label: 'Fighting', color: '#C03028', light: true },
    { slug: 'poison', label: 'Poison', color: '#A040A0', light: true },
    { slug: 'ground', label: 'Ground', color: '#E0C068', light: false },
    { slug: 'flying', label: 'Flying', color: '#A890F0', light: true },
    { slug: 'psychic', label: 'Psychic', color: '#F85888', light: true },
    { slug: 'bug', label: 'Bug', color: '#A8B820', light: false },
    { slug: 'rock', label: 'Rock', color: '#B8A038', light: true },
    { slug: 'ghost', label: 'Ghost', color: '#705898', light: true },
    { slug: 'dark', label: 'Dark', color: '#705848', light: true },
    { slug: 'dragon', label: 'Dragon', color: '#7038F8', light: true },
    { slug: 'steel', label: 'Steel', color: '#B8B8D0', light: false },
    { slug: 'fairy', label: 'Fairy', color: '#EE99AC', light: false },
    { slug: 'normal', label: 'Normal', color: '#A8A878', light: false }
  ];
  var TYPE_MAP = {};
  TYPES.forEach(function (t) { TYPE_MAP[t.slug] = t; });

  var GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var REGIONS = { 1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unova', 6: 'Kalos', 7: 'Alola', 8: 'Galar', 9: 'Paldea' };
  var STAT_LABELS = ['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE'];

  var MODES = {
    team:      { label: 'Starter Team (6)',      rollLabel: '🎲 Roll Starter Team',      count: 6 },
    encounter: { label: 'First Encounter (1)',   rollLabel: '🎲 Roll First Encounter',   count: 1 },
    death:     { label: 'Death Replacement (1)', rollLabel: '🎲 Roll Death Replacement', count: 1 }
  };

  var DEFAULTS = { mode: 'team', gens: [], noLeg: true, noMyth: true, initialOnly: false };
  var LS_HISTORY = 'rpg:nuz-history';
  var LS_GRAVE = 'rpg:nuz-graveyard';
  var HISTORY_MAX = 20;
  var TEAM_MAX = 12;

  /* ---------------- helpers ---------------- */
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

  function parseList(v) {
    if (!v) return [];
    return v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function stateFromParams(params) {
    var f = Object.assign({}, DEFAULTS);
    var mode = params.get('mode');
    if (MODES[mode]) f.mode = mode;
    f.gens = parseList(params.get('gens')).map(Number).filter(function (g) { return GENERATIONS.indexOf(g) >= 0; });
    var rules = params.get('rules');
    if (rules !== null) {
      var rl = parseList(rules);
      f.noLeg = rl.indexOf('noLeg') >= 0;
      f.noMyth = rl.indexOf('noMyth') >= 0;
      f.initialOnly = rl.indexOf('initialOnly') >= 0;
    }
    return f;
  }

  function applyFilters(f) {
    return POKEMON.filter(function (p) {
      if (f.gens.length && f.gens.indexOf(p.g) < 0) return false;
      if (f.noLeg && p.lg) return false;
      if (f.noMyth && p.my) return false;
      if (f.initialOnly && p.ev !== 'initial') return false;
      return true;
    });
  }

  function rollFrom(pool, count) {
    var arr = pool.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(secureRandom() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr.slice(0, Math.min(count, arr.length));
  }

  /* ---------------- state ---------------- */
  var params = new URLSearchParams(location.search);
  var state = stateFromParams(params);
  var currentRoll = [];

  /* ---------------- DOM refs ---------------- */
  function $(id) { return document.getElementById(id); }
  var grid = $('results-grid'), emptyEl = $('results-empty'), metaEl = $('results-meta');
  var poolEl = $('pool-count'), rollLabel = $('roll-label');

  /* ---------------- render controls ---------------- */
  function syncRange() {
    [].forEach.call(document.querySelectorAll('#mode-buttons .chip-btn'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-mode') === state.mode ? 'true' : 'false');
    });
    [].forEach.call(document.querySelectorAll('#rule-buttons .chip-btn'), function (b) {
      var r = b.getAttribute('data-rule');
      var on = r === 'noLeg' ? state.noLeg : r === 'noMyth' ? state.noMyth : state.initialOnly;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    rollLabel.textContent = MODES[state.mode].rollLabel;
  }

  function renderGenButtons() {
    var wrap = $('gen-buttons');
    wrap.innerHTML = '';
    GENERATIONS.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn';
      b.textContent = 'Gen ' + g + ' · ' + REGIONS[g];
      b.setAttribute('aria-pressed', state.gens.indexOf(g) >= 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        var i = state.gens.indexOf(g);
        if (i >= 0) state.gens.splice(i, 1); else state.gens.push(g);
        b.setAttribute('aria-pressed', state.gens.indexOf(g) >= 0 ? 'true' : 'false');
        updatePool();
      });
      wrap.appendChild(b);
    });
  }

  function updatePool() {
    var pool = applyFilters(state);
    poolEl.textContent = pool.length.toLocaleString() + ' in pool';
    return pool;
  }

  /* ---------------- results ---------------- */
  function buildCard(p) {
    var aura = TYPES.some(function (t) { return t.slug === p.t[0]; }) ? TYPE_MAP[p.t[0]].color : '#A8A878';
    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dex-card cornered';
    btn.style.setProperty('--aura', aura);
    btn.setAttribute('aria-label', displayName(p.n));

    var top = document.createElement('span');
    top.className = 'dex-top';
    var num = document.createElement('span');
    num.className = 'dex-num';
    num.textContent = '#' + pad4(p.si);
    top.appendChild(num);
    btn.appendChild(top);

    var art = document.createElement('span');
    art.className = 'dex-art';
    var auraEl = document.createElement('span');
    auraEl.className = 'dex-aura';
    auraEl.setAttribute('aria-hidden', 'true');
    art.appendChild(auraEl);
    var img = document.createElement('img');
    img.src = p.sp;
    img.alt = displayName(p.n) + ' artwork';
    img.width = 475; img.height = 475;
    img.loading = 'lazy';
    img.onerror = function () {
      var fb = img.src.replace('/other/official-artwork', '');
      if (fb !== img.src) img.src = fb; else img.onerror = null;
    };
    art.appendChild(img);
    btn.appendChild(art);

    var name = document.createElement('span');
    name.className = 'dex-name';
    name.textContent = displayName(p.n);
    btn.appendChild(name);

    var sub = document.createElement('span');
    sub.className = 'dex-sub';
    sub.textContent = 'Gen ' + p.g + ' · ' + (REGIONS[p.g] || '');
    btn.appendChild(sub);

    var chips = document.createElement('span');
    chips.className = 'chip-row';
    p.t.forEach(function (t) {
      var m = TYPE_MAP[t];
      var chip = document.createElement('span');
      chip.className = 'type-tag';
      chip.style.setProperty('--tag', m ? m.color : '#A8A878');
      chip.style.setProperty('--tag-text', m && m.light ? '#fff' : '#121212');
      chip.textContent = m ? m.label : t;
      chips.appendChild(chip);
    });
    btn.appendChild(chips);

    var bst = document.createElement('span');
    bst.className = 'bst-line';
    bst.innerHTML = 'BST <strong>' + p.tt + '</strong>';
    btn.appendChild(bst);

    /* remove / mark-as-fallen button (sibling of the card, not nested) */
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'card-x-btn';
    x.textContent = '✕';
    x.title = 'Remove from team — OK marks it as fallen';
    x.setAttribute('aria-label', 'Remove ' + displayName(p.n) + ' from team');
    x.addEventListener('click', function (e) {
      e.stopPropagation();
      showRemoveModal(p);
    });
    li.appendChild(x);

    li.appendChild(btn);
    return li;
  }

  function renderRoll(pool) {
    grid.innerHTML = '';
    emptyEl.hidden = currentRoll.length > 0;
    if (currentRoll.length === 0) {
      emptyEl.textContent = 'No Pokémon match these rules — loosen a toggle or pick a different generation!';
      metaEl.textContent = '';
      return;
    }
    currentRoll.forEach(function (p) { grid.appendChild(buildCard(p)); });
    metaEl.textContent = 'Showing ' + currentRoll.length + ' of ' + pool.length.toLocaleString() + ' matching Pokémon';
  }

  /* ---------------- tactical analysis (ported from home engine) ---------------- */
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
    var members = rolls;
    var n = members.length;

    var defense = TYPES.map(function (t) {
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
    var offense = TYPES.map(function (t) {
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
          tip: 'Use the Unevolved Only toggle intentionally, or re-roll for fully evolved picks.'
        });
      }
    });
    if (avg[5] < 60) {
      warnings.push({
        level: 'warn',
        text: 'Average Speed is only ' + avg[5] + ' — this squad is slow and will often move second.',
        tip: 'Re-roll for faster picks or pick a different generation.'
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
    rolls.forEach(function (p) {
      var li = document.createElement('li');
      li.className = 'role-item';
      var img = document.createElement('img');
      img.src = p.sp;
      img.alt = displayName(p.n) + ' artwork';
      img.width = 44; img.height = 44;
      img.loading = 'lazy';
      img.onerror = function () {
        var fb = img.src.replace('/other/official-artwork', '');
        if (fb !== img.src) img.src = fb; else img.onerror = null;
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
      TYPES.map(function (t) { return { t: t, m: effectiveness(t.slug, p.t) }; })
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

  /* ---------------- roll history ---------------- */
  var rollHistory = loadHistory();

  function loadHistory() {
    try {
      var h = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
      if (!Array.isArray(h)) return [];
      return h.filter(function (e) {
        return e && Array.isArray(e.team) && e.team.length > 0 &&
          e.team.every(function (id) { return BY_ID[id]; });
      });
    } catch (e) { return []; }
  }

  function saveHistory() {
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(rollHistory)); } catch (e) { /* ignore */ }
  }

  function pushHistory(rolls) {
    rollHistory.unshift({
      ts: Date.now(),
      mode: state.mode,
      f: { gens: state.gens.slice(), noLeg: state.noLeg, noMyth: state.noMyth, initialOnly: state.initialOnly },
      team: rolls.map(function (p) { return p.i; })
    });
    if (rollHistory.length > HISTORY_MAX) rollHistory.length = HISTORY_MAX;
    saveHistory();
    renderHistory();
  }

  function formatTime(ts) {
    var d = new Date(ts);
    var p2 = function (n) { return String(n).padStart(2, '0'); };
    return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
  }

  function entryPokemon(entry) {
    return entry.team.map(function (id) { return BY_ID[id]; }).filter(Boolean);
  }

  function renderHistory() {
    var panel = $('history-panel'), list = $('history-list');
    list.innerHTML = '';
    panel.hidden = rollHistory.length === 0;
    rollHistory.forEach(function (entry, idx) {
      var num = rollHistory.length - idx;
      var li = document.createElement('li');
      li.className = 'history-row';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item';
      btn.setAttribute('aria-label', 'Load roll ' + num + ' at ' + formatTime(entry.ts));

      var label = document.createElement('span');
      label.className = 'history-label';
      label.textContent = '#' + num + ' · ' + formatTime(entry.ts) + ' · ' + mono(entry.mode);
      btn.appendChild(label);

      var thumbs = document.createElement('span');
      thumbs.className = 'history-thumbs';
      entryPokemon(entry).forEach(function (p) {
        var img = document.createElement('img');
        img.src = p.sp;
        img.alt = displayName(p.n);
        img.width = 40; img.height = 40;
        img.loading = 'lazy';
        img.onerror = function () {
          var fb = img.src.replace('/other/official-artwork', '');
          if (fb !== img.src) img.src = fb; else img.onerror = null;
        };
        thumbs.appendChild(img);
      });
      btn.appendChild(thumbs);

      btn.addEventListener('click', function () { loadFromHistory(entry); });

      var share = document.createElement('button');
      share.type = 'button';
      share.className = 'history-share';
      share.textContent = '🔗 Share';
      share.setAttribute('aria-label', 'Copy share link for roll ' + num);
      share.addEventListener('click', function () {
        var url = entryShareUrl(entry);
        copyToClipboard(url, function (ok) {
          share.textContent = ok ? '✅ Copied' : '🔗 Link ready';
          setTimeout(function () { share.textContent = '🔗 Share'; }, 1800);
        });
      });

      li.appendChild(btn);
      li.appendChild(share);
      list.appendChild(li);
    });
  }

  function mono(mode) {
    return { team: 'Starter', encounter: 'Encounter', death: 'Death' }[mode] || 'Starter';
  }

  function loadFromHistory(entry) {
    state.mode = entry.mode || 'team';
    state.gens = (entry.f && entry.f.gens) ? entry.f.gens.slice() : [];
    state.noLeg = entry.f ? entry.f.noLeg : true;
    state.noMyth = entry.f ? entry.f.noMyth : true;
    state.initialOnly = entry.f ? entry.f.initialOnly : false;
    currentRoll = entryPokemon(entry);
    syncRange();
    renderGenButtons();
    var pool = updatePool();
    renderRoll(pool);
    renderAnalysis(currentRoll);
    syncStateToUrl();
    grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function entryShareUrl(entry) {
    var f = { mode: entry.mode, gens: entry.f ? entry.f.gens : [], noLeg: entry.f ? entry.f.noLeg : true, noMyth: entry.f ? entry.f.noMyth : true, initialOnly: entry.f ? entry.f.initialOnly : false };
    var q = new URLSearchParams();
    q.set('mode', f.mode);
    if (f.gens.length) q.set('gens', f.gens.slice().sort(function (a, b) { return a - b; }).join(','));
    q.set('team', entry.team.join(','));
    var rl = [];
    if (f.noLeg) rl.push('noLeg');
    if (f.noMyth) rl.push('noMyth');
    if (f.initialOnly) rl.push('initialOnly');
    if (rl.length) q.set('rules', rl.join(','));
    return location.origin + location.pathname + '?' + q.toString();
  }

  /* ---------------- share links ---------------- */
  function rulesToParam() {
    var r = [];
    if (state.noLeg) r.push('noLeg');
    if (state.noMyth) r.push('noMyth');
    if (state.initialOnly) r.push('initialOnly');
    return r.join(',');
  }

  function buildShareUrl() {
    var q = new URLSearchParams();
    q.set('mode', state.mode);
    if (state.gens.length) q.set('gens', state.gens.slice().sort(function (a, b) { return a - b; }).join(','));
    if (currentRoll.length) q.set('team', currentRoll.map(function (p) { return p.i; }).join(','));
    var rules = rulesToParam();
    if (rules) q.set('rules', rules);
    return location.origin + location.pathname + '?' + q.toString();
  }

  function syncStateToUrl() {
    var q = buildShareUrl();
    history.replaceState(null, '', q.split('?')[1] ? location.pathname + '?' + q.split('?')[1] : location.pathname);
  }

  function copyToClipboard(url, done) {
    function legacyCopy() {
      var ta = document.createElement('textarea');
      ta.value = url;
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
    function fallbackPrompt() {
      try { window.prompt('Copy your share link:', url); }
      catch (e) { window.alert(url); }
      done(false);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done(true); })
        .catch(function () { if (!legacyCopy()) fallbackPrompt(); else done(true); });
    } else {
      if (!legacyCopy()) fallbackPrompt(); else done(true);
    }
  }

  /* ---------------- team editing (hand-roll + remove/fallen) ---------------- */
  function removeFromTeam(p, markDead) {
    var i = currentRoll.indexOf(p);
    if (i < 0) return;
    currentRoll.splice(i, 1);
    if (markDead) registerFallen(p);
    var pool = updatePool();
    renderRoll(pool);
    renderAnalysis(currentRoll);
    syncStateToUrl();
  }

  function addToTeam(p) {
    if (currentRoll.length >= TEAM_MAX) {
      showInfoModal('Team is full (' + TEAM_MAX + ' Pokémon max). Remove one first.');
      return;
    }
    if (currentRoll.indexOf(p) >= 0) {
      showInfoModal(displayName(p.n) + ' is already in your team.');
      return;
    }
    currentRoll.push(p);
    var pool = updatePool();
    renderRoll(pool);
    renderAnalysis(currentRoll);
    syncStateToUrl();
    grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------------- add-pokemon modal ---------------- */
  var addModal = $('add-modal'), addList = $('add-list'), addSearch = $('add-search');
  var addFilters = { gens: [], types: [] };
  var ADD_LIST_MAX = 150;

  function openAddModal() {
    addModal.hidden = false;
    document.body.style.overflow = 'hidden';
    addSearch.value = '';
    renderAddFilters();
    renderAddList();
    addSearch.focus();
  }

  function closeAddModal() {
    addModal.hidden = true;
    document.body.style.overflow = '';
  }

  function renderAddFilters() {
    var gw = $('add-gen-filters');
    gw.innerHTML = '';
    GENERATIONS.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn';
      b.textContent = 'Gen ' + g;
      b.setAttribute('aria-pressed', addFilters.gens.indexOf(g) >= 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        var i = addFilters.gens.indexOf(g);
        if (i >= 0) addFilters.gens.splice(i, 1); else addFilters.gens.push(g);
        b.setAttribute('aria-pressed', addFilters.gens.indexOf(g) >= 0 ? 'true' : 'false');
        renderAddList();
      });
      gw.appendChild(b);
    });

    var tw = $('add-type-filters');
    tw.innerHTML = '';
    TYPES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn type-chip';
      b.style.setProperty('--chip', t.color);
      b.style.setProperty('--chip-text', t.light ? '#fff' : '#121212');
      b.textContent = t.label;
      b.setAttribute('aria-pressed', addFilters.types.indexOf(t.slug) >= 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        var i = addFilters.types.indexOf(t.slug);
        if (i >= 0) addFilters.types.splice(i, 1); else addFilters.types.push(t.slug);
        b.setAttribute('aria-pressed', addFilters.types.indexOf(t.slug) >= 0 ? 'true' : 'false');
        renderAddList();
      });
      tw.appendChild(b);
    });
  }

  function addPool() {
    var q = addSearch.value.trim().toLowerCase();
    return POKEMON.filter(function (p) {
      if (addFilters.gens.length && addFilters.gens.indexOf(p.g) < 0) return false;
      if (addFilters.types.length && !p.t.some(function (t) { return addFilters.types.indexOf(t) >= 0; })) return false;
      if (q && p.n.indexOf(q) < 0 && displayName(p.n).toLowerCase().indexOf(q) < 0 &&
        String(p.si).indexOf(q) < 0) return false;
      return true;
    });
  }

  function renderAddList() {
    addList.innerHTML = '';
    var pool = addPool();
    var shown = pool.slice(0, ADD_LIST_MAX);
    if (pool.length > ADD_LIST_MAX) {
      var note = document.createElement('li');
      note.className = 'add-note';
      note.textContent = pool.length + ' match — showing first ' + ADD_LIST_MAX + ', refine filters to narrow down.';
      addList.appendChild(note);
    } else if (!pool.length) {
      var empty = document.createElement('li');
      empty.className = 'add-note';
      empty.textContent = 'No Pokémon match these filters.';
      addList.appendChild(empty);
    }
    shown.forEach(function (p) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      var inTeam = currentRoll.indexOf(p) >= 0;
      b.className = 'add-row' + (inTeam ? ' added' : '');
      b.disabled = inTeam;

      var img = document.createElement('img');
      img.src = p.sp;
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = function () {
        var fb = img.src.replace('/other/official-artwork', '');
        if (fb !== img.src) img.src = fb; else img.onerror = null;
      };

      var name = document.createElement('span');
      name.className = 'ar-name';
      name.textContent = displayName(p.n);

      var meta = document.createElement('span');
      meta.className = 'ar-meta';
      meta.textContent = '#' + pad4(p.si) + ' · ' + (REGIONS[p.g] || '') + ' · BST ' + p.tt;

      var chips = document.createElement('span');
      chips.className = 'chip-row';
      p.t.forEach(function (t) {
        var m = TYPE_MAP[t];
        var chip = document.createElement('span');
        chip.className = 'type-tag';
        chip.style.setProperty('--tag', m ? m.color : '#A8A878');
        chip.style.setProperty('--tag-text', m && m.light ? '#fff' : '#121212');
        chip.textContent = m ? m.label : t;
        chips.appendChild(chip);
      });

      b.appendChild(img);
      b.appendChild(name);
      b.appendChild(meta);
      b.appendChild(chips);
      b.addEventListener('click', function () {
        addToTeam(p);
        renderAddList();
      });
      li.appendChild(b);
      addList.appendChild(li);
    });
  }

  addSearch.addEventListener('input', renderAddList);
  $('manual-btn').addEventListener('click', openAddModal);
  $('add-modal-close').addEventListener('click', closeAddModal);
  addModal.addEventListener('click', function (e) { if (e.target === addModal) closeAddModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !addModal.hidden) closeAddModal();
  });

  /* ---------------- showdown export ---------------- */
  function displayAbility(slug) {
    return displayName(slug);
  }

  function buildShowdownText(rolls) {
    return rolls.map(function (p) {
      var ab = p.ab && p.ab.length ? displayAbility(p.ab[0]) : 'No Ability';
      return displayName(p.n) + '\nAbility: ' + ab + '\nLevel: 50\n\n';
    }).join('');
  }

  function exportToShowdown() {
    var label = $('export-label');
    if (!currentRoll.length) {
      label.textContent = '📤 Roll first!';
      setTimeout(function () { label.textContent = '📤 Export to Showdown'; }, 1800);
      return;
    }
    copyToClipboard(buildShowdownText(currentRoll), function (ok) {
      label.textContent = ok ? '✅ Exported!' : '📤 Copy failed';
      setTimeout(function () { label.textContent = '📤 Export to Showdown'; }, 1800);
    });
  }

  /* ---------------- info notice modal ---------------- */
  var infoModal = $('info-modal'), infoText = $('info-modal-text');

  function showInfoModal(msg) {
    infoText.textContent = msg;
    infoModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function hideInfoModal() {
    infoModal.hidden = true;
    document.body.style.overflow = '';
  }

  $('info-ok').addEventListener('click', hideInfoModal);
  $('info-modal-close').addEventListener('click', hideInfoModal);
  infoModal.addEventListener('click', function (e) { if (e.target === infoModal) hideInfoModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !infoModal.hidden) hideInfoModal();
  });

  /* ---------------- remove confirm modal ---------------- */
  var removeModal = $('remove-modal'), removeText = $('remove-modal-text');
  var pendingRemove = null;

  function showRemoveModal(p) {
    pendingRemove = p;
    removeText.textContent = displayName(p.n) + ' will leave the team. Mark it as fallen to keep a graveyard record, or just remove it.';
    removeModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function hideRemoveModal() {
    removeModal.hidden = true;
    document.body.style.overflow = '';
    pendingRemove = null;
  }

  $('rm-fallen').addEventListener('click', function () {
    if (pendingRemove) removeFromTeam(pendingRemove, true);
    hideRemoveModal();
  });
  $('rm-only').addEventListener('click', function () {
    if (pendingRemove) removeFromTeam(pendingRemove, false);
    hideRemoveModal();
  });
  $('rm-cancel').addEventListener('click', hideRemoveModal);
  $('remove-modal-close').addEventListener('click', hideRemoveModal);
  removeModal.addEventListener('click', function (e) { if (e.target === removeModal) hideRemoveModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !removeModal.hidden) hideRemoveModal();
  });

  /* ---------------- graveyard ---------------- */
  var graveyard = loadGraveyard();

  function loadGraveyard() {
    try {
      var g = JSON.parse(localStorage.getItem(LS_GRAVE) || '[]');
      if (!Array.isArray(g)) return [];
      return g.filter(function (e) { return e && BY_ID[e.i]; });
    } catch (e) { return []; }
  }

  function saveGraveyard() {
    try { localStorage.setItem(LS_GRAVE, JSON.stringify(graveyard)); } catch (e) { /* ignore */ }
  }

  function registerFallen(p) {
    graveyard.unshift({ i: p.i, ts: Date.now() });
    saveGraveyard();
    renderGraveyard();
  }

  function reviveFallen(idx) {
    graveyard.splice(idx, 1);
    saveGraveyard();
    renderGraveyard();
  }

  function renderGraveyard() {
    var panel = $('graveyard-panel'), list = $('graveyard-list');
    list.innerHTML = '';
    panel.hidden = graveyard.length === 0;
    graveyard.forEach(function (entry, idx) {
      var p = BY_ID[entry.i];
      var li = document.createElement('li');
      li.className = 'history-row';

      var item = document.createElement('div');
      item.className = 'history-item';
      item.style.cursor = 'default';

      var label = document.createElement('span');
      label.className = 'history-label';
      label.textContent = '💀 ' + displayName(p.n) + ' · ' + formatTime(entry.ts);
      item.appendChild(label);

      var thumbs = document.createElement('span');
      thumbs.className = 'history-thumbs';
      var img = document.createElement('img');
      img.src = p.sp;
      img.alt = displayName(p.n);
      img.width = 40; img.height = 40;
      img.loading = 'lazy';
      img.onerror = function () {
        var fb = img.src.replace('/other/official-artwork', '');
        if (fb !== img.src) img.src = fb; else img.onerror = null;
      };
      thumbs.appendChild(img);
      item.appendChild(thumbs);
      li.appendChild(item);

      var revive = document.createElement('button');
      revive.type = 'button';
      revive.className = 'history-share';
      revive.textContent = '↩ Revive';
      revive.setAttribute('aria-label', 'Revive ' + displayName(p.n));
      revive.addEventListener('click', function () { reviveFallen(idx); });
      li.appendChild(revive);

      list.appendChild(li);
    });
  }

  /* ---------------- control events ---------------- */
  function roll() {
    var pool = updatePool();
    currentRoll = rollFrom(pool, MODES[state.mode].count);
    renderRoll(pool);
    renderAnalysis(currentRoll);
    syncStateToUrl();
    if (currentRoll.length) pushHistory(currentRoll);
  }

  [].forEach.call(document.querySelectorAll('#mode-buttons .chip-btn'), function (b) {
    b.addEventListener('click', function () {
      state.mode = b.getAttribute('data-mode');
      syncRange();
      if (state.mode === 'encounter' || state.mode === 'death') {
        roll();
      }
    });
  });

  [].forEach.call(document.querySelectorAll('#rule-buttons .chip-btn'), function (b) {
    b.addEventListener('click', function () {
      var r = b.getAttribute('data-rule');
      if (r === 'noLeg') state.noLeg = !state.noLeg;
      else if (r === 'noMyth') state.noMyth = !state.noMyth;
      else state.initialOnly = !state.initialOnly;
      syncRange();
      updatePool();
      syncStateToUrl();
    });
  });

  $('roll-btn').addEventListener('click', roll);

  $('reset-btn').addEventListener('click', function () {
    state = Object.assign({}, DEFAULTS);
    currentRoll = [];
    syncRange();
    renderGenButtons();
    var pool = updatePool();
    renderRoll(pool);
    $('analysis-panel').hidden = true;
    history.replaceState(null, '', location.pathname);
  });

  $('copy-btn').addEventListener('click', function () {
    var label = $('copy-label');
    copyToClipboard(buildShareUrl(), function (ok) {
      label.textContent = ok ? '✅ Copied!' : '🔗 Link ready';
      setTimeout(function () { label.textContent = '🔗 Copy Share Link'; }, 1800);
    });
  });

  $('export-btn').addEventListener('click', exportToShowdown);

  $('graveyard-clear').addEventListener('click', function () {
    graveyard = [];
    saveGraveyard();
    renderGraveyard();
  });

  $('history-clear').addEventListener('click', function () {
    rollHistory = [];
    saveHistory();
    renderHistory();
  });

  $('nuz-form').addEventListener('submit', function (e) { e.preventDefault(); roll(); });

  /* ---------------- init ---------------- */
  var sharedIds = params.get('team');
  var sharedTeam = sharedIds ? parseList(sharedIds).map(function (id) { return BY_ID[Number(id)]; }).filter(Boolean).slice(0, 6) : [];
  renderGenButtons();
  syncRange();
  renderHistory();
  renderGraveyard();
  var pool = updatePool();
  if (sharedTeam.length) {
    currentRoll = sharedTeam;
    renderRoll(pool);
    renderAnalysis(currentRoll);
    metaEl.textContent = 'Shared Nuzlocke roll — these exact Pokémon came with this link. Press 🎲 Roll to roll your own!';
  } else {
    renderRoll(pool);
  }
})();
