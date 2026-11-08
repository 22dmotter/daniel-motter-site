/* Render literal labels. Never read visitor tracker data or guess payment allocations. */
(function () {
  'use strict';
  var C = window.DanielDebt, r = window.DanielDebtBreakdown.report(), list = document.getElementById('breakdown-list');
  if (!list) return;
  function el(tag, text, cls) { var n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
  var fragment = document.createDocumentFragment();
  r.named.forEach(function (item) {
    var li = el('li', undefined, 'card balance-card');
    li.append(el('h3', item.label), el('b', C.money(item.balanceCents), 'balance-value'));
    var p = el('p', 'Reported ', 'history-note'), time = el('time', C.formatDate(item.reportedDate));
    time.dateTime = item.reportedDate; p.appendChild(time); li.appendChild(p);
    if (item.included) {
      var details = el('details', undefined, 'student-loans'), summary = el('summary', 'View ' + item.included.length + ' student loans');
      var includedNote = el('p', 'Included in the ', 'history-note');
      includedNote.append(el('span', C.money(item.balanceCents), 'debt-amount'), document.createTextNode(' above—not additional debt.'));
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
