'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process');
const C = require('../debt-contributions'), root = path.join(__dirname,'..');
let count = 0; function test(name,fn){fn();count++;console.log('ok - '+name);}
const source = contributions => ({ startingCents:10000, journeyStart:'2026-11-03', contributions });
const event = (date,amountCents) => ({date,amountCents});
const tagged = (date,amountCents,account) => ({date,amountCents,account});
const accounts = list => list.map(([id,startingCents])=>({id,label:id,startingCents}));
test('five user-confirmed dates and amounts, including Nov 3 opening contribution',()=>{
 assert.deepEqual(C.data.contributions.slice(0,5),[tagged('2026-11-03',268,'credit-card-2'),tagged('2026-11-04',6000,'credit-card-2'),tagged('2026-11-05',46000,'credit-card-2'),tagged('2026-11-06',37520,'credit-card-2'),tagged('2026-11-07',100,'credit-card-1')]);
 const r=C.report({...C.data,contributions:C.data.contributions.slice(0,5)});
 assert.equal(r.paidCents,89888);assert.equal(r.remainingCents,4821456);assert.equal(r.startingCents,4911344);
});
test('Nov 8 $1.00 as Day 6 brought the total to $899.88 paid, $48,213.56 left',()=>{
 const r=C.report({...C.data,contributions:C.data.contributions.slice(0,6)});assert.deepEqual(C.data.contributions[5],tagged('2026-11-08',100,'credit-card-1'));
 assert.equal(r.paidCents,89988);assert.equal(r.remainingCents,4821356);assert.equal(r.lastDate,'2026-11-08');
});
test('current ledger adds Nov 9 $20.00 to Credit Card 1 as Day 7: $919.88 paid, $48,193.56 left',()=>{
 const r=C.report();assert.equal(C.data.contributions.length,7);assert.deepEqual(C.data.contributions[6],tagged('2026-11-09',2000,'credit-card-1'));
 assert.equal(r.paidCents,91988);assert.equal(r.remainingCents,4819356);assert.deepEqual(r.days.map(d=>d.journeyDay),[1,2,3,4,5,6,7]);
 assert.deepEqual(r.days.map(d=>d.cumulativeCents),[268,6268,52268,89788,89888,89988,91988]);assert.equal(r.lastDate,'2026-11-09');assert.equal(r.percent.toFixed(1),'1.9');
});
test('canonical cumulative totals and journey days are exact',()=>{
 const r=C.report({...C.data,contributions:C.data.contributions.slice(0,5)});
 assert.deepEqual(r.days.map(d=>d.cumulativeCents),[268,6268,52268,89788,89888]);
 assert.deepEqual(r.days.map(d=>d.journeyDay),[1,2,3,4,5]);
 assert.deepEqual(r.days.map(d=>d.remainingCents),[4911076,4905076,4859076,4821556,4821456]);
 assert.equal(r.lastDate,'2026-11-07');
});
test('four debt starting balances are defined once and add up to the $49,113.44 overall start',()=>{
 assert.deepEqual(C.data.accounts.map(a=>[a.id,a.label,a.startingCents]),[['car-loan','Car loan',1520913],['credit-card-1','Credit Card 1',61241],['student-loans','Student loans',2967233],['credit-card-2','Credit Card 2',361957]]);
 assert.equal(C.data.accounts.reduce((s,a)=>s+a.startingCents,0),C.data.startingCents);assert.equal(C.data.startingCents,4911344);assert(Object.isFrozen(C.data.accounts));assert(Object.isFrozen(C.data.accounts[0]));
});
test('per-debt paid and remaining derive from tagged entries and reconcile with overall totals',()=>{
 const r=C.report(),f=id=>r.accounts.find(a=>a.id===id);
 assert.deepEqual(r.accounts.map(a=>[a.id,a.startingCents,a.paidCents,a.remainingCents]),[['car-loan',1520913,0,1520913],['credit-card-1',61241,2200,59041],['student-loans',2967233,0,2967233],['credit-card-2',361957,89788,272169]]);
 assert.equal(r.accounts.reduce((s,a)=>s+a.paidCents,0),r.paidCents);assert.equal(r.accounts.reduce((s,a)=>s+a.remainingCents,0),r.remainingCents);assert.equal(r.remainingCents,4819356);
 assert.equal(f('credit-card-2').percent.toFixed(1),'24.8');assert.equal(f('credit-card-1').percent.toFixed(1),'3.6');assert.equal(f('car-loan').percent,0);assert.equal(f('student-loans').percent,0);
});
test('per-debt trackers list each debt\'s own dated contributions with running balance',()=>{
 const r=C.report(),f=id=>r.accounts.find(a=>a.id===id);
 assert.deepEqual(f('credit-card-2').days.map(d=>[d.date,d.amountCents,d.remainingCents]),[['2026-11-03',268,361689],['2026-11-04',6000,355689],['2026-11-05',46000,309689],['2026-11-06',37520,272169]]);
 assert.deepEqual(f('credit-card-1').days.map(d=>[d.date,d.amountCents,d.remainingCents]),[['2026-11-07',100,61141],['2026-11-08',100,61041],['2026-11-09',2000,59041]]);
 assert.deepEqual(f('car-loan').days,[]);assert.deepEqual(f('student-loans').days,[]);
});
test('every published contribution names a known account; untagged or unknown entries fail',()=>{
 for(const c of C.data.contributions)assert(C.data.accounts.some(a=>a.id===c.account),'untagged or unknown account on '+c.date);
 assert.throws(()=>C.report({...C.data,contributions:C.data.contributions.concat({date:'2026-11-09',amountCents:100})}),/known account/);
 assert.throws(()=>C.report({...C.data,contributions:C.data.contributions.concat({date:'2026-11-09',amountCents:100,account:'credit-card-3'})}),/known account/);
 assert.throws(()=>C.report(source([tagged('2026-11-03',1,'x')])),/defines none/);
});
test('account starts must reconcile, ids must be unique, and a debt cannot be overpaid',()=>{
 const base={startingCents:300,journeyStart:'2026-11-03'};
 assert.throws(()=>C.report({...base,accounts:accounts([['a',100],['b',100]]),contributions:[]}),/add up/);
 assert.throws(()=>C.report({...base,accounts:accounts([['a',100],['a',200]]),contributions:[]}),/Duplicate/);
 for(const id of ['','A','bad id','a--b'])assert.throws(()=>C.report({...base,accounts:accounts([[id,300]]),contributions:[]}));
 assert.throws(()=>C.report({...base,accounts:accounts([['a',100],['b',200]]),contributions:[tagged('2026-11-03',101,'a')]}),/exceed/);
 const r=C.report({...base,accounts:accounts([['a',100],['b',200]]),contributions:[tagged('2026-11-04',30,'b'),tagged('2026-11-03',70,'a'),tagged('2026-11-04',20,'b')]});
 assert.deepEqual(r.accounts.map(a=>[a.paidCents,a.remainingCents]),[[70,30],[50,150]]);assert.deepEqual(r.accounts[1].days.map(d=>[d.date,d.amountCents,d.cumulativeCents]),[['2026-11-04',50,50]]);assert.equal(r.accounts[0].percent,70);
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
  assert(s.includes('src="debt-contributions.js?v='));assert(s.indexOf('src="debt-contributions.js?v=')<s.indexOf('src="public-debt-ui.js?v='));assert(!/var DEBT_START|PAID=/.test(s));
  if(s.includes('class="pct"'))assert(s.includes('>'+r.percent.toFixed(1)+'%</strong>'));
 }
});
test('full paid cards are real links with visible hints and green styling preserved',()=>{
 for(const f of ['index.html','about.html']){
  const s=fs.readFileSync(path.join(root,f),'utf8'), link=s.match(/<a class="stat paid-stat-link" href="daily-contributions.html">([\s\S]*?)<\/a>/);
  assert(link,f);assert(link[1].includes('class="debt-paid"'));assert(link[1].includes('Paid off so far'));assert(link[1].includes('View daily contributions'));assert(!/button|onclick/.test(link[0]));assert(s.includes('href="public-debt.css?v='));
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
  fs.mkdirSync(path.join(dir,'scripts'));fs.copyFileSync(path.join(root,'debt-contributions.js'),path.join(dir,'debt-contributions.js'));fs.copyFileSync(path.join(root,'debt-breakdown.js'),path.join(dir,'debt-breakdown.js'));fs.copyFileSync(path.join(root,'scripts/sync-public-debt.js'),path.join(dir,'scripts/sync-public-debt.js'));
  const files=['index.html','about.html','daily-contributions.html','debt-breakdown.html'];
  for(const f of files)fs.copyFileSync(path.join(root,f),path.join(dir,f));
  cp.execFileSync(process.execPath,[path.join(dir,'scripts/sync-public-debt.js')]);
  for(const f of files)assert.equal(fs.readFileSync(path.join(dir,f),'utf8'),fs.readFileSync(path.join(root,f),'utf8'),f+' fallbacks need syncing');
  cp.execFileSync(process.execPath,[path.join(dir,'scripts/sync-public-debt.js')]);
  for(const f of files)assert.equal(fs.readFileSync(path.join(dir,f),'utf8'),fs.readFileSync(path.join(root,f),'utf8'));
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
console.log(count+' public contribution tests passed');
