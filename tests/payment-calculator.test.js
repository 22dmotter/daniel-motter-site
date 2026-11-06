// Run: node tests/payment-calculator.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const C = require('../payment-calculator.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

// Independent reference: plain float simulation, no shared code.
function refPlan(debts, extra, strategy) {
  const ds = debts.map((d, i) => ({ i, b: d.balance, r: d.apr / 1200, min: d.minimum, int: 0, off: null }));
  const budget = ds.reduce((s, d) => s + d.min, 0) + extra;
  let m = 0, interest = 0;
  while (ds.some(d => d.b > 0.004) && m < 600) {
    m++;
    ds.forEach(d => { if (d.b > 0.004) { const i = d.b * d.r; d.b += i; d.int += i; interest += i; } });
    let left = budget;
    ds.forEach(d => { if (d.b > 0.004) { const p = Math.min(d.min, d.b, left); d.b -= p; left -= p; } });
    const act = ds.filter(d => d.b > 0.004).sort(strategy === 'avalanche' ? (a, b) => b.r - a.r || a.b - b.b : (a, b) => a.b - b.b || b.r - a.r);
    act.forEach(d => { const p = Math.min(left, d.b); d.b -= p; left -= p; });
    ds.forEach(d => { if (d.b <= 0.004 && d.off === null) d.off = m; });
  }
  return { months: m, interest, off: ds.map(d => d.off) };
}

