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
test('remaining cards are keyboard-focusable native links on Home, About and history',()=>{for(const f of ['index.html','about.html','daily-contributions.html']){const x=setup(f),a=x.d.querySelector('.remaining-stat-link');assert(a);a.focus();assert.equal(x.d.activeElement,a);assert.equal(a.href,'https://22dmotter.github.io/daniel-motter-site/debt-breakdown.html');assert.equal(a.querySelector('.debt-left').textContent,'$48,213.56');x.dom.window.close();}});
test('four balance cards reconcile and retain reported snapshot dates',()=>{const x=setup();assert.deepEqual(Array.from(x.d.querySelectorAll('.balance-value')).map(n=>n.textContent),['$15,209.13','$611.41','$29,672.33','$2,720.69']);assert.deepEqual(Array.from(x.d.querySelectorAll('.balance-card time')).map(n=>n.dateTime),['2026-11-08','2026-11-08','2026-11-08','2026-11-08']);const w=x.d.getElementById('breakdown-warning');assert(w.hidden);assert.equal(x.d.querySelectorAll('.unitemized').length,0);assert.equal(x.d.querySelector('.debt-paid').textContent,'$899.88');x.dom.window.close();});
test('mismatch is visible without altering named balances or inventing negative remainder',()=>{const x=setup('debt-breakdown.html',1000000);assert(!x.d.getElementById('breakdown-warning').hidden);assert(x.d.getElementById('breakdown-warning').textContent.includes('$38,213.56'));assert.equal(x.d.querySelectorAll('.unitemized').length,0);assert.equal(x.d.querySelector('.balance-value').textContent,'$15,209.13');assert.equal(x.d.querySelector('.debt-left').textContent,'$10,000.00');x.dom.window.close();});
test('HTML-looking nicknames render only as literal text',()=>{const label='<img src=x onerror=alert(1)>',x=setup('debt-breakdown.html',100,[{label,balanceCents:29,reportedDate:'2026-11-08'}]);assert.equal(x.d.querySelector('.balance-card h3').textContent,label);assert.equal(x.d.querySelectorAll('.balance-card img').length,0);assert.equal(x.d.querySelectorAll('.balance-value')[1].textContent,'$0.71');x.dom.window.close();});
test('student detail is native collapsed expansion with six included balances and no double count',()=>{
 const x=setup(),detail=x.d.querySelector('details.student-loans');assert(detail);assert(!detail.open);assert.equal(detail.querySelector('summary').textContent,'View 6 student loans');detail.querySelector('summary').focus();assert.equal(x.d.activeElement,detail.querySelector('summary'));detail.open=true;assert(detail.open);
 assert.deepEqual(Array.from(detail.querySelectorAll('.included-balance')).map(n=>n.textContent),['$6,374.49','$2,280.42','$4,916.28','$8,467.27','$5,509.61','$2,124.26']);assert.equal(x.d.querySelectorAll('.balance-card').length,4);assert.equal(x.d.querySelector('.debt-left').textContent,'$48,213.56');assert(detail.textContent.includes('not additional debt'));x.dom.window.close();
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
console.log(count+' public breakdown DOM tests passed');
