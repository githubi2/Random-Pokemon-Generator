/* 语言切换下拉：点击开合、点外面关闭、Esc 关闭 */
(function () {
  'use strict';
  var box = document.getElementById('lang-switch');
  var btn = document.getElementById('lang-toggle');
  if (!box || !btn) return;

  function setOpen(open) {
    box.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!box.classList.contains('open'));
  });

  document.addEventListener('click', function (e) {
    if (!box.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();
