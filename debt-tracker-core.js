/* Local debt tracker: integer cents, explicit balance snapshots, no network calls. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DebtTracker = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var VERSION = 1, MAX_CENTS = 1000000000, MAX_DEBTS = 50, MAX_ENTRIES = 5000, MAX_BYTES = 2000000;
  var KEY = 'daniel-motter-debt-tracker-v1';
  function fail(message) { throw new Error(message); }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function date(s, now) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) fail('Use a valid date (YYYY-MM-DD).');
    var d = new Date(s + 'T12:00:00Z');
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== s || s < '1900-01-01' || s > (now || today())) fail('Dates must be real dates from 1900 through today, not in the future.');
    return s;
  }
  function cents(n, positive) {
    if (!Number.isSafeInteger(n) || n < (positive ? 1 : 0) || n > MAX_CENTS) fail('Amounts must be whole cents between ' + (positive ? '$0.01' : '$0') + ' and $10,000,000.');
    return n;
  }
  function money(s, positive) {
    if (typeof s !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(s.trim()) || s.trim().length > 14) fail('Enter dollars with up to two decimal places, without commas or currency symbols.');
    var p = s.trim().split('.'), n = Number(p[0]) * 100 + Number((p[1] || '').padEnd(2, '0'));
    return cents(n, positive);
  }
  function keys(o, expected) {
    if (!o || typeof o !== 'object' || Array.isArray(o) || Object.getPrototypeOf(o) !== Object.prototype || Object.keys(o).sort().join('|') !== expected.slice().sort().join('|')) fail('Backup has missing, extra, or unsupported fields.');
  }
  function id(s, seen) {
    if (typeof s !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(s) || seen.has(s)) fail('Backup contains invalid or duplicate IDs.');
    seen.add(s); return s;
  }
  function name(s) {
    if (typeof s !== 'string' || !s.trim() || s !== s.trim() || s.length > 60 || /[\u0000-\u001f\u007f]/.test(s)) fail('Use a nickname of 1–60 characters, with no control characters.');
    return s;
  }
  function empty() { return { version: VERSION, debts: [] }; }
  function validate(s, now) {
    keys(s, ['version', 'debts']);
    if (s.version !== VERSION) fail('Unsupported backup version. Keep your original file; only version 1 is supported.');
    if (!Array.isArray(s.debts) || s.debts.length > MAX_DEBTS) fail('A tracker can hold up to 50 debts.');
    var seen = new Set(), totalEntries = 0;
    var debts = s.debts.map(function (d) {
      keys(d, ['id', 'name', 'startDate', 'startingCents', 'openingDate', 'openingCents', 'entries']);
      var out = { id: id(d.id, seen), name: name(d.name), startDate: date(d.startDate, now), startingCents: cents(d.startingCents, true), openingDate: date(d.openingDate, now), openingCents: cents(d.openingCents, false), entries: [] };
      if (out.openingDate < out.startDate) fail('The first balance date cannot be before the journey start date.');
      if (!Array.isArray(d.entries) || (totalEntries += d.entries.length) > MAX_ENTRIES) fail('A tracker can hold up to 5,000 history entries.');
      var lastDate = out.openingDate;
      out.entries = d.entries.map(function (e) {
        keys(e, ['id', 'date', 'paymentCents', 'balanceCents']);
        var entry = { id: id(e.id, seen), date: date(e.date, now), paymentCents: cents(e.paymentCents, false), balanceCents: cents(e.balanceCents, false) };
        if (entry.date < lastDate) fail('Entries must be in date order, on or after the first balance date. Undo the latest entry to correct it.');
        lastDate = entry.date;
        return entry;
      });
      return out;
    });
    return { version: VERSION, debts: debts };
  }
  function bytes(s) { return new TextEncoder().encode(s).length; }
  function parse(raw, now) {
    if (typeof raw !== 'string' || raw.length > MAX_BYTES || bytes(raw) > MAX_BYTES) fail('Backup must be a JSON file no larger than 2 MB.');
    var s;
    try { s = JSON.parse(raw); } catch (_) { fail('This file is not valid JSON. Your current tracker has not been changed.'); }
    return validate(s, now);
  }
  function serialize(s, now) { return JSON.stringify(validate(s, now), null, 2); }
  function current(d) { return d.entries.length ? d.entries[d.entries.length - 1].balanceCents : d.openingCents; }
  function totals(s) {
    var t = { starting: 0, remaining: 0, paid: 0, reduction: 0, percent: 0, debtCount: s.debts.length, paidOff: 0 };
    s.debts.forEach(function (d) {
      t.starting += d.startingCents; t.remaining += current(d);
      var previous = d.openingCents, cleared = false;
      d.entries.forEach(function (e) { t.paid += e.paymentCents; if (previous > 0 && e.balanceCents === 0) cleared = true; previous = e.balanceCents; });
      // Opening at zero alone is not evidence of a payoff event. A later balance rise relocks this status.
      if (current(d) === 0 && cleared) t.paidOff++;
    });
    t.reduction = t.starting - t.remaining;
    t.percent = t.starting ? Math.max(0, Math.min(100, t.reduction / t.starting * 100)) : 0;
    return t;
  }
  function milestones(s) {
    var t = totals(s), has = t.debtCount > 0;
    var m = [{ id: 'payment', label: 'First payment recorded', active: has && t.paid > 0 },
      { id: 'reduction', label: 'First net balance reduction', active: has && t.reduction > 0 },
      { id: 'cleared', label: 'A debt paid off in your history', active: has && t.paidOff > 0 }];
    [10, 25, 50, 75, 90, 100].forEach(function (p) {
      m.push({ id: 'percent-' + p, label: p === 100 ? 'All tracked balances at zero' : p + '% net debt reduction', active: has && t.reduction * 100 >= t.starting * p });
    });
    return m;
  }
  function clone(s) { return JSON.parse(JSON.stringify(s)); }
  function addDebt(s, d, now) { var next = clone(s); next.debts.push(d); return validate(next, now); }
  function find(s, debtId) { var d = s.debts.find(function (v) { return v.id === debtId; }); if (!d) fail('Debt not found.'); return d; }
  function addEntry(s, debtId, entry, now) { var next = clone(s); find(next, debtId).entries.push(entry); return validate(next, now); }
  function undo(s, debtId, now) { var next = clone(s), d = find(next, debtId); if (!d.entries.length) fail('No entry to undo.'); d.entries.pop(); return validate(next, now); }
  function remove(s, debtId, now) { find(s, debtId); return validate({ version: VERSION, debts: s.debts.filter(function (d) { return d.id !== debtId; }) }, now); }
  function load(storage, now) {
    var raw;
    try { raw = storage.getItem(KEY); } catch (_) { return { ok: false, kind: 'unavailable', state: empty(), raw: null, message: 'Browser storage is unavailable. Changes will only stay in this tab. Download a backup before leaving.' }; }
    if (raw === null) return { ok: true, state: empty(), raw: null };
    try { return { ok: true, state: parse(raw, now), raw: raw }; }
    catch (_) { return { ok: false, kind: 'invalid', state: empty(), raw: raw, message: 'Saved data could not be read. It has NOT been overwritten. Download the unreadable data before importing a valid backup or clearing it.' }; }
  }
  function save(storage, s, expectedRaw, now) {
    var raw;
    try { raw = serialize(s, now); } catch (e) { return { ok: false, kind: 'invalid', message: e.message }; }
    try {
      if (expectedRaw !== undefined && storage.getItem(KEY) !== expectedRaw) return { ok: false, kind: 'conflict', message: 'Another tab changed this tracker. No changes were applied. Reload this page to use the latest data.' };
      storage.setItem(KEY, raw);
      if (storage.getItem(KEY) !== raw) throw new Error('Write was not retained');
      return { ok: true, raw: raw };
    } catch (_) { return { ok: false, kind: 'unavailable', message: 'Changes are NOT saved in this browser. Keep this tab open and download a backup. Browser storage may be blocked or full.' }; }
  }
  return { VERSION: VERSION, MAX_BYTES: MAX_BYTES, KEY: KEY, empty: empty, today: today, date: date, money: money, validate: validate, parse: parse, serialize: serialize, current: current, totals: totals, milestones: milestones, addDebt: addDebt, addEntry: addEntry, undo: undo, remove: remove, load: load, save: save };
}));
