/* Daniel's public, self-reported payoff ledger. Amounts are whole cents.
   Overall and per-debt totals both derive from this one ledger.
   Dates are recorded updates, not independently confirmed bank settlement dates. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DanielDebt = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Each debt's starting balance is defined once here. They must add up to startingCents.
  // Credit Card 2's start includes the $898.88 paid Nov 3-7; Credit Card 1's includes the Nov 8 $1.00.
  var data = Object.freeze({
    startingCents: 4911344,
    journeyStart: '2026-11-03',
    accounts: Object.freeze([
      Object.freeze({ id: 'car-loan', label: 'Car loan', startingCents: 1520913 }),
      Object.freeze({ id: 'credit-card-1', label: 'Credit Card 1', startingCents: 61241 }),
      Object.freeze({ id: 'student-loans', label: 'Student loans', startingCents: 2967233 }),
      Object.freeze({ id: 'credit-card-2', label: 'Credit Card 2', startingCents: 361957 })
    ]),
    // Every contribution names the account id it paid. Untagged or unknown ids are rejected.
    // An optional plain-text note (1–80 characters) labels an entry, e.g. an extra reconciliation payment.
    contributions: Object.freeze([
      Object.freeze({ date: '2026-11-03', amountCents: 268, account: 'credit-card-2' }),
      Object.freeze({ date: '2026-11-04', amountCents: 6000, account: 'credit-card-2' }),
      Object.freeze({ date: '2026-11-05', amountCents: 46000, account: 'credit-card-2' }),
      // Nov 6 was one $375.20 day split across two debts: $373.13 car payment, $2.07 Credit Card 1 (Daniel, Nov 10, 2026).
      Object.freeze({ date: '2026-11-06', amountCents: 37313, account: 'car-loan' }),
      Object.freeze({ date: '2026-11-06', amountCents: 207, account: 'credit-card-1' }),
      Object.freeze({ date: '2026-11-07', amountCents: 100, account: 'credit-card-1' }),
      Object.freeze({ date: '2026-11-08', amountCents: 100, account: 'credit-card-1' }),
      Object.freeze({ date: '2026-11-09', amountCents: 2000, account: 'credit-card-1' }),
      // Nov 10: today's $1,477.32 payment, plus a $222.04 extra payment Daniel added because his original
      // Credit Card 2 starting figure was off; together they bring the card to the $1,397.53 he reported (Daniel, Nov 10, 2026).
      Object.freeze({ date: '2026-11-10', amountCents: 147732, account: 'credit-card-2' }),
      Object.freeze({ date: '2026-11-10', amountCents: 22204, account: 'credit-card-2', note: 'Extra payment (balance reconciliation)' }),
      Object.freeze({ date: '2026-11-11', amountCents: 100, account: 'credit-card-1' }),
      Object.freeze({ date: '2026-11-12', amountCents: 2000, account: 'credit-card-1' })
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
  function accountSetup(source) {
    if (source.accounts === undefined) return null; // Untagged legacy/test ledgers only; the published ledger always has accounts.
    if (!Array.isArray(source.accounts) || !source.accounts.length) throw new Error('Accounts must be a nonempty list.');
    var byId = new Map(), sum = 0;
    source.accounts.forEach(function (a) {
      if (!a || typeof a.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.id) || a.id.length > 40) throw new Error('Each account needs a lowercase id such as credit-card-1.');
      if (byId.has(a.id)) throw new Error('Duplicate account id.');
      if (typeof a.label !== 'string' || !a.label.trim() || a.label !== a.label.trim() || a.label.length > 80 || /[\u0000-\u001f\u007f]/.test(a.label)) throw new Error('Use a clear account nickname of 1–80 characters.');
      if (!Number.isSafeInteger(a.startingCents) || a.startingCents < 0) throw new Error('Account starting balances must be nonnegative whole cents.');
      sum += a.startingCents;
      byId.set(a.id, { id: a.id, label: a.label, startingCents: a.startingCents, paidCents: 0, contributions: [] });
    });
    if (sum !== source.startingCents) throw new Error('Account starting balances do not add up to the overall starting debt; reconcile before publishing.');
    return byId;
  }
  function report(source) {
    source = source || data;
    if (!Number.isSafeInteger(source.startingCents) || source.startingCents < 1 || !Array.isArray(source.contributions)) throw new Error('Invalid starting balance or ledger.');
    dateParts(source.journeyStart);
    var byId = accountSetup(source), grouped = new Map(), parts = new Map(), notes = new Map(), paid = 0;
    source.contributions.forEach(function (c) {
      dateParts(c.date);
      if (c.date < source.journeyStart) throw new Error('Contribution cannot predate the journey.');
      if (!Number.isSafeInteger(c.amountCents) || c.amountCents <= 0) throw new Error('Contribution amounts must be positive whole cents.');
      if (c.note !== undefined && (typeof c.note !== 'string' || !c.note.trim() || c.note !== c.note.trim() || c.note.length > 80 || /[\u0000-\u001f\u007f]/.test(c.note))) throw new Error('A contribution note must be plain text of 1–80 characters.');
      paid += c.amountCents;
      if (!Number.isSafeInteger(paid) || paid > source.startingCents) throw new Error('Reported contributions exceed the starting balance; reconcile the ledger before publishing.');
      if (byId) {
        var a = byId.get(c.account);
        if (!a) throw new Error('Each contribution must name a known account id (for example credit-card-1).');
        a.paidCents += c.amountCents;
        if (a.paidCents > a.startingCents) throw new Error('Contributions to ' + a.label + ' exceed its starting balance; reconcile before publishing.');
        a.contributions.push(c.note === undefined ? { date: c.date, amountCents: c.amountCents } : { date: c.date, amountCents: c.amountCents, note: c.note });
      } else if (c.account !== undefined) throw new Error('Contribution names an account but the ledger defines none.');
      grouped.set(c.date, (grouped.get(c.date) || 0) + c.amountCents);
      if (c.note !== undefined) notes.set(c.date, (notes.get(c.date) || []).concat([{ account: c.account, label: byId ? byId.get(c.account).label : null, amountCents: c.amountCents, note: c.note }]));
      if (byId) {
        // Per-day split by debt, so a day paid across several debts can be shown in parts.
        var dayParts = parts.get(c.date) || [], label = byId.get(c.account).label, part = dayParts.filter(function (p) { return p.account === c.account; })[0];
        if (part) part.amountCents += c.amountCents; else dayParts.push({ account: c.account, label: label, amountCents: c.amountCents });
        parts.set(c.date, dayParts);
      }
    });
    var cumulative = 0;
    var days = Array.from(grouped.keys()).sort().map(function (date) {
      var amount = grouped.get(date); cumulative += amount;
      return { date: date, amountCents: amount, cumulativeCents: cumulative, remainingCents: source.startingCents - cumulative, journeyDay: journeyDay(date, source.journeyStart), parts: parts.get(date) || [], notes: notes.get(date) || [] };
    });
    var accounts = byId ? Array.from(byId.values()).map(function (a) {
      // One tracker row per recorded payment (in date order), so two payments on one day count as two.
      var running = 0, history = a.contributions.map(function (c, i) { return { c: c, i: i }; }).sort(function (x, y) { return x.c.date < y.c.date ? -1 : x.c.date > y.c.date ? 1 : x.i - y.i; }).map(function (x) {
        running += x.c.amountCents;
        var row = { date: x.c.date, amountCents: x.c.amountCents, cumulativeCents: running, remainingCents: a.startingCents - running };
        if (x.c.note !== undefined) row.note = x.c.note;
        return row;
      });
      return { id: a.id, label: a.label, startingCents: a.startingCents, paidCents: a.paidCents, remainingCents: a.startingCents - a.paidCents, percent: a.startingCents ? a.paidCents / a.startingCents * 100 : 100, days: history };
    }) : null;
    return { startingCents: source.startingCents, paidCents: paid, remainingCents: source.startingCents - paid, percent: paid / source.startingCents * 100, days: days, lastDate: days.length ? days[days.length - 1].date : null, accounts: accounts };
  }
  return { data: data, report: report, formatDate: formatDate, journeyDay: journeyDay, money: money };
}));
