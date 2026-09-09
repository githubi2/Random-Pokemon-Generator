/* ============================================================
   Pokemon Search — site-wide Pokemon name search (SearchAction target)
   ES5 IIFE, no build step.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var DATA = window.POKEMON_DATA || [];

  function displayName(slug) {
    return (slug.charAt(0).toUpperCase() + slug.slice(1)).split('-')[0];
  }
  function pad4(n) { return String(n).padStart(4, '0'); }

  function buildResults(query) {
    var q = query.trim().toLowerCase();
    var box = $('srch-results');
    var count = $('srch-count');
    if (!q) {
      count.textContent = 'Type a Pokemon name to search the national dex.';
      box.innerHTML = '';
      return;
    }
    var hits = DATA.filter(function (p) {
      return p.n.indexOf(q) >= 0 || displayName(p.n).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 25);
    if (!hits.length) {
      count.textContent = 'No Pokemon matched "' + query.trim() + '" — try a shorter name (e.g. "pika" for Pikachu).';
      box.innerHTML = '';
      return;
    }
    count.textContent = hits.length + (hits.length === 1 ? ' Pokemon found' : ' Pokemon found') + ' for "' + query.trim() + '" — top ' + hits.length + ' shown.';
    box.innerHTML = '';
    hits.forEach(function (p) {
      var row = document.createElement('a');
      row.className = 'srch-row';
      row.href = '../?team=' + p.i;
      row.title = 'Open ' + displayName(p.n) + ' in the generator';
      var img = document.createElement('img');
      img.src = p.sp;
      img.alt = displayName(p.n) + ' artwork';
      img.loading = 'lazy';
      img.width = 96; img.height = 96;
      row.appendChild(img);
      var info = document.createElement('div');
      var name = document.createElement('span');
      name.className = 'srch-name';
      name.textContent = displayName(p.n);
      info.appendChild(name);
      var meta = document.createElement('span');
      meta.className = 'rec-desc';
      meta.textContent = '#' + pad4(p.si) + ' · Gen ' + p.g + ' · ' + p.t.join(' / ') + ' · BST ' + p.tt;
      info.appendChild(meta);
      row.appendChild(info);
      var arrow = document.createElement('span');
      arrow.className = 'rec-desc';
      arrow.textContent = 'Open in generator \u2192';
      row.appendChild(arrow);
      box.appendChild(row);
    });
  }

  function init() {
    var params = new URLSearchParams(location.search);
    var q = params.get('q') || '';
    var input = $('srch-input');
    input.value = q;
    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { buildResults(input.value); }, 150);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); buildResults(input.value); }
    });
    if (q) buildResults(q);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
