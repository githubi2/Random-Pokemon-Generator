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
    fire: { label: 'ほのお', color: '#FF9D55', light: false }, water: { label: 'みず', color: '#6890F0', light: true },
    grass: { label: 'くさ', color: '#78C850', light: false }, electric: { label: 'でんき', color: '#F8D030', light: false },
    ice: { label: 'こおり', color: '#98D8D8', light: false }, fighting: { label: 'かくとう', color: '#C03028', light: true },
    poison: { label: 'どく', color: '#A040A0', light: true }, ground: { label: 'じめん', color: '#E0C068', light: false },
    flying: { label: 'ひこう', color: '#A890F0', light: true }, psychic: { label: 'エスパー', color: '#F85888', light: true },
    bug: { label: 'むし', color: '#A8B820', light: false }, rock: { label: 'いわ', color: '#B8A038', light: true },
    ghost: { label: 'ゴースト', color: '#705898', light: true }, dark: { label: 'あく', color: '#705848', light: true },
    dragon: { label: 'ドラゴン', color: '#7038F8', light: true }, steel: { label: 'はがね', color: '#B8B8D0', light: false },
    fairy: { label: 'フェアリー', color: '#EE99AC', light: false }, normal: { label: 'ノーマル', color: '#A8A878', light: false }
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
    ['Veil', 'Grace', 'おだやか', 'Ward'],
    ['Dash', 'Swift', 'Zoom', 'Fleet']
  ];
  var STAT_LABELS = ['HP', 'こうげき', 'ぼうぎょ', '特攻', '特防', 'すばやさ'];

  var ROYAL_WORDS = ['Mythic', 'Ancient', 'Eternal', 'Sacred', 'Grand'];
  var CUTE_SUFFIXES = ['y', 'ie', 'o', 'ster', 'ling', 'bit', 'let', 'kins'];
  var CUTE_PREFIXES = ['ちび', 'おおきな', 'いにしえの'];

  /* short glosses used to explain each name's meaning on its card */
  var TYPE_GLOSS = {
    Ember: '小さく生きる火花', Blaze: '激しく燃える炎', Cinder: '光る炭のかけら', Pyre: '儀式の炎', Flare: '突然の閃光', Scorch: '焼け焦げた痕',
    Tide: '海の引力', Ripple: '静かな水面の波紋', Brine: '深海の塩', Mist: '水しぶきのベール', Surge: '盛り上がる波', Splash: 'はしゃぐ水しぶき',
    Thorn: '守りのとげ', Petal: 'やわらかな花ひらき', Moss: '静かな緑の絨毯', Fern: '森の床のシダ', Bloom: '花ひらく', Bramble: '絡み合うとげ',
    Volt: 'むき出しの電気', Spark: '跳ねる電弧', Bolt: '落雷', Amp: 'うねる電流', Static: 'はじける電荷', Joule: '蓄えたエネルギー',
    Frost: '白く冷たい霜', Rime: '凍てつく露', Glacier: '悠久の氷', Shard: '氷のかけら', Chill: '忍び寄る寒気', Sleet: '吹きすさぶ氷雨',
    Brawn: '鍛え上げた筋肉', Jab: '素早いストレート', Valor: '戦いの勇気', Strike: '決め手の一撃', Champ: '生まれながらの勝者', Rumble: '揺れる乱闘',
    Venom: '毒の牙', Toxin: '遅効性の毒', Blight: '忍び寄る腐敗', Sting: '毒の針', Smog: '息を詰まらせる霧', Sludge: '有毒なヘドロ',
    Terra: '固い大地', Dune: '風がかたちづくる砂', Quake: '揺れる大地', Clay: '形を変える土', Loam: '豊かな黒土', Mesa: '平らな台地',
    Gale: '吹きすさぶ風', Zephyr: 'そよ風', Wing: '舞い上がる飛翔', Sky: '開けた大空', Soar: 'effortless height', Gust: '突然の突風',
    Mind: '純粋な思念', Oracle: '先を見通す者', Aura: '感じる気配', Psyche: '内なる自分', Vision: '彼方のまなざし', Esper: '心を読む者',
    Swarm: '千の羽がひとつに', Shell: '硬い殻', Drone: '不眠不休の働き手', Molt: '脱皮して成長する', Skitter: '素早い小さな足', Weave: '紡いだ絹の巣',
    Crag: '切り立つ崖', Flint: '火花を散らす石', Onyx: '縞模様の黒石', Boulder: '巨大な岩', Ridge: '石の背骨', Slate: '層をなす灰色の岩',
    Shade: '生きる影', Wisp: '漂う鬼火', Phantom: '通り過ぎる魂', Hollow: '空のこだま', Hex: 'ささやく呪い', Specter: 'さまよう亡霊',
    Night: '闇の刻', Shadow: '見えぬままに続くもの', Gloom: '重く淡い光', Rogue: '掟破り', Umbra: '最深の影', Dusk: '消えゆく光',
    Draco: '古き竜', Fang: "捕食者の牙", Wyrm: '古代の大蛇', Scale: '鎧の皮膚', Raptor: '俊速の狩人', Serpent: 'とぐろを巻く巨人',
    Chrome: '磨かれた金属', Alloy: '鍛え上げた合金', Iron: '不屈の金属', Gear: '回転する機械', Plate: '装甲板', Forge: '金属が生まれる場所',
    Pixie: '小さな悪戯好きの精', Moon: 'やわらかな夜の光', Charm: '小さな魔法', Glimmer: 'かすかなきらめき', Fae: '妖精たち', Twinkle: '小さな輝き',
    Echo: '返ってくる音', Dash: '素早い走り', Mellow: '穏やかでやわらか', Drift: '気ままな旅', Plain: 'シンプルでまっすぐ', Cozy: 'あたたかく安全'
  };
  var STAT_GLOSS = {
    Vital: '生命力にあふれて', Bulwark: '生きている壁', Hearty: '丈夫であたたかい', Chunk: 'ずっしりとした塊',
    Slash: '斬り裂く一撃', Might: '圧倒的な力', Crusher: '骨を砕く力',
    Aegis: '守りの盾', Guard: '見張る守護者', Bastion: '破られぬ砦', Buckler: '小さな丸盾',
    Sage: '賢き術師', Mystic: '秘密を守る者', Arcane: '古く秘めた魔法', Scholar: '学びし知性',
    Veil: 'やわらかな障壁', Grace: '重圧に動じない', Calm: '揺るがぬ静寂', Ward: '守りの護符',
    Swift: '風のごとき速さ', Zoom: '残像の速さ', Fleet: '駿足'
  };
  var ROYAL_GLOSS = {
    Mythic: '伝説に生まれし', Ancient: '地図より古い', Eternal: 'never-ending', Sacred: '近寄りがたき神聖', Grand: 'すべての上に'
  };
  var HABITAT_GLOSS = {
    Grotto: '隠された洞窟', Cavern: '深い洞', Stalact: '滴る洞窟の岩', Deep: '地下の闇',
    Grove: '木立', Thicket: '密な下草', Sylvan: '深き森の',
    Meadow: '花咲く草原', Prairie: '広い平野', Field: '開けた野原', Steppe: '果てなき枯れ草',
    Peak: '高き頂', Summit: '最高峰', Alpine: '高峰の',
    Myth: '語り継がれる物語', Relic: '古き時代の生き残り', Elder: '古き者',
    Badland: '荒れた裂け地', Ravine: '深い岩の裂け目', Scree: '滑り落ちる石', Barren: '実り少なき地',
    Abyss: '陽の届かぬ深み', Reef: '生きる珊瑚の壁', Pelagic: '外洋の', Depths: '深海の重圧',
    Metro: '都会の灯り', Alley: '裏路地の道', Neon: '電気の輝き', Civic: '街の',
    Marsh: 'やわらかな湿地', Shore: '水と陸の交わるところ', Lagoon: '静かな青い淵', Fen: '霧の湿地'
  };

  var STAGES = [
    { id: 'initial', label: '進化前' },
    { id: 'middle', label: '中間進化' },
    { id: 'final', label: '最終進化' }
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
    /*JA_LOOKUP*/var _T=window.JA_POKE_NAMES||{},_A=window.JA_ABILITY_NAMES||{},_M=window.JA_MOVE_NAMES||{},_N=window.JA_NATURE_NAMES||{};if(_T[slug])return _T[slug];if(_A[slug])return _A[slug];if(_M[slug])return _M[slug];if(_N[slug])return _N[slug];return slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function cap(s) { var M = { initial: '進化前', middle: '中間進化', final: '最終進化', cave: '洞窟', forest: '森', grassland: '草原', mountain: '山', rare: 'レア', 'rough-terrain': '荒れ地', sea: '海', urban: '都市', 'waters-edge': '水辺', red: '赤', blue: '青', yellow: '黄', green: '緑', black: '黒', brown: '茶', purple: '紫', gray: '灰', white: '白', pink: '桃' }; if (M[s]) return M[s]; return s.charAt(0).toUpperCase() + s.slice(1); }
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

  /* clear first: the chips are already in the HTML (fast first paint, no layout shift) */
  genWrap.innerHTML = ''; typeWrap.innerHTML = ''; stageWrap.innerHTML = ''; rarityWrap.innerHTML = '';

  GENERATIONS.forEach(function (g) {
    var chip = makeChip('第' + g, function (on) {
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
    { label: '伝説なし', set: function (v) { noLeg = v; } },
    { label: '幻なし', set: function (v) { noMyth = v; } },
    { label: 'レアのみ', set: function (v) { rareOnly = v; } }
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
      b.setAttribute('aria-label', '選択:' + displayName(p.n));
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
      meta.innerHTML = '第' + p.g + ' · ' + typeBadgesHtml(p) + '· 種族値' + p.tt;
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
      ? pool.length + '匹が該当します — 検索かスクロールで探して、クリックすると名前を付けられます。'
      : 'この条件に合うポケモンはいません。条件を広げるか、検索をクリアしてください。';
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
    facts.push(['図鑑の色', cap(p.c)]);
    if (p.h) facts.push(['Habitat', displayName(p.h)]);
    facts.push(['進化段階', cap(p.ev)]);
    facts.push(['Rarity', p.lg ? 'Legendary' : (p.my ? 'Mythical' : 'Regular')]);
    if (p.ab && p.ab.length) facts.push(['Abilities', p.ab.map(displayName).join(', ')]);
    var evoText = '';
    if (p.pre) evoText = '由来:' + displayName(p.pre);
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
      '<p class="ng-selected-meta">#' + ('000' + p.i).slice(-4) + '· 第' + p.g + ' · ' + typeBadgesHtml(p) + '</p>' +
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
      if (picks[i].getAttribute('aria-label') === '選択:' + displayName(p.n)) {
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
    ['Phoenix', '自らの灰から蘇る火の鳥', ['fire']],
    ['Ra', 'エジプトの太陽神', ['fire']],
    ['Apollo', 'ギリシャの太陽神', ['fire']],
    ['Ifrit', 'アラビア伝説の火の精', ['fire']],
    ['Agni', 'ヒンドゥーの火の神', ['fire']],
    ['Vulcan', 'ローマの鍛冶の神', ['fire', 'steel']],
    ['Poseidon', 'ギリシャの海の神', ['water']],
    ['Neptune', 'ローマの海の神', ['water']],
    ['Kraken', '伝説の海の怪物', ['water']],
    ['Undine', 'ヨーロッパ民話の水の精', ['water']],
    ['Leviathan', '聖書の海の蛇', ['water', 'dragon']],
    ['Triton', '海を告げる人魚', ['water']],
    ['Thor', '北欧の雷神', ['electric', 'fighting']],
    ['Zeus', 'ギリシャの稲妻の神', ['electric']],
    ['Raijin', '日本の雷神', ['electric']],
    ['Indra', 'ヒンドゥーの嵐の神', ['electric']],
    ['Perun', 'スラヴの雷神', ['electric']],
    ['Gaia', 'ギリシャの大地の母', ['grass', 'ground']],
    ['Demeter', 'ギリシャの収穫の女神', ['grass']],
    ['Flora', 'ローマの花の女神', ['grass', 'fairy']],
    ['Daphne', '月桂樹になったニンフ', ['grass']],
    ['Sylvanus', 'ローマの森の神', ['grass']],
    ['Skadi', '北欧の冬の女神', ['ice']],
    ['Boreas', 'ギリシャの北風の神', ['ice', 'flying']],
    ['Khione', 'ギリシャの雪の女神', ['ice']],
    ['Ymir', '北欧神話最初の霜の巨人', ['ice']],
    ['Ares', 'ギリシャの戦の神', ['fighting']],
    ['Athena', 'ギリシャの戦略の女神', ['fighting']],
    ['Hercules', '十二の試練の英雄', ['fighting']],
    ['Achilles', 'ほぼ無敵のギリシャの戦士', ['fighting']],
    ['Tyr', '北欧の戦と名誉の神', ['fighting']],
    ['Medusa', '蛇の髪のゴルゴン', ['poison']],
    ['Circe', '薬と変身の魔女', ['poison', 'psychic']],
    ['Echidna', '怪物の母', ['poison']],
    ['Atlas', '天を支えるティタン', ['rock', 'fighting']],
    ['Golem', '伝説の粘土の守護者', ['ground', 'rock']],
    ['Cronus', '時のティタン王', ['rock']],
    ['Aeolus', 'ギリシャの風の守り手', ['flying']],
    ['Hermes', '翼のサンダルを履く伝令の神', ['flying']],
    ['Icarus', '太陽に近づきすぎた少年', ['flying']],
    ['Valkyrie', '北欧の戦死者を選ぶ者', ['flying', 'fighting']],
    ['Garuda', 'ヒンドゥー伝説の神鷲', ['flying', 'fire']],
    ['Roc', 'アラビアの物語の巨大鳥', ['flying']],
    ['Hecate', 'ギリシャの魔術の女神', ['psychic', 'ghost']],
    ['Merlin', 'アーサー王伝説の魔術師', ['psychic']],
    ['Odin', '知恵と引き換えに片目を捧げた北欧の全能の父', ['psychic']],
    ['Delphi', '古代ギリシャの神託にちなむ', ['psychic']],
    ['Anansi', '西アフリカの物語の蜘蛛の悪戯者', ['bug']],
    ['Khepri', 'エジプトの朝日のスカラベ神', ['bug']],
    ['Arachne', '蜘蛛に姿を変えた織り手', ['bug', 'poison']],
    ['Hades', 'ギリシャの冥界の神', ['ghost']],
    ['Anubis', 'エジプトの死者の導き手', ['ghost']],
    ['Charon', '冥界の川の渡し守', ['ghost']],
    ['Banshee', 'アイルランド民話の泣き叫ぶ精霊', ['ghost']],
    ['Nyx', 'ギリシャの夜の女神', ['dark']],
    ['Erebus', 'ギリシャの闇の化身', ['dark']],
    ['Loki', '北欧の悪戯の神', ['dark']],
    ['Fenrir', '北欧神話の怪物狼', ['dark']],
    ['Jormungandr', '世界を取り巻く北欧の蛇', ['dragon', 'water']],
    ['Fafnir', '竜となったドワーフ', ['dragon']],
    ['Ryujin', '日本の海の竜神', ['dragon', 'water']],
    ['Tiamat', 'バビロニアの原初の竜の女神', ['dragon']],
    ['Bahamut', 'アラビア宇宙論の巨大な獣', ['dragon']],
    ['Talos', 'クレタを守った青銅の自動人形', ['steel']],
    ['Hephaestus', 'ギリシャの神々の鍛冶師', ['steel', 'fire']],
    ['Mjolnir', 'ふさわしき者だけが持ち上げられる槌', ['steel', 'electric']],
    ['Oberon', '妖精の王', ['fairy']],
    ['Titania', '妖精の女王', ['fairy']],
    ['Puck', 'イングランド民話の悪戯な妖精', ['fairy']],
    ['Morgana', 'アーサー王伝説の女魔術師', ['fairy', 'psychic']],
    ['Nike', 'ギリシャの勝利の女神', ['normal', 'fighting']],
    ['Sleipnir', 'オーディンの八本脚の馬', ['normal']],
    ['Argus', 'ギリシャ神話の百眼の巨人', ['normal']],
    ['Oni', '日本の民話の鬼', ['dark', 'fighting']]
  ];

  var CUTE_BANK = [
    ['Buddy', '忠実で小さな友', ['normal']],
    ['Scout', '好奇心旺盛な探検家', ['flying']],
    ['Pip', '名前の小さな種', []],
    ['Ziggy', '元気で遊び好き', ['electric']],
    ['Momo', 'まんまるで桃色', ['pink']],
    ['Kiki', '明るく元気', ['flying']],
    ['Lulu', 'やわらかく歌うような', []],
    ['Boo', '小さくて不気味かわいい', ['ghost']],
    ['Wiggles', 'じっとしていない', []],
    ['Nibbles', 'いつもおやつを味見する', []],
    ['Bubbles', '軽やかに浮かぶ', ['water']],
    ['Snuggles', '抱きしめたくなる姿', ['normal']],
    ['Paws', '四匹が同時に', []],
    ['Whiskers', 'いつもぴくぴく', []],
    ['Bouncer', '春いっぱい', ['fighting']],
    ['Doodles', '落書きのような小さな友', []],
    ['Sunny', 'ぽかぽかの小袋', ['fire', 'yellow']],
    ['Pippin', '小さなりんごのような名前', ['grass']],
    ['Coco', 'あたたかく甘い', ['brown']],
    ['Bean', '小さくてまんまる', ['green']],
    ['Sprout', '育ちはじめたばかり', ['grass']],
    ['Nugget', '小さな黄金のかけら', ['yellow']],
    ['Peanut', '小さくて愛らしい', ['brown']],
    ['Buttons', 'ひとつで十分かわいい', []],
    ['Dumpling', 'まんまるでほっとする', ['white']],
    ['Squirt', '小さくても元気', ['water']],
    ['Tadpole', 'まだ育つ途中', ['water']]
  ];

  var TOUGH_BANK = [
    ['Tank', '次々にやってくる', ['steel', 'rock']],
    ['Spike', '鋭くて準備万端', ['poison']],
    ['Rex', '暴君の王', ['dragon']],
    ['Brutus', 'むき出しの筋肉、弁明なし', ['fighting']],
    ['Crusher', '骨を砕く力', ['fighting', 'rock']],
    ['Jaws', '決着をつける噛みつき', ['water', 'dark']],
    ['Viper', '素早く、毒々しく、正確', ['poison']],
    ['Bandit', '自分の掟で動く', ['dark']],
    ['Rogue', '鋭さを持つ一匹狼', ['dark']],
    ['Blitz', '瞬く間に終わる', ['electric']],
    ['Raptor', '俊敏で賢い狩人', ['flying']],
    ['Bruiser', '喧嘩好き', ['fighting']],
    ['Fang', 'いい牙が一本あれば十分', ['dragon', 'dark']],
    ['Diesel', '重くて止まらない', ['steel']],
    ['Rocco', '用心棒のように頑丈', ['rock']],
    ['Sarge', '仲間全体に命令を飛ばす', ['fighting']],
    ['Maverick', '誰の命令も聞かない', ['flying']],
    ['Gunner', '重砲', ['steel']],
    ['Havoc', 'どこへ行っても跡形を残す', ['dragon']],
    ['Brick', '拳を持つ壁', ['rock', 'fighting']],
    ['Torque', 'むき出しの回転力', ['steel']],
    ['Brawler', 'いつも真っ先に戦う', ['fighting']],
    ['Gnasher', '牙と気迫だけ', ['dark']],
    ['Rampage', '始まったら止まらない', ['fighting', 'ground']],
    ['Onyx', 'black stone, black stare', ['rock', 'black']],
    ['Saber', '刃のようなポケモン', ['steel']],
    ['Talon', '掴んだら離さない', ['flying']],
    ['Avalanche', '動く山', ['ice', 'rock']]
  ];

  var FOOD_BANK = [
    ['Chili', '熱く赤い', ['red', 'fire']],
    ['Pepper', '熱を運ぶ', ['red', 'fire']],
    ['Wasabi', '小さな緑の蹴り', ['green']],
    ['Kiwi', 'ふわふわで明るい', ['green']],
    ['Basil', 'みずみずしく緑', ['green', 'grass']],
    ['Pickles', '潮気があって愛らしい', ['green']],
    ['Matcha', 'なめらかな緑の力', ['green']],
    ['Sushi', '海から来た新鮮さ', ['water', 'blue']],
    ['Mochi', 'やわらかく甘く、ぷにぷに', ['white', 'pink']],
    ['Brownie', '濃く深い', ['brown']],
    ['Truffle', '隠れた珍味', ['brown']],
    ['Oreo', '白黒の定番', ['black', 'white']],
    ['Saffron', '金より価値がある', ['yellow']],
    ['Honey', '金色で甘い', ['yellow']],
    ['Cheddar', '鋭くて誇り高い', ['yellow']],
    ['Noodle', '長くてぬるり', ['water']],
    ['Taco', 'みんな大好き', []],
    ['Waffles', '金色で温かい', ['yellow']],
    ['Pretzel', 'ねじれて塩気あり', ['brown']],
    ['Ginger', '辛くて温かい', ['red', 'brown']],
    ['Soda', 'シュワシュワで元気', ['blue']],
    ['Boba', '真珠でいっぱい', ['brown']],
    ['Miso', '塩気でほっとする', ['brown']],
    ['Tamago', '金色の小さな卵', ['yellow']],
    ['Sesame', '小さくても味わい深い', ['brown']],
    ['Pumpkin', 'まんまるで秋めいた', ['red']],
    ['Berry', '甘くて野性的', ['red', 'grass']],
    ['Vanilla', '定番でなめらか', ['white']],
    ['Licorice', '濃くて賛否両論', ['black']],
    ['Cola', '濃くてシュワシュワ', ['black']]
  ];

  var NATURE_BANK = [
    ['Willow', '水辺の優雅さ', ['forest', 'waters-edge']],
    ['Birch', '白い幹で明るい', ['forest', 'white']],
    ['Rowan', '古の魔法の木', ['forest']],
    ['River', 'いつも動いている', ['sea', 'waters-edge', 'blue']],
    ['Brook', '水のささやき', ['waters-edge']],
    ['Coral', '生きる珊瑚礁', ['sea', 'pink']],
    ['Summit', '最高峰', ['mountain']],
    ['Ridge', '石の背骨', ['mountain', 'rock']],
    ['Tundra', '静かな冷たい北', ['mountain', 'ice']],
    ['Moss', 'やわらかな緑の絨毯', ['cave', 'grassland', 'green']],
    ['Grotto', '隠された洞窟', ['cave']],
    ['Dune', '風がかたちづくる砂', ['rough-terrain', 'ground']],
    ['Flint', '火花を散らす石', ['rough-terrain', 'rock']],
    ['Neon', '都会の夜の輝き', ['urban']],
    ['Metro', '街の鼓動', ['urban']],
    ['Alley', '裏路地の生まれ', ['urban']],
    ['Clover', '幸運な出会い', ['grassland', 'green']],
    ['Meadow', '花咲く草原', ['grassland']],
    ['Eclipse', '希少で見逃せない', ['rare']],
    ['Relic', '古き時代の生き残り', ['rare']],
    ['Storm', '地平線に響く雷鳴', ['water', 'electric']],
    ['Aurora', '北の果ての光', ['ice']],
    ['Comet', '夜空を走る光の筋', ['rare']],
    ['Luna', '静かな月', ['psychic', 'fairy']],
    ['Solstice', '巡る季節', ['fire', 'ice']],
    ['Ember', '小さく生きる火花', ['red', 'fire']],
    ['Gale', '吹きすさぶ風', ['flying']],
    ['Frost', '白く冷たい霜', ['ice', 'white']],
    ['Cinder', '光る炭のかけら', ['fire']],
    ['Cedar', '高く常緑', ['forest']],
    ['Harbor', '船が休む場所', ['sea', 'waters-edge']],
    ['Drift', '気ままな旅人', ['sea']],
    ['Pebble', '小さく、なめらかで、頑固', ['rock', 'waters-edge']],
    ['Glacier', '悠久の氷', ['ice']],
    ['Monsoon', '雨の季節', ['water']],
    ['Tornado', '渦巻く風の柱', ['flying']]
  ];

  var REAL_BANK = [
    ['Ruby', '赤い宝石', ['red']],
    ['Scarlett', '深く鮮やかな赤', ['red']],
    ['Jade', '幸運の緑の石', ['green']],
    ['Marina', '海の', ['water', 'blue']],
    ['Dylan', '「海の子」を意味するウェールズの名', ['water']],
    ['Brooke', '小さな小川', ['water', 'waters-edge']],
    ['Skye', '広く開けた空気', ['flying', 'blue']],
    ['Violet', '紫の花', ['purple', 'grass']],
    ['Iris', '虹の花', ['purple', 'grass']],
    ['Lily', '白い花', ['white', 'grass']],
    ['Pearl', '海の宝物', ['white', 'water']],
    ['Opal', '揺らめく虹色の石', ['white']],
    ['Ebony', '深い黒木', ['black']],
    ['Raven', '賢い黒い鳥', ['black', 'flying', 'dark']],
    ['Bruno', '褐色で頑丈 — 四天王らしい名前', ['brown', 'fighting']],
    ['Bear', '大きくて心優しい', ['brown']],
    ['Wolf', '生まれながらの群れのリーダー', ['gray']],
    ['Ash', 'すべてのトレーナーが知る名前', ['fire', 'gray']],
    ['Rocky', '頑丈で勝気', ['rock']],
    ['Drake', '竜のような名前', ['dragon']],
    ['Max', 'ただ最高の', []],
    ['Felix', '幸運な者', []],
    ['Duke', '生まれながらのリーダー', ['fighting']],
    ['Stella', '星', ['fairy']],
    ['Hazel', 'あたたかな茶緑の瞳', ['brown', 'green']],
    ['Amber', '化石になった金色の樹脂', ['yellow']],
    ['Crystal', '澄んで鋭い', ['ice', 'rock']],
    ['Cliff', '固い高台', ['rock', 'mountain']],
    ['Sandy', '岸辺の', ['ground', 'waters-edge']],
    ['Forrest', '深き森の', ['grass', 'forest']],
    ['Reed', '水辺の背の高い草', ['waters-edge', 'grass']],
    ['Clay', '豊かな大地の', ['ground']],
    ['Rose', '定番の花', ['grass', 'red', 'pink']],
    ['Daisy', '明るく素朴な花', ['grass', 'white']],
    ['Holly', '鋭い葉と赤い実', ['grass', 'red']],
    ['Heath', '開けた荒野', ['grassland']],
    ['Glen', '静かな緑の谷', ['grassland', 'forest']],
    ['Pierce', '鋭くまっすぐ', ['steel']],
    ['Colt', '若く速い', ['normal']],
    ['Brock', 'とあるニビジムのリーダーのように頑丈', ['rock']],
    ['Misty', 'ハナダシティの定番', ['water']]
  ];

  /* wordplay: programmatic puns, titles and blends built from the species itself */
  function wordplayEntries(p) {
    var head = cap(headOf(p.n, 3));
    var out = [];
    var SUFFIXES = [
      ['zilla', '怪獣映画っぽい語尾 — 大きくそびえ立つポケモンにぴったり'],
      ['inator', 'マッドサイエンティストの発明品っぽい語尾'],
      ['meister', '「巨匠」を意味するドイツ語 — 自分自身を極めた名'],
      ['bot', 'ロボットっぽい語尾 — メカの小さな相棒に'],
      ['aroo', '弾むように遊び心のある語尾'],
      ['enstein', '定番の縫い合わせモンスター風の語尾'],
      ['tastic', 'とにかく最高だから'],
      ['prime', '群れのリーダーを表す語尾'],
      ['o-matic', '止まらない装置のような'],
      ['imus', 'ローマ皇帝もどきの語尾'],
      ['nado', '渦巻く嵐のような語尾'],
      ['ster', 'マフィアのボス風の語尾']
    ];
    SUFFIXES.forEach(function (s) {
      var nm = cap(joinClean(head, s[0]));
      if (nm.length <= 16) out.push([nm, head + 'プラス' + s[1], []]);
    });
    var TITLES = [
      ['サー', '優れたポケモンにふさわしい騎士の称号'],
      ['ロード', '貴族の風格がよく似合う'],
      ['レディ', '優雅で采配をふるう'],
      ['博士', 'さすがに物知り'],
      ['キャプテン', '仲間を率いるために生まれた'],
      ['ドクター', '信頼できる、プロだから'],
      ['エージェント', '秘密任務の途中'],
      ['チーフ', '草むらのボス']
    ];
    TITLES.forEach(function (t) {
      out.push([t[0] + head, t[1], []]);
    });
    out.push([head + 'マク' + head + 'face', 'ネットの定番 — 民意が名付けた一匹', []]);
    var tail = cap(tailOf(p.n, 3));
    out.push([cap(joinClean(tail.toLowerCase(), headOf(p.n, 3))), '名前を後ろから前にひっくり返しただけ — どこか見覚えがありつつ、完全に唯一無二', []]);
    if (p.nxt && p.nxt.length) {
      var nx = displayName(p.nxt[0]);
      out.push(['ノット' + nx, '進化の話を聞いて、丁寧に断った', []]);
      out.push(['もう少しで' + nx, '偉大さまであと1レベル', []]);
    }
    if (p.pre) {
      out.push(['メガ' + displayName(p.pre), '進化前の全盛期にちなんだ' + displayName(p.pre), []]);
    }
    var t = p.t[0];
    var word = pick(TYPE_WORDS[t]);
    out.push([cap(joinClean(word, tail.toLowerCase())), '"' + word + '" — ' + TYPE_GLOSS[word] + ' — fused with the ending of its own name', [t]]);
    if (p.ab && p.ab.length) {
      var ab = cap(prettyAbility(p.ab[0]));
      out.push([cap(joinClean(ab, tail.toLowerCase())), '特性から借りた' + displayName(p.ab[0]) + ', welded to its own name', []]);
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
      out.push([clip + suf, 'ペット名の短縮' + displayName(p.n) + 'と、愛情込めた「' + suf + '」の語尾', []]);
    });
    out.push(['小さな' + head, '一番小さくて一番優しい仲間へ', []]);
    out.push([head + '-boo', '名前の頭に付く抱きしめたくなる呼び名', []]);
    if (p.pre) out.push([displayName(p.pre) + 'ジュニア', 'まだ進化前の' + displayName(p.pre) + 'のまま', []]);
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
        if (tg === p.c) { score += 2; fit = fit || 'その' + p.c + 'の色'; }
        else if (p.t.indexOf(tg) !== -1) { score += 2; fit = fit || 'その' + TYPES[tg].label + 'のタイプ'; }
        else if (p.h && tg === p.h) { score += 2; fit = fit || 'その' + p.h.replace(/-/g, ' ') + ' habitat'; }
        else if (tg === 'leg' && p.lg) { score += 2; fit = fit || '伝説の地位'; }
        else if (tg === 'myth' && p.my) { score += 2; fit = fit || '幻の地位'; }
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
    { id: 'myth', label: '神話と伝説', quota: 16, tag: '神話と伝説', bank: MYTH_BANK },
    { id: 'cute', label: 'Cute', quota: 20, tag: 'かわいいペット名', entries: cuteEntries },
    { id: 'tough', label: 'Tough', quota: 18, tag: '強そうなあだ名', bank: TOUGH_BANK },
    { id: 'food', label: 'Food', quota: 16, tag: '食べ物のあだ名', bank: FOOD_BANK },
    { id: 'nature', label: 'Nature', quota: 16, tag: '自然の名前', bank: NATURE_BANK },
    { id: 'realname', label: '実在の名前', quota: 14, tag: '人間風の名前', bank: REAL_BANK }
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
    resultsTitle.textContent = '名前:' + displayName(selected.n);
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
      copyBtn.setAttribute('aria-label', 'コピー:' + item.name);
      copyBtn.addEventListener('click', function () {
        copyText(item.name);
        copyBtn.textContent = 'Copied';
        setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1200);
      });

      card.appendChild(art);
      card.appendChild(body);
      card.appendChild(copyBtn);

      card.addEventListener('click', function (e) {
        if (e.target.closest('button, a, input, label')) return;
        if (window.pokeDetail && selected) window.pokeDetail({ p: selected, shiny: false });
      });

      resultsBox.appendChild(card);
    });
  }

  /* ---------------- actions ---------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!selected) {
      dexNote.textContent = '先にリストからポケモンを選んでから、名前を生成してください。';
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
    copyAllBtn.textContent = 'Copied';
    setTimeout(function () { copyAllBtn.textContent = 'すべてコピー'; }, 1200);
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
