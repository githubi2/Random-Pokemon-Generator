/* ============================================================
   Pokemon Release Dates - set list filter, release countdown,
   next-set answer box state, month focus, and a saved
   "collected" checklist (localStorage).
   Vanilla ES5, no dependencies.
   ============================================================ */
(function () {
  'use strict';

  var LS_KEY = 'rpg:releasedates-got';
  var NEXT_SET_UTC = Date.UTC(2026, 10, 6);
  var DEGRADE_AT = new Date(2026, 10, 7, 0, 0, 0).getTime();

  function $(id) { return document.getElementById(id); }
  function setText(id, txt) { var el = $(id); if (el) { el.textContent = txt; } }

  var nowMs = Date.now();

  // -------- countdown to the next set --------
  var daysLeft = Math.ceil((NEXT_SET_UTC - nowMs) / 86400000);
  setText('rd-countdown', daysLeft > 1 ? (daysLeft + ' days') : (daysLeft === 1 ? '1 day' : 'Out now'));

  // -------- answer box: degrade once Delta Reign has shipped --------
  if (nowMs >= DEGRADE_AT) {
    setText('rd-hint', 'The next Pokemon TCG set has not been announced yet. New sets usually land every seven to eleven weeks, and the next confirmed date will appear here as soon as it is official. The newest set already out is Mega Evolution\u2014Delta Reign, from November 6, 2026.');
    setText('rd-next-num', 'To be announced');
    setText('rd-next-label', 'The next set');
    setText('rd-date-num', 'Not announced yet');
    setText('rd-date-label', 'Release date');
    setText('rd-countdown-label', 'Delta Reign');
    var calLink = $('rd-cal-link');
    if (calLink && calLink.style) { calLink.style.display = 'none'; }
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

  // -------- month focus (calendar) --------
  var monthChips = document.querySelectorAll('.rd-month-chip');
  var monthNote = $('rd-month-note');
  var monthRows = document.querySelectorAll('.rd-cal li');
  var FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function monthLabel(y, m) { return FULL_MONTHS[m] + ' ' + y; }

  function monthRowText(row) {
    var spans = row.getElementsByTagName ? row.getElementsByTagName('span') : null;
    if (spans && spans.length > 1 && spans[1].textContent) {
      return spans[1].textContent;
    }
    return row.textContent || '';
  }

  function focusMonth(offset) {
    var base = new Date(nowMs);
    var y = base.getFullYear();
    var m = base.getMonth() + offset;
    while (m < 0) { m += 12; y -= 1; }
    while (m > 11) { m -= 12; y += 1; }
    var key = y + '-' + pad2(m + 1);
    var found = null;
    for (var i = 0; i < monthRows.length; i++) {
      if (monthRows[i].getAttribute('data-month') === key) { found = monthRows[i]; }
      monthRows[i].removeAttribute('data-focus');
    }
    if (found) {
      found.setAttribute('data-focus', '1');
      if (monthNote) { monthNote.textContent = monthLabel(y, m) + ' — ' + monthRowText(found); }
    } else if (monthNote) {
      monthNote.textContent = monthLabel(y, m) + ' — no sets scheduled.';
    }
  }

  function pressMonthChips(active) {
    for (var k = 0; k < monthChips.length; k++) {
      monthChips[k].setAttribute('aria-pressed', monthChips[k] === active ? 'true' : 'false');
    }
  }

  for (var mc = 0; mc < monthChips.length; mc++) {
    monthChips[mc].addEventListener('click', (function (button) {
      return function () {
        pressMonthChips(button);
        focusMonth(parseInt(button.getAttribute('data-offset'), 10));
      };
    }(monthChips[mc])));
  }
  for (var mi = 0; mi < monthChips.length; mi++) {
    if (monthChips[mi].getAttribute('data-offset') === '0') {
      pressMonthChips(monthChips[mi]);
      focusMonth(0);
      break;
    }
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
