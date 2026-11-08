'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process');
const C = require('../debt-contributions'), root = path.join(__dirname,'..');
let count = 0; function test(name,fn){fn();count++;console.log('ok - '+name);}
const source = contributions => ({ startingCents:10000, journeyStart:'2026-11-03', contributions });
const event = (date,amountCents) => ({date,amountCents});
test('five user-confirmed dates and amounts, including Nov 3 opening contribution',()=>{
 assert.deepEqual(C.data.contributions.slice(0,5),[event('2026-11-03',268),event('2026-11-04',6000),event('2026-11-05',46000),event('2026-11-06',37520),event('2026-11-07',100)]);
 const r=C.report({...C.data,contributions:C.data.contributions.slice(0,5)});
 assert.equal(r.paidCents,89888);assert.equal(r.remainingCents,4821456);assert.equal(r.startingCents,4911344);
});
test('canonical cumulative totals and journey days are exact',()=>{
 const r=C.report({...C.data,contributions:C.data.contributions.slice(0,5)});
 assert.deepEqual(r.days.map(d=>d.cumulativeCents),[268,6268,52268,89788,89888]);
 assert.deepEqual(r.days.map(d=>d.journeyDay),[1,2,3,4,5]);
 assert.deepEqual(r.days.map(d=>d.remainingCents),[4911076,4905076,4859076,4821556,4821456]);
 assert.equal(r.lastDate,'2026-11-07');
});
test('same-date entries group, unsorted input is sorted without mutation',()=>{
 const entries=[event('2026-11-05',29),event('2026-11-03',101),event('2026-11-05',71),event('2026-11-04',99)], original=JSON.stringify(entries);
 const r=C.report(source(entries));assert.deepEqual(r.days.map(d=>d.date),['2026-11-03','2026-11-04','2026-11-05']);
 assert.deepEqual(r.days.map(d=>d.amountCents),[101,99,100]);assert.deepEqual(r.days.map(d=>d.cumulativeCents),[101,200,300]);assert.equal(JSON.stringify(entries),original);
});
test('whole-cent precision is conserved',()=>{
 const r=C.report(source([event('2026-11-03',29),event('2026-11-03',1),event('2026-11-04',10)]));
 assert.equal(r.paidCents,40);assert.equal(r.remainingCents,9960);assert.equal(C.money(r.paidCents),'$0.40');
});
test('no zero-payment dates invented for gaps',()=>{
 const r=C.report(source([event('2026-11-03',1),event('2026-11-07',2)]));assert.equal(r.days.length,2);assert.deepEqual(r.days.map(d=>d.journeyDay),[1,5]);
});
test('missing dates rejected rather than guessed',()=>{
 for(const date of [null,undefined,'','unknown'])assert.throws(()=>C.report(source([event(date,268)])));
});
test('invalid calendar dates and dates before journey start rejected',()=>{
 for(const date of ['2026-02-30','2026-13-01','2026-11-02','11/03/2026','1899-11-03','2026-11-003'])assert.throws(()=>C.report(source([event(date,1)])));
});
test('invalid cent amounts rejected',()=>{
 for(const value of [0,-1,1.5,'100',NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>C.report(source([event('2026-11-03',value)])));
});
test('sum above starting debt rejected for manual reconciliation',()=>{
 assert.throws(()=>C.report(source([event('2026-11-03',9999),event('2026-11-04',2)])),/reconcile/);
});
test('unsafe or absent starting balances and invalid ledger rejected',()=>{
 for(const value of [0,-1,0.5,NaN,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>C.report({startingCents:value,journeyStart:'2026-11-03',contributions:[]}));
 assert.throws(()=>C.report({...source([]),contributions:null}));
});
test('empty ledger has no fictitious contribution or date',()=>{
 const r=C.report(source([]));assert.deepEqual(r.days,[]);assert.equal(r.paidCents,0);assert.equal(r.lastDate,null);assert.equal(r.remainingCents,10000);
});
test('exact full payoff has zero remaining and 100 percent',()=>{
 const r=C.report(source([event('2026-11-03',10000)]));assert.equal(r.remainingCents,0);assert.equal(r.percent,100);
});
test('formats all amounts as exact dollar cents',()=>{
 assert.equal(C.money(268),'$2.68');assert.equal(C.money(100),'$1.00');assert.equal(C.money(4911344),'$49,113.44');assert.equal(C.money(Number.MAX_SAFE_INTEGER),'$90,071,992,547,409.91');assert.throws(()=>C.money(-1));
});
test('date labels and journey days never shift with time zones or DST',()=>{
 for(const tz of ['UTC','America/New_York','Pacific/Honolulu','Pacific/Kiritimati']) {
  const result=cp.execFileSync(process.execPath,['-e',`const C=require(${JSON.stringify(path.join(root,'debt-contributions.js'))});console.log(C.formatDate('2026-11-03')+'|'+C.journeyDay('2026-11-04','2026-11-03')+'|'+C.journeyDay('2027-03-15','2027-03-13'));`],{env:{...process.env,TZ:tz},encoding:'utf8'}).trim();
  assert.equal(result,'Nov 3, 2026|2|3');
 }
});
test('public data is immutable and independent of personal tracker storage',()=>{
 assert(Object.isFrozen(C.data));assert(Object.isFrozen(C.data.contributions));assert(Object.isFrozen(C.data.contributions[0]));
 for(const f of ['debt-contributions.js','public-debt-ui.js'])assert(!/localStorage|sessionStorage|fetch\(/.test(fs.readFileSync(path.join(root,f),'utf8')));
});
test('all three HTML summary fallbacks reconcile to authoritative ledger',()=>{
 const r=C.report();for(const f of ['index.html','about.html','daily-contributions.html']){
  const s=fs.readFileSync(path.join(root,f),'utf8');
  for(const [cls,amount] of [['debt-start',r.startingCents],['debt-paid',r.paidCents],['debt-left',r.remainingCents]])assert(s.includes('<b class="'+cls+'">'+C.money(amount)+'</b>'),f+' '+cls+' is stale: run node scripts/sync-public-debt.js');
  assert(s.includes('src="debt-contributions.js"'));assert(s.indexOf('src="debt-contributions.js"')<s.indexOf('src="public-debt-ui.js"'));assert(!/var DEBT_START|PAID=/.test(s));
  if(s.includes('class="pct"'))assert(s.includes('>'+r.percent.toFixed(1)+'%</strong>'));
 }
});
test('full paid cards are real links with visible hints and green styling preserved',()=>{
 for(const f of ['index.html','about.html']){
  const s=fs.readFileSync(path.join(root,f),'utf8'), link=s.match(/<a class="stat paid-stat-link" href="daily-contributions.html">([\s\S]*?)<\/a>/);
  assert(link,f);assert(link[1].includes('class="debt-paid"'));assert(link[1].includes('Paid off so far'));assert(link[1].includes('View daily contributions'));assert(!/button|onclick/.test(link[0]));assert(s.includes('href="public-debt.css"'));
 }
 assert(fs.readFileSync(path.join(root,'public-debt.css'),'utf8').includes('a.paid-stat-link:focus-visible'));
});
test('all static history records match sorted grouped ledger, including dollar signs',()=>{
 const s=fs.readFileSync(path.join(root,'daily-contributions.html'),'utf8'), r=C.report();
 const area=s.match(/<!-- contribution-records:start -->([\s\S]*?)<!-- contribution-records:end -->/)[1];
 const rows=[...area.matchAll(/<li class="card contribution-record">([\s\S]*?)<\/li>/g)];assert.equal(rows.length,r.days.length);
 rows.forEach((row,i)=>{
  const d=r.days[i],html=row[1];assert(html.includes('datetime="'+d.date+'"'));assert(html.includes('>'+C.formatDate(d.date)+'</time>'));assert(html.includes('Day '+d.journeyDay));
  const values=[...html.matchAll(/<dd[^>]*>([^<]*)<\/dd>/g)].map(m=>m[1]);assert.deepEqual(values,[C.money(d.amountCents),C.money(d.cumulativeCents),C.money(d.remainingCents)]);
 });
 assert(s.includes('datetime="'+r.lastDate+'">'+C.formatDate(r.lastDate)));
 assert(s.includes('not bank-confirmed settlement dates'));assert(s.includes('A missing date does not mean no payment was made'));
});
test('fallback sync is deterministic, idempotent, and matches current release files',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dm-public-debt-'));
 try {
  fs.mkdirSync(path.join(dir,'scripts'));fs.copyFileSync(path.join(root,'debt-contributions.js'),path.join(dir,'debt-contributions.js'));fs.copyFileSync(path.join(root,'scripts/sync-public-debt.js'),path.join(dir,'scripts/sync-public-debt.js'));
  const files=['index.html','about.html','daily-contributions.html'];
  for(const f of files)fs.copyFileSync(path.join(root,f),path.join(dir,f));
  cp.execFileSync(process.execPath,[path.join(dir,'scripts/sync-public-debt.js')]);
  for(const f of files)assert.equal(fs.readFileSync(path.join(dir,f),'utf8'),fs.readFileSync(path.join(root,f),'utf8'),f+' fallbacks need syncing');
  cp.execFileSync(process.execPath,[path.join(dir,'scripts/sync-public-debt.js')]);
  for(const f of files)assert.equal(fs.readFileSync(path.join(dir,f),'utf8'),fs.readFileSync(path.join(root,f),'utf8'));
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
console.log(count+' public contribution tests passed');
