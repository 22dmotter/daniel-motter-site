/* Daniel's public, self-reported payoff ledger. Amounts are whole cents.
   Dates are recorded updates, not independently confirmed bank settlement dates. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DanielDebt = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var data = Object.freeze({
    startingCents: 4911344,
    journeyStart: '2026-11-03',
    contributions: Object.freeze([
      Object.freeze({ date: '2026-11-03', amountCents: 268 }),
      Object.freeze({ date: '2026-11-04', amountCents: 6000 }),
      Object.freeze({ date: '2026-11-05', amountCents: 46000 }),
      Object.freeze({ date: '2026-11-06', amountCents: 37520 }),
      Object.freeze({ date: '2026-11-07', amountCents: 100 })
    ])
  });
  function dateParts(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('A recorded contribution needs a date in YYYY-MM-DD format.');
    var p = s.split('-').map(Number), stamp = Date.UTC(p[0], p[1] - 1, p[2]), d = new Date(stamp);
    if (p[0] < 1900 || p[0] > 9999 || d.getUTCFullYear() !== p[0] || d.getUTCMonth() + 1 !== p[1] || d.getUTCDate() !== p[2]) throw new Error('Invalid calendar date.');
    return { year: p[0], month: p[1], day: p[2], stamp: stamp };
  }
  function formatDate(s) {
    var d = dateParts(s);
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.month - 1] + ' ' + d.day + ', ' + d.year;
  }
  function journeyDay(s, start) { return (dateParts(s).stamp - dateParts(start).stamp) / 86400000 + 1; }
  function money(cents) {
    if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Money must be nonnegative whole cents.');
    return '$' + Math.floor(cents / 100).toLocaleString('en-US') + '.' + String(cents % 100).padStart(2, '0');
  }
  function report(source) {
    source = source || data;
    if (!Number.isSafeInteger(source.startingCents) || source.startingCents < 1 || !Array.isArray(source.contributions)) throw new Error('Invalid starting balance or ledger.');
    dateParts(source.journeyStart);
    var grouped = new Map(), paid = 0;
    source.contributions.forEach(function (c) {
      dateParts(c.date);
      if (c.date < source.journeyStart) throw new Error('Contribution cannot predate the journey.');
      if (!Number.isSafeInteger(c.amountCents) || c.amountCents <= 0) throw new Error('Contribution amounts must be positive whole cents.');
      paid += c.amountCents;
      if (!Number.isSafeInteger(paid) || paid > source.startingCents) throw new Error('Reported contributions exceed the starting balance; reconcile the ledger before publishing.');
      grouped.set(c.date, (grouped.get(c.date) || 0) + c.amountCents);
    });
    var cumulative = 0;
    var days = Array.from(grouped.keys()).sort().map(function (date) {
      var amount = grouped.get(date); cumulative += amount;
      return { date: date, amountCents: amount, cumulativeCents: cumulative, remainingCents: source.startingCents - cumulative, journeyDay: journeyDay(date, source.journeyStart) };
    });
    return { startingCents: source.startingCents, paidCents: paid, remainingCents: source.startingCents - paid, percent: paid / source.startingCents * 100, days: days, lastDate: days.length ? days[days.length - 1].date : null };
  }
  return { data: data, report: report, formatDate: formatDate, journeyDay: journeyDay, money: money };
}));