t('known amortization: $200k, 6%, 30 yrs = $1,199.10 formula', () => {
  assert.strictEqual(C.requiredPayment(200000, 6, 360).toFixed(2), '1199.10');
  const r = C.paymentPlan(200000, 6, 360);
  assert.ok(r.ok && r.months <= 360);
  assert.ok(r.payment >= 119910 && r.payment <= 119911, r.payment);
});
t('known amortization: $10k, 7%, 60 mo = $198.01', () => {
  const r = C.paymentPlan(10000, 7, 60);
  assert.strictEqual(r.payment, 19802); // formula 198.0120 rounded up to the cent
  assert.strictEqual(r.months, 60);
  assert.strictEqual(r.totalPaid, 1000000 + r.interest);
  assert.ok(Math.abs(r.interest / 100 - 1880.72) < 1.5, r.interest);
});
t('0% APR exact split and partial final month', () => {
  const r = C.paymentPlan(1000, 0, 3); // 333.333.. -> 333.34, last 333.32
  assert.strictEqual(r.payment, 33334); assert.strictEqual(r.lastPayment, 33332);
  assert.strictEqual(r.interest, 0); assert.strictEqual(r.totalPaid, 100000); assert.strictEqual(r.months, 3);
  assert.strictEqual(C.paymentPlan(1200, 0, 12).payment, 10000);
});
t('amortize partial final payment and conservation', () => {
  const r = C.amortize(100000, 12, 30000);
  assert.ok(r.ok); assert.strictEqual(r.months, 4);
  assert.ok(r.lastPayment < 30000 && r.lastPayment > 0);
  assert.strictEqual(r.totalPaid, 100000 + r.interest);
  r.rows.forEach(x => assert.ok(x.balance >= 0));
});
t('single payment insufficient for interest', () => {
  assert.deepStrictEqual(C.amortize(1000000, 24, 20000), { ok: false, reason: 'interest' });
});
t('planner: zero-interest hand case (snowball pays $500 debt first)', () => {
  const d = [{ label: 'A', balance: 1000, apr: 0, minimum: 100 }, { label: 'B', balance: 500, apr: 0, minimum: 50 }];
  const r = C.planDebts(d, 50, 'snowball');
  assert.ok(r.ok); assert.strictEqual(r.months, 8); assert.strictEqual(r.interest, 0);
  assert.strictEqual(r.budget, 20000); assert.strictEqual(r.totalPaid, 150000);
  // B gets 50 min + 100 (A min 100, extra 50 => A keeps min) -> B: 100/mo -> paid month 5
  assert.strictEqual(r.debts[1].payoffMonth, 5); assert.strictEqual(r.debts[0].payoffMonth, 8);
  r.schedule.slice(0, -1).forEach(s => assert.strictEqual(s.payment, 20000)); // budget held constant
});
const sample = [
  { label: 'Card', balance: 3200, apr: 24.99, minimum: 95 },
  { label: 'Car', balance: 11500, apr: 7.5, minimum: 280 },
  { label: 'Student', balance: 18000, apr: 5.5, minimum: 190 },
  { label: 'Store', balance: 900, apr: 29.99, minimum: 35 },
];
for (const s of ['snowball', 'avalanche']) t(`planner ${s}: matches independent reference, conserves money`, () => {
  const r = C.planDebts(sample, 200, s), ref = refPlan(sample, 200, s);
  assert.ok(r.ok);
  assert.ok(Math.abs(r.months - ref.months) <= 1, r.months + ' vs ' + ref.months);
  assert.ok(Math.abs(r.interest / 100 - ref.interest) < 5, r.interest / 100 + ' vs ' + ref.interest);
  assert.strictEqual(r.totalPaid, r.startTotal + r.interest);
  r.debts.forEach(d => { assert.strictEqual(d.bal, 0); assert.strictEqual(d.paid, d.start + d.interest); assert.ok(d.payoffMonth >= 1); });
  r.schedule.forEach(x => { assert.ok(x.balance >= 0 && x.payment <= r.budget); });
  assert.strictEqual(r.schedule[r.schedule.length - 1].balance, 0);
});
t('avalanche never costs more interest than snowball; orders differ correctly', () => {
  const sn = C.planDebts(sample, 200, 'snowball'), av = C.planDebts(sample, 200, 'avalanche');
  assert.ok(av.interest <= sn.interest);
  const sameRates = [{ label: 'big hi', balance: 5000, apr: 25, minimum: 100 }, { label: 'small lo', balance: 1000, apr: 5, minimum: 30 }];
  assert.ok(C.planDebts(sameRates, 300, 'snowball').debts[1].payoffMonth < C.planDebts(sameRates, 300, 'snowball').debts[0].payoffMonth);
  assert.ok(C.planDebts(sameRates, 300, 'avalanche').interest < C.planDebts(sameRates, 300, 'snowball').interest);
});
t('planner: budget below first month interest -> no payoff', () => {
  const r = C.planDebts([{ label: 'x', balance: 20000, apr: 30, minimum: 100 }], 0, 'snowball');
  assert.strictEqual(r.ok, false); assert.strictEqual(r.reason, 'interest'); assert.strictEqual(r.months, undefined);
});
t('planner: hits 50-year cap -> no false payoff date', () => {
  const r = C.planDebts([{ label: 'x', balance: 200000, apr: 24, minimum: 4000.01 }], 0, 'snowball');
  assert.strictEqual(r.ok, false); assert.strictEqual(r.reason, 'cap'); assert.ok(r.remaining > 0);
});
t('planner: zero minimum debt is funded by extra/rollover', () => {
  const r = C.planDebts([{ label: 'a', balance: 300, apr: 0, minimum: 0 }, { label: 'b', balance: 300, apr: 10, minimum: 50 }], 100, 'avalanche');
  assert.ok(r.ok); r.debts.forEach(d => assert.strictEqual(d.bal, 0));
});
t('malicious debt label stays plain data; UI never uses innerHTML', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const r = C.planDebts([{ label: evil, balance: 100, apr: 0, minimum: 10 }], 0, 'snowball');
  assert.strictEqual(r.debts[0].label, evil);
  const html = fs.readFileSync(path.join(__dirname, '..', 'calculate-your-payment.html'), 'utf8');
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write|eval\(/.test(html));
});
t('every inline script on every page compiles', () => {
  const dir = path.join(__dirname, '..');
  fs.readdirSync(dir).filter(f => f.endsWith('.html')).forEach(f => {
    const h = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of h.matchAll(/<script(?![^>]*src)([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/ld\+json/.test(m[1])) JSON.parse(m[2]); else new Function(m[2]);
    }
  });
});
console.log(`\n${n} tests passed`);
