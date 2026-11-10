'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const C=require('../debt-contributions'),B=require('../debt-breakdown'),root=path.join(__dirname,'..');let count=0;
function test(name,fn){fn();count++;console.log('ok - '+name);}
const item=(label,balanceCents,reportedDate='2026-11-08')=>({label,balanceCents,reportedDate});
function sandbox(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dm-breakdown-'));try{
 fs.mkdirSync(path.join(dir,'scripts'));
 for(const f of ['debt-contributions.js','debt-breakdown.js','index.html','about.html','daily-contributions.html','debt-breakdown.html','scripts/sync-public-debt.js'])fs.copyFileSync(path.join(root,f),path.join(dir,f));
 fn(dir);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}}
function sync(dir){cp.execFileSync(process.execPath,[path.join(dir,'scripts/sync-public-debt.js')]);}
function addContribution(dir,cents,account){const p=path.join(dir,'debt-contributions.js');let s=fs.readFileSync(p,'utf8');const key="Object.freeze({ date: '2026-11-08', amountCents: 100, account: 'credit-card-1' })";assert(s.includes(key));s=s.replace(key,key+",\n      Object.freeze({ date: '2026-11-09', amountCents: "+cents+(account===undefined?'':", account: '"+account+"'")+' })');fs.writeFileSync(p,s);}
function syncFails(dir,re){const before=fs.readFileSync(path.join(dir,'debt-breakdown.html'),'utf8');let err;try{cp.execFileSync(process.execPath,[path.join(dir,'scripts/sync-public-debt.js')],{stdio:'pipe'});}catch(e){err=e;}assert(err,'sync should refuse');assert.match(String(err.stderr),re);assert.equal(fs.readFileSync(path.join(dir,'debt-breakdown.html'),'utf8'),before);}
test('user-reported snapshots are exact and recorded on Nov 8',()=>{assert.deepEqual(B.snapshots.map(({label,balanceCents,reportedDate})=>({label,balanceCents,reportedDate})),[item('Car loan',1520913),item('Credit Card 1',58834),item('Student loans',2967233),item('Credit Card 2',272376)]);assert(Object.isFrozen(B.snapshots));assert(Object.isFrozen(B.snapshots[0]));});
test('Credit Card 1 payments through Nov 9: named balances reconcile to $48,193.56 with no discrepancy',()=>{const r=B.report();assert.equal(r.totalCents,C.report().remainingCents);assert.equal(r.totalCents,4819356);assert.equal(r.namedCents,4819356);assert.equal(r.unitemizedCents,0);assert.equal(r.mismatch,false);});
test('Credit Card 2 is the explicitly assigned current residual, student loans are not added twice',()=>{const r=B.report(),find=label=>r.named.find(d=>d.label===label).balanceCents;assert.equal(find('Student loans'),2967233);assert.equal(find('Credit Card 2'),4819356-find('Car loan')-find('Credit Card 1')-find('Student loans'));assert.equal(r.named.length,4);});
test('empty itemization represents entire total as calculated remainder, no invented account',()=>{const r=B.report(9999,[]);assert.deepEqual(r.named,[]);assert.equal(r.unitemizedCents,9999);assert.equal(r.namedCents,0);assert.equal(r.mismatch,false);});
test('additional itemization reduces residual without changing overall total',()=>{const r=B.report(4819356,[...B.snapshots.slice(0,2),item('Another reported debt',500000)]);assert.equal(r.totalCents,4819356);assert.equal(r.namedCents,2079747);assert.equal(r.unitemizedCents,2739609);});
test('known balances are not reduced or proportioned when aggregate falls',()=>{const before=B.report(),after=B.report(4819256);assert.deepEqual(after.named,before.named);assert.equal(after.unitemizedCents,null);assert(after.mismatch);assert.equal(after.discrepancyCents,100);});
test('stale snapshots above total produce explicit discrepancy, not a negative residual or clamp',()=>{const r=B.report(1000000);assert.equal(r.mismatch,true);assert.equal(r.unitemizedCents,null);assert.equal(r.discrepancyCents,3819356);assert.equal(r.named[0].balanceCents,1520913);});
test('full itemization and zero total handled exactly',()=>{assert.equal(B.report(4819356).unitemizedCents,0);const zero=B.report(0,[]);assert.equal(zero.mismatch,false);assert.equal(zero.unitemizedCents,0);assert.equal(B.report(0).mismatch,true);});
test('integer-cent precision conserved',()=>{const r=B.report(100,[item('One',29),item('Two',1)]);assert.equal(r.namedCents,30);assert.equal(r.unitemizedCents,70);});
test('negative, fractional, unsafe and nonnumeric amounts rejected',()=>{for(const x of [-1,0.1,NaN,Infinity,'100',Number.MAX_SAFE_INTEGER+1]){assert.throws(()=>B.report(x,[]));assert.throws(()=>B.report(100,[item('Debt',x)]));}assert.throws(()=>B.report(100,[item('A',Number.MAX_SAFE_INTEGER),item('B',1)]));});
test('invalid labels, duplicate nicknames and invalid recorded dates rejected',()=>{for(const label of ['', ' x ', 'x'.repeat(81),'bad\nname'])assert.throws(()=>B.report(100,[item(label,1)]));assert.throws(()=>B.report(100,[item('Card',1),item('card',1)]));for(const date of [null,'2026-02-30','unknown'])assert.throws(()=>B.report(100,[item('Debt',1,date)]));});
test('HTML-looking nickname is literal data, not interpreted or rewritten',()=>{const label='<img src=x onerror=alert(1)>';assert.equal(B.report(100,[item(label,1)]).named[0].label,label);});
test('report does not mutate supplied data or public aggregate ledger',()=>{const input=[item('Debt',30)],before=JSON.stringify(input),ledger=JSON.stringify(C.data);B.report(100,input);assert.equal(JSON.stringify(input),before);assert.equal(JSON.stringify(C.data),ledger);assert.equal(C.report().paidCents,91988);});
test('all three remaining cards are native links and paid-history cards are retained',()=>{for(const f of ['index.html','about.html','daily-contributions.html']){const s=fs.readFileSync(path.join(root,f),'utf8'),link=s.match(/<a class="stat remaining-stat-link" href="debt-breakdown.html">([\s\S]*?)<\/a>/);assert(link,f);assert(link[1].includes('class="debt-left">$48,193.56'));assert(link[1].includes('View debt breakdown'));assert(!/onclick|button/.test(link[0]));}for(const f of ['index.html','about.html'])assert(fs.readFileSync(path.join(root,f),'utf8').includes('class="stat paid-stat-link" href="daily-contributions.html"'));assert(fs.readFileSync(path.join(root,'public-debt.css'),'utf8').includes('a.remaining-stat-link:focus-visible'));});
test('published fallback includes four reconciled snapshots, no warning, no unitemized remainder',()=>{const s=fs.readFileSync(path.join(root,'debt-breakdown.html'),'utf8'),r=B.report();for(const d of r.named){assert(s.includes('-name">'+d.label+'</h3>'));assert(s.includes('>'+C.money(d.balanceCents)+'</b>'));assert(s.includes('datetime="'+d.reportedDate+'">Nov 8, 2026'));}assert(!s.includes('<li class="card balance-card unitemized">'));assert(s.includes('>$29,672.33</b>'));assert(s.includes('>$2,723.76</b>'));assert(s.includes('names the debt it went toward')); assert(s.includes('class="debt-left">$48,193.56'));assert(s.includes('role="alert" hidden'));assert(s.includes('>$588.34</b>'));});
test('sync is deterministic and preserves current four public-page fallbacks',()=>sandbox(dir=>{sync(dir);for(const f of ['index.html','about.html','daily-contributions.html','debt-breakdown.html'])assert.equal(fs.readFileSync(path.join(dir,f),'utf8'),fs.readFileSync(path.join(root,f),'utf8'));sync(dir);assert.equal(fs.readFileSync(path.join(dir,'debt-breakdown.html'),'utf8'),fs.readFileSync(path.join(root,'debt-breakdown.html'),'utf8'));}));
test('a new tagged payment updates only that debt, its bar and tracker, and stays reconciled',()=>sandbox(dir=>{addContribution(dir,100,'car-loan');sync(dir);const s=fs.readFileSync(path.join(dir,'debt-breakdown.html'),'utf8');assert(s.includes('role="alert" hidden'));assert(!s.includes('<li class="card balance-card unitemized">'));assert(s.includes('>$15,208.13</b>'));assert(s.includes('>$2,723.76</b>'));assert(s.includes('>$588.34</b>'));assert(s.includes('class="debt-left">$48,192.56'));const car=s.match(/<li class="card balance-card" id="debt-car-loan">([\s\S]*?)<\/li>\n/)[1];assert(car.includes('aria-valuetext="$1.00 of $15,209.13 paid, $15,208.13 remaining (0.0%)"'));assert(car.includes('<time datetime="2026-11-09">Nov 9, 2026</time><span class="account-contribution">$1.00</span><span class="account-history-left">$15,208.13 left on this debt</span>'));assert(!car.includes('No contributions recorded yet'));}));
test('sync refuses untagged, unknown-account and overpaying entries and leaves pages untouched',()=>{sandbox(dir=>{addContribution(dir,100);syncFails(dir,/known account/);});sandbox(dir=>{addContribution(dir,100,'credit-card-9');syncFails(dir,/known account/);});sandbox(dir=>{addContribution(dir,61142,'credit-card-1');syncFails(dir,/exceed/);});});
test('static fallback escapes nickname markup before embedding it into HTML',()=>sandbox(dir=>{const p=path.join(dir,'debt-contributions.js'),label='<img src=x onerror=alert(1)>';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace("label: 'Car loan'",'label: '+JSON.stringify(label)));sync(dir);const s=fs.readFileSync(path.join(dir,'debt-breakdown.html'),'utf8');assert(!s.includes(label));assert(s.includes('&lt;img src=x onerror=alert(1)&gt;'));}));
test('six verified student balances reconcile exactly without double counting main categories',()=>{
 const r=B.report(),student=r.named.find(x=>x.label==='Student loans');
 assert.deepEqual(student.included.map(x=>x.balanceCents),[637449,228042,491628,846727,550961,212426]);
 assert.deepEqual(student.included.map(x=>x.description),['Direct Loan—Unsubsidized','Direct Loan—Subsidized','Direct Loan—Unsubsidized','Direct Loan—Unsubsidized','Direct Loan—Unsubsidized','Direct Loan—Unsubsidized']);
 assert.equal(student.included.reduce((s,x)=>s+x.balanceCents,0),2967233);assert.equal(r.named.length,4);assert.equal(r.namedCents,4819356);assert.equal(r.unitemizedCents,0);assert.equal(r.mismatch,false);
 assert(Object.isFrozen(B.snapshots[2].included));assert(Object.isFrozen(B.snapshots[2].included[0]));
});
test('mismatched subloan subtotal cannot be silently published',()=>{
 const items=JSON.parse(JSON.stringify(B.snapshots));items[2].included[0].balanceCents++;assert.throws(()=>B.report(4821456,items),/subtotal/);
});
test('invalid included amount, duplicate label and malformed detail rejected',()=>{
 const record=()=>({label:'Student loans',balanceCents:100,reportedDate:'2026-11-08',included:[{label:'Student loan 1',description:'Direct Loan—Subsidized',balanceCents:100}]});
 for(const val of [-1,1.5,NaN,Infinity,'100']){const d=record();d.included[0].balanceCents=val;assert.throws(()=>B.report(100,[d]));}
 const duplicate=record();duplicate.included.push({...duplicate.included[0],balanceCents:0});assert.throws(()=>B.report(100,[duplicate]),/Duplicate/);
 const malformed=record();malformed.included[0].description='';assert.throws(()=>B.report(100,[malformed]));
});
test('no-JS student details preserve all six amounts, labels and native expansion',()=>{
 const s=fs.readFileSync(path.join(root,'debt-breakdown.html'),'utf8');assert(s.includes('<details class="student-loans"><summary>View 6 student loans</summary>'));assert(s.replace(/<[^>]*>/g,'').includes('These starting balances make up the $29,672.33 starting balance—not additional debt.'));
 for(const d of B.snapshots[2].included){assert(s.includes('<strong>'+d.label+'</strong>'));assert(s.includes('class="included-balance">'+C.money(d.balanceCents)+'</span>'));}
});
test('breakdown balances are derived from ledger accounts, not entered separately',()=>{
 assert.deepEqual(B.snapshots.map(d=>[d.id,d.startingCents,d.paidCents,d.balanceCents]),[['car-loan',1520913,0,1520913],['credit-card-1',61241,2407,58834],['student-loans',2967233,0,2967233],['credit-card-2',361957,89581,272376]]);
 assert.equal(B.snapshots.reduce((s,d)=>s+d.startingCents,0),4911344);assert(!/balanceCents: (1520913|61141|61241|272069|361957|2967233)\b/.test(fs.readFileSync(path.join(root,'debt-breakdown.js'),'utf8')));
 assert(Object.isFrozen(B.snapshots[3].days));assert.deepEqual(Object.keys(B.details),['car-loan','credit-card-1','student-loans','credit-card-2']);
 const r=C.report();assert.throws(()=>B.accountItems(r,{...B.details,'credit-card-3':{reportedDate:'2026-11-08'}}),/unknown account/);const missing={...B.details};delete missing['car-loan'];assert.throws(()=>B.accountItems(r,missing),/Missing/);
 const bad=JSON.parse(JSON.stringify(B.snapshots));bad[0].paidCents=1;assert.throws(()=>B.report(4819356,bad),/Starting balance minus paid/);
});
test('no-JS fallback has an accessible labeled progress bar, amounts and tracker for every debt',()=>{
 const s=fs.readFileSync(path.join(root,'debt-breakdown.html'),'utf8');
 const want={'car-loan':['$15,209.13','$0.00','$15,209.13','0.0',[]],'credit-card-1':['$612.41','$24.07','$588.34','3.9',[['2026-11-06','$2.07','$610.34'],['2026-11-07','$1.00','$609.34'],['2026-11-08','$1.00','$608.34'],['2026-11-09','$20.00','$588.34']]],'student-loans':['$29,672.33','$0.00','$29,672.33','0.0',[]],'credit-card-2':['$3,619.57','$895.81','$2,723.76','24.7',[['2026-11-03','$2.68','$3,616.89'],['2026-11-04','$60.00','$3,556.89'],['2026-11-05','$460.00','$3,096.89'],['2026-11-06','$373.13','$2,723.76']]]};
 for(const [id,[start,paid,left,pct,hist]] of Object.entries(want)){
  const card=s.match(new RegExp('<li class="card balance-card" id="debt-'+id+'">([\\s\\S]*?)</li>\\n'))[1];
  assert(card.includes('role="progressbar" aria-labelledby="debt-'+id+'-name" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'" aria-valuetext="'+paid+' of '+start+' paid, '+left+' remaining ('+pct+'%)"'),id);
  assert(card.includes('<span class="account-pct-value">'+pct+'%</span> paid off'));
  assert(card.includes('<dd class="account-start">'+start+'</dd></div><div><dt>Paid</dt><dd class="account-paid">'+paid+'</dd></div><div><dt>Remaining</dt><dd class="account-left">'+left+'</dd>'));
  const rows=[...card.matchAll(/<time datetime="([^"]+)">[^<]*<\/time><span class="account-contribution">([^<]*)<\/span><span class="account-history-left">([^<]*) left on this debt/g)].map(m=>[m[1],m[2],m[3]]);
  assert.deepEqual(rows,hist,id);assert.equal(card.includes('No contributions recorded yet.'),hist.length===0,id);assert(card.includes('<details class="account-tracker"><summary>'),id);
 }
});
test('no-JS trackers for all four debts are closed native disclosures with payment counts',()=>{
 const s=fs.readFileSync(path.join(root,'debt-breakdown.html'),'utf8');
 assert(s.includes('<details class="account-tracker"><summary>Credit Card 2 contribution tracker (4 payments)</summary><ol class="account-history">'));
 assert(s.includes('<details class="account-tracker"><summary>Credit Card 1 contribution tracker (4 payments)</summary><ol class="account-history">'));
 assert(s.includes('<details class="account-tracker"><summary>Car loan contribution tracker (0 payments)</summary><p class="history-note account-empty">No contributions recorded yet.</p></details>'));assert(s.includes('<summary>Student loans contribution tracker (0 payments)</summary>'));assert.equal((s.match(/<details class="account-tracker"/g)||[]).length,4);assert(!/<details[^>]*\sopen/.test(s));assert(!/<details class="account-tracker" open/.test(s));
 assert(fs.readFileSync(path.join(root,'public-debt.css'),'utf8').includes('details.account-tracker summary:focus-visible'));
});
test('every page shares one footer: brand + Romans 13:8, links in main-nav order, current page marked',()=>{
 const order=['index.html','about.html','get-out-of-debt.html','calculate-your-payment.html','debt-tracker.html','channel.html','blog/','coming-soon.html','daily-contributions.html','debt-breakdown.html'];
 for(const f of order.filter(h=>h.endsWith('.html'))){const s=fs.readFileSync(path.join(root,f),'utf8'),ft=s.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/);assert(ft,f);
  assert(ft[1].includes('<div class="footer-brand"><strong>Daniel Motter</strong><p class="footer-verse">"Let no debt remain outstanding, except the continuing debt to love one another." Romans 13:8</p></div>'),f);
  const hrefs=[...ft[1].match(/footer-links">([\s\S]*?)<\/div>/)[1].matchAll(/<a href="([^"]+)"/g)].map(m=>m[1]).filter(h=>!h.startsWith('mailto:'));assert.deepEqual(hrefs,order,f);
  assert.deepEqual([...ft[1].matchAll(/<a href="([^"]+)" aria-current="page"/g)].map(m=>m[1]),[f]);assert(ft[1].includes('class="footer-legal"'));}
 const css=fs.readFileSync(path.join(root,'site-nav.css'),'utf8');assert(css.includes('footer.site-footer .wrap{display:grid;grid-template-columns:minmax(240px,340px) minmax(0,1fr)'));assert(/@media\(max-width:759px\)\{footer\.site-footer \.wrap\{grid-template-columns:minmax\(0,1fr\)\}/.test(css));
});
test('every local CSS/JS reference carries a current content-hash version stamp',()=>{
 const crypto=require('node:crypto');let n=0;
 const blog=fs.existsSync(path.join(root,'blog'))?fs.readdirSync(path.join(root,'blog')).filter(f=>f.endsWith('.html')).map(f=>'blog/'+f):[];
 for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.html')).concat(blog)){const s=fs.readFileSync(path.join(root,f),'utf8');
  for(const m of s.matchAll(/(?:<link rel="stylesheet" href|<script src)="([^"]+)"/g)){const u=m[1];if(/^https?:/.test(u))continue;n++;
   const [asset,v]=u.split('?v=');assert(v,f+' '+u+' is unstamped: run node scripts/stamp-assets.js');
   const file=path.join(root,path.dirname(f),asset);assert(fs.existsSync(file),f+' references missing '+asset);
   assert.equal(v,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,10),f+' '+asset+' stamp is stale: run node scripts/stamp-assets.js');}}
 assert(n>=27+4*51);
});
test('footer order matches the main nav, then Daily Contributions and Debt Breakdown',()=>{
 for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.html')&&f!=='why-debt-is-bad.html')){const s=fs.readFileSync(path.join(root,f),'utf8');
  const nav=[...s.match(/<nav aria-label="Main navigation">[\s\S]*?<\/ul>/)[0].matchAll(/<li><a href="([^"]+)"/g)].map(m=>m[1]);
  const foot=[...s.match(/footer-links">([\s\S]*?)<\/div>/)[1].matchAll(/<a href="([^"]+)"/g)].map(m=>m[1]).filter(h=>!h.startsWith('mailto:'));
  assert.deepEqual(foot,nav.concat(['daily-contributions.html','debt-breakdown.html']),f);}
});
console.log(count+' public breakdown tests passed');
