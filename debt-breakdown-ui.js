/* Render literal labels with textContent. Per-debt figures come from the tagged ledger; never reads visitor tracker data. */
(function () {
  'use strict';
  var C = window.DanielDebt, r = window.DanielDebtBreakdown.report(), list = document.getElementById('breakdown-list');
  if (!list) return;
  function el(tag, text, cls) { var n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
  var fragment = document.createDocumentFragment();
  function progress(li, item) {
    if (item.startingCents === undefined) return;
    var pct = item.percent.toFixed(1), nameId = 'debt-' + item.id + '-name';
    var wrap = el('div', undefined, 'account-progress'), bar = el('div', undefined, 'account-bar'), fill = el('i');
    bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-labelledby', nameId);
    bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-valuenow', pct);
    bar.setAttribute('aria-valuetext', C.money(item.paidCents) + ' of ' + C.money(item.startingCents) + ' paid, ' + C.money(item.balanceCents) + ' remaining (' + pct + '%)');
    fill.style.width = Math.min(100, item.percent) + '%'; bar.appendChild(fill);
    var label = el('p', undefined, 'account-pct'); label.append(el('span', pct + '%', 'account-pct-value'), document.createTextNode(' paid off'));
    wrap.append(bar, label);
    var dl = el('dl', undefined, 'account-amounts');
    [['Starting', item.startingCents, 'account-start'], ['Paid', item.paidCents, 'account-paid'], ['Remaining', item.balanceCents, 'account-left']].forEach(function (x) {
      var pair = el('div'); pair.append(el('dt', x[0]), el('dd', C.money(x[1]), x[2])); dl.appendChild(pair);
    });
    // Native disclosure for every debt, closed by default (same pattern as the student-loan details).
    var tracker = el('details', undefined, 'account-tracker');
    tracker.appendChild(el('summary', item.label + ' contribution tracker (' + item.days.length + (item.days.length === 1 ? ' payment' : ' payments') + ')'));
    if (item.days.length) {
      var ol = el('ol', undefined, 'account-history');
      item.days.forEach(function (d) {
        var row = el('li'), t = el('time', C.formatDate(d.date)); t.dateTime = d.date;
        row.append(t, el('span', C.money(d.amountCents), 'account-contribution'), el('span', C.money(d.remainingCents) + ' left on this debt', 'account-history-left'));
        ol.appendChild(row);
      });
      tracker.appendChild(ol);
    } else tracker.appendChild(el('p', 'No contributions recorded yet.', 'history-note account-empty'));
    li.append(wrap, dl, tracker);
  }
  r.named.forEach(function (item) {
    var li = el('li', undefined, 'card balance-card'), h3 = el('h3', item.label);
    if (item.id) { li.id = 'debt-' + item.id; h3.id = 'debt-' + item.id + '-name'; }
    li.append(h3, el('b', C.money(item.balanceCents), 'balance-value'));
    var p = el('p', 'Remaining · itemized ', 'history-note'), time = el('time', C.formatDate(item.reportedDate));
    time.dateTime = item.reportedDate; p.appendChild(time); li.appendChild(p);
    progress(li, item);
    if (item.included) {
      var details = el('details', undefined, 'student-loans'), summary = el('summary', 'View ' + item.included.length + ' student loans');
      var includedNote = el('p', 'These starting balances make up the ', 'history-note');
      includedNote.append(el('span', C.money(item.startingCents !== undefined ? item.startingCents : item.balanceCents), 'debt-amount'), document.createTextNode(' starting balance—not additional debt.'));
      details.append(summary, includedNote);
      var children = el('ol', undefined, 'included-loans');
      item.included.forEach(function (child) {
        var row = el('li'); row.append(el('strong', child.label), el('p', child.description), el('span', C.money(child.balanceCents), 'included-balance')); children.appendChild(row);
      });
      details.appendChild(children); li.appendChild(details);
    }
    fragment.appendChild(li);
  });
  if (!r.mismatch && r.unitemizedCents > 0) {
    var other = el('li', undefined, 'card balance-card unitemized');
    other.append(el('h3', 'Other debt—not yet itemized'), el('b', C.money(r.unitemizedCents), 'balance-value'), el('p', 'Calculated remainder, not a separate reported account. More individual balances can be added as I report them.', 'history-note'));
    fragment.appendChild(other);
  }
  list.replaceChildren(fragment);
  var warning = document.getElementById('breakdown-warning'); warning.hidden = !r.mismatch;
  warning.replaceChildren();
  if (r.mismatch) warning.append(document.createTextNode('Update needed: the individual balance snapshots total '), el('span', C.money(r.namedCents), 'debt-amount'), document.createTextNode(', which is '), el('span', C.money(r.discrepancyCents), 'debt-amount'), document.createTextNode(' above the current remaining total. The individual balances need updating. No unitemized amount is shown until the figures reconcile.'));
  document.getElementById('breakdown-status').textContent = r.mismatch ? 'Individual snapshots do not currently reconcile with the overall total.' : r.unitemizedCents === 0 ? 'The current remaining total is fully itemized by these reported snapshots.' : 'This is a partial breakdown. The calculated remainder fills the gap to the current remaining total.';
}());
