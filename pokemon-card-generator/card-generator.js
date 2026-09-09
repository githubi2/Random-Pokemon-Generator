/* ============================================================
   Pokemon Card Generator — vanilla JS engine
   Flow: template + rarity + card type -> form fields -> live
   canvas preview (630x880) -> PNG download / copy text.
   Photos: local upload (dataURL) or random PokeAPI artwork
   (CORS-ok: raw.githubusercontent.com sends ACAO:*).
   State persists in localStorage (rpg:cardgen-state).
   Data: window.POKEMON_DATA (data.js)
   ============================================================ */
(function () {
  'use strict';

  var POKEMON = window.POKEMON_DATA || [];
  var BASE_POOL = [];
  POKEMON.forEach(function (p) { if (p.ev === 'initial') BASE_POOL.push(p); });

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

  var HOLO_GRAD = ['#f6d365', '#fda085', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

  var LS_KEY = 'rpg:cardgen-state';
  var CANVAS_W = 630, CANVAS_H = 880;

  function $(id) { return document.getElementById(id); }

  var canvas = $('cg-canvas');
  var ctx = canvas.getContext('2d');

  /* ---------------- state ---------------- */
  var defaultState = {
    template: 'classic', rarity: 'common', cardType: 'pokemon',
    name: '', hp: 60, type: 'fire', weakness: 'water',
    atk1Name: '', atk1Dmg: 40, atk2Name: '', atk2Dmg: 0,
    flavor: '', illustrator: '', energyType: 'grass',
    photo: null /* {kind:'file',data:..} | {kind:'poke',id:123} | null */
  };
  var state = loadState();

  function loadState() {
    try {
      var raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultState));
      var s = JSON.parse(raw);
      var out = JSON.parse(JSON.stringify(defaultState));
      Object.keys(out).forEach(function (k) { if (s[k] !== undefined) out[k] = s[k]; });
      return out;
    } catch (e) { return JSON.parse(JSON.stringify(defaultState)); }
  }
  var saveTimer = null;
  function saveState() {
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* storage full: drop photo */ }
  }
  function queueSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 300);
    var s = $('cg-saved-note');
    if (s) s.textContent = '';
  }

  /* ---------------- photo loading (CORS-safe) ---------------- */
  var cachedImg = { key: null, img: null };
  function photoKey(photo) {
    if (!photo) return null;
    return photo.kind === 'file' ? ('f:' + photo.data.slice(0, 200)) : ('p:' + photo.id);
  }
  function photoUrl(photo) {
    if (!photo) return null;
    if (photo.kind === 'file') return photo.data;
    var p = null;
    for (var i = 0; i < POKEMON.length; i++) { if (POKEMON[i].i === photo.id) { p = POKEMON[i]; break; } }
    return p ? p.sp : null;
  }
  function ensurePhoto(cb) {
    var key = photoKey(state.photo);
    if (!key) { cachedImg = { key: null, img: null }; cb(); return; }
    if (cachedImg.key === key && cachedImg.img) { cb(); return; }
    var img = new Image();
    if (state.photo.kind === 'poke') img.crossOrigin = 'anonymous';
    img.onload = function () { cachedImg = { key: key, img: img }; cb(); };
    img.onerror = function () { cachedImg = { key: undefined, img: null }; state.photo = null; cb(); };
    img.src = photoUrl(state.photo);
  }

  /* ---------------- drawing helpers ---------------- */
  function rr(ctx2, x, y, w, h, r) {
    ctx2.beginPath();
    ctx2.moveTo(x + r, y);
    ctx2.arcTo(x + w, y, x + w, y + h, r);
    ctx2.arcTo(x + w, y + h, x, y + h, r);
    ctx2.arcTo(x, y + h, x, y, r);
    ctx2.arcTo(x, y, x + w, y, r);
    ctx2.closePath();
  }
  function fitFont(ctx2, text, maxW, baseSize, weight, family) {
    var size = baseSize;
    ctx2.font = weight + ' ' + size + 'px ' + family;
    while (size > 10 && ctx2.measureText(text).width > maxW) {
      size -= 2;
      ctx2.font = weight + ' ' + size + 'px ' + family;
    }
    return size;
  }
  function wrapLines(ctx2, text, maxW, size) {
    var words = String(text).split(/\s+/).filter(function (w) { return w; });
    var lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx2.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else { cur = test; }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 2);
  }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
    var g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
    var b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function cropCover(img, w, h) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var scale = Math.max(w / iw, h / ih);
    var sw = w / scale, sh = h / scale;
    return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw: sw, sh: sh };
  }
  function drawArt(ctx2, x, y, w, h, r, img) {
    ctx2.save();
    rr(ctx2, x, y, w, h, r);
    ctx2.clip();
    if (img && img.width) {
      var c = cropCover(img, w, h);
      ctx2.drawImage(img, c.sx, c.sy, c.sw, c.sh, x, y, w, h);
    } else {
      var g = ctx2.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, '#e8e2d2'); g.addColorStop(1, '#cfc6b0');
      ctx2.fillStyle = g; ctx2.fillRect(x, y, w, h);
      ctx2.fillStyle = 'rgba(120,105,80,0.45)';
      ctx2.font = '900 72px "Segoe UI", Arial, sans-serif';
      ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
      ctx2.fillText('?', x + w / 2, y + h / 2);
    }
    ctx2.restore();
  }
  function gradientEdge(ctx2, w, h, colors, lineW, r) {
    var g = ctx2.createLinearGradient(0, 0, w, h);
    colors.forEach(function (c, i) { g.addColorStop(i / (colors.length - 1), c); });
    ctx2.strokeStyle = g;
    ctx2.lineWidth = lineW;
    rr(ctx2, lineW / 2, lineW / 2, w - lineW, h - lineW, r);
    ctx2.stroke();
  }

  /* ---------------- card painters ---------------- */
  function drawEnergyCard(ctx2, img) {
    var T = TYPES[state.energyType] || TYPES.grass;
    ctx2.clearRect(0, 0, CANVAS_W, CANVAS_H);
    var g = ctx2.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    g.addColorStop(0, shade(T.color, 1.12)); g.addColorStop(1, shade(T.color, 0.82));
    ctx2.fillStyle = g;
    rr(ctx2, 0, 0, CANVAS_W, CANVAS_H, 40); ctx2.fill();
    if (state.rarity === 'holo') gradientEdge(ctx2, CANVAS_W, CANVAS_H, HOLO_GRAD, 10, 40);
    else if (state.rarity === 'rare') { ctx2.strokeStyle = 'rgba(255,255,255,0.85)'; ctx2.lineWidth = 8; rr(ctx2, 5, 5, CANVAS_W - 10, CANVAS_H - 10, 36); ctx2.stroke(); }

    /* top ribbon */
    ctx2.fillStyle = 'rgba(0,0,0,0.25)';
    rr(ctx2, 36, 40, CANVAS_W - 72, 76, 18); ctx2.fill();
    var title = T.label + ' Energy';
    ctx2.fillStyle = '#fff';
    ctx2.font = '800 34px "Segoe UI", Arial, sans-serif';
    ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
    ctx2.fillText(title, CANVAS_W / 2, 78);

    /* art area (slightly small so the gem reads as the card) */
    drawArt(ctx2, 42, 132, CANVAS_W - 84, 420, 26, img);

    /* gem */
    var cx = CANVAS_W / 2, cy = 560;
    var rg = ctx2.createRadialGradient(cx - 24, cy - 30, 10, cx, cy, 120);
    rg.addColorStop(0, 'rgba(255,255,255,0.95)');
    rg.addColorStop(0.55, shade(T.color, 1.35));
    rg.addColorStop(1, shade(T.color, 0.7));
    ctx2.fillStyle = rg;
    ctx2.save();
    ctx2.translate(cx, cy); ctx2.rotate(Math.PI / 4);
    rr(ctx2, -60, -60, 120, 120, 18); ctx2.fill();
    ctx2.restore();
    ctx2.fillStyle = 'rgba(255,255,255,0.9)';
    ctx2.font = '900 40px "Segoe UI", Arial, sans-serif';
    ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
    ctx2.fillText(T.label.toUpperCase().slice(0, 4), cx, cy + 2);

    /* bottom label */
    ctx2.fillStyle = 'rgba(0,0,0,0.22)';
    rr(ctx2, 120, 664, CANVAS_W - 240, 66, 22); ctx2.fill();
    ctx2.fillStyle = '#fff';
    ctx2.font = '600 26px "Segoe UI", Arial, sans-serif';
    ctx2.fillText(T.label + ' energy card — fan design', CANVAS_W / 2, 698);

    /* artist line */
    ctx2.fillStyle = 'rgba(0,0,0,0.4)';
    ctx2.font = '500 16px "Segoe UI", Arial, sans-serif';
    var footer = (state.illustrator || 'fan project') + '  ·  unofficial';
    ctx2.fillText(footer, CANVAS_W / 2, 790);
  }

  function drawTrainerPlaceholder(ctx2) {
    ctx2.clearRect(0, 0, CANVAS_W, CANVAS_H);
    var g = ctx2.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    g.addColorStop(0, '#d8e2f0'); g.addColorStop(1, '#b7c6dd');
    ctx2.fillStyle = g;
    rr(ctx2, 0, 0, CANVAS_W, CANVAS_H, 28); ctx2.fill();
    ctx2.fillStyle = '#33415c';
    ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
    ctx2.font = '900 40px "Segoe UI", Arial, sans-serif';
    ctx2.fillText('Trainer cards live on their own page', CANVAS_W / 2, 330);
    ctx2.font = '600 26px "Segoe UI", Arial, sans-serif';
    ctx2.fillText('Pokemon Trainer Card Generator', CANVAS_W / 2, 395);
    ctx2.font = '500 20px "Segoe UI", Arial, sans-serif';
    ctx2.fillStyle = '#5c6b88';
    ctx2.fillText('name plate · badge row · partner Pokemon', CANVAS_W / 2, 465);
  }

  function drawPokemonCard(ctx2, img) {
    var T = TYPES[state.type] || TYPES.fire;
    var dark = T.light;
    var fullArt = state.rarity === 'fullart';

    ctx2.clearRect(0, 0, CANVAS_W, CANVAS_H);

    /* ---------- background ---------- */
    if (state.template === 'pocket') {
      ctx2.fillStyle = '#ffffff';
      rr(ctx2, 0, 0, CANVAS_W, CANVAS_H, 34); ctx2.fill();
      ctx2.strokeStyle = T.color; ctx2.lineWidth = 6;
      rr(ctx2, 6, 6, CANVAS_W - 12, CANVAS_H - 12, 30); ctx2.stroke();
    } else {
      var bgG = ctx2.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
      bgG.addColorStop(0, '#f4e6b8'); bgG.addColorStop(1, '#e0c274');
      ctx2.fillStyle = bgG;
      rr(ctx2, 0, 0, CANVAS_W, CANVAS_H, 22); ctx2.fill();
      /* inner frame */
      ctx2.strokeStyle = '#6b4d1e'; ctx2.lineWidth = 6;
      rr(ctx2, 8, 8, CANVAS_W - 16, CANVAS_H - 16, 18); ctx2.stroke();
      ctx2.strokeStyle = '#d8a53f'; ctx2.lineWidth = 3;
      rr(ctx2, 16, 16, CANVAS_W - 32, CANVAS_H - 32, 14); ctx2.stroke();
    }

    /* ---------- edge effects ---------- */
    if (state.rarity === 'holo') gradientEdge(ctx2, CANVAS_W, CANVAS_H, HOLO_GRAD, 12, 22);
    else if (state.rarity === 'rare') { ctx2.strokeStyle = 'rgba(220,220,235,0.9)'; ctx2.lineWidth = 8; rr(ctx2, 4, 4, CANVAS_W - 8, CANVAS_H - 8, 20); ctx2.stroke(); }

    /* ---------- name plate tucked under top ---------- */
    var namePlateH = 72;
    var nameFont = '800';
    if (state.template === 'modern') {
      var npG = ctx2.createLinearGradient(0, 28, 0, 28 + namePlateH);
      npG.addColorStop(0, shade(T.color, 1.0)); npG.addColorStop(1, shade(T.color, 0.85));
      ctx2.fillStyle = npG;
      rr(ctx2, 24, 28, CANVAS_W - 48, namePlateH, 16); ctx2.fill();
    } else if (state.template === 'pocket') {
      ctx2.fillStyle = 'rgba(0,0,0,0.06)';
      rr(ctx2, 24, 28, CANVAS_W - 48, namePlateH, 16); ctx2.fill();
    } else {
      ctx2.fillStyle = 'rgba(60,40,10,0.88)';
      rr(ctx2, 24, 28, CANVAS_W - 48, namePlateH, 12); ctx2.fill();
    }
    var dispName = state.name || 'Your Pokemon';
    var hpText = 'HP ' + state.hp;
    ctx2.textBaseline = 'middle';
    ctx2.font = nameFont + ' 40px "Segoe UI", Arial, sans-serif';
    ctx2.textAlign = 'left';
    var maxNameW = CANVAS_W - 48 - 24 - 130;
    var size = fitFont(ctx2, dispName, maxNameW, 40, '800', '"Segoe UI", Arial, sans-serif');
    ctx2.font = '800 ' + size + 'px "Segoe UI", Arial, sans-serif';
    var nameColor = (state.template === 'classic') ? '#fff' : (dark ? '#333' : '#333');
    if (state.template === 'modern') nameColor = '#fff';
    ctx2.fillStyle = nameColor;
    ctx2.fillText(dispName, 44, 28 + namePlateH / 2 + 2);
    /* HP at right of plate, with type dot */
    ctx2.fillStyle = T.color;
    ctx2.beginPath(); ctx2.arc(CANVAS_W - 150, 28 + namePlateH / 2, 15, 0, Math.PI * 2); ctx2.fill();
    ctx2.fillStyle = (state.template === 'classic' || state.template === 'modern') ? '#fff' : '#333';
    ctx2.font = '800 34px "Segoe UI", Arial, sans-serif';
    ctx2.textAlign = 'right';
    ctx2.fillText(hpText, CANVAS_W - 44, 28 + namePlateH / 2 + 2);
    ctx2.textAlign = 'left';

    /* ---------- art window ---------- */
    if (fullArt) {
      /* full-art: art edge to edge under a dark top, panels float */
      drawArt(ctx2, 10, 10, CANVAS_W - 20, 560, 18, img);
      var veils = ctx2.createLinearGradient(0, 10, 0, 130);
      veils.addColorStop(0, 'rgba(20,15,5,0.55)'); veils.addColorStop(1, 'rgba(20,15,5,0)');
      ctx2.fillStyle = veils;
      rr(ctx2, 10, 10, CANVAS_W - 20, 120, 18); ctx2.fill();
      ctx2.fillStyle = '#fff';
      ctx2.font = '800 40px "Segoe UI", Arial, sans-serif';
      ctx2.fillText(dispName, 38, 72);
      ctx2.textAlign = 'right';
      ctx2.fillText(hpText, CANVAS_W - 38, 72);
      ctx2.textAlign = 'left';
      /* bottom white panel */
      ctx2.fillStyle = 'rgba(255,255,255,0.93)';
      rr(ctx2, 10, 560, CANVAS_W - 20, 296, 18); ctx2.fill();
      drawAttackRows(ctx2, 588, null, true);
      /* weakness strip on the panel */
      drawWeakRow(ctx2, 796, null);
      ctx2.fillStyle = '#777';
      ctx2.font = '500 15px "Segoe UI", Arial, sans-serif';
      ctx2.textAlign = 'right';
      ctx2.fillText((state.illustrator || 'fan project') + '  ·  unofficial card', CANVAS_W - 32, 840);
      ctx2.textAlign = 'left';
    } else {
      drawArt(ctx2, 42, 122, CANVAS_W - 84, 296, 18, img);
      /* attack rows */
      drawAttackRows(ctx2, 452, (state.template === 'classic' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)'), false);
      /* weakness / retreat */
      drawWeakRow(ctx2, 676, (state.template === 'classic' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)'));
      /* flavor */
      ctx2.font = 'italic 500 19px Georgia, serif';
      ctx2.fillStyle = (state.template === 'pocket' ? '#6b6b6b' : 'rgba(70,55,20,0.85)');
      var lines = wrapLines(ctx2, state.flavor || 'A custom Pokemon made by a fan.', CANVAS_W - 96, 19);
      for (var li = 0; li < lines.length; li++) {
        ctx2.fillText(lines[li], 48, 778 + li * 26);
      }
      /* footer */
      ctx2.font = '500 15px "Segoe UI", Arial, sans-serif';
      ctx2.fillStyle = 'rgba(80,65,30,0.8)';
      ctx2.fillText((state.illustrator || 'Unclaimed') + '  ·  unsolicited & unofficial', 48, 846);
    }
  }

  function drawAttackRows(ctx2, y, bg, onWhite) {
    var rows = [
      { name: state.atk1Name, dmg: state.atk1Dmg },
      { name: state.atk2Name, dmg: state.atk2Dmg }
    ];
    var rowH = 92, gap = 12;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r.name && !r.dmg) continue;
      var ry = y + i * (rowH + gap);
      if (bg) { ctx2.fillStyle = bg; rr(ctx2, 30, ry, CANVAS_W - 60, rowH, 14); ctx2.fill(); }
      ctx2.fillStyle = TYPES[state.type].color;
      ctx2.beginPath(); ctx2.arc(52, ry + rowH / 2, 14, 0, Math.PI * 2); ctx2.fill();
      ctx2.fillStyle = '#333';
      ctx2.font = '600 26px "Segoe UI", Arial, sans-serif';
      var nm = r.name || 'Attack';
      var sz = fitFont(ctx2, nm, CANVAS_W - 60 - 120 - 70, 26, '600', '"Segoe UI", Arial, sans-serif');
      ctx2.font = '600 ' + sz + 'px "Segoe UI", Arial, sans-serif';
      ctx2.fillText(nm, 78, ry + rowH / 2 + 2);
      if (r.dmg) {
        ctx2.fillStyle = '#333';
        ctx2.font = '800 38px "Segoe UI", Arial, sans-serif';
        ctx2.textAlign = 'right';
        ctx2.fillText(String(r.dmg), CANVAS_W - 48, ry + rowH / 2 + 2);
        ctx2.textAlign = 'left';
      }
    }
  }

  function drawWeakRow(ctx2, y, bg) {
    if (bg) { ctx2.fillStyle = bg; rr(ctx2, 30, y, CANVAS_W - 60, 66, 14); ctx2.fill(); }
    ctx2.fillStyle = '#333';
    ctx2.font = '600 18px "Segoe UI", Arial, sans-serif';
    ctx2.fillText('Weakness', 48, y + 35);
    var W = TYPES[state.weakness] || null;
    if (W) {
      ctx2.fillStyle = W.color;
      rr(ctx2, 150, y + 14, 96, 38, 10); ctx2.fill();
      ctx2.fillStyle = '#fff';
      ctx2.font = '700 18px "Segoe UI", Arial, sans-serif';
      ctx2.textAlign = 'center';
      ctx2.fillText(W.label, 198, y + 34);
      ctx2.textAlign = 'left';
    } else {
      ctx2.fillStyle = '#888';
      ctx2.font = '500 17px "Segoe UI", Arial, sans-serif';
      ctx2.fillText('—', 158, y + 35);
    }
    ctx2.font = '600 18px "Segoe UI", Arial, sans-serif';
    ctx2.fillText('Retreat', CANVAS_W - 190, y + 35);
    ctx2.fillStyle = '#c9c9c9';
    ctx2.beginPath(); ctx2.arc(CANVAS_W - 92, y + 33, 12, 0, Math.PI * 2); ctx2.fill();
    ctx2.beginPath(); ctx2.arc(CANVAS_W - 62, y + 33, 12, 0, Math.PI * 2); ctx2.fill();
  }

  /* ---------------- render dispatch ---------------- */
  function render() {
    ensurePhoto(function () {
      var img = cachedImg.img || null;
      if (state.cardType === 'trainer') drawTrainerPlaceholder(ctx);
      else if (state.cardType === 'energy') drawEnergyCard(ctx, img);
      else drawPokemonCard(ctx, img);
    });
  }

  /* ---------------- controls: template / rarity / card type ---------------- */
  function bindChips(containerId, valueKey, after) {
    var wrap = $(containerId);
    if (!wrap) return;
    var buttons = wrap.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        for (var j = 0; j < buttons.length; j++) {
          buttons[j].setAttribute('aria-pressed', buttons[j] === this ? 'true' : 'false');
        }
        state[valueKey] = this.getAttribute('data-value');
        after && after(state[valueKey]);
        queueSave(); render();
      });
    }
  }
  function updateTemplateNote(v) {
    var notes = {
      classic: 'Classic — the warm yellow base-set look from 1999.',
      modern: 'Modern — deep border in your type color, Scarlet & Violet era.',
      pocket: 'TCG Pocket — soft rounded frame, clean white space.'
    };
    var el = $('cg-template-note');
    if (el) el.textContent = notes[v] || '';
  }
  function updateRarityNote(v) {
    var notes = {
      common: 'Common — the plain frame.',
      rare: 'Rare — a silver edge around the card.',
      holo: 'Holo — a rainbow edge, like a foil pull.',
      fullart: 'Full Art — artwork runs edge to edge, text floats over it.'
    };
    var el = $('cg-rarity-note');
    if (el) el.textContent = notes[v] || '';
  }
  function updateCardType(v) {
    var pokemonFields = $('cg-pokemon-fields');
    var energyFields = $('cg-energy-fields');
    var trainerBanner = $('cg-trainer-banner');
    if (pokemonFields) pokemonFields.hidden = (v !== 'pokemon');
    if (energyFields) energyFields.hidden = (v !== 'energy');
    if (trainerBanner) trainerBanner.hidden = (v !== 'trainer');
  }
  function updateTypeSelects() {
    var sel = $('cg-type'), selW = $('cg-weakness'), selE = $('cg-energy-type');
    [sel, selW, selE].forEach(function (s) {
      if (!s) return;
      s.innerHTML = '';
      var opts = ['none'].concat(Object.keys(TYPES));
      opts.forEach(function (t) {
        var o = document.createElement('option');
        o.value = t;
        o.textContent = t === 'none' ? 'None' : TYPES[t].label;
        s.appendChild(o);
      });
    });
  }

  /* ---------------- upload ---------------- */
  function handleFile(f) {
    if (!f || !/^image\//.test(f.type)) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var MAX = 1024;
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, MAX / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
        var c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        var c2 = c.getContext('2d');
        c2.fillStyle = '#fff'; c2.fillRect(0, 0, cw, ch);
        c2.drawImage(img, 0, 0, cw, ch);
        state.photo = { kind: 'file', data: c.toDataURL('image/jpeg', 0.85) };
        var n = $('cg-art-note');
        if (n) n.textContent = 'Photo added — it fills the art window automatically.';
        queueSave(); render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(f);
  }

  function bindUpload() {
    var up = $('cg-upload'), file = $('cg-file');
    if (!up || !file) return;
    up.addEventListener('click', function () { file.click(); });
    up.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); }
    });
    file.addEventListener('change', function () { handleFile(file.files && file.files[0]); });
    ['dragover', 'dragenter'].forEach(function (ev) {
      up.addEventListener(ev, function (e) { e.preventDefault(); up.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      up.addEventListener(ev, function (e) { e.preventDefault(); up.classList.remove('dragover'); });
    });
    up.addEventListener('drop', function (e) {
      var dt = e.dataTransfer;
      if (dt && dt.files && dt.files[0]) handleFile(dt.files[0]);
    });
  }

  function randomPokemon() {
    var pool = BASE_POOL.length ? BASE_POOL : POKEMON;
    var p = pool[Math.floor(Math.random() * pool.length)];
    state.photo = { kind: 'poke', id: p.i };
    if (!state.name && !$('cg-name').value) { state.name = p.n.charAt(0).toUpperCase() + p.n.slice(1).split('-').join(' ').split(' ').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); }
    if (p.t && p.t.length) { state.type = p.t[0]; state.weakness = weaknessFor(state.type); }
    fillForm(); queueSave(); render();
  }
  function weaknessFor(type) {
    var chart = {
      fire: 'water', water: 'electric', grass: 'fire', electric: 'ground', ice: 'fire',
      fighting: 'psychic', poison: 'ground', ground: 'water', flying: 'electric', psychic: 'dark',
      bug: 'fire', rock: 'water', ghost: 'dark', dark: 'fairy', dragon: 'fairy', steel: 'fire',
      fairy: 'steel', normal: 'fighting'
    };
    return chart[type] || 'fire';
  }

  /* ---------------- form <-> state ---------------- */
  function fillForm() {
    setVal('cg-name', state.name);
    setVal('cg-hp', state.hp);
    setVal('cg-type', state.type);
    setVal('cg-weakness', state.weakness);
    setVal('cg-atk1-name', state.atk1Name);
    setVal('cg-atk1-dmg', state.atk1Dmg);
    setVal('cg-atk2-name', state.atk2Name);
    setVal('cg-atk2-dmg', state.atk2Dmg);
    setVal('cg-flavor', state.flavor);
    setVal('cg-illustrator', state.illustrator);
    setVal('cg-energy-type', state.energyType);
  }
  function setVal(id, v) {
    var el = $(id);
    if (el && el.value !== String(v === undefined ? '' : v)) el.value = (v === undefined ? '' : v);
  }
  function readForm() {
    state.name = $('cg-name').value;
    state.hp = clampNum($('cg-hp').value, 1, 999, 60);
    state.type = $('cg-type').value || 'fire';
    state.weakness = $('cg-weakness').value || 'none';
    state.atk1Name = $('cg-atk1-name').value;
    state.atk1Dmg = clampNum($('cg-atk1-dmg').value, 0, 999, 0);
    state.atk2Name = $('cg-atk2-name').value;
    state.atk2Dmg = clampNum($('cg-atk2-dmg').value, 0, 999, 0);
    state.flavor = $('cg-flavor').value;
    state.illustrator = $('cg-illustrator').value;
    state.energyType = $('cg-energy-type').value || 'grass';
  }
  function clampNum(v, min, max, def) {
    var n = parseInt(v, 10);
    if (isNaN(n)) return def;
    return Math.min(max, Math.max(min, n));
  }

  /* ---------------- download / copy ---------------- */
  function download() {
    try {
      var data = canvas.toDataURL('image/png');
      var a = document.createElement('a');
      a.href = data;
      a.download = (state.name ? state.name.toLowerCase().split(' ').join('-') : 'pokemon') + '-pokemon-card.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      showModal('Download blocked — the card image is cross-origin. Re-upload the picture locally, or download using the Copy Card Text button instead.');
    }
  }
  function shareText() {
    var nm = state.name || 'My custom Pokemon card';
    var parts = [nm + ' — made with the Pokemon Card Generator'];
    if (state.hp) parts.push('HP ' + state.hp + ', ' + (TYPES[state.type] ? TYPES[state.type].label : '') + ' type');
    if (state.atk1Name) parts.push('attacks: ' + state.atk1Name + (state.atk1Dmg ? ' (' + state.atk1Dmg + ' dmg)' : '') + (state.atk2Name ? ', ' + state.atk2Name : ''));
    parts.push('Make your own: https://www.random-pokemon-generator.co/pokemon-card-generator/');
    return parts.join('\n');
  }
  function copyText() {
    var text = shareText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        var n = $('cg-saved-note');
        if (n) n.textContent = 'Copied! The card text is on your clipboard.';
      }, function () { showModal(text); });
    } else showModal(text);
  }
  function showModal(text) {
    var m = $('cg-modal');
    var t = $('cg-modal-text');
    if (!m || !t) return;
    t.value = text;
    m.hidden = false;
    t.focus(); t.select();
  }

  /* ---------------- init ---------------- */
  function init() {
    bindChips('cg-template-chips', 'template', updateTemplateNote);
    bindChips('cg-rarity-chips', 'rarity', updateRarityNote);
    bindChips('cg-cardtype-chips', 'cardType', updateCardType);
    updateTypeSelects();
    updateTemplateNote(state.template);
    updateRarityNote(state.rarity);
    updateCardType(state.cardType);
    fillForm();

    /* sync chip pressed states from restored state */
    [['cg-template-chips', 'template'], ['cg-rarity-chips', 'rarity'], ['cg-cardtype-chips', 'cardType']].forEach(function (pair) {
      var wrap = $(pair[0]);
      if (!wrap) return;
      var buttons = wrap.querySelectorAll('button');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-value') === state[pair[1]] ? 'true' : 'false');
      }
    });

    var ids = ['cg-name', 'cg-hp', 'cg-type', 'cg-weakness', 'cg-atk1-name', 'cg-atk1-dmg', 'cg-atk2-name', 'cg-atk2-dmg', 'cg-flavor', 'cg-illustrator', 'cg-energy-type'];
    ids.forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', function () { readForm(); queueSave(); render(); });
    });

    bindUpload();
    var rand = $('cg-rand-art');
    if (rand) rand.addEventListener('click', randomPokemon);
    var dl = $('cg-download');
    if (dl) dl.addEventListener('click', download);
    var cp = $('cg-copy');
    if (cp) cp.addEventListener('click', copyText);
    var close = $('cg-modal-close');
    if (close) close.addEventListener('click', function () { $('cg-modal').hidden = true; });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { var m = $('cg-modal'); if (m) m.hidden = true; }
    });

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
