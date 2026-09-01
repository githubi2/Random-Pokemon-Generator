/* ============================================================
   Random Pokemon Name Generator — vanilla JS engine
   Flow: filter the dex -> pick ONE Pokemon -> roll N nicknames
   inspired by that species' name, types, color, habitat,
   abilities, stats and evolution chain.
   Data: window.POKEMON_DATA (data.js)
   ============================================================ */
(function () {
  'use strict';

  var POKEMON = window.POKEMON_DATA || [];

  var TYPES = {
    fire: { label: 'Fire', color: '#FF9D55', light: false }, water: { label: 'Water', color: '#6890F0', light: true },
    grass: { label: 'Grass', color: '#78C850', light: false }, electric: { label: 'Electric', color: '#F8D030', light: false },
    ice: { label: 'Ice', color: '#98D8D8', light: false }, fighting: { label: 'Fighting', color: '#C03028', light: true },
    poison: { label: 'Poison', color: '#A040A0', light: true }, ground: { label: 'Ground', color: '#E0C068', light: false },
    flying: { label: 'Flying', color: '#A890F0', light: true }, psychic: { label: 'Psychic', color: '#F85888', light: true },
    bug: { label: 'Bug', color: '#A8B820', light: false }, rock: { label: 'Rock', color: '#B8A038', light: true },
    ghost: { label: 'Ghost', color: '#705898', light: true }, dark: { label: 'Dark', color: '#705848', light: true },
    dragon: { label: 'Dragon', color: '#7038F8', light: true }, steel: { label: 'Steel', color: '#B8B8D0', light: false },
    fairy: { label: 'Fairy', color: '#EE99AC', light: false }, normal: { label: 'Normal', color: '#A8A878', light: false }
  };

  var TYPE_WORDS = {
    fire: ['Ember', 'Blaze', 'Cinder', 'Pyre', 'Flare', 'Scorch'],
    water: ['Tide', 'Ripple', 'Brine', 'Mist', 'Surge', 'Splash'],
    grass: ['Thorn', 'Petal', 'Moss', 'Fern', 'Bloom', 'Bramble'],
    electric: ['Volt', 'Spark', 'Bolt', 'Amp', 'Static', 'Joule'],
    ice: ['Frost', 'Rime', 'Glacier', 'Shard', 'Chill', 'Sleet'],
    fighting: ['Brawn', 'Jab', 'Valor', 'Strike', 'Champ', 'Rumble'],
    poison: ['Venom', 'Toxin', 'Blight', 'Sting', 'Smog', 'Sludge'],
    ground: ['Terra', 'Dune', 'Quake', 'Clay', 'Loam', 'Mesa'],
    flying: ['Gale', 'Zephyr', 'Wing', 'Sky', 'Soar', 'Gust'],
    psychic: ['Mind', 'Oracle', 'Aura', 'Psyche', 'Vision', 'Esper'],
    bug: ['Swarm', 'Shell', 'Drone', 'Molt', 'Skitter', 'Weave'],
    rock: ['Crag', 'Flint', 'Onyx', 'Boulder', 'Ridge', 'Slate'],
    ghost: ['Shade', 'Wisp', 'Phantom', 'Hollow', 'Hex', 'Specter'],
    dark: ['Night', 'Shadow', 'Gloom', 'Rogue', 'Umbra', 'Dusk'],
    dragon: ['Draco', 'Fang', 'Wyrm', 'Scale', 'Raptor', 'Serpent'],
    steel: ['Chrome', 'Alloy', 'Iron', 'Gear', 'Plate', 'Forge'],
    fairy: ['Pixie', 'Moon', 'Charm', 'Glimmer', 'Fae', 'Twinkle'],
    normal: ['Echo', 'Dash', 'Mellow', 'Drift', 'Plain', 'Cozy']
  };

  var HABITAT_WORDS = {
    'cave': ['Grotto', 'Cavern', 'Stalact', 'Deep'],
    'forest': ['Grove', 'Thicket', 'Bramble', 'Sylvan'],
    'grassland': ['Meadow', 'Prairie', 'Field', 'Steppe'],
    'mountain': ['Peak', 'Summit', 'Crag', 'Alpine'],
    'rare': ['Myth', 'Relic', 'Elder', 'Arcane'],
    'rough-terrain': ['Badland', 'Ravine', 'Scree', 'Barren'],
    'sea': ['Abyss', 'Reef', 'Pelagic', 'Depths'],
    'urban': ['Metro', 'Alley', 'Neon', 'Civic'],
    'waters-edge': ['Marsh', 'Shore', 'Lagoon', 'Fen']
  };

  var HABITAT_NOUNS = {
    'cave': 'grotto', 'forest': 'grove', 'grassland': 'meadow', 'mountain': 'peak',
    'rare': 'relic', 'rough-terrain': 'ravine', 'sea': 'reef', 'urban': 'alley', 'waters-edge': 'marsh'
  };

  var COLOR_ADJS = {
    black: 'Dusky', blue: 'Azure', brown: 'Umber', gray: 'Ashen', green: 'Verdant',
    pink: 'Rosy', purple: 'Violet', red: 'Crimson', white: 'Ivory', yellow: 'Golden'
  };

  /* stat personality words: [hp, atk, def, spa, spd, spe] */
  var STAT_WORDS = [
    ['Vital', 'Bulwark', 'Hearty', 'Chunk'],
    ['Brawn', 'Slash', 'Might', 'Crusher'],
    ['Aegis', 'Guard', 'Bastion', 'Buckler'],
    ['Sage', 'Mystic', 'Arcane', 'Scholar'],
    ['Veil', 'Grace', 'Calm', 'Ward'],
    ['Dash', 'Swift', 'Zoom', 'Fleet']
  ];
  var STAT_LABELS = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];

  var ROYAL_WORDS = ['Mythic', 'Ancient', 'Eternal', 'Sacred', 'Grand'];
  var CUTE_SUFFIXES = ['y', 'ie', 'o', 'ster', 'ling', 'bit', 'let', 'kins'];
  var CUTE_PREFIXES = ['Lil ', 'Big ', 'Old '];

  /* short glosses used to explain each name's meaning on its card */
  var TYPE_GLOSS = {
    Ember: 'a small living spark', Blaze: 'a fierce open flame', Cinder: 'a glowing coal fragment', Pyre: 'a ceremonial blaze', Flare: 'a sudden burst of light', Scorch: 'a searing heat mark',
    Tide: 'the pull of the sea', Ripple: 'a ring on still water', Brine: 'the salt of the deep', Mist: 'a veil of spray', Surge: 'a rising wave', Splash: 'a playful leap of water',
    Thorn: 'a guarded spike', Petal: 'a soft bloom', Moss: 'a quiet green carpet', Fern: 'a forest-floor frond', Bloom: 'a flower opening', Bramble: 'a tangle of thorns',
    Volt: 'raw electric charge', Spark: 'a jumping arc', Bolt: 'a lightning strike', Amp: 'surging current', Static: 'crackling charge', Joule: 'stored energy',
    Frost: 'a cold white coating', Rime: 'frozen dew', Glacier: 'slow ancient ice', Shard: 'a splinter of ice', Chill: 'a creeping cold', Sleet: 'driving ice rain',
    Brawn: 'trained muscle', Jab: 'a quick straight punch', Valor: 'courage in battle', Strike: 'a decisive blow', Champ: 'a born winner', Rumble: 'a shaking brawl',
    Venom: 'a toxic bite', Toxin: 'a slow poison', Blight: 'a creeping decay', Sting: 'a venomed point', Smog: 'a choking haze', Sludge: 'toxic muck',
    Terra: 'solid earth', Dune: 'wind-shaped sand', Quake: 'shaking ground', Clay: 'moldable earth', Loam: 'rich dark soil', Mesa: 'a flat-topped rise',
    Gale: 'a driving wind', Zephyr: 'a gentle breeze', Wing: 'lifted flight', Sky: 'the open air', Soar: 'effortless height', Gust: 'a sudden rush of wind',
    Mind: 'pure thought', Oracle: 'one who sees ahead', Aura: 'a felt presence', Psyche: 'the inner self', Vision: 'a glimpse beyond', Esper: 'a reader of minds',
    Swarm: 'a thousand wings as one', Shell: 'a hard casing', Drone: 'a tireless worker', Molt: 'shedding to grow', Skitter: 'quick little feet', Weave: 'a spun silken home',
    Crag: 'a jagged cliff', Flint: 'stone that sparks', Onyx: 'banded black stone', Boulder: 'a massive rock', Ridge: 'a stony spine', Slate: 'layered gray stone',
    Shade: 'a living shadow', Wisp: 'a drifting ghost-light', Phantom: 'a passing spirit', Hollow: 'an empty echo', Hex: 'a whispered curse', Specter: 'a lingering ghost',
    Night: 'the dark hours', Shadow: 'what follows unseen', Gloom: 'dim heavy light', Rogue: 'a rule-breaker', Umbra: 'the deepest shadow', Dusk: 'the fading light',
    Draco: 'the old dragon', Fang: "a predator's tooth", Wyrm: 'an ancient serpent', Scale: 'an armored hide', Raptor: 'a swift hunter', Serpent: 'a coiling giant',
    Chrome: 'polished metal', Alloy: 'a forged mixture', Iron: 'unbending metal', Gear: 'a turning machine', Plate: 'armor sheeting', Forge: 'where metal is born',
    Pixie: 'a small trickster spirit', Moon: 'soft night light', Charm: 'a little magic', Glimmer: 'a faint sparkle', Fae: 'the fair folk', Twinkle: 'a tiny shining',
    Echo: 'a returning sound', Dash: 'a quick run', Mellow: 'calm and soft', Drift: 'an easy wander', Plain: 'simple and true', Cozy: 'warm and safe'
  };
  var STAT_GLOSS = {
    Vital: 'full of life', Bulwark: 'a living wall', Hearty: 'sturdy and warm', Chunk: 'solid mass',
    Slash: 'a cutting blow', Might: 'overwhelming power', Crusher: 'bone-breaking force',
    Aegis: 'a protective shield', Guard: 'a watchful defender', Bastion: 'an unbreakable fort', Buckler: 'a small round shield',
    Sage: 'a wise caster', Mystic: 'a keeper of secrets', Arcane: 'old hidden magic', Scholar: 'a studied mind',
    Veil: 'a soft barrier', Grace: 'calm under pressure', Calm: 'unshaken stillness', Ward: 'a guarding charm',
    Swift: 'quick as wind', Zoom: 'blurring pace', Fleet: 'fast of foot'
  };
  var ROYAL_GLOSS = {
    Mythic: 'born of legend', Ancient: 'older than maps', Eternal: 'never-ending', Sacred: 'untouchably holy', Grand: 'above all others'
  };
  var HABITAT_GLOSS = {
    Grotto: 'a hidden cavern', Cavern: 'a deep cave', Stalact: 'dripping cave stone', Deep: 'the dark below',
    Grove: 'a stand of trees', Thicket: 'dense undergrowth', Sylvan: 'of the deep woods',
    Meadow: 'open flowering grass', Prairie: 'wide open plains', Field: 'open country', Steppe: 'endless dry grass',
    Peak: 'the high point', Summit: 'the very top', Alpine: 'of the high slopes',
    Myth: 'a story told for ages', Relic: 'a survivor of old times', Elder: 'the ancient one',
    Badland: 'harsh broken ground', Ravine: 'a deep rocky cut', Scree: 'loose sliding stone', Barren: 'where little grows',
    Abyss: 'the sunless deep', Reef: 'a living coral wall', Pelagic: 'of the open sea', Depths: 'the pressure below',
    Metro: 'city lights', Alley: 'a back-street path', Neon: 'electric glow', Civic: 'of the city',
    Marsh: 'soft wet ground', Shore: 'where water meets land', Lagoon: 'a calm blue pool', Fen: 'a misty wetland'
  };

  var STAGES = [
    { id: 'initial', label: 'Initial' },
    { id: 'middle', label: 'Middle' },
    { id: 'final', label: 'Final' }
  ];
  var GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  /* ---------------- helpers ---------------- */
  function secureRandom() {
    if (window.crypto && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }
  function pick(arr) { return arr[Math.floor(secureRandom() * arr.length)]; }
  function isVowel(ch) { return 'aeiou'.indexOf(ch) !== -1; }
  function displayName(slug) {
    return slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function spriteUrl(p) {
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + p.si + '.png';
  }

  /* for multi-part slugs (mega/gmax/regional forms) keep the name part */
  function basePart(slug) {
    if (slug.indexOf('-') === -1) return slug;
    var parts = slug.split('-').filter(function (s) { return s.length; });
    var best = parts[0];
    parts.forEach(function (s) { if (s.length > best.length) best = s; });
    if (best.length >= 3) return best;
    return parts.join('');
  }

  function fragSplit(slug) {
    var s = slug.replace(/[^a-z]/g, '');
    if (s.length <= 3) return [s];
    var frags = [], start = 0, i, cut;
    for (i = 0; i < s.length - 2; i++) {
      if (isVowel(s[i]) && !isVowel(s[i + 1])) {
        cut = i + 1;
        if (cut - start >= 2 && s.length - cut >= 2) {
          frags.push(s.slice(start, cut));
          start = cut;
        }
      }
    }
    frags.push(s.slice(start));
    if (frags.length < 2) {
      var mid = Math.ceil(s.length / 2);
      return [s.slice(0, mid), s.slice(mid)];
    }
    return frags;
  }

  function headOf(slug, minLen) {
    var frags = fragSplit(basePart(slug)), out = '', i;
    for (i = 0; i < frags.length; i++) {
      out += frags[i];
      if (out.length >= (minLen || 3)) break;
    }
    if (out.length > 7) out = out.slice(0, 7);
    return out;
  }

  function tailOf(slug, minLen) {
    var frags = fragSplit(basePart(slug)), out = '', i;
    for (i = frags.length - 1; i >= 0; i--) {
      out = frags[i] + out;
      if (out.length >= (minLen || 3)) break;
    }
    if (out.length > 7) out = out.slice(out.length - 7);
    return out;
  }

  function joinClean(a, b) {
    if (a.charAt(a.length - 1).toLowerCase() === b.charAt(0).toLowerCase()) b = b.slice(1);
    return a + b;
  }

  function topStatIndex(p) {
    var best = 0;
    for (var i = 1; i < p.st.length; i++) if (p.st[i] > p.st[best]) best = i;
    return best;
  }

  function prettyAbility(slug) {
    return slug.split('-')[0];
  }

  /* ---------------- state ---------------- */
  var gens = [], types = [], stages = [];
  var noLeg = false, noMyth = false, rareOnly = false;
  var searchTerm = '';
  var selected = null;   // the one Pokemon
  var lastBatch = [];    // array of { id, label, items:[{name,cat,tag,meaning}] }
  var activeCat = 'wordplay';

  /* ---------------- DOM ---------------- */
  function $(id) { return document.getElementById(id); }
  var genWrap = $('ng-gen-chips'), typeWrap = $('ng-type-chips'), stageWrap = $('ng-stage-chips');
  var rarityWrap = $('ng-rarity-chips');
  var searchInput = $('ng-search');
  var dexBox = $('ng-dex'), dexNote = $('ng-dex-note');
  var combo = $('ng-combo'), comboTrigger = $('ng-combo-trigger'),
      comboLabel = $('ng-combo-label'), comboPanel = $('ng-combo-panel');
  var selectedBar = $('ng-selected');
  var tabsWrap = $('ng-tabs');
  var form = $('ng-form'), generateBtn = $('ng-generate-btn');
  var resultsHead = $('ng-results-head'), resultsTitle = $('ng-results-title');
  var resultsBox = $('ng-results');
  var copyAllBtn = $('ng-copy-all'), clearBtn = $('ng-clear');
  var modal = $('ng-modal'), modalText = $('ng-modal-text'), modalClose = $('ng-modal-close');

  function makeChip(label, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-btn';
    b.textContent = label;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      onClick(on);
    });
    return b;
  }

  var genChipEls = {}, typeChipEls = {}, stageChipEls = {}, rarityChipEls = [];

  GENERATIONS.forEach(function (g) {
    var chip = makeChip('Gen ' + g, function (on) {
      var i = gens.indexOf(g);
      if (on && i === -1) gens.push(g);
      if (!on && i !== -1) gens.splice(i, 1);
      renderDex();
    });
    genChipEls[g] = chip;
    genWrap.appendChild(chip);
  });

  Object.keys(TYPES).forEach(function (t) {
    var meta = TYPES[t];
    var chip = makeChip(meta.label, function (on) {
      var i = types.indexOf(t);
      if (on && i === -1) types.push(t);
      if (!on && i !== -1) types.splice(i, 1);
      renderDex();
    });
    chip.classList.add('type-chip');
    chip.style.setProperty('--chip', meta.color);
    if (meta.light) chip.style.setProperty('--chip-text', '#fff');
    typeChipEls[t] = chip;
    typeWrap.appendChild(chip);
  });

  STAGES.forEach(function (s) {
    var chip = makeChip(s.label, function (on) {
      var i = stages.indexOf(s.id);
      if (on && i === -1) stages.push(s.id);
      if (!on && i !== -1) stages.splice(i, 1);
      renderDex();
    });
    stageChipEls[s.id] = chip;
    stageWrap.appendChild(chip);
  });

  [
    { label: 'No Legendary', set: function (v) { noLeg = v; } },
    { label: 'No Mythical', set: function (v) { noMyth = v; } },
    { label: 'Rare Only', set: function (v) { rareOnly = v; } }
  ].forEach(function (r, ri) {
    var chip = makeChip(r.label, function (on) {
      r.set(on);
      renderDex();
    });
    rarityChipEls[ri] = chip;
    rarityWrap.appendChild(chip);
  });

  searchInput.addEventListener('input', function () {
    searchTerm = searchInput.value.trim().toLowerCase();
    renderDex();
  });

  /* ---------------- local cache ---------------- */
  var STORAGE_KEY = 'pokemon-name-generator-state';

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        gens: gens, types: types, stages: stages,
        noLeg: noLeg, noMyth: noMyth, rareOnly: rareOnly,
        search: searchTerm,
        activeCat: activeCat,
        selected: selected ? { i: selected.i, n: selected.n } : null,
        batch: lastBatch
      }));
    } catch (e) { /* storage unavailable — session simply won't persist */ }
  }

  function pressChip(chip, on) {
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function loadState() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { s = null; }
    if (!s) return;
    gens = s.gens || []; types = s.types || []; stages = s.stages || [];
    noLeg = !!s.noLeg; noMyth = !!s.noMyth; rareOnly = !!s.rareOnly;
    gens.forEach(function (g) { if (genChipEls[g]) pressChip(genChipEls[g], true); });
    types.forEach(function (t) { if (typeChipEls[t]) pressChip(typeChipEls[t], true); });
    stages.forEach(function (st) { if (stageChipEls[st]) pressChip(stageChipEls[st], true); });
    if (rarityChipEls[0]) pressChip(rarityChipEls[0], noLeg);
    if (rarityChipEls[1]) pressChip(rarityChipEls[1], noMyth);
    if (rarityChipEls[2]) pressChip(rarityChipEls[2], rareOnly);
    searchTerm = s.search || '';
    searchInput.value = searchTerm;
    if (s.activeCat) activeCat = s.activeCat;
    if (s.selected) {
      var found = null;
      POKEMON.forEach(function (p) {
        if (!found && s.selected && p.i === s.selected.i && p.n === s.selected.n) found = p;
      });
      if (found) selectPokemon(found);
    }
    /* only keep batches in the current categorized format */
    lastBatch = (s.batch || []).filter(function (cat) {
      return cat && cat.id && cat.label && cat.items && cat.items.length;
    });
    renderAll();
  }

  /* ---------------- dex list ---------------- */
  function currentPool() {
    return POKEMON.filter(function (p) {
      if (gens.length && gens.indexOf(p.g) === -1) return false;
      if (types.length) {
        var hit = false;
        for (var i = 0; i < p.t.length; i++) {
          if (types.indexOf(p.t[i]) !== -1) { hit = true; break; }
        }
        if (!hit) return false;
      }
      if (stages.length && stages.indexOf(p.ev) === -1) return false;
      if (noLeg && p.lg) return false;
      if (noMyth && p.my) return false;
      if (rareOnly && !p.lg && !p.my) return false;
      if (searchTerm && p.n.indexOf(searchTerm) === -1 && displayName(p.n).toLowerCase().indexOf(searchTerm) === -1) return false;
      return true;
    });
  }

  function typeBadgesHtml(p) {
    return p.t.map(function (t) {
      var m = TYPES[t];
      var style = 'background:' + m.color + ';color:' + (m.light ? '#fff' : '#121212');
      return '<span class="ng-type-badge" style="' + style + '">' + m.label + '</span>';
    }).join(' ');
  }

  function renderDex() {
    var pool = currentPool();
    dexBox.innerHTML = '';
    pool.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ng-pick';
      b.setAttribute('role', 'option');
      var isSel = selected && selected.i === p.i && selected.n === p.n;
      if (isSel) b.classList.add('ng-pick-active');
      b.setAttribute('aria-selected', isSel ? 'true' : 'false');
      b.setAttribute('aria-label', 'Pick ' + displayName(p.n));
      var img = document.createElement('img');
      img.src = spriteUrl(p);
      img.alt = '';
      img.width = 44;
      img.height = 44;
      img.loading = 'lazy';
      var info = document.createElement('span');
      info.className = 'ng-pick-info';
      var nm = document.createElement('span');
      nm.className = 'ng-pick-name';
      nm.textContent = displayName(p.n);
      var meta = document.createElement('span');
      meta.className = 'ng-pick-meta';
      meta.innerHTML = 'Gen ' + p.g + ' · ' + typeBadgesHtml(p) + ' · BST ' + p.tt;
      info.appendChild(nm);
      info.appendChild(meta);
      var num = document.createElement('span');
      num.className = 'ng-pick-num';
      num.textContent = '#' + ('000' + p.i).slice(-4);
      b.appendChild(img);
      b.appendChild(info);
      b.appendChild(num);
      b.addEventListener('click', function () { selectPokemon(p); });
      dexBox.appendChild(b);
    });
    dexNote.textContent = pool.length
      ? pool.length + ' Pokemon match — search or scroll, then click one to name it.'
      : 'No Pokemon match these filters — widen them or clear the search.';
    saveState();
  }

  /* ---------------- combo open/close ---------------- */
  var comboOpen = false;
  function setComboOpen(open) {
    comboOpen = open;
    comboPanel.hidden = !open;
    comboTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    combo.classList.toggle('ng-combo-open', open);
    if (open) searchInput.focus();
  }
  comboTrigger.addEventListener('click', function (e) {
    e.stopPropagation();
    setComboOpen(!comboOpen);
  });
  document.addEventListener('click', function (e) {
    if (comboOpen && !combo.contains(e.target)) setComboOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && comboOpen) setComboOpen(false);
  });
  /* Enter in the search box must not submit the form */
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') e.preventDefault();
  });

  function selectPokemon(p) {
    selected = p;
    var facts = [];
    facts.push(['Color', cap(p.c)]);
    if (p.h) facts.push(['Habitat', displayName(p.h)]);
    facts.push(['Stage', cap(p.ev)]);
    facts.push(['Rarity', p.lg ? 'Legendary' : (p.my ? 'Mythical' : 'Regular')]);
    if (p.ab && p.ab.length) facts.push(['Abilities', p.ab.map(displayName).join(', ')]);
    var evoText = '';
    if (p.pre) evoText = 'From ' + displayName(p.pre);
    if (p.nxt && p.nxt.length) evoText += (evoText ? ' · ' : '') + 'Into ' + p.nxt.map(displayName).join(' / ');
    if (evoText) facts.push(['Evolution', evoText]);
    var factsHtml = facts.map(function (f) {
      return '<span class="ng-fact"><span class="ng-fact-label">' + f[0] + '</span>' + f[1] + '</span>';
    }).join('');
    var statLabels = ['HP', 'ATK', 'DEF', 'SPA', 'SPD', 'SPE'];
    var statsHtml = statLabels.map(function (l, i) {
      return '<span class="ng-stat"><span class="ng-stat-label">' + l + '</span><span class="ng-stat-val">' + p.st[i] + '</span></span>';
    }).join('') +
    '<span class="ng-stat ng-stat-total"><span class="ng-stat-label">BST</span><span class="ng-stat-val">' + p.tt + '</span></span>';
    selectedBar.hidden = false;
    selectedBar.innerHTML =
      '<img class="ng-selected-art" src="' + p.sp + '" alt="" width="120" height="120" />' +
      '<div class="ng-selected-info">' +
      '<p class="ng-selected-label">Naming for</p>' +
      '<p class="ng-selected-name">' + displayName(p.n) + '</p>' +
      '<p class="ng-selected-meta">#' + ('000' + p.i).slice(-4) + ' · Gen ' + p.g + ' · ' + typeBadgesHtml(p) + '</p>' +
      '<div class="ng-selected-facts">' + factsHtml + '</div>' +
      '<div class="ng-selected-stats">' + statsHtml + '</div>' +
      '</div>';
    comboLabel.innerHTML =
      '<img class="ng-combo-mini" src="' + spriteUrl(p) + '" alt="" width="28" height="28" />' +
      '<span>' + displayName(p.n) + '</span>';
    var picks = dexBox.querySelectorAll('.ng-pick');
    for (var i = 0; i < picks.length; i++) {
      picks[i].classList.remove('ng-pick-active');
      picks[i].setAttribute('aria-selected', 'false');
      if (picks[i].getAttribute('aria-label') === 'Pick ' + displayName(p.n)) {
        picks[i].classList.add('ng-pick-active');
        picks[i].setAttribute('aria-selected', 'true');
      }
    }
    setComboOpen(false);
    generateBtn.disabled = false;
    saveState();
  }

  /* ---------------- name banks (nickname-style, by category) ----------------
     bank entry: [name, gloss, tags?] — tags match color, type, habitat, or 'leg'/'myth';
     matching tags push the entry higher in the shuffled pick order. */

  var MYTH_BANK = [
    ['Phoenix', 'the firebird reborn from its own ashes', ['fire']],
    ['Ra', 'the Egyptian sun god', ['fire']],
    ['Apollo', 'the Greek god of the sun', ['fire']],
    ['Ifrit', 'a fire spirit of Arabian legend', ['fire']],
    ['Agni', 'the Hindu god of fire', ['fire']],
    ['Vulcan', 'the Roman god of the forge', ['fire', 'steel']],
    ['Poseidon', 'the Greek god of the sea', ['water']],
    ['Neptune', 'the Roman god of the sea', ['water']],
    ['Kraken', 'the legendary sea monster', ['water']],
    ['Undine', 'a water nymph of European folklore', ['water']],
    ['Leviathan', 'the biblical sea serpent', ['water', 'dragon']],
    ['Triton', 'the merman herald of the sea', ['water']],
    ['Thor', 'the Norse god of thunder', ['electric', 'fighting']],
    ['Zeus', 'the Greek god of lightning', ['electric']],
    ['Raijin', 'the Japanese god of thunder', ['electric']],
    ['Indra', 'the Hindu god of storms', ['electric']],
    ['Perun', 'the Slavic god of thunder', ['electric']],
    ['Gaia', 'the Greek mother of the earth', ['grass', 'ground']],
    ['Demeter', 'the Greek goddess of the harvest', ['grass']],
    ['Flora', 'the Roman goddess of flowers', ['grass', 'fairy']],
    ['Daphne', 'the nymph who became a laurel tree', ['grass']],
    ['Sylvanus', 'the Roman god of the forest', ['grass']],
    ['Skadi', 'the Norse goddess of winter', ['ice']],
    ['Boreas', 'the Greek god of the north wind', ['ice', 'flying']],
    ['Khione', 'the Greek goddess of snow', ['ice']],
    ['Ymir', 'the first frost giant of Norse myth', ['ice']],
    ['Ares', 'the Greek god of war', ['fighting']],
    ['Athena', 'the Greek goddess of battle strategy', ['fighting']],
    ['Hercules', 'the hero of the twelve labors', ['fighting']],
    ['Achilles', 'the nearly invincible Greek warrior', ['fighting']],
    ['Tyr', 'the Norse god of combat and honor', ['fighting']],
    ['Medusa', 'the snake-haired Gorgon', ['poison']],
    ['Circe', 'the sorceress of potions and transformations', ['poison', 'psychic']],
    ['Echidna', 'the mother of monsters', ['poison']],
    ['Atlas', 'the Titan who carries the sky', ['rock', 'fighting']],
    ['Golem', 'the clay guardian of legend', ['ground', 'rock']],
    ['Cronus', 'the Titan lord of time', ['rock']],
    ['Aeolus', 'the Greek keeper of the winds', ['flying']],
    ['Hermes', 'the wing-sandaled messenger god', ['flying']],
    ['Icarus', 'the boy who flew too close to the sun', ['flying']],
    ['Valkyrie', 'a Norse chooser of the slain', ['flying', 'fighting']],
    ['Garuda', 'the divine eagle of Hindu legend', ['flying', 'fire']],
    ['Roc', 'the giant bird of Arabian tales', ['flying']],
    ['Hecate', 'the Greek goddess of magic', ['psychic', 'ghost']],
    ['Merlin', 'the wizard of Arthurian legend', ['psychic']],
    ['Odin', 'the Norse all-father who traded an eye for wisdom', ['psychic']],
    ['Delphi', 'named for the oracle of ancient Greece', ['psychic']],
    ['Anansi', 'the spider trickster of West African tales', ['bug']],
    ['Khepri', 'the Egyptian scarab god of the morning sun', ['bug']],
    ['Arachne', 'the weaver transformed into a spider', ['bug', 'poison']],
    ['Hades', 'the Greek god of the underworld', ['ghost']],
    ['Anubis', 'the Egyptian guide of the dead', ['ghost']],
    ['Charon', 'the ferryman of the underworld river', ['ghost']],
    ['Banshee', 'the wailing spirit of Irish folklore', ['ghost']],
    ['Nyx', 'the Greek goddess of night', ['dark']],
    ['Erebus', 'the Greek personification of darkness', ['dark']],
    ['Loki', 'the Norse trickster god', ['dark']],
    ['Fenrir', 'the monstrous wolf of Norse myth', ['dark']],
    ['Jormungandr', 'the Norse serpent that circles the world', ['dragon', 'water']],
    ['Fafnir', 'the dwarf who became a dragon', ['dragon']],
    ['Ryujin', 'the Japanese dragon god of the sea', ['dragon', 'water']],
    ['Tiamat', 'the Babylonian primordial dragon goddess', ['dragon']],
    ['Bahamut', 'the colossal beast of Arabian cosmology', ['dragon']],
    ['Talos', 'the bronze automaton that guarded Crete', ['steel']],
    ['Hephaestus', 'the Greek smith of the gods', ['steel', 'fire']],
    ['Mjolnir', 'the hammer only the worthy can lift', ['steel', 'electric']],
    ['Oberon', 'the king of the fairies', ['fairy']],
    ['Titania', 'the queen of the fairies', ['fairy']],
    ['Puck', 'the mischief sprite of English folklore', ['fairy']],
    ['Morgana', 'the enchantress of Arthurian legend', ['fairy', 'psychic']],
    ['Nike', 'the Greek goddess of victory', ['normal', 'fighting']],
    ['Sleipnir', 'the eight-legged horse of Odin', ['normal']],
    ['Argus', 'the hundred-eyed giant of Greek myth', ['normal']],
    ['Oni', 'the ogre-demon of Japanese folklore', ['dark', 'fighting']]
  ];

  var CUTE_BANK = [
    ['Buddy', 'a loyal little friend', ['normal']],
    ['Scout', 'an eager explorer', ['flying']],
    ['Pip', 'a tiny seed of a name', []],
    ['Ziggy', 'zippy and playful', ['electric']],
    ['Momo', 'round and peachy', ['pink']],
    ['Kiki', 'bright and chirpy', ['flying']],
    ['Lulu', 'soft and singable', []],
    ['Boo', 'small and spooky-cute', ['ghost']],
    ['Wiggles', 'never sits still', []],
    ['Nibbles', 'always sampling snacks', []],
    ['Bubbles', 'light and floaty', ['water']],
    ['Snuggles', 'built for hugs', ['normal']],
    ['Paws', 'all four of them at once', []],
    ['Whiskers', 'always twitching', []],
    ['Bouncer', 'full of spring', ['fighting']],
    ['Doodles', 'a scribbly little friend', []],
    ['Sunny', 'a pocket of warm weather', ['fire', 'yellow']],
    ['Pippin', 'a small apple of a name', ['grass']],
    ['Coco', 'warm and sweet', ['brown']],
    ['Bean', 'tiny and round', ['green']],
    ['Sprout', 'just beginning to grow', ['grass']],
    ['Nugget', 'a small golden chunk', ['yellow']],
    ['Peanut', 'small and lovable', ['brown']],
    ['Buttons', 'cute as one', []],
    ['Dumpling', 'round and comforting', ['white']],
    ['Squirt', 'small but spirited', ['water']],
    ['Tadpole', 'still growing into itself', ['water']]
  ];

  var TOUGH_BANK = [
    ['Tank', 'it just keeps coming', ['steel', 'rock']],
    ['Spike', 'sharp and ready', ['poison']],
    ['Rex', 'the tyrant king', ['dragon']],
    ['Brutus', 'raw muscle and no apologies', ['fighting']],
    ['Crusher', 'bone-breaking force', ['fighting', 'rock']],
    ['Jaws', 'a bite that ends things', ['water', 'dark']],
    ['Viper', 'fast, venomous and precise', ['poison']],
    ['Bandit', 'plays by its own rules', ['dark']],
    ['Rogue', 'a loner with an edge', ['dark']],
    ['Blitz', 'over before you blink', ['electric']],
    ['Raptor', 'a swift and clever hunter', ['flying']],
    ['Bruiser', 'loves a good scrap', ['fighting']],
    ['Fang', 'one good tooth is enough', ['dragon', 'dark']],
    ['Diesel', 'heavy and unstoppable', ['steel']],
    ['Rocco', 'solid as a bouncer', ['rock']],
    ['Sarge', 'barks orders at the whole squad', ['fighting']],
    ['Maverick', 'answers to no one', ['flying']],
    ['Gunner', 'the heavy artillery', ['steel']],
    ['Havoc', 'leaves wreckage wherever it goes', ['dragon']],
    ['Brick', 'a wall with fists', ['rock', 'fighting']],
    ['Torque', 'raw rotational power', ['steel']],
    ['Brawler', 'first into every fight', ['fighting']],
    ['Gnasher', 'all teeth and attitude', ['dark']],
    ['Rampage', 'hard to stop once it starts', ['fighting', 'ground']],
    ['Onyx', 'black stone, black stare', ['rock', 'black']],
    ['Saber', 'a blade of a Pokemon', ['steel']],
    ['Talon', 'grips and never lets go', ['flying']],
    ['Avalanche', 'a mountain in motion', ['ice', 'rock']]
  ];

  var FOOD_BANK = [
    ['Chili', 'hot and red', ['red', 'fire']],
    ['Pepper', 'brings the heat', ['red', 'fire']],
    ['Wasabi', 'a small green kick', ['green']],
    ['Kiwi', 'fuzzy and bright', ['green']],
    ['Basil', 'fresh and green', ['green', 'grass']],
    ['Pickles', 'briny and lovable', ['green']],
    ['Matcha', 'smooth green energy', ['green']],
    ['Sushi', 'fresh from the sea', ['water', 'blue']],
    ['Mochi', 'soft, sweet and squishy', ['white', 'pink']],
    ['Brownie', 'rich and dark', ['brown']],
    ['Truffle', 'a hidden delicacy', ['brown']],
    ['Oreo', 'the black-and-white classic', ['black', 'white']],
    ['Saffron', 'worth more than gold', ['yellow']],
    ['Honey', 'golden and sweet', ['yellow']],
    ['Cheddar', 'sharp and proud of it', ['yellow']],
    ['Noodle', 'long and slippery', ['water']],
    ['Taco', 'everyone loves one', []],
    ['Waffles', 'golden and warm', ['yellow']],
    ['Pretzel', 'twisted and salty', ['brown']],
    ['Ginger', 'spicy and warm', ['red', 'brown']],
    ['Soda', 'fizzy and hyper', ['blue']],
    ['Boba', 'full of pearls', ['brown']],
    ['Miso', 'salty and comforting', ['brown']],
    ['Tamago', 'a golden little egg', ['yellow']],
    ['Sesame', 'small but full of flavor', ['brown']],
    ['Pumpkin', 'round and autumnal', ['red']],
    ['Berry', 'sweet and wild', ['red', 'grass']],
    ['Vanilla', 'classic and smooth', ['white']],
    ['Licorice', 'dark and divisive', ['black']],
    ['Cola', 'dark and fizzy', ['black']]
  ];

  var NATURE_BANK = [
    ['Willow', 'graceful by the water', ['forest', 'waters-edge']],
    ['Birch', 'white-barked and bright', ['forest', 'white']],
    ['Rowan', 'a tree of old magic', ['forest']],
    ['River', 'always moving', ['sea', 'waters-edge', 'blue']],
    ['Brook', 'a small chatter of water', ['waters-edge']],
    ['Coral', 'a living reef', ['sea', 'pink']],
    ['Summit', 'the very top', ['mountain']],
    ['Ridge', 'a stony spine', ['mountain', 'rock']],
    ['Tundra', 'the silent cold north', ['mountain', 'ice']],
    ['Moss', 'a soft green carpet', ['cave', 'grassland', 'green']],
    ['Grotto', 'a hidden cavern', ['cave']],
    ['Dune', 'wind-shaped sand', ['rough-terrain', 'ground']],
    ['Flint', 'stone that sparks', ['rough-terrain', 'rock']],
    ['Neon', 'the glow of city nights', ['urban']],
    ['Metro', 'the heartbeat of the city', ['urban']],
    ['Alley', 'a back-street native', ['urban']],
    ['Clover', 'a lucky find', ['grassland', 'green']],
    ['Meadow', 'open flowering grass', ['grassland']],
    ['Eclipse', 'rare and unmissable', ['rare']],
    ['Relic', 'a survivor of old times', ['rare']],
    ['Storm', 'rolling thunder on the horizon', ['water', 'electric']],
    ['Aurora', 'the lights of the far north', ['ice']],
    ['Comet', 'a streak across the night sky', ['rare']],
    ['Luna', 'the quiet moon', ['psychic', 'fairy']],
    ['Solstice', 'the turning of the year', ['fire', 'ice']],
    ['Ember', 'a small living spark', ['red', 'fire']],
    ['Gale', 'a driving wind', ['flying']],
    ['Frost', 'a cold white coating', ['ice', 'white']],
    ['Cinder', 'a glowing coal fragment', ['fire']],
    ['Cedar', 'tall and evergreen', ['forest']],
    ['Harbor', 'where the ships rest', ['sea', 'waters-edge']],
    ['Drift', 'an easy wanderer', ['sea']],
    ['Pebble', 'small, smooth and stubborn', ['rock', 'waters-edge']],
    ['Glacier', 'slow ancient ice', ['ice']],
    ['Monsoon', 'the season of rain', ['water']],
    ['Tornado', 'a spinning column of wind', ['flying']]
  ];

  var REAL_BANK = [
    ['Ruby', 'the red gemstone', ['red']],
    ['Scarlett', 'a deep bold red', ['red']],
    ['Jade', 'the green stone of luck', ['green']],
    ['Marina', 'of the sea', ['water', 'blue']],
    ['Dylan', 'a Welsh name meaning "son of the sea"', ['water']],
    ['Brooke', 'a small stream', ['water', 'waters-edge']],
    ['Skye', 'wide open air', ['flying', 'blue']],
    ['Violet', 'the purple flower', ['purple', 'grass']],
    ['Iris', 'the rainbow flower', ['purple', 'grass']],
    ['Lily', 'the white flower', ['white', 'grass']],
    ['Pearl', 'a treasure of the sea', ['white', 'water']],
    ['Opal', 'a shifting iridescent stone', ['white']],
    ['Ebony', 'deep black wood', ['black']],
    ['Raven', 'the clever black bird', ['black', 'flying', 'dark']],
    ['Bruno', 'brown and sturdy — an Elite Four name', ['brown', 'fighting']],
    ['Bear', 'big and warm-hearted', ['brown']],
    ['Wolf', 'a born pack leader', ['gray']],
    ['Ash', 'a name every trainer knows', ['fire', 'gray']],
    ['Rocky', 'solid and scrappy', ['rock']],
    ['Drake', 'the dragon of a name', ['dragon']],
    ['Max', 'simply the greatest', []],
    ['Felix', 'the lucky one', []],
    ['Duke', 'a born leader', ['fighting']],
    ['Stella', 'a star', ['fairy']],
    ['Hazel', 'warm brown-green eyes', ['brown', 'green']],
    ['Amber', 'fossilized golden resin', ['yellow']],
    ['Crystal', 'clear and sharp', ['ice', 'rock']],
    ['Cliff', 'solid high ground', ['rock', 'mountain']],
    ['Sandy', 'of the shore', ['ground', 'waters-edge']],
    ['Forrest', 'of the deep woods', ['grass', 'forest']],
    ['Reed', 'tall waterside grass', ['waters-edge', 'grass']],
    ['Clay', 'of the good earth', ['ground']],
    ['Rose', 'the classic flower', ['grass', 'red', 'pink']],
    ['Daisy', 'a bright simple flower', ['grass', 'white']],
    ['Holly', 'sharp leaves, red berries', ['grass', 'red']],
    ['Heath', 'open wild country', ['grassland']],
    ['Glen', 'a quiet green valley', ['grassland', 'forest']],
    ['Pierce', 'sharp and direct', ['steel']],
    ['Colt', 'young and fast', ['normal']],
    ['Brock', 'as solid as a certain Pewter Gym Leader', ['rock']],
    ['Misty', 'a Cerulean City classic', ['water']]
  ];

  /* wordplay: programmatic puns, titles and blends built from the species itself */
  function wordplayEntries(p) {
    var head = cap(headOf(p.n, 3));
    var out = [];
    var SUFFIXES = [
      ['zilla', 'the monster-movie suffix, for a Pokemon that looms large'],
      ['inator', 'a mad-scientist invention suffix'],
      ['meister', 'German for "master" — it has mastered being itself'],
      ['bot', 'the robot suffix, for a mechanical little companion'],
      ['aroo', 'a bouncy, playful ending'],
      ['enstein', 'the classic stitched-together monster suffix'],
      ['tastic', 'because it is simply fantastic'],
      ['prime', 'the leader-of-the-pack suffix'],
      ['o-matic', 'like a gadget that never stops working'],
      ['imus', 'a mock-Roman emperor ending'],
      ['nado', 'a spinning storm of a suffix'],
      ['ster', 'the mob-boss suffix']
    ];
    SUFFIXES.forEach(function (s) {
      var nm = cap(joinClean(head, s[0]));
      if (nm.length <= 16) out.push([nm, head + ' plus ' + s[1], []]);
    });
    var TITLES = [
      ['Sir ', 'a knightly title for a distinguished Pokemon'],
      ['Lord ', 'nobility clearly suits it'],
      ['Lady ', 'elegant and in charge'],
      ['Professor ', 'it obviously knows things'],
      ['Captain ', 'born to lead the squad'],
      ['Doctor ', 'trust it — it is a professional'],
      ['Agent ', 'on a secret mission'],
      ['Chief ', 'the boss of the tall grass']
    ];
    TITLES.forEach(function (t) {
      out.push([t[0] + head, t[1], []]);
    });
    out.push([head + ' Mc' + head + 'face', 'the internet classic — democracy named this one', []]);
    var tail = cap(tailOf(p.n, 3));
    out.push([cap(joinClean(tail.toLowerCase(), headOf(p.n, 3))), 'its own name flipped tail-first — instantly familiar, totally unique', []]);
    if (p.nxt && p.nxt.length) {
      var nx = displayName(p.nxt[0]);
      out.push(['Not ' + nx, 'it heard about its evolution and politely declined', []]);
      out.push(['Almost ' + nx, 'one level away from greatness', []]);
    }
    if (p.pre) {
      out.push(['Mega ' + displayName(p.pre), 'named for the glory days of its pre-evolution ' + displayName(p.pre), []]);
    }
    var t = p.t[0];
    var word = pick(TYPE_WORDS[t]);
    out.push([cap(joinClean(word, tail.toLowerCase())), '"' + word + '" — ' + TYPE_GLOSS[word] + ' — fused with the ending of its own name', [t]]);
    if (p.ab && p.ab.length) {
      var ab = cap(prettyAbility(p.ab[0]));
      out.push([cap(joinClean(ab, tail.toLowerCase())), 'borrowed from its ability ' + displayName(p.ab[0]) + ', welded to its own name', []]);
    }
    return out;
  }

  /* cute: pet-name bank plus clippings of the species' own name */
  function cuteEntries(p) {
    var out = CUTE_BANK.slice();
    var base = basePart(p.n);
    var n = 3 + Math.floor(secureRandom() * 2);
    var clip = cap(base.slice(0, Math.min(n, base.length)));
    var head = cap(headOf(p.n, 3));
    CUTE_SUFFIXES.forEach(function (suf) {
      out.push([clip + suf, 'a pet-name clipping of ' + displayName(p.n) + ' with the affectionate -' + suf + ' ending', []]);
    });
    out.push(['Little ' + head, 'for the smallest squad member with the biggest heart', []]);
    out.push([head + '-boo', 'a cuddly spin on the front of its name', []]);
    if (p.pre) out.push([displayName(p.pre) + ' Jr.', 'still its pre-evolution ' + displayName(p.pre) + ' at heart', []]);
    return out;
  }

  /* pick `quota` entries: tag-matching ones float up, randomness keeps it fresh */
  function bankItems(p, pool, quota, catId, tagLabel, seen) {
    var scored = [];
    pool.forEach(function (entry) {
      var tags = entry[2] || [];
      var score = secureRandom() * 1.6;
      var fit = null;
      for (var i = 0; i < tags.length; i++) {
        var tg = tags[i];
        if (tg === p.c) { score += 2; fit = fit || 'its ' + p.c + ' coloring'; }
        else if (p.t.indexOf(tg) !== -1) { score += 2; fit = fit || 'its ' + TYPES[tg].label + ' typing'; }
        else if (p.h && tg === p.h) { score += 2; fit = fit || 'its ' + p.h.replace(/-/g, ' ') + ' habitat'; }
        else if (tg === 'leg' && p.lg) { score += 2; fit = fit || 'its legendary status'; }
        else if (tg === 'myth' && p.my) { score += 2; fit = fit || 'its mythical status'; }
      }
      scored.push({ entry: entry, score: score, fit: fit });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    var out = [];
    for (var j = 0; j < scored.length && out.length < quota; j++) {
      var it = scored[j];
      if (seen[it.entry[0]]) continue;
      seen[it.entry[0]] = true;
      out.push({
        name: it.entry[0],
        cat: catId,
        tag: tagLabel,
        meaning: '"' + it.entry[0] + '" — ' + it.entry[1] + (it.fit ? ', a fitting match for ' + it.fit : '') + '.'
      });
    }
    return out;
  }

  var CATEGORIES = [
    { id: 'wordplay', label: 'Wordplay', quota: 20, tag: 'wordplay', entries: wordplayEntries },
    { id: 'myth', label: 'Myth & Legend', quota: 16, tag: 'myth & legend', bank: MYTH_BANK },
    { id: 'cute', label: 'Cute', quota: 20, tag: 'cute pet name', entries: cuteEntries },
    { id: 'tough', label: 'Tough', quota: 18, tag: 'tough nickname', bank: TOUGH_BANK },
    { id: 'food', label: 'Food', quota: 16, tag: 'food nickname', bank: FOOD_BANK },
    { id: 'nature', label: 'Nature', quota: 16, tag: 'nature name', bank: NATURE_BANK },
    { id: 'realname', label: 'Real Names', quota: 14, tag: 'human-style name', bank: REAL_BANK }
  ];

  function buildAll(p) {
    var seen = {};
    return CATEGORIES.map(function (c) {
      var pool = c.entries ? c.entries(p) : c.bank;
      return { id: c.id, label: c.label, items: bankItems(p, pool, c.quota, c.id, c.tag, seen) };
    });
  }

  /* ---------------- copy / modal ---------------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { openCopyModal(text); });
    } else {
      openCopyModal(text);
    }
  }
  function openCopyModal(text) {
    modalText.value = text;
    modal.hidden = false;
    modalText.focus();
    modalText.select();
  }
  modalClose.addEventListener('click', function () { modal.hidden = true; });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) modal.hidden = true;
  });

  /* ---------------- render ---------------- */
  function renderAll() {
    resultsBox.innerHTML = '';
    tabsWrap.innerHTML = '';
    if (!lastBatch.length || !selected) { resultsHead.hidden = true; tabsWrap.hidden = true; return; }
    resultsHead.hidden = false;
    resultsTitle.textContent = 'Names for ' + displayName(selected.n);
    tabsWrap.hidden = false;
    lastBatch.forEach(function (cat) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'chip-btn';
      tab.setAttribute('aria-pressed', cat.id === activeCat ? 'true' : 'false');
      tab.textContent = cat.label + ' (' + cat.items.length + ')';
      tab.addEventListener('click', function () {
        if (activeCat === cat.id) return;
        activeCat = cat.id;
        renderAll();
        saveState();
      });
      tabsWrap.appendChild(tab);
    });
    var current = null;
    lastBatch.forEach(function (cat) { if (cat.id === activeCat) current = cat; });
    if (!current) { current = lastBatch[0]; activeCat = current.id; }
    current.items.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'ng-card';

      var art = document.createElement('span');
      art.className = 'ng-card-art';
      var img = document.createElement('img');
      img.src = selected.sp;
      img.alt = '';
      img.width = 96;
      img.height = 96;
      img.loading = 'lazy';
      art.appendChild(img);

      var body = document.createElement('div');
      body.className = 'ng-card-body';
      var nm = document.createElement('h3');
      nm.className = 'ng-card-name';
      nm.textContent = item.name;
      var src = document.createElement('p');
      src.className = 'ng-card-source';
      src.textContent = item.tag;
      var mean = document.createElement('p');
      mean.className = 'ng-card-meaning';
      mean.textContent = item.meaning;
      body.appendChild(nm);
      body.appendChild(src);
      body.appendChild(mean);

      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-ghost ng-card-copy';
      copyBtn.textContent = 'Copy';
      copyBtn.setAttribute('aria-label', 'Copy name ' + item.name);
      copyBtn.addEventListener('click', function () {
        copyText(item.name);
        copyBtn.textContent = 'Copied ✓';
        setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1200);
      });

      card.appendChild(art);
      card.appendChild(body);
      card.appendChild(copyBtn);
      resultsBox.appendChild(card);
    });
  }

  /* ---------------- actions ---------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!selected) {
      dexNote.textContent = 'Pick a Pokemon from the list first — then roll its names.';
      setComboOpen(true);
      return;
    }
    lastBatch = buildAll(selected);
    renderAll();
    saveState();
    resultsHead.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  copyAllBtn.addEventListener('click', function () {
    if (!lastBatch.length) return;
    var names = [];
    lastBatch.forEach(function (cat) {
      names.push('== ' + cat.label + ' ==');
      cat.items.forEach(function (item) { names.push(item.name); });
    });
    copyText(names.join('\n'));
    copyAllBtn.textContent = 'Copied ✓';
    setTimeout(function () { copyAllBtn.textContent = 'Copy All Names'; }, 1200);
  });

  clearBtn.addEventListener('click', function () {
    lastBatch = [];
    renderAll();
    saveState();
  });

  generateBtn.disabled = true;
  loadState();
  renderDex();
})();
