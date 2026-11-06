/* Payment calculator math. Runs entirely in the browser; nothing is sent or stored.
   All money is handled in whole cents. Interest = balance x (APR / 12), added each month,
   then the payment is applied at the end of the month. No fees, rate changes or new charges. */
(function (root) {
  'use strict';
  var MAX_MONTHS = 600; // 50-year safety cap

  function toCents(x) { return Math.round(x * 100); }

  // Required level monthly payment (in dollars, unrounded) to repay principal over n months.
  function requiredPayment(principal, apr, months) {
    var r = apr / 1200;
    if (r === 0) return principal / months;
    return principal * r / (1 - Math.pow(1 + r, -months));
  }

  // Amortize one loan with a fixed payment (cents). Last payment may be partial.
  function amortize(principalCents, apr, paymentCents, maxMonths) {
    maxMonths = maxMonths || MAX_MONTHS;
    var r = apr / 1200, bal = principalCents, interest = 0, paid = 0, m = 0, rows = [];
    if (bal <= 0) return { ok: true, months: 0, interest: 0, totalPaid: 0, lastPayment: 0, rows: rows };
    if (paymentCents <= Math.round(bal * r)) return { ok: false, reason: 'interest' };
    var pay = 0;
    while (bal > 0 && m < maxMonths) {
      var i = Math.round(bal * r);
      bal += i; interest += i;
      pay = Math.min(paymentCents, bal);
      bal -= pay; paid += pay; m++;
      rows.push({ month: m, payment: pay, interest: i, balance: bal });
    }
    if (bal > 0) return { ok: false, reason: 'cap', months: m };
    return { ok: true, months: m, interest: interest, totalPaid: paid, lastPayment: pay, rows: rows };
  }

  // Simple calculator: payment needed to pay off balance in `months`.
  function paymentPlan(balance, apr, months) {
    var pc = Math.ceil(toCents(requiredPayment(toCents(balance) / 100, apr, months)) - 1e-9);
    // ensure payoff within term after cent rounding of interest
    var res = amortize(toCents(balance), apr, pc, months + 1);
    while (res.ok && res.months > months) { pc++; res = amortize(toCents(balance), apr, pc, months + 1); }
    res.payment = pc;
    return res;
  }

  function order(active, strategy) {
    return active.slice().sort(function (a, b) {
      if (strategy === 'avalanche') return (b.apr - a.apr) || (a.bal - b.bal) || (a.idx - b.idx);
      return (a.bal - b.bal) || (b.apr - a.apr) || (a.idx - b.idx);
    });
  }

  // Multi-debt planner. debts: [{label, balance, apr, minimum}] in dollars. extra in dollars.
  // Budget = sum of entered minimums + extra, held constant; freed payments roll over.
  function planDebts(debts, extra, strategy, maxMonths) {
    maxMonths = maxMonths || MAX_MONTHS;
    var ds = debts.map(function (d, idx) {
      return { idx: idx, label: d.label, apr: d.apr, r: d.apr / 1200, start: toCents(d.balance), bal: toCents(d.balance),
               min: toCents(d.minimum), interest: 0, paid: 0, payoffMonth: d.balance > 0 ? null : 0 };
    });
    var budget = ds.reduce(function (s, d) { return s + d.min; }, 0) + toCents(extra);
    var startTotal = ds.reduce(function (s, d) { return s + d.bal; }, 0);
    var firstInterest = ds.reduce(function (s, d) { return s + Math.round(d.bal * d.r); }, 0);
    var base = { budget: budget, startTotal: startTotal, strategy: strategy };
    if (startTotal <= 0) return Object.assign(base, { ok: true, months: 0, interest: 0, totalPaid: 0, debts: ds, schedule: [] });
    if (budget <= firstInterest) return Object.assign(base, { ok: false, reason: 'interest', firstInterest: firstInterest });
    var m = 0, schedule = [], totalInterest = 0, totalPaid = 0;
    while (m < maxMonths) {
      var active = ds.filter(function (d) { return d.bal > 0; });
      if (!active.length) break;
      m++;
      var monthInt = 0;
      active.forEach(function (d) { var i = Math.round(d.bal * d.r); d.bal += i; d.interest += i; monthInt += i; });
      var left = budget, monthPaid = 0;
      // 1) each debt's minimum (up to what's owed)
      active.forEach(function (d) { var p = Math.min(d.min, d.bal, left); d.bal -= p; d.paid += p; left -= p; monthPaid += p; });
      // 2) extra + freed budget in strategy order (order by balance after interest & minimums)
      order(active.filter(function (d) { return d.bal > 0; }), strategy).forEach(function (d) {
        if (left <= 0) return; var p = Math.min(left, d.bal); d.bal -= p; d.paid += p; left -= p; monthPaid += p;
      });
      active.forEach(function (d) { if (d.bal === 0 && d.payoffMonth === null) d.payoffMonth = m; });
      totalInterest += monthInt; totalPaid += monthPaid;
      schedule.push({ month: m, payment: monthPaid, interest: monthInt,
                      balance: ds.reduce(function (s, d) { return s + d.bal; }, 0) });
    }
    var remaining = ds.reduce(function (s, d) { return s + d.bal; }, 0);
    if (remaining > 0) return Object.assign(base, { ok: false, reason: 'cap', months: m, remaining: remaining, debts: ds });
    return Object.assign(base, { ok: true, months: m, interest: totalInterest, totalPaid: totalPaid, debts: ds, schedule: schedule });
  }

  var api = { MAX_MONTHS: MAX_MONTHS, toCents: toCents, requiredPayment: requiredPayment, amortize: amortize,
              paymentPlan: paymentPlan, planDebts: planDebts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PayCalc = api;
})(this);
