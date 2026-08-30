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
