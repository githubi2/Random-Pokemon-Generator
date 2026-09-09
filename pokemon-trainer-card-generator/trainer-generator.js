/* ============================================================
   Pokemon Trainer Card Generator — vanilla JS engine
   Flow: random sample card on load -> editable fields ->
   live canvas preview (900x720) -> PNG download / copy text.
   Partners: official PokeAPI sprites (CORS-ok), three slots.
   State persists in localStorage (rpg:trainer-state).
   Data: window.POKEMON_DATA (data.js)
   ============================================================ */
(function () {
  'use strict';

  var POKEMON = window.POKEMON_DATA || [];
  var BASE_POOL = [];
  POKEMON.forEach(function (p) { if (p.ev === 'initial') BASE_POOL.push(p); });

  var NAMES = ['Ash', 'Misty', 'Brock', 'Red', 'Blue', 'Dawn', 'May', 'Serena', 'Lance', 'Steven', 'Cynthia', 'Leaf', 'Gold', 'Silver', 'Nessa', 'Raihan', 'Leon', 'Hop', 'Marnie', 'Lillie', 'Mika', 'Riley', 'Kira', 'Theo', 'Zach', 'Emma', 'Noah', 'Olivia', 'Lyra', 'Cade', 'Jo', 'Ari', 'Sam', 'Taro'];
  var TITLES = ['Aspiring Champion', 'Shiny Hunter', 'Catch \u2019Em All Trainer', 'Elite Four Aspirant', 'Battle Tower Regular', 'Pastel Adventurer', 'Legend Hunter', 'Dex Completer', 'Route Rookie', 'Sandbox Legend', 'Nuzlocke Veteran', 'Reward Card Collector'];
  var BGS = {
    ocean: { top: '#4a7fb5', bottom: '#2f5b8c', name: 'Ocean' },
    meadow: { top: '#5c9e57', bottom: '#3f7a3c', name: 'Meadow' },
    cinder: { top: '#c35b3a', bottom: '#8f4026', name: 'Cinder' },
    night: { top: '#5b4a8c', bottom: '#36295c', name: 'Night' }
  };

  var LS_KEY = 'rpg:trainer-state';
  var W = 900, H = 720;

  function $(id) { return document.getElementById(id); }
  var canvas = $('tg-canvas');
  var ctx = canvas.getContext('2d');

  /* ---------------- state ---------------- */
  var defaultState = { style: 'classic', bg: 'ocean', name: '', title: '', badges: 4, partners: [25, 1, 133], battles: 123, caught: 630, photo: null };
  var state = loadState();

  function loadState() {
    try {
      var raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return randomState();
      var s = JSON.parse(raw);
      var out = JSON.parse(JSON.stringify(defaultState));
      Object.keys(out).forEach(function (k) { if (s[k] !== undefined) out[k] = s[k]; });
      return out;
    } catch (e) { return randomState(); }
  }
  function randomState() {
    var s = JSON.parse(JSON.stringify(defaultState));
    s.name = NAMES[Math.floor(Math.random() * NAMES.length)];
    s.title = TITLES[Math.floor(Math.random() * TITLES.length)];
    s.badges = Math.floor(Math.random() * 9);
    s.battles = 10 + Math.floor(Math.random() * 310);
    s.caught = 20 + Math.floor(Math.random() * 600);
    s.partners = [randPoke(), randPoke(), randPoke()];
    s.photo = null;
    return s;
  }
  function randPoke() {
    var pool = BASE_POOL.length ? BASE_POOL : POKEMON;
    return pool[Math.floor(Math.random() * pool.length)].i;
  }
  var saveTimer = null;
  function saveState() {
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function queueSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 300);
    var s = $('tg-saved-note');
    if (s) s.textContent = '';
  }
  function newSample() {
    var fresh = randomState();
    state = fresh;
    syncChips(); fillForm(); buildPartners(); queueSave(); render();
  }

  /* ---------------- name / art helpers ---------------- */
  function displayName(p) {
    return p.n.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function findPoke(id) {
    for (var i = 0; i < POKEMON.length; i++) { if (POKEMON[i].i === id) return POKEMON[i]; }
    return null;
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function drawFitArt(c, img, x, y, w, h, r, bg) {
    c.save();
    rr(c, x, y, w, h, r);
    c.clip();
    if (bg) { c.fillStyle = bg; c.fillRect(x, y, w, h); }
    if (img && img.naturalWidth) {
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var sc = Math.max(w / iw, h / ih);
      var sw = w / sc, sh = h / sc;
      c.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
    }
    c.restore();
  }
  function drawSilhouette(c, x, y, w, h) {
    c.save();
    rr(c, x, y, w, h, 24); c.clip();
    var g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#c9c2b4'); g.addColorStop(1, '#a39a88');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    c.fillStyle = '#6f6659';
    c.beginPath(); c.arc(x + w / 2, y + h * 0.36, w * 0.2, 0, Math.PI * 2); c.fill();
    c.beginPath();
    c.moveTo(x + w * 0.18, y + h);
    c.quadraticCurveTo(x + w / 2, y + h * 0.52, x + w * 0.82, y + h);
    c.closePath(); c.fill();
    c.restore();
  }
  function drawBadge(c, x, y, r, earned, idx) {
    if (earned) {
      var g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
      g.addColorStop(0, '#ffe9a3'); g.addColorStop(0.7, '#f6c945'); g.addColorStop(1, '#c98f1b');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#8a5e0e'; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#6b4705';
      c.font = '700 ' + Math.round(r * 1.1) + 'px "Segoe UI", Arial, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('★', x, y + 1);
    } else {
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.font = '600 ' + Math.round(r * 0.9) + 'px "Segoe UI", Arial, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(idx), x, y + 1);
    }
  }

  /* ---------------- partner thumbs ---------------- */
  var partnerImgs = [null, null, null];
  function buildPartners() {
    var wrap = $('tg-parts');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      (function (i) {
        var slot = document.createElement('div');
        slot.className = 'pnk';
        var c = document.createElement('canvas');
        c.width = 150; c.height = 150;
        c.setAttribute('aria-label', 'Partner Pokemon slot ' + (i + 1));
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-text';
        btn.textContent = '↻ Reroll';
        slot.appendChild(c);
        slot.appendChild(btn);
        wrap.appendChild(slot);
        loadPartner(i, c);
        btn.addEventListener('click', function () {
          state.partners[i] = randPoke();
          loadPartner(i, c);
          queueSave(); render();
        });
      })(i);
    }
  }
  function loadPartner(i, c) {
    var p = findPoke(state.partners[i]);
    if (!p) { drawPartnerCanvas(c, null); return; }
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { partnerImgs[i] = img; drawPartnerCanvas(c, img); render(); };
    img.onerror = function () { drawPartnerCanvas(c, null); };
    img.src = p.sp;
  }
  function drawPartnerCanvas(c, img) {
    var c2 = c.getContext('2d');
    c2.clearRect(0, 0, 150, 150);
    drawFitArt(c2, img, 6, 6, 138, 138, 16, '#f5f2ea');
  }

  /* ---------------- portrait ---------------- */
  var portraitImg = null;
  function loadPortrait() {
    if (!state.photo) { portraitImg = null; render(); return; }
    var img = new Image();
    img.onload = function () { portraitImg = img; render(); };
    img.onerror = function () { portraitImg = null; render(); };
    img.src = state.photo;
  }
  function handleFile(f) {
    if (!f || !/^image\//.test(f.type)) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var MAX = 640;
        var w = img.naturalWidth, h = img.naturalHeight;
        var sc = Math.min(1, MAX / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(h * sc));
        var c2 = c.getContext('2d');
        c2.fillStyle = '#fff'; c2.fillRect(0, 0, c.width, c.height);
        c2.drawImage(img, 0, 0, c.width, c.height);
        state.photo = c.toDataURL('image/jpeg', 0.85);
        loadPortrait(); queueSave();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(f);
  }

  /* ---------------- card painter ---------------- */
  function render() {
    var B = BGS[state.bg] || BGS.ocean;
    ctx.clearRect(0, 0, W, H);

    /* background */
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, B.top); g.addColorStop(1, B.bottom);
    ctx.fillStyle = g;
    rr(ctx, 0, 0, W, H, 22); ctx.fill();

    /* frame */
    if (state.style === 'classic') {
      ctx.strokeStyle = '#1d3550'; ctx.lineWidth = 18;
      rr(ctx, 9, 9, W - 18, H - 18, 16); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3;
      rr(ctx, 22, 22, W - 44, H - 44, 12); ctx.stroke();
    } else {
      var fg = ctx.createLinearGradient(0, 0, W, H);
      fg.addColorStop(0, 'rgba(255,255,255,0.95)'); fg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); fg.addColorStop(1, 'rgba(255,255,255,0.95)');
      ctx.strokeStyle = fg; ctx.lineWidth = 12;
      rr(ctx, 6, 6, W - 12, H - 12, 18); ctx.stroke();
    }

    /* name plate */
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    rr(ctx, 48, 42, W - 96, 96, 18); ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = '900 44px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.name || 'Your Name', 72, 76);
    ctx.font = '600 21px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText((state.title || 'Pokemon Trainer') + '  ·  Trainer Card', 74, 118);

    /* badge row */
    var badgeCount = Math.max(0, Math.min(8, parseInt(state.badges, 10)));
    var bx0 = 78, by = 186, gapx = 92;
    for (var b = 0; b < 8; b++) {
      drawBadge(ctx, bx0 + b * gapx, by, 26, b < badgeCount, b + 1);
    }

    /* portrait */
    if (state.photo && portraitImg) drawFitArt(ctx, portraitImg, 48, 240, 250, 310, 24, null);
    else drawSilhouette(ctx, 48, 240, 250, 310);

    /* partner row label */
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Partners', 340, 246);

    /* partner cards */
    var px0 = 340, py = 270, pw = 165, ph = 200, pgap = 118;
    ctx.textAlign = 'left';
    for (var pi = 0; pi < 3; pi++) {
      var x = px0 + pi * pgap;
      var p = findPoke(state.partners[pi]);
      drawFitArt(ctx, partnerImgs[pi], x, py, pw, ph, 18, 'rgba(255,255,255,0.86)');
      ctx.font = '600 17px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      var nm = p ? displayName(p) : '???';
      var short = nm.length > 13 ? nm.slice(0, 12) + '…' : nm;
      ctx.fillText(short, x, py + ph + 26);
    }

    /* stats bar */
    var stats = [
      { label: 'Battles won', val: state.battles },
      { label: 'Pokemon caught', val: state.caught },
      { label: 'Badges', val: badgeCount }
    ];
    var sx = 48, sy = 546, sWW = 250, sH = 92, sg = 38;
    for (var si = 0; si < stats.length; si++) {
      var xs = sx + si * (sWW + sg);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      rr(ctx, xs, sy, sWW, sH, 16); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '800 34px "Segoe UI", Arial, sans-serif';
      ctx.fillText(String(stats[si].val), xs + 22, sy + 40);
      ctx.font = '500 16px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(stats[si].label, xs + 22, sy + 70);
    }

    /* footer */
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '500 16px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Unofficial fan card — not affiliated with Nintendo / The Pokemon Company', W / 2 - 320, 676);
  }

  /* ---------------- controls ---------------- */
  function syncChips() {
    [['tg-style-chips', 'style'], ['tg-bg-chips', 'bg']].forEach(function (pair) {
      var wrap = $(pair[0]);
      if (!wrap) return;
      var buttons = wrap.querySelectorAll('button');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-value') === state[pair[1]] ? 'true' : 'false');
      }
    });
    var bw = $('tg-badge-chips');
    if (bw) {
      var buttons = bw.querySelectorAll('button');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute('aria-pressed', Number(buttons[i].getAttribute('data-value')) === state.badges ? 'true' : 'false');
      }
    }
    var note = $('tg-badge-note');
    if (note) {
      note.textContent = state.badges === 0 ? '0 badges — a fresh journey.' :
        state.badges === 8 ? 'All eight badges — champion status.' :
        state.badges + ' badge' + (state.badges > 1 ? 's' : '') + ' — keep going.';
    }
  }
  function bindChips(containerId, valueKey) {
    var wrap = $(containerId);
    if (!wrap) return;
    var buttons = wrap.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        state[valueKey] = this.getAttribute('data-value');
        syncChips(); queueSave(); render();
      });
    }
  }
  function fillForm() {
    setVal('tg-name', state.name);
    setVal('tg-title', state.title);
    setVal('tg-battles', state.battles);
    setVal('tg-caught', state.caught);
  }
  function setVal(id, v) {
    var el = $(id);
    if (el && el.value !== String(v === undefined ? '' : v)) el.value = (v === undefined ? '' : v);
  }
  function readForm() {
    state.name = $('tg-name').value;
    state.title = $('tg-title').value;
    state.battles = clampNum($('tg-battles').value, 0, 99999, 0);
    state.caught = clampNum($('tg-caught').value, 0, 99999, 0);
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
      a.download = (state.name ? state.name.toLowerCase().split(' ').join('-') : 'trainer') + '-trainer-card.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      showModal('Download blocked — the card image is cross-origin. Re-upload the portrait locally, or use Copy Card Text instead.');
    }
  }
  function shareText() {
    var lines = [(state.name || 'My trainer card') + ' — made with the Pokemon Trainer Card Generator'];
    lines.push((state.title || 'Pokemon Trainer') + ' · ' + state.badges + ' badges · ' + state.battles + ' battles won · ' + state.caught + ' Pokemon caught');
    lines.push('Make your own: https://www.random-pokemon-generator.co/pokemon-trainer-card-generator/');
    return lines.join('\n');
  }
  function copyText() {
    var text = shareText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        var n = $('tg-saved-note');
        if (n) n.textContent = 'Copied! The card text is on your clipboard.';
      }, function () { showModal(text); });
    } else showModal(text);
  }
  function showModal(text) {
    var m = $('tg-modal');
    var t = $('tg-modal-text');
    if (!m || !t) return;
    t.value = text;
    m.hidden = false;
    t.focus(); t.select();
  }

  /* ---------------- init ---------------- */
  function init() {
    /* badge chips 0-8 */
    var bw = $('tg-badge-chips');
    if (bw) {
      for (var i = 0; i <= 8; i++) {
        (function (n) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'chip-btn';
          b.setAttribute('data-value', String(n));
          b.textContent = String(n);
          b.addEventListener('click', function () {
            state.badges = n;
            syncChips(); queueSave(); render();
          });
          bw.appendChild(b);
        })(i);
      }
    }

    bindChips('tg-style-chips', 'style');
    bindChips('tg-bg-chips', 'bg');
    syncChips();
    fillForm();
    buildPartners();
    loadPortrait();

    ['tg-name', 'tg-title', 'tg-battles', 'tg-caught'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', function () { readForm(); queueSave(); render(); });
    });

    var up = $('tg-upload'), file = $('tg-file');
    if (up && file) {
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

    var rand = $('tg-rand');
    if (rand) rand.addEventListener('click', newSample);
    var dl = $('tg-download');
    if (dl) dl.addEventListener('click', download);
    var cp = $('tg-copy');
    if (cp) cp.addEventListener('click', copyText);
    var close = $('tg-modal-close');
    if (close) close.addEventListener('click', function () { $('tg-modal').hidden = true; });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { var m = $('tg-modal'); if (m) m.hidden = true; }
    });

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
