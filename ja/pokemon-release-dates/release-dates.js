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
  var FOLLOW_UP_UTC = Date.UTC(2027, 1, 5);
  var DEGRADE_AT = new Date(2026, 10, 7, 0, 0, 0).getTime();

  function $(id) { return document.getElementById(id); }
  function setText(id, txt) { var el = $(id); if (el) { el.textContent = txt; } }

  var nowMs = Date.now();

  // -------- countdown to the next set --------
  var daysLeft = Math.ceil((NEXT_SET_UTC - nowMs) / 86400000);
  setText('rd-countdown', daysLeft > 1 ? (daysLeft + '日') : (daysLeft === 1 ? '1日' : '発売中'));

  // -------- answer box: degrade once Delta Reign has shipped --------
  if (nowMs >= DEGRADE_AT) {
    var followDays = Math.ceil((FOLLOW_UP_UTC - nowMs) / 86400000);
    setText('rd-hint', 'Mega Evolution—Delta Reign は発売中です。次のセットは Flowing Fists、2027年2月5日 発売 — メガルカリオZexが主役で、日本版「Aura Seeker」の英語版にあたります。プレリリースは 1月23日 から 31日 まで。');
    setText('rd-next-num', 'Flowing Fists');
    setText('rd-next-label', '次のセット');
    setText('rd-date-num', 'Feb 5, 2027');
    setText('rd-date-label', '発売日');
    setText('rd-countdown', followDays > 1 ? (followDays + '日') : (followDays === 1 ? '1日' : '発売中'));
    setText('rd-countdown-label', 'Flowing Fists');
    var calLink = $('rd-cal-link');
    if (calLink) {
      calLink.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Flowing%20Fists%20releases&dates=20270205/20270206&details=Pokemon%20TCG%3A%20Flowing%20Fists%20releases%20February%205%2C%202027.%20Release%20calendar%20tracked%20at%20random-pokemon-generator.co';
      var lbl = calLink.querySelector('span');
      if (lbl) { lbl.textContent = 'Flowing Fistsをカレンダーに追加'; }
    }
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
      filterNote.textContent = '表示：' + shown + '/' + total + 'セット';
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
    filterNote.textContent = '表示：' + total + '/' + total + 'セット';
  }

  // -------- month focus (calendar) --------
  var monthChips = document.querySelectorAll('.rd-month-chip');
  var monthNote = $('rd-month-note');
  var monthRows = document.querySelectorAll('.rd-cal li');
  var FULL_MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function monthLabel(y, m) { return y + '年' + FULL_MONTHS[m]; }

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
      monthNote.textContent = monthLabel(y, m) + '— 予定はありません。';
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
  var DEFAULT_NOTE = '持っているセットにチェックを入れてください — リストはこのブラウザに保存されます。';

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
        ? ('チェック済み：' + count + '/' + boxes.length + 'セットを収集済みにしました。')
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
  var RESET_LABEL = 'リセット';
  var ARMED_LABEL = 'もう一度で消去';
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
