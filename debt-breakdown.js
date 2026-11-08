/* Latest self-reported individual balances. Public snapshots, not payment allocations. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./debt-contributions'));
  else root.DanielDebtBreakdown = factory(root.DanielDebt);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (C) {
  'use strict';
  var snapshots = Object.freeze([
    Object.freeze({ label: 'Car loan', balanceCents: 1520913, reportedDate: '2026-11-08' }),
    Object.freeze({ label: 'Credit Card 1', balanceCents: 61241, reportedDate: '2026-11-08' }),
    Object.freeze({ label: 'Student loans', balanceCents: 2967233, reportedDate: '2026-11-08', included: Object.freeze([
      Object.freeze({ label: 'Student loan 1', description: 'Direct Loan—Unsubsidized', balanceCents: 637449 }),
      Object.freeze({ label: 'Student loan 2', description: 'Direct Loan—Subsidized', balanceCents: 228042 }),
      Object.freeze({ label: 'Student loan 3', description: 'Direct Loan—Unsubsidized', balanceCents: 491628 }),
      Object.freeze({ label: 'Student loan 4', description: 'Direct Loan—Unsubsidized', balanceCents: 846727 }),
      Object.freeze({ label: 'Student loan 5', description: 'Direct Loan—Unsubsidized', balanceCents: 550961 }),
      Object.freeze({ label: 'Student loan 6', description: 'Direct Loan—Unsubsidized', balanceCents: 212426 })
    ]) }),
    // User assigned the CURRENT remaining $2,720.69 to this card. This is not a future-payment sink.
    Object.freeze({ label: 'Credit Card 2', balanceCents: 272069, reportedDate: '2026-11-08' })
  ]);
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
        if (subtotal !== item.balanceCents) throw new Error('Included loan subtotal does not match its parent balance. Update the snapshots before publishing.');
      }
      return result;
    });
    var mismatch = namedCents > totalCents;
    return { totalCents: totalCents, namedCents: namedCents, named: named, mismatch: mismatch, unitemizedCents: mismatch ? null : totalCents - namedCents, discrepancyCents: mismatch ? namedCents - totalCents : 0 };
  }
  return { snapshots: snapshots, report: report };
}));
