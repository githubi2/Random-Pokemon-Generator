/* ============================================================
   Hamburger nav toggle — shared by home & subpage
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
})();
