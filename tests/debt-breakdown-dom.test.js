/* Simulated DOM only; use the existing temporary jsdom test installation. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');let count=0;function test(n,fn){fn();count++;console.log('ok - '+n);}
function setup(file='debt-breakdown.html',total,items){const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'),{url:'https://22dmotter.github.io/daniel-motter-site/'+file,runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w,'localStorage',{get(){throw Error('Public breakdown must not access visitor storage');}});
 w.eval(fs.readFileSync(path.join(root,'debt-contributions.js'),'utf8'));
 if(total!==undefined){const C=w.DanielDebt;w.DanielDebt={...C,report:()=>({...C.report(),remainingCents:total})};}
 w.eval(fs.readFileSync(path.join(root,'public-debt-ui.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'debt-breakdown.js'),'utf8'));
 if(items){const B=w.DanielDebtBreakdown;w.DanielDebtBreakdown={...B,report:()=>B.report(total,items)};}
 w.eval(fs.readFileSync(path.join(root,'debt-breakdown-ui.js'),'utf8'));return {dom,w,d:w.document};}
test('remaining cards are keyboard-focusable native links on Home, About and history',()=>{for(const f of ['index.html','about.html','daily-contributions.html']){const x=setup(f),a=x.d.querySelector('.remaining-stat-link');assert(a);a.focus();assert.equal(x.d.activeElement,a);assert.equal(a.href,'https://22dmotter.github.io/daniel-motter-site/debt-breakdown.html');assert.equal(a.querySelector('.debt-left').textContent,'$46,463.20');x.dom.window.close();}});
test('four balance cards reconcile and retain reported snapshot dates',()=>{const x=setup();assert.deepEqual(Array.from(x.d.querySelectorAll('.balance-value')).map(n=>n.textContent),['$14,836.00','$557.34','$29,672.33','$1,397.53']);assert.deepEqual(Array.from(x.d.querySelectorAll('.balance-card > .history-note time')).map(n=>n.dateTime),['2026-11-08','2026-11-08','2026-11-08','2026-11-08']);const w=x.d.getElementById('breakdown-warning');assert(w.hidden);assert.equal(x.d.querySelectorAll('.unitemized').length,0);assert.equal(x.d.querySelector('.debt-paid').textContent,'$2,650.24');x.dom.window.close();});
test('mismatch is visible without altering named balances or inventing negative remainder',()=>{const x=setup('debt-breakdown.html',1000000);assert(!x.d.getElementById('breakdown-warning').hidden);assert(x.d.getElementById('breakdown-warning').textContent.includes('$36,463.20'));assert.equal(x.d.querySelectorAll('.unitemized').length,0);assert.equal(x.d.querySelector('.balance-value').textContent,'$14,836.00');assert.equal(x.d.querySelector('.debt-left').textContent,'$10,000.00');x.dom.window.close();});
test('HTML-looking nicknames render only as literal text',()=>{const label='<img src=x onerror=alert(1)>',x=setup('debt-breakdown.html',100,[{label,balanceCents:29,reportedDate:'2026-11-08'}]);assert.equal(x.d.querySelector('.balance-card h3').textContent,label);assert.equal(x.d.querySelectorAll('.balance-card img').length,0);assert.equal(x.d.querySelectorAll('.balance-value')[1].textContent,'$0.71');x.dom.window.close();});
test('student detail is native collapsed expansion with six included balances and no double count',()=>{
 const x=setup(),detail=x.d.querySelector('details.student-loans');assert(detail);assert(!detail.open);assert.equal(detail.querySelector('summary').textContent,'View 6 student loans');detail.querySelector('summary').focus();assert.equal(x.d.activeElement,detail.querySelector('summary'));detail.open=true;assert(detail.open);
 assert.deepEqual(Array.from(detail.querySelectorAll('.included-balance')).map(n=>n.textContent),['$6,374.49','$2,280.42','$4,916.28','$8,467.27','$5,509.61','$2,124.26']);assert.equal(x.d.querySelectorAll('.balance-card').length,4);assert.equal(x.d.querySelector('.debt-left').textContent,'$46,463.20');assert(detail.textContent.includes('not additional debt'));x.dom.window.close();
});
test('included loan labels and descriptions are literal safe text',()=>{
 const label='<img src=x onerror=alert(1)>',x=setup('debt-breakdown.html',100,[{label:'Student loans',balanceCents:29,reportedDate:'2026-11-08',included:[{label,description:'<script>alert(1)</script>',balanceCents:29}]}]);
 assert.equal(x.d.querySelector('.included-loans strong').textContent,label);assert.equal(x.d.querySelectorAll('.included-loans img,.included-loans script').length,0);x.dom.window.close();
});
function colors(x){const style=x.d.createElement('style');style.textContent=fs.readFileSync(path.join(root,'public-debt.css'),'utf8');x.d.head.appendChild(style);}
test('every current breakdown debt amount, including subtotal, is red; paid stays green',()=>{
 const x=setup();colors(x);const nodes=x.d.querySelectorAll('.debt-start,.debt-left,.balance-value,.included-balance,.debt-amount');assert.equal(nodes.length,13);nodes.forEach(n=>assert.equal(x.w.getComputedStyle(n).color,'rgb(255, 59, 59)',n.textContent));assert.equal(x.w.getComputedStyle(x.d.querySelector('.debt-paid')).color,'rgb(34, 197, 94)');assert.notEqual(x.w.getComputedStyle(x.d.querySelector('.student-loans .history-note')).color,'rgb(255, 59, 59)');x.dom.window.close();
});
test('future reconciliation monetary figures are red without coloring whole warning red',()=>{
 const x=setup('debt-breakdown.html',1000000);colors(x);const warning=x.d.getElementById('breakdown-warning');assert.equal(warning.querySelectorAll('.debt-amount').length,2);warning.querySelectorAll('.debt-amount').forEach(n=>assert.equal(x.w.getComputedStyle(n).color,'rgb(255, 59, 59)'));assert.notEqual(x.w.getComputedStyle(warning).color,'rgb(255, 59, 59)');x.dom.window.close();
});
test('breakdown red selectors do not change Home remaining or paid colors',()=>{
 const x=setup('index.html');colors(x);assert.notEqual(x.w.getComputedStyle(x.d.querySelector('.debt-left')).color,'rgb(255, 59, 59)');assert.equal(x.w.getComputedStyle(x.d.querySelector('.debt-paid')).color,'rgb(34, 197, 94)');x.dom.window.close();
});
test('no-JavaScript fallback has the same red debt amounts and green paid value',()=>{
 const dom=new JSDOM(fs.readFileSync(path.join(root,'debt-breakdown.html'),'utf8'),{runScripts:'outside-only'}),x={dom,w:dom.window,d:dom.window.document};colors(x);const nodes=x.d.querySelectorAll('.debt-start,.debt-left,.balance-value,.included-balance,.debt-amount');assert.equal(nodes.length,13);nodes.forEach(n=>assert.equal(x.w.getComputedStyle(n).color,'rgb(255, 59, 59)'));assert.equal(x.w.getComputedStyle(x.d.querySelector('.debt-paid')).color,'rgb(34, 197, 94)');x.dom.window.close();
});
test('each debt has a labeled progressbar, amounts and its own tracker after JS render',()=>{
 const x=setup(),cards=Array.from(x.d.querySelectorAll('.balance-card'));
 const bars=cards.map(c=>c.querySelector('[role="progressbar"]'));
 assert.deepEqual(bars.map(b=>x.d.getElementById(b.getAttribute('aria-labelledby')).textContent),['Car loan','Credit Card 1','Student loans','Credit Card 2']);
 assert.deepEqual(bars.map(b=>[b.getAttribute('aria-valuemin'),b.getAttribute('aria-valuemax'),b.getAttribute('aria-valuenow')]),[['0','100','2.5'],['0','100','9.0'],['0','100','0.0'],['0','100','61.4']]);
 assert.equal(bars[3].getAttribute('aria-valuetext'),'$2,222.04 of $3,619.57 paid, $1,397.53 remaining (61.4%)');assert.equal(bars[0].getAttribute('aria-valuetext'),'$373.13 of $15,209.13 paid, $14,836.00 remaining (2.5%)');assert.equal(bars[1].getAttribute('aria-valuetext'),'$55.07 of $612.41 paid, $557.34 remaining (9.0%)');
 assert.deepEqual(bars.map(b=>parseFloat(b.querySelector('i').style.width).toFixed(2)),['2.45','8.99','0.00','61.39']);
 assert.deepEqual(cards.map(c=>Array.from(c.querySelectorAll('.account-amounts dd')).map(n=>n.textContent)),[['$15,209.13','$373.13','$14,836.00'],['$612.41','$55.07','$557.34'],['$29,672.33','$0.00','$29,672.33'],['$3,619.57','$2,222.04','$1,397.53']]);
 assert.deepEqual(cards.map(c=>Array.from(c.querySelectorAll('.account-history li')).map(li=>li.querySelector('time').dateTime+' '+li.querySelector('.account-contribution').textContent)),[['2026-11-06 $373.13'],['2026-11-06 $2.07','2026-11-07 $1.00','2026-11-08 $1.00','2026-11-09 $20.00','2026-11-11 $1.00','2026-11-12 $20.00','2026-11-13 $10.00'],[],['2026-11-03 $2.68','2026-11-04 $60.00','2026-11-05 $460.00','2026-11-10 $1,477.32','2026-11-10 $222.04']]);
 assert.deepEqual(cards.map(c=>!!c.querySelector('details.account-tracker .account-empty')),[false,false,true,false]);
 assert.equal(x.d.querySelectorAll('.account-tracker h4').length,0);
 x.dom.window.close();
});
test('all four contribution trackers are native disclosures, closed after JS render, keyboard-toggleable',()=>{
 const x=setup(),cards=Array.from(x.d.querySelectorAll('.balance-card'));
 const det=cards.map(c=>c.querySelector(':scope > details.account-tracker'));
 assert.deepEqual(det.map(d=>d.querySelector('summary').textContent),['Car loan contribution tracker (1 payment)','Credit Card 1 contribution tracker (7 payments)','Student loans contribution tracker (0 payments)','Credit Card 2 contribution tracker (5 payments)']);
 assert.equal(x.d.querySelectorAll('details[open]').length,0,'no disclosure may render open');assert.equal(x.d.querySelectorAll('.account-tracker:not(details)').length,0);assert.equal(x.d.querySelectorAll('.account-history:not(details .account-history)').length,0,'tracker rows must live inside a disclosure');
 for(const d of det){assert(!d.open);assert(!d.hasAttribute('open'));const s=d.querySelector('summary');assert.equal(s,d.firstElementChild);s.focus();assert.equal(x.d.activeElement,s);d.open=true;assert(d.open);}
 assert.equal(det[3].querySelectorAll('.account-history li').length,5);assert.equal(det[3].querySelectorAll('.account-note').length,1);assert.equal(det[3].querySelectorAll('.account-history li')[4].querySelector('.account-note').textContent,'Extra payment (balance reconciliation)');assert.equal(x.d.querySelectorAll('.account-note').length,1);assert.equal(det[0].querySelectorAll('.account-history li').length,1);
 for(const i of [2])assert.equal(det[i].querySelector('.account-empty').textContent,'No contributions recorded yet.');
 x.dom.window.close();
});
test('JS-rendered cards match the no-JS fallback markup',()=>{
 const html=fs.readFileSync(path.join(root,'debt-breakdown.html'),'utf8'),norm=s=>s.replace(/ style="width:\s*([0-9.]+)%;?"/g,(_,w)=>' style="'+parseFloat(w).toFixed(4)+'"').replace(/<!--[\s\S]*?-->/g,'').replace(/>\s+</g,'><').trim();
 const fallback=new JSDOM(html).window.document.getElementById('breakdown-list').innerHTML,x=setup();
 assert.equal(norm(x.d.getElementById('breakdown-list').innerHTML),norm(fallback));x.dom.window.close();
});
test('per-debt starting/remaining figures are red and paid figures green',()=>{
 const x=setup();colors(x);
 for(const n of x.d.querySelectorAll('.account-start,.account-left,.account-history-left'))assert.equal(x.w.getComputedStyle(n).color,'rgb(255, 59, 59)',n.textContent);
 for(const n of x.d.querySelectorAll('.account-paid,.account-contribution,.account-pct-value'))assert.equal(x.w.getComputedStyle(n).color,'rgb(34, 197, 94)',n.textContent);
 assert.equal(x.d.querySelectorAll('.account-start').length,4);assert.equal(x.d.querySelectorAll('.account-contribution').length,13);x.dom.window.close();
});
test('footer layout rules win the cascade on every page with stylesheets in real load order',()=>{
 for(const f of ['index.html','about.html','get-out-of-debt.html','calculate-your-payment.html','debt-tracker.html','channel.html','coming-soon.html','daily-contributions.html','debt-breakdown.html']){
  const html=fs.readFileSync(path.join(root,f),'utf8').replace(/<link rel="stylesheet" href="([A-Za-z0-9._-]+\.css)\?v=[0-9a-f]+">/g,(m,h)=>'<style>'+fs.readFileSync(path.join(root,h),'utf8')+'</style>');
  const w=new JSDOM(html).window,d=w.document,cs=n=>w.getComputedStyle(n);
  assert.equal(cs(d.querySelector('footer .wrap')).gridTemplateColumns,'minmax(240px,340px) minmax(0,1fr)',f);
  assert.equal(cs(d.querySelector('.footer-legal')).gridColumn,'1/-1',f);assert.equal(cs(d.querySelector('.footer-links')).display,'grid',f);
  assert.equal(cs(d.querySelector('.footer-brand strong')).whiteSpace,'nowrap',f);w.close();
 }
});
test('breakdown page JS never adds open attributes or replaces footer markup',()=>{
 const ui=fs.readFileSync(path.join(root,'debt-breakdown-ui.js'),'utf8');assert(!/\.open\s*=|setAttribute\(\s*'open'|footer/.test(ui));
 const x=setup(),before=fs.readFileSync(path.join(root,'debt-breakdown.html'),'utf8').match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
 assert.equal(x.d.querySelector('footer').outerHTML.replace(/<span id="yr"><\/span>/,''),before.replace(/<span id="yr"><\/span>/,''));x.dom.window.close();
});
console.log(count+' public breakdown DOM tests passed');
