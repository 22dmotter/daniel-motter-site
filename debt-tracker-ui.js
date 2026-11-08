/* All visitor-provided text is rendered with textContent, never HTML. */
(function () {
  'use strict';
  var C = window.DebtTracker, $ = function (s) { return document.getElementById(s); };
  var storage;
  try { storage = window.localStorage; } catch (_) { storage = null; }
  var loaded = C.load(storage), state = loaded.state, expected = loaded.ok || loaded.kind === 'invalid' ? loaded.raw : undefined;
  var unreadable = loaded.kind === 'invalid', rawUnreadable = unreadable ? loaded.raw : null, conflict = false;
  var status = $('save-status'), action = $('action-status');
  function el(tag, text, cls) { var n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
  function uid() { return window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2); }
  function cash(c) { return (c < 0 ? '−' : '') + '$' + (Math.abs(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function day(s) { var p = s.split('-'); return p[1] + '/' + p[2] + '/' + p[0]; }
  function storageStatus(ok, message) { status.classList.toggle('storage-ok', ok); status.textContent = message; }
  function read(input, fn) {
    try { var v = fn(input.value); input.removeAttribute('aria-invalid'); return v; }
    catch (e) { input.setAttribute('aria-invalid', 'true'); input.focus(); throw e; }
  }
  function clearErrors(form) { form.querySelectorAll('[aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); }); }
  function lockControls() {
    document.querySelectorAll('#add-debt-form input,#add-debt-form button,.entry-form input,.entry-form button,.remove-debt,.undo-entry').forEach(function (n) { n.disabled = unreadable || conflict; });
    $('export').textContent = unreadable ? 'Download unreadable saved data' : 'Download backup';
  }
  function apply(next, message, focusId) {
    if (conflict) return false;
    var before = C.milestones(state).filter(function (m) { return m.active; }).map(function (m) { return m.id; });
    var saved = C.save(storage, next, expected);
    if (!saved.ok && saved.kind === 'conflict') { conflict = true; storageStatus(false, saved.message); lockControls(); return false; }
    if (!saved.ok && saved.kind === 'invalid') { storageStatus(false, saved.message); return false; }
    state = next; unreadable = false; rawUnreadable = null;
    if (saved.ok) expected = saved.raw;
    storageStatus(saved.ok, saved.ok ? 'Saved in this browser on this device. Download a backup regularly; there is no sync.' : saved.message);
    var newWins = C.milestones(state).filter(function (m) { return m.active && before.indexOf(m.id) < 0; }).map(function (m) { return m.label; });
    action.textContent = message + (newWins.length ? ' Milestones now active: ' + newWins.join('; ') + '.' : '');
    render();
    if (focusId && $(focusId)) $(focusId).focus();
    return true;
  }
  function button(text, cls, fn) { var b = el('button', text, cls); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function field(formGrid, label, id, type, value, errorId) {
    var box = el('div'), l = el('label', label), input = el('input');
    l.htmlFor = id; input.id = id; input.type = type; input.value = value; input.required = true;
    input.setAttribute('aria-describedby', errorId);
    if (type === 'date') { input.min = '1900-01-01'; input.max = C.today(); }
    else { input.inputMode = 'decimal'; input.autocomplete = 'off'; }
    box.append(l, input); formGrid.appendChild(box); return input;
  }
  function renderDebt(d) {
    var card = el('article', undefined, 'card debt-card'), head = el('div', undefined, 'debt-head');
    card.id = 'debt-' + d.id;
    var h = el('h3', d.name); h.id = 'heading-' + d.id; h.tabIndex = -1;
    head.append(h, button('Delete debt', 'btn ghost sm danger remove-debt', function () {
      if (!window.confirm('Delete this debt and all its history? This changes your totals and milestones. Download a backup first. This cannot be undone without a backup.')) return;
      apply(C.remove(state, d.id), 'Debt deleted. Totals and milestones recalculated.', 'new-name');
    }));
    var facts = el('dl', undefined, 'debt-facts');
    [['Starting balance', cash(d.startingCents)], ['Balance left', cash(C.current(d))], ['Net reduction', cash(d.startingCents - C.current(d))]].forEach(function (f) {
      var pair = el('div'); pair.append(el('dt', f[0]), el('dd', f[1])); facts.appendChild(pair);
    });
    card.append(head, facts, el('p', 'Journey started ' + day(d.startDate) + '. First recorded balance: ' + cash(d.openingCents) + ' on ' + day(d.openingDate) + '. This opening snapshot is not a payment.', 'note'));
    var form = el('form', undefined, 'entry-form'); form.noValidate = true;
    form.append(el('h4', 'Log a payment or balance update'), el('p', 'Enter the actual payment, then the updated remaining balance shown by your lender. For a balance-only update (interest, fees, or new borrowing), enter a payment of 0. Do not subtract the full payment yourself unless your lender confirms it all reduced the balance.', 'note'));
    var fields = el('div', undefined, 'fields'), error = el('p', undefined, 'error'), eid = 'entry-error-' + d.id;
    error.id = eid; error.setAttribute('role', 'alert');
    var date = field(fields, 'Entry date', 'date-' + d.id, 'date', C.today(), eid);
    date.min = d.entries.length ? d.entries[d.entries.length - 1].date : d.openingDate;
    var payment = field(fields, 'Actual payment made ($; 0 for balance-only)', 'payment-' + d.id, 'text', '', eid);
    var balance = field(fields, 'Updated remaining balance ($)', 'balance-' + d.id, 'text', '', eid);
    var save = el('button', 'Record entry', 'btn sm'); save.type = 'submit';
    form.append(fields, el('p', 'Entries must be in date order, on or after your latest entry or first recorded balance. Use Undo latest entry below to correct a mistake, then enter it again.', 'note'), error, save);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); clearErrors(form); error.textContent = '';
      try {
        var entry = { id: uid(), date: read(date, C.date), paymentCents: read(payment, function (v) { return C.money(v, false); }), balanceCents: read(balance, function (v) { return C.money(v, false); }) };
        apply(C.addEntry(state, d.id, entry), 'Entry recorded for ' + d.name + '.', h.id);
      } catch (err) { error.textContent = err.message; }
    });
    card.appendChild(form);
    var tools = el('div', undefined, 'cta-row tools'), undo = button('Undo latest entry', 'btn ghost sm undo-entry', function () {
      if (!window.confirm('Undo the latest payment/balance entry for this debt? This restores its previous balance and recalculates payments and milestones. You can then enter the corrected values.')) return;
      apply(C.undo(state, d.id), 'Latest entry removed. You can record the corrected entry.', 'heading-' + d.id);
    });
    undo.disabled = !d.entries.length; undo.dataset.empty = d.entries.length ? 'no' : 'yes'; tools.appendChild(undo); card.appendChild(tools);
    var detail = el('details'), summary = el('summary', 'Payment & balance history (' + d.entries.length + ' entries)');
    var region = el('div', undefined, 'history-wrap'); region.tabIndex = 0; region.setAttribute('role', 'region'); region.setAttribute('aria-label', 'History for ' + d.name);
    var table = el('table', undefined, 'history'); table.appendChild(el('caption', 'Most recent first. Opening snapshots are not logged payments.'));
    var thead = el('thead'), hr = el('tr');
    ['Date / type', 'Payment made', 'Balance left', 'Balance reduction'].forEach(function (title) { var th = el('th', title); th.scope = 'col'; hr.appendChild(th); });
    thead.appendChild(hr); table.appendChild(thead); var body = el('tbody'), previous = d.openingCents;
    var entries = d.entries.map(function (e) { var row = [day(e.date) + (e.paymentCents > 0 ? ' · Payment' : ' · Balance update'), cash(e.paymentCents), cash(e.balanceCents), cash(previous - e.balanceCents)]; previous = e.balanceCents; return row; }).reverse();
    entries.push([day(d.openingDate) + ' · Opening snapshot', 'Not a payment', cash(d.openingCents), 'Not an event']);
    entries.forEach(function (values) { var tr = el('tr'); values.forEach(function (v) { tr.appendChild(el('td', v)); }); body.appendChild(tr); });
    table.appendChild(body); region.appendChild(table); detail.append(summary, region); card.appendChild(detail);
    return card;
  }
  function render() {
    var t = C.totals(state);
    $('t-start').textContent = cash(t.starting); $('t-left').textContent = cash(t.remaining); $('t-reduced').textContent = cash(t.reduction); $('t-paid').textContent = cash(t.paid);
    $('t-reduced').style.color = t.reduction < 0 ? '#ff9e9e' : '#64df8a';
    // Floor the display to avoid showing 100% for a remaining cent. Exact zero alone displays 100%.
    var pct = t.remaining === 0 && t.debtCount ? 100 : Math.floor(t.percent * 10) / 10;
    $('progress-label').textContent = t.debtCount ? pct.toFixed(1) + '% net debt reduction' : 'Add your first debt to begin.';
    $('t-bar').style.width = t.percent + '%'; $('t-progress').setAttribute('aria-valuenow', String(pct));
    $('progress-note').textContent = t.reduction < 0 ? 'Current balances are above your starting baseline. Your progress bar stays at zero; keep your balances accurate.' : t.debtCount ? 'Based on ' + t.debtCount + ' tracked debt' + (t.debtCount === 1 ? '' : 's') + '. Percentages below 100% are rounded down to one decimal place.' : 'No balances or payments have been entered. No milestones are active yet.';
    var mlist = $('milestone-list'); mlist.replaceChildren();
    C.milestones(state).forEach(function (m) { var li = el('li', undefined, 'milestone' + (m.active ? ' active' : '')); li.append(el('strong', m.label), el('span', m.active ? 'Active now ✓' : 'Not yet active')); mlist.appendChild(li); });
    var list = $('debt-list'); list.replaceChildren();
    if (!state.debts.length) list.appendChild(el('p', unreadable ? 'Your saved data could not be read. Use the backup controls below before making changes.' : 'No debts yet. Add your first debt below—only your own numbers.', 'notice'));
    state.debts.forEach(function (d) { list.appendChild(renderDebt(d)); });
    lockControls();
    document.querySelectorAll('.undo-entry[data-empty=yes]').forEach(function (b) { b.disabled = true; });
  }
  ['new-start', 'new-date'].forEach(function (id) { $(id).value = C.today(); $(id).max = C.today(); });
  $('add-debt-form').querySelectorAll('input').forEach(function (n) { n.setAttribute('aria-describedby', 'add-error'); });
  $('add-debt-form').addEventListener('submit', function (e) {
    e.preventDefault(); clearErrors(this); $('add-error').textContent = '';
    try {
      var nickname = $('new-name').value.trim();
      if (!nickname || nickname.length > 60) { $('new-name').setAttribute('aria-invalid', 'true'); $('new-name').focus(); throw new Error('Enter a debt nickname of 1–60 characters.'); }
      var d = { id: uid(), name: nickname, startDate: read($('new-start'), C.date), startingCents: read($('new-baseline'), function (v) { return C.money(v, true); }), openingDate: read($('new-date'), C.date), openingCents: read($('new-balance'), function (v) { return C.money(v, false); }), entries: [] };
      if (apply(C.addDebt(state, d), 'Debt added. Your baseline and current milestone statuses have been recalculated.', 'heading-' + d.id)) {
        $('new-name').value = ''; $('new-baseline').value = ''; $('new-balance').value = '';
      }
    } catch (err) { $('add-error').textContent = err.message; }
  });
  function download(raw, filename) {
    var url = URL.createObjectURL(new Blob([raw], { type: 'application/json' })), a = el('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  $('export').addEventListener('click', function () {
    $('backup-error').textContent = '';
    try {
      download(unreadable ? rawUnreadable : C.serialize(state), (unreadable ? 'unreadable-tracker-' : 'debt-tracker-backup-') + C.today() + '.json');
      action.textContent = 'Backup download requested. Check your downloads and keep this unencrypted file safe.';
    } catch (err) { $('backup-error').textContent = 'Could not create a backup: ' + err.message; }
  });
  $('import-form').addEventListener('submit', async function (e) {
    e.preventDefault(); $('backup-error').textContent = '';
    try {
      var file = $('import-file').files[0];
      if (!file) throw new Error('Choose a tracker JSON backup first.');
      if (file.size > C.MAX_BYTES) throw new Error('Backup must be no larger than 2 MB.');
      var next = C.parse(await file.text());
      if (!window.confirm('Replace ALL current tracker data with this validated backup (' + next.debts.length + ' debts)? This cannot be undone without your current backup. Cancel to download your current data first.')) return;
      if (apply(next, 'Backup imported. Totals and milestones recalculated.', 'export')) $('import-file').value = '';
    } catch (err) { $('backup-error').textContent = err.message + ' Current data has not been changed.'; }
  });
  $('clear').addEventListener('click', function () {
    if (!window.confirm('Clear ALL debts and history in this browser? Download a backup first. This cannot be undone without a backup.')) return;
    apply(C.empty(), 'Tracker cleared. There are no debts or active milestones.', 'new-name');
  });
  window.addEventListener('storage', function (e) {
    if (e.key === C.KEY || e.key === null) { conflict = true; storageStatus(false, 'This tracker changed in another tab or browser data was cleared. Reload this page before making changes. You can still download this tab’s backup.'); lockControls(); }
  });
  if (loaded.ok) storageStatus(true, loaded.raw === null ? 'No saved tracker yet. Add a debt to begin. Data will save in this browser only.' : 'Loaded from this browser. Download a backup regularly; there is no sync.');
  else storageStatus(false, loaded.message);
  render();
}());
