/* ============================================================
   Favorite Pokemon of Each Type — 18-slot grid engine
   Flow: tap a type slot -> pick from that type's pool -> the grid
   fills up -> download a 1080 x 1080 PNG or copy a share link.
   Data: window.POKEMON_DATA (data.js). Artwork: PokeAPI sprites on
   raw.githubusercontent (CORS-ok: sends ACAO:*, so the export uses
   crossOrigin + canvas.toDataURL).
   Persistence: localStorage key rpg:favorite-each-type.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- type table (same values as the type chart page) ---------- */
  var TYPES = [
    { slug: 'normal', label: 'Normal', color: '#A8A878' },
    { slug: 'fire', label: 'Fire', color: '#FF9D55' },
    { slug: 'water', label: 'Water', color: '#6890F0' },
    { slug: 'electric', label: 'Electric', color: '#F8D030' },
    { slug: 'grass', label: 'Grass', color: '#78C850' },
    { slug: 'ice', label: 'Ice', color: '#98D8D8' },
    { slug: 'fighting', label: 'Fighting', color: '#C03028' },
    { slug: 'poison', label: 'Poison', color: '#A040A0' },
    { slug: 'ground', label: 'Ground', color: '#E0C068' },
    { slug: 'flying', label: 'Flying', color: '#A890F0' },
    { slug: 'psychic', label: 'Psychic', color: '#F85888' },
    { slug: 'bug', label: 'Bug', color: '#A8B820' },
    { slug: 'rock', label: 'Rock', color: '#B8A038' },
    { slug: 'ghost', label: 'Ghost', color: '#705898' },
    { slug: 'dragon', label: 'Dragon', color: '#7038F8' },
    { slug: 'dark', label: 'Dark', color: '#705848' },
    { slug: 'steel', label: 'Steel', color: '#B8B8D0' },
    { slug: 'fairy', label: 'Fairy', color: '#EE99AC' }
  ];
  var TYPE_MAP = {};
  TYPES.forEach(function (t) { TYPE_MAP[t.slug] = t; });

  /* ---------- data ---------- */
  var DATA = window.POKEMON_DATA || [];
  var BY_ID = {};
  DATA.forEach(function (p) { BY_ID[p.i] = p; });

  var POOLS = {};
  TYPES.forEach(function (t) { POOLS[t.slug] = []; });
  DATA.forEach(function (p) {
    p.t.forEach(function (t) { if (POOLS[t]) POOLS[t].push(p); });
  });
  TYPES.forEach(function (t) {
    POOLS[t.slug].sort(function (a, b) { return (a.si - b.si) || (a.i - b.i); });
  });

  var NAME_OVERRIDES = {
    'ho-oh': 'Ho-Oh',
    'porygon-z': 'Porygon-Z',
    'mr-mime': 'Mr. Mime',
    'mime-jr': 'Mime Jr.',
    'farfetchd': "Farfetch'd",
    'sirfetchd': "Sirfetch'd",
    'type-null': 'Type: Null',
    'jangmo-o': 'Jangmo-o',
    'hakamo-o': 'Hakamo-o',
    'kommo-o': 'Kommo-o'
  };
  function displayName(n) {
    if (NAME_OVERRIDES[n]) return NAME_OVERRIDES[n];
    return n.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  function smallSprite(p) { return p.sp.replace('/other/official-artwork/', '/'); }

  /* ---------- state ---------- */
  var LS_KEY = 'rpg:favorite-each-type';
  var state = { picks: {}, name: '' };
  var activeSlug = null;
  var completeTracked = false;

  function track(event, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', event, params || {}); } catch (e) {}
  }
  function filledCount() {
    var n = 0;
    TYPES.forEach(function (t) { if (state.picks[t.slug]) n++; });
    return n;
  }
  function maybeComplete() {
    if (!completeTracked && filledCount() === 18) {
      completeTracked = true;
      track('fet_complete', { slots: 18 });
    }
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var st = JSON.parse(raw);
      if (st && typeof st === 'object') {
        if (st.name) state.name = String(st.name).slice(0, 24);
        if (st.picks) {
          TYPES.forEach(function (t) {
            var id = st.picks[t.slug];
            if (id && BY_ID[id]) state.picks[t.slug] = id;
          });
        }
      }
    } catch (e) {}
  }

  /* ---------- grid ---------- */
  function renderGrid() {
    var grid = $('fet-grid');
    grid.innerHTML = '';
    TYPES.forEach(function (t) {
      var id = state.picks[t.slug];
      var p = id ? BY_ID[id] : null;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fet-slot' + (p ? ' filled' : '') + (activeSlug === t.slug ? ' active' : '');
      btn.setAttribute('aria-label', 'Pick your favorite ' + t.label + ' Pokemon' + (p ? ', currently ' + displayName(p.n) : ''));
      var tag = document.createElement('span');
      tag.className = 'fet-tag';
      tag.style.background = t.color;
      tag.textContent = t.label;
      btn.appendChild(tag);
      if (p) {
        var img = document.createElement('img');
        img.src = smallSprite(p);
        img.alt = '';
        img.width = 76;
        img.height = 76;
        img.loading = 'lazy';
        btn.appendChild(img);
        var nm = document.createElement('span');
        nm.className = 'fet-name';
        nm.textContent = displayName(p.n);
        btn.appendChild(nm);
      } else {
        var em = document.createElement('span');
        em.className = 'fet-empty';
        em.textContent = 'Pick one';
        btn.appendChild(em);
      }
      btn.addEventListener('click', function () { openPicker(t.slug); });
      grid.appendChild(btn);
    });
    syncCounter();
  }
  function syncCounter() {
    $('fet-count').textContent = 'Picked ' + filledCount() + ' / 18';
  }

  /* ---------- slot picker modal ---------- */
  function openPicker(slug) {
    if (!TYPE_MAP[slug]) return;
    activeSlug = slug;
    $('fet-modal-title').textContent = 'Your favorite ' + TYPE_MAP[slug].label + ' Pokemon';
    $('fet-search').value = '';
    renderPool('');
    renderGrid();
    $('fet-modal').hidden = false;
    try { $('fet-search').focus(); } catch (e) {}
  }
  function closePicker() {
    activeSlug = null;
    $('fet-modal').hidden = true;
    renderGrid();
  }
  function renderPool(q) {
    if (!activeSlug) return;
    var wrap = $('fet-pool');
    var pool = POOLS[activeSlug] || [];
    var cur = state.picks[activeSlug];
    var used = {};
    TYPES.forEach(function (t) { if (state.picks[t.slug]) used[state.picks[t.slug]] = true; });
    var ql = (q || '').trim().toLowerCase();
    wrap.innerHTML = '';
    var shown = 0;
    pool.forEach(function (p) {
      var name = displayName(p.n);
      if (ql && name.toLowerCase().indexOf(ql) < 0 && p.n.indexOf(ql) < 0) return;
      shown++;
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'fet-item' + (p.i === cur ? ' current' : '') + (used[p.i] && p.i !== cur ? ' used' : '');
      item.setAttribute('aria-label', 'Pick ' + name);
      var img = document.createElement('img');
      img.src = smallSprite(p);
      img.alt = '';
      img.width = 64;
      img.height = 64;
      img.loading = 'lazy';
      item.appendChild(img);
      var nm = document.createElement('span');
      nm.className = 'fet-item-name';
      nm.textContent = name;
      item.appendChild(nm);
      item.addEventListener('click', function () { setPick(activeSlug, p.i); });
      wrap.appendChild(item);
    });
    if (!shown) {
      var none = document.createElement('p');
      none.className = 'tool-note';
      none.textContent = 'No Pokemon match that search.';
      wrap.appendChild(none);
    }
  }
  function setPick(slug, id) {
    if (!TYPE_MAP[slug] || !BY_ID[id]) return;
    state.picks[slug] = id;
    save();
    maybeComplete();
    closePicker();
    $('fet-status').textContent = '';
  }
  function clearSlot() {
    if (activeSlug) {
      delete state.picks[activeSlug];
      save();
      $('fet-status').textContent = 'Slot cleared.';
    }
    closePicker();
  }
  $('fet-close').addEventListener('click', function () { closePicker(); });
  $('fet-clear').addEventListener('click', clearSlot);
  $('fet-modal').addEventListener('click', function (e) { if (e.target === $('fet-modal')) closePicker(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('fet-modal').hidden) closePicker();
    if (e.key === 'Escape' && !$('share-modal').hidden) $('share-modal').hidden = true;
  });
  $('fet-search').addEventListener('input', function () { renderPool($('fet-search').value); });

  /* ---------- random fill ---------- */
  function randomFill() {
    var used = {};
    TYPES.forEach(function (t) { if (state.picks[t.slug]) used[state.picks[t.slug]] = true; });
    var added = 0;
    TYPES.forEach(function (t) {
      if (state.picks[t.slug]) return;
      var pool = POOLS[t.slug] || [];
      var candidates = pool.filter(function (p) { return !used[p.i]; });
      if (!candidates.length) candidates = pool;
      if (!candidates.length) return;
      var pick = candidates[Math.floor(Math.random() * candidates.length)];
      state.picks[t.slug] = pick.i;
      used[pick.i] = true;
      added++;
    });
    save();
    maybeComplete();
    renderGrid();
    $('fet-status').textContent = added
      ? 'Filled ' + added + ' empty slot' + (added === 1 ? '' : 's') + ' at random.'
      : 'Every slot is already filled.';
  }

  /* ---------- canvas export ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function tint(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var f = 0.82;
    r = Math.round(r + (255 - r) * f);
    g = Math.round(g + (255 - g) * f);
    b = Math.round(b + (255 - b) * f);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function inkFor(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum < 150 ? '#ffffff' : '#121212';
  }
  function loadImage(url, ok, fail) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { ok(img); };
    img.onerror = function () { fail(); };
    img.src = url;
  }
  function loadPickArt(p, cb) {
    loadImage(p.sp, function (img) { cb(img); }, function () {
      loadImage(smallSprite(p), function (img) { cb(img); }, function () { cb(null); });
    });
  }
  function drawGrid(canvas, arts) {
    var W = 1080, H = 1080;
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffdf5';
    ctx.fillRect(0, 0, W, H);
    var name = (state.name || '').trim();
    var top = 0;
    if (name) {
      top = 96;
      ctx.fillStyle = '#121212';
      ctx.font = 'bold 44px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, W / 2, 52, W - 80);
    }
    var cols = 6, rows = 3;
    var cw = W / cols, chh = (H - top) / rows, pad = 7;
    TYPES.forEach(function (t, idx) {
      var col = idx % cols, row = Math.floor(idx / cols);
      var x = col * cw + pad, y = top + row * chh + pad;
      var w = cw - pad * 2, h = chh - pad * 2;
      var id = state.picks[t.slug];
      var p = id ? BY_ID[id] : null;
      roundRect(ctx, x, y, w, h, 16);
      if (p) {
        ctx.fillStyle = tint(t.color);
        ctx.fill();
        ctx.setLineDash([]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(18,18,18,0.22)';
        ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.setLineDash([10, 8]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(18,18,18,0.35)';
        ctx.stroke();
        ctx.setLineDash([]);
      }
      /* type pill */
      ctx.font = 'bold 20px Arial, sans-serif';
      var label = t.label.toUpperCase();
      var lw = ctx.measureText(label).width;
      var pw = lw + 34, ph = 36;
      var px = x + (w - pw) / 2, py = y + 12;
      roundRect(ctx, px, py, pw, ph, 18);
      ctx.fillStyle = t.color;
      ctx.fill();
      ctx.fillStyle = inkFor(t.color);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, py + ph / 2 + 1);
      if (p) {
        var art = arts[t.slug] || null;
        var aw = 148;
        var ax = x + (w - aw) / 2;
        var ay = py + ph + 8;
        if (art) ctx.drawImage(art, ax, ay, aw, aw);
        var dn = displayName(p.n);
        var maxw = w - 18;
        var fs = 24;
        ctx.font = 'bold ' + fs + 'px Arial, sans-serif';
        ctx.fillStyle = '#121212';
        while (ctx.measureText(dn).width > maxw && fs > 15) {
          fs -= 2;
          ctx.font = 'bold ' + fs + 'px Arial, sans-serif';
        }
        if (ctx.measureText(dn).width > maxw) {
          while (dn.length > 1 && ctx.measureText(dn + '\u2026').width > maxw) dn = dn.slice(0, -1);
          dn = dn + '\u2026';
        }
        ctx.fillText(dn, x + w / 2, ay + aw + 26);
      }
    });
  }
  function download() {
    var status = $('fet-status');
    var n = filledCount();
    if (!n) {
      status.textContent = 'Pick at least one favorite first.';
      return;
    }
    status.textContent = 'Preparing your grid image\u2026';
    var toLoad = [];
    TYPES.forEach(function (t) { if (state.picks[t.slug]) toLoad.push(t.slug); });
    var arts = {};
    var pending = toLoad.length;
    function finish() {
      var canvas = $('fet-canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'fet-canvas';
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
      }
      try {
        drawGrid(canvas, arts);
        var data = canvas.toDataURL('image/png');
        var a = document.createElement('a');
        a.href = data;
        a.download = 'favorite-pokemon-of-each-type.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        track('fet_download', { picks: n });
        status.textContent = 'Grid saved \u2014 check your downloads.';
      } catch (e) {
        status.textContent = 'Image export failed in this browser. Try again, or take a screenshot of the grid above.';
      }
    }
    if (!pending) { finish(); return; }
    toLoad.forEach(function (slug) {
      var p = BY_ID[state.picks[slug]];
      loadPickArt(p, function (img) {
        arts[slug] = img;
        pending--;
        if (pending <= 0) finish();
      });
    });
  }

  /* ---------- share ---------- */
  function buildShareUrl() {
    var parts = TYPES.map(function (t) { return state.picks[t.slug] ? state.picks[t.slug] : 0; });
    var url = location.origin + location.pathname + '?p=' + parts.join('-');
    var name = (state.name || '').trim();
    if (name) url += '&n=' + encodeURIComponent(name);
    return url;
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
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); })
        .catch(function () { if (!legacyCopy()) done(false); else done(true); });
    } else {
      if (!legacyCopy()) done(false); else done(true);
    }
  }
  function showShareModal(text) {
    var ta = $('share-modal-text');
    ta.value = text;
    $('share-modal').hidden = false;
    try { ta.focus(); ta.select(); } catch (e) {}
  }
  function copyFavorites() {
    var status = $('fet-status');
    if (!filledCount()) {
      status.textContent = 'Pick at least one favorite first.';
      return;
    }
    var url = buildShareUrl();
    copyToClipboard(url, function (ok) {
      if (ok) {
        status.textContent = 'Link copied \u2014 it restores all 18 picks, trainer name included.';
        track('fet_copy', { picks: filledCount() });
      } else {
        status.textContent = '';
        showShareModal(url);
      }
    });
  }
  $('share-modal-close').addEventListener('click', function () { $('share-modal').hidden = true; });
  $('share-modal').addEventListener('click', function (e) { if (e.target === $('share-modal')) $('share-modal').hidden = true; });

  /* ---------- reset + name ---------- */
  $('fet-reset').addEventListener('click', function () {
    state.picks = {};
    state.name = '';
    $('fet-name').value = '';
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    renderGrid();
    $('fet-status').textContent = 'Grid cleared.';
  });
  $('fet-name').addEventListener('input', function () {
    state.name = $('fet-name').value.slice(0, 24);
    save();
  });

  /* ---------- init ---------- */
  function applyParams(params) {
    var raw = params.get('p');
    if (raw) {
      var parts = raw.split('-');
      TYPES.forEach(function (t, idx) {
        var v = parseInt(parts[idx], 10);
        if (v && BY_ID[v]) state.picks[t.slug] = v;
      });
    }
    var n = params.get('n');
    if (n) state.name = n.slice(0, 24);
  }
  function init() {
    var params = new URLSearchParams(location.search);
    if (params.get('p')) applyParams(params); else load();
    $('fet-name').value = state.name || '';
    renderGrid();
    $('fet-fill').addEventListener('click', randomFill);
    $('fet-download').addEventListener('click', download);
    $('fet-copy').addEventListener('click', copyFavorites);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
