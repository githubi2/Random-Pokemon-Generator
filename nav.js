/* ============================================================
   Hamburger nav + Tools dropdown — shared by all pages
   ============================================================ */
(function () {
  'use strict';
  var btn = document.getElementById('nav-toggle');
  var nav = document.getElementById('main-nav');
  if (!btn || !nav) return;

  function setOpen(open) {
    nav.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? '✕' : '☰';
  }

  btn.addEventListener('click', function () {
    setOpen(!nav.classList.contains('nav-open'));
  });

  /* collapse after tapping a menu item (anchor or page nav) */
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  /* ---------- Tools dropdown ---------- */
  var group = document.querySelector('.nav-group');
  var tools = document.getElementById('tools-toggle');
  if (!group || !tools) return;

  tools.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = group.classList.toggle('open');
    tools.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* close when clicking outside */
  document.addEventListener('click', function (e) {
    if (!group.contains(e.target)) {
      group.classList.remove('open');
      tools.setAttribute('aria-expanded', 'false');
    }
  });

  /* close on Escape */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      group.classList.remove('open');
      tools.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* ============================================================
   长下拉框：自己画展开层
   原生 select 弹出列表由系统绘制，选中蓝和悬停蓝都改不掉。
   只接管选项 >= 8 的单选下拉；多选（Move/Ability 筛选）保持原样。
   弹窗里的 select 是打开后才填选项的，所以列表在每次展开时重建。
   ============================================================ */
(function () {
  'use strict';
  if (!document.querySelectorAll) return;

  function each(nodes, fn) { Array.prototype.forEach.call(nodes, fn); }

  function enhance(sel) {
    if (sel.dataset.cdrop || sel.multiple || sel.disabled) return;
    if (sel.options.length < 8) return;
    sel.dataset.cdrop = '1';

    var wrap = document.createElement('div');
    wrap.className = 'cdrop';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('cdrop-native');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cdrop-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');

    var list = document.createElement('ul');
    list.className = 'cdrop-list';
    list.setAttribute('role', 'listbox');
    var built = -1;

    function buildList() {
      list.textContent = '';
      each(sel.options, function (o, i) {
        var li = document.createElement('li');
        li.className = 'cdrop-item';
        li.setAttribute('role', 'option');
        li.textContent = o.text;
        li.addEventListener('mousedown', function (e) { e.preventDefault(); });
        li.addEventListener('click', function (e) {
          e.stopPropagation();
          sel.selectedIndex = i;
          sel.dispatchEvent(new Event('input', { bubbles: true }));
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          syncLabel();
          close();
          btn.focus();
        });
        list.appendChild(li);
      });
      built = sel.options.length;
    }

    function syncLabel() {
      var i = sel.selectedIndex;
      btn.textContent = i >= 0 ? sel.options[i].text : '';
      each(list.children, function (c, k) { c.classList.toggle('is-sel', k === i); });
    }

    function close() {
      wrap.classList.remove('is-open', 'cdrop-up');
      btn.setAttribute('aria-expanded', 'false');
    }

    function open() {
      each(document.querySelectorAll('.cdrop.is-open'), function (d) {
        d.classList.remove('is-open', 'cdrop-up');
      });
      if (sel.options.length !== built) buildList();
      syncLabel();
      var r = btn.getBoundingClientRect();
      if (window.innerHeight - r.bottom < 300 && r.top > 320) wrap.classList.add('cdrop-up');
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      var cur = list.querySelector('.is-sel');
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'center' });
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (wrap.classList.contains('is-open')) close(); else open();
    });

    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var d = e.key === 'ArrowDown' ? 1 : -1;
        var n = sel.selectedIndex + d;
        if (n < 0) n = sel.options.length - 1;
        if (n >= sel.options.length) n = 0;
        sel.selectedIndex = n;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        syncLabel();
      }
    });

    sel.addEventListener('change', syncLabel);
    wrap.appendChild(btn);
    wrap.appendChild(list);
    buildList();
    syncLabel();
  }

  function init() { each(document.querySelectorAll('select'), enhance); }

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest || !e.target.closest('.cdrop')) {
      each(document.querySelectorAll('.cdrop.is-open'), function (d) { d.classList.remove('is-open', 'cdrop-up'); });
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      each(document.querySelectorAll('.cdrop.is-open'), function (d) { d.classList.remove('is-open', 'cdrop-up'); });
    }
  });

  function boot() {
    init();
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        each(m.addedNodes, function (n) {
          if (!n || n.nodeType !== 1) return;
          if (n.tagName === 'SELECT') { enhance(n); return; }
          if (n.tagName === 'OPTION' || n.tagName === 'OPTGROUP') {
            var p = n.parentElement;
            if (p && p.tagName === 'SELECT') enhance(p);
            return;
          }
          if (n.querySelectorAll) {
            each(n.querySelectorAll('select'), enhance);
            each(n.querySelectorAll('option'), function (o) {
              var sp = o.parentElement;
              if (sp && sp.tagName === 'SELECT') enhance(sp);
            });
          }
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ============================================================
   宝可梦详情弹窗（全站通用）
   页面里调 window.pokeDetail({ p: pokemon, shiny: false }) 即可。
   弹窗 DOM 由本脚本懒创建，页面不用改 HTML。
   ============================================================ */
(function () {
  'use strict';

  var TYPE_COLOR = {
    fire: '#FF9D55', water: '#6890F0', grass: '#78C850', electric: '#F8D030',
    ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0', ground: '#E0C068',
    flying: '#A890F0', psychic: '#F85888', bug: '#A8B820', rock: '#B8A038',
    ghost: '#705898', dark: '#705848', dragon: '#7038F8', steel: '#B8B8D0',
    fairy: '#EE99AC', normal: '#A8A878'
  };
  var TYPE_LABEL = {
    fire: 'Fire', water: 'Water', grass: 'Grass', electric: 'Electric',
    ice: 'Ice', fighting: 'Fighting', poison: 'Poison', ground: 'Ground',
    flying: 'Flying', psychic: 'Psychic', bug: 'Bug', rock: 'Rock',
    ghost: 'Ghost', dark: 'Dark', dragon: 'Dragon', steel: 'Steel',
    fairy: 'Fairy', normal: 'Normal'
  };
  var STAT_NAMES = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
  var REGIONS = { 1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unova', 6: 'Kalos', 7: 'Alola', 8: 'Galar', 9: 'Paldea' };
  var CRY = 'https://play.pokemonshowdown.com/audio/cries/';

  var overlay = null;

  function pad4(n) { return String(n).padStart(4, '0'); }
  function titleCase(slug) {
    return String(slug || '').split('-').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.hidden = true;
    overlay.innerHTML = [
      '<div class="modal cornered" role="dialog" aria-modal="true" aria-labelledby="pd-name">',
      '  <div class="modal-head">',
      '    <div>',
      '      <p class="modal-meta" id="pd-meta"></p>',
      '      <h3 id="pd-name"></h3>',
      '      <div class="chip-row" id="pd-types"></div>',
      '    </div>',
      '    <span class="modal-art"><span class="dex-aura" aria-hidden="true"></span><img id="pd-img" width="475" height="475" alt="" /></span>',
      '  </div>',
      '  <h4 class="modal-section">Base stats · total <strong id="pd-bst"></strong></h4>',
      '  <dl class="stats" id="pd-stats"></dl>',
      '  <h4 class="modal-section">Abilities</h4>',
      '  <ul class="ability-list" id="pd-abilities"></ul>',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn-slide btn-secondary" id="pd-cry"><span>Play cry</span></button>',
      '    <button type="button" class="btn-slide btn-secondary" id="pd-close"><span>Close (ESC)</span></button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    overlay.querySelector('#pd-close').addEventListener('click', close);
    overlay.querySelector('#pd-cry').addEventListener('click', function () {
      var cur = overlay._roll;
      if (!cur || !cur.p) return;
      try {
        var a = new Audio(CRY + cur.p.n + '.mp3');
        a.play();
      } catch (err) { /* ignore */ }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && !overlay.hidden) close();
    });
  }

  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  function open(roll) {
    if (!roll || !roll.p) return;
    if (!overlay) build();
    var p = roll.p;

    overlay._roll = roll;
    overlay.querySelector('.modal').style.setProperty('--aura', TYPE_COLOR[p.t[0]] || '#A8A878');

    var bits = ['#' + pad4(p.si)];
    if (p.g) bits.push('Gen ' + p.g);
    if (REGIONS[p.g]) bits.push(REGIONS[p.g]);
    if (p.ev) bits.push(p.ev);
    if (p.lg) bits.push('Legendary');
    if (p.my) bits.push('Mythical');
    overlay.querySelector('#pd-meta').textContent = bits.join(' · ');

    overlay.querySelector('#pd-name').textContent = titleCase(p.n) + (roll.shiny ? '' : '');

    var types = overlay.querySelector('#pd-types');
    types.textContent = '';
    (p.t || []).forEach(function (t) {
      var chip = document.createElement('span');
      chip.className = 'type-tag';
      chip.style.setProperty('--tag', TYPE_COLOR[t] || '#A8A878');
      chip.textContent = TYPE_LABEL[t] || t;
      types.appendChild(chip);
    });

    var img = overlay.querySelector('#pd-img');
    img.src = roll.shiny && p.sps ? p.sps : (p.sp || '');
    img.alt = titleCase(p.n) + ' artwork';
    img.onerror = function () {
      var fb = img.src.replace('/other/official-artwork', '');
      if (fb !== img.src) img.src = fb; else img.onerror = null;
    };

    overlay.querySelector('#pd-bst').textContent = p.tt || '';
    var stats = overlay.querySelector('#pd-stats');
    stats.textContent = '';
    (p.st || []).forEach(function (v, i) {
      var row = document.createElement('div');
      row.className = 'stat-row';
      var dt = document.createElement('dt');
      dt.textContent = STAT_NAMES[i];
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

    var ab = overlay.querySelector('#pd-abilities');
    ab.textContent = '';
    (p.ab || []).forEach(function (a) {
      var li = document.createElement('li');
      li.textContent = titleCase(a);
      ab.appendChild(li);
    });

    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    overlay.querySelector('#pd-close').focus();
  }

  window.pokeDetail = open;
})();
