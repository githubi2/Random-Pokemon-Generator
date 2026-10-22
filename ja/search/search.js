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
      count.textContent = 'ポケモン名を入力すると全国図鑑を検索できます。';
      box.innerHTML = '';
      return;
    }
    var hits = DATA.filter(function (p) {
      return p.n.indexOf(q) >= 0 || displayName(p.n).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 25);
    if (!hits.length) {
      count.textContent = '"' + query.trim() + '" に一致するポケモンはありません — 短い名前でお試しください（例：「pika」→ピカチュウ）。';
      box.innerHTML = '';
      return;
    }
    count.textContent = hits.length + (hits.length === 1 ? '匹見つかりました' : '匹見つかりました') + '— 「' + query.trim() + '」 上位' + hits.length + '件を表示。';
    box.innerHTML = '';
    hits.forEach(function (p) {
      var row = document.createElement('a');
      row.className = 'srch-row';
      row.href = '../?team=' + p.i;
      row.title = 'クリックで開く：' + displayName(p.n) + 'をジェネレーターで表示';
      var img = document.createElement('img');
      img.src = p.sp;
      img.alt = displayName(p.n) + 'のアート';
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
      meta.textContent = '#' + pad4(p.si) + ' · 第' + p.g + '世代 · ' + p.t.join(' / ') + ' · BST ' + p.tt;
      info.appendChild(meta);
      row.appendChild(info);
      var arrow = document.createElement('span');
      arrow.className = 'rec-desc';
      arrow.textContent = '生成ツールで開く →';
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
