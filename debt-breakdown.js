/* Per-debt breakdown derived from the tagged ledger in debt-contributions.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./debt-contributions'));
  else root.DanielDebtBreakdown = factory(root.DanielDebt);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (C) {
  'use strict';
  // Display details for each account defined in debt-contributions.js. Balances are NOT entered here:
  // remaining = account starting balance minus the contributions tagged with that account id.
  var details = Object.freeze({
    'car-loan': Object.freeze({ reportedDate: '2026-11-08' }),
    'credit-card-1': Object.freeze({ reportedDate: '2026-11-08' }),
    // Starting balances of the six loans in the combined student-loan account (must sum to its starting balance).
    'student-loans': Object.freeze({ reportedDate: '2026-11-08', included: Object.freeze([
      Object.freeze({ label: 'Student loan 1', description: 'Direct Loan—Unsubsidized', balanceCents: 637449 }),
      Object.freeze({ label: 'Student loan 2', description: 'Direct Loan—Subsidized', balanceCents: 228042 }),
      Object.freeze({ label: 'Student loan 3', description: 'Direct Loan—Unsubsidized', balanceCents: 491628 }),
      Object.freeze({ label: 'Student loan 4', description: 'Direct Loan—Unsubsidized', balanceCents: 846727 }),
      Object.freeze({ label: 'Student loan 5', description: 'Direct Loan—Unsubsidized', balanceCents: 550961 }),
      Object.freeze({ label: 'Student loan 6', description: 'Direct Loan—Unsubsidized', balanceCents: 212426 })
    ]) }),
    'credit-card-2': Object.freeze({ reportedDate: '2026-11-08' })
  });
  function deepFreeze(o) { Object.values(o).forEach(function (v) { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); }
  function accountItems(ledgerReport, detailMap) {
    ledgerReport = ledgerReport || C.report(); detailMap = detailMap || details;
    if (!ledgerReport.accounts) throw new Error('The ledger must define accounts for a per-debt breakdown.');
    var ids = ledgerReport.accounts.map(function (a) { return a.id; });
    Object.keys(detailMap).forEach(function (id) { if (ids.indexOf(id) < 0) throw new Error('Breakdown detail for unknown account ' + id + '.'); });
    return ledgerReport.accounts.map(function (a) {
      var d = detailMap[a.id];
      if (!d) throw new Error('Missing breakdown detail for account ' + a.id + '.');
      var item = { id: a.id, label: a.label, balanceCents: a.remainingCents, startingCents: a.startingCents, paidCents: a.paidCents, percent: a.percent, days: a.days, reportedDate: d.reportedDate };
      if (d.included !== undefined) item.included = d.included;
      return item;
    });
  }
  var snapshots = deepFreeze(accountItems());
  function report(totalCents, items) {
    if (totalCents === undefined) totalCents = C.report().remainingCents;
    if (items === undefined) items = snapshots;
    if (!Number.isSafeInteger(totalCents) || totalCents < 0 || !Array.isArray(items)) throw new Error('Invalid remaining total or balance snapshots.');
    var namedCents = 0, labels = new Set();
    var named = items.map(function (item) {
      if (!item || typeof item.label !== 'string' || !item.label.trim() || item.label !== item.label.trim() || item.label.length > 80 || /[\u0000-\u001f\u007f]/.test(item.label)) throw new Error('Use a clear account nickname of 1–80 characters.');
      var key = item.label.toLowerCase();
      if (labels.has(key)) throw new Error('Duplicate account nickname; do not itemize the same balance twice.');
      labels.add(key);
      if (!Number.isSafeInteger(item.balanceCents) || item.balanceCents < 0) throw new Error('Balances must be nonnegative whole cents.');
      C.formatDate(item.reportedDate); // Validate a real recorded date; never guess one.
      namedCents += item.balanceCents;
      if (!Number.isSafeInteger(namedCents)) throw new Error('Named balance total exceeds safe integer cents.');
      var result = { label: item.label, balanceCents: item.balanceCents, reportedDate: item.reportedDate };
      if (item.startingCents !== undefined) {
        if (!Number.isSafeInteger(item.startingCents) || !Number.isSafeInteger(item.paidCents) || item.paidCents < 0 || item.startingCents - item.paidCents !== item.balanceCents) throw new Error('Starting balance minus paid must equal the remaining balance.');
        result.id = item.id; result.startingCents = item.startingCents; result.paidCents = item.paidCents; result.percent = item.percent;
        result.days = (item.days || []).map(function (d) { C.formatDate(d.date); return { date: d.date, amountCents: d.amountCents, cumulativeCents: d.cumulativeCents, remainingCents: d.remainingCents }; });
      }
      if (item.included !== undefined) {
        if (!Array.isArray(item.included) || !item.included.length) throw new Error('Included balances must be a nonempty list.');
        var subtotal = 0, childLabels = new Set();
        result.included = item.included.map(function (child) {
          if (!child || typeof child.label !== 'string' || !child.label.trim() || child.label !== child.label.trim() || child.label.length > 80 || /[\u0000-\u001f\u007f]/.test(child.label) || typeof child.description !== 'string' || !child.description.trim() || child.description.length > 120 || /[\u0000-\u001f\u007f]/.test(child.description)) throw new Error('Invalid included balance label or description.');
          if (childLabels.has(child.label.toLowerCase())) throw new Error('Duplicate included balance label.');
          childLabels.add(child.label.toLowerCase());
          if (!Number.isSafeInteger(child.balanceCents) || child.balanceCents < 0) throw new Error('Included balances must be nonnegative whole cents.');
          subtotal += child.balanceCents;
          if (!Number.isSafeInteger(subtotal)) throw new Error('Included balance subtotal exceeds safe integer cents.');
          return { label: child.label, description: child.description, balanceCents: child.balanceCents };
        });
        if (subtotal !== (item.startingCents !== undefined ? item.startingCents : item.balanceCents)) throw new Error('Included loan subtotal does not match its parent balance. Update the snapshots before publishing.');
      }
      return result;
    });
    var mismatch = namedCents > totalCents;
    return { totalCents: totalCents, namedCents: namedCents, named: named, mismatch: mismatch, unitemizedCents: mismatch ? null : totalCents - namedCents, discrepancyCents: mismatch ? namedCents - totalCents : 0 };
  }
  return { snapshots: snapshots, details: details, accountItems: accountItems, report: report };
}));
