/* Shared public debt summaries. Does not read or change visitors' personal trackers. */
(function () {
  'use strict';
  var C = window.DanielDebt, r = C.report();
  function all(selector, text) { document.querySelectorAll(selector).forEach(function (n) { n.textContent = text; }); }
  all('.debt-start', C.money(r.startingCents));
  all('.debt-paid', C.money(r.paidCents));
  all('.debt-left', C.money(r.remainingCents));
  all('.pct', r.percent.toFixed(1) + '%');
  all('.last-contribution-date', r.lastDate ? C.formatDate(r.lastDate) : 'No updates recorded');
  document.querySelectorAll('time.last-contribution-date').forEach(function (n) { if (r.lastDate) n.dateTime = r.lastDate; else n.removeAttribute('datetime'); });
  document.querySelectorAll('.bar i').forEach(function (n) { n.style.width = Math.min(100, r.percent) + '%'; });
  var now = new Date(), localDay = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  all('.days-in', Math.max(1, C.journeyDay(localDay, C.data.journeyStart)).toLocaleString('en-US'));
  var list = document.getElementById('contribution-list');
  if (!list) return;
  function el(tag, text, cls) { var n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
  var fragment = document.createDocumentFragment();
  r.days.forEach(function (record) {
    var li = el('li', undefined, 'card contribution-record'), h = el('h3'), time = el('time', C.formatDate(record.date));
    time.dateTime = record.date; h.appendChild(time);
    li.append(el('p', 'Day ' + record.journeyDay, 'tag'), h);
    var dl = el('dl', undefined, 'contribution-amounts');
    [['Reported that day', record.amountCents, 'contribution-amount'], ['Cumulative paid', record.cumulativeCents, ''], ['Remaining*', record.remainingCents, '']].forEach(function (item) {
      var pair = el('div'); pair.append(el('dt', item[0]), el('dd', C.money(item[1]), item[2])); dl.appendChild(pair);
    });
    li.appendChild(dl); fragment.appendChild(li);
  });
  list.replaceChildren(fragment);
}());
