/* ============================================================
   Pokemon Release Dates - set list filter, release countdown,
   and a saved "collected" checklist (localStorage).
   Vanilla ES5, no dependencies.
   ============================================================ */
(function () {
  'use strict';

  var LS_KEY = 'rpg:releasedates-got';

  function $(id) { return document.getElementById(id); }

  // -------- countdown to the next set --------
  var NEXT_SET_UTC = Date.UTC(2026, 10, 6); // Mega Evolution - Delta Reign, Nov 6, 2026
  var countdownEl = $('rd-countdown');
  if (countdownEl) {
    var daysLeft = Math.ceil((NEXT_SET_UTC - Date.now()) / 86400000);
    countdownEl.textContent = daysLeft > 1 ? (daysLeft + ' days') : (daysLeft === 1 ? '1 day' : 'Out now');
  }

  // -------- set list filter --------
  var chips = document.querySelectorAll('.rd-filter');
  var rows = document.querySelectorAll('.rd-row');
  var filterNote = $('rd-filter-note');
  var total = rows.length;

  function applyFilter(filter) {
    var shown = 0;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var isMatch = filter === 'all'
        || filter === row.getAttribute('data-year')
        || (filter === 'upcoming' && row.getAttribute('data-status') === 'upcoming');
      row.style.display = isMatch ? '' : 'none';
      if (isMatch) shown += 1;
    }
    if (filterNote) {
      filterNote.textContent = 'Showing ' + shown + ' of ' + total + ' sets.';
    }
  }

  for (var c = 0; c < chips.length; c++) {
    chips[c].addEventListener('click', (function (button) {
      return function () {
        for (var k = 0; k < chips.length; k++) {
          chips[k].setAttribute('aria-pressed', chips[k] === button ? 'true' : 'false');
        }
        applyFilter(button.getAttribute('data-filter'));
      };
    }(chips[c])));
  }
  if (filterNote && total) {
    filterNote.textContent = 'Showing ' + total + ' of ' + total + ' sets.';
  }

  // -------- collected checklist --------
  var boxes = document.querySelectorAll('.rd-got');
  var gotNote = $('rd-got-note');
  var resetBtn = $('rd-got-reset');
  var DEFAULT_NOTE = 'Tick what you own — the list is saved in this browser.';

  function readStored() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return parsed instanceof Array ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeStored(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function checkedList() {
    var list = [];
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].checked) list.push(boxes[i].getAttribute('data-set'));
    }
    return list;
  }

  function refreshGot() {
    var count = checkedList().length;
    if (gotNote) {
      gotNote.textContent = count > 0
        ? ('You have marked ' + count + ' of ' + boxes.length + ' sets as collected.')
        : DEFAULT_NOTE;
    }
  }

  function restore() {
    var stored = readStored();
    for (var i = 0; i < boxes.length; i++) {
      var id = boxes[i].getAttribute('data-set');
      for (var k = 0; k < stored.length; k++) {
        if (stored[k] === id) boxes[i].checked = true;
      }
    }
  }

  for (var b = 0; b < boxes.length; b++) {
    boxes[b].addEventListener('change', function () {
      writeStored(checkedList());
      refreshGot();
    });
  }
  restore();
  refreshGot();

  // two-tap reset (no native dialogs)
  var armed = false;
  var armTimer = null;
  var RESET_LABEL = 'Reset list';
  var ARMED_LABEL = 'Tap again to clear';
  if (resetBtn) {
    resetBtn.textContent = RESET_LABEL;
    resetBtn.addEventListener('click', function () {
      if (!armed) {
        armed = true;
        resetBtn.textContent = ARMED_LABEL;
        armTimer = setTimeout(function () {
          armed = false;
          resetBtn.textContent = RESET_LABEL;
        }, 4000);
        return;
      }
      if (armTimer) { clearTimeout(armTimer); }
      armed = false;
      resetBtn.textContent = RESET_LABEL;
      writeStored([]);
      for (var i = 0; i < boxes.length; i++) { boxes[i].checked = false; }
      refreshGot();
    });
  }
})();
