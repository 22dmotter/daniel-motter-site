/* Simulated DOM only. Run with NODE_PATH=/tmp/dm-tracker-test/node_modules */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');let count=0;
function test(n,fn){fn();count++;console.log('ok - '+n);}
function setup(file,extra){
 const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'),{url:'https://22dmotter.github.io/daniel-motter-site/'+file,runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w,'localStorage',{get(){throw new Error('Public summaries must not access visitor storage');}});
 w.eval(fs.readFileSync(path.join(root,'debt-contributions.js'),'utf8'));
 if(extra){const C=w.DanielDebt;w.DanielDebt={...C,report:()=>C.report({...C.data,contributions:C.data.contributions.concat(extra)})};}
 w.eval(fs.readFileSync(path.join(root,'public-debt-ui.js'),'utf8'));return {dom,w,d:w.document};
}
test('home/about green paid card is focusable, navigable, and shows authoritative totals',()=>{
 for(const file of ['index.html','about.html']){
  const x=setup(file),a=x.d.querySelector('.paid-stat-link');a.focus();assert.equal(x.d.activeElement,a);assert.equal(a.href,'https://22dmotter.github.io/daniel-motter-site/daily-contributions.html');
  assert.equal(a.querySelector('.debt-paid').textContent,'$919.88');assert.equal(x.d.querySelector('.debt-left').textContent,'$48,193.56');assert(Number(x.d.querySelector('.days-in').textContent.replace(/,/g,''))>=1);x.dom.window.close();
 }
});
test('history renders seven genuine dated contributions and accurate running totals',()=>{
 const x=setup('daily-contributions.html'),rows=x.d.querySelectorAll('.contribution-record');assert.equal(rows.length,7);
 assert.deepEqual(Array.from(rows).map(r=>r.querySelector('time').dateTime),['2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08','2026-11-09']);
 assert.deepEqual(Array.from(rows).map(r=>r.querySelector('.contribution-amount').textContent),['$2.68','$60.00','$460.00','$375.20','$1.00','$1.00','$20.00']);
 assert.equal(rows[4].querySelectorAll('dd')[1].textContent,'$898.88');assert.equal(rows[5].querySelectorAll('dd')[1].textContent,'$899.88');assert.equal(rows[5].querySelector('.tag').textContent,'Day 6');assert.equal(rows[6].querySelectorAll('dd')[1].textContent,'$919.88');assert.equal(rows[6].querySelector('.tag').textContent,'Day 7');assert.equal(rows[6].querySelectorAll('dd')[2].textContent,'$48,193.56');assert.equal(x.d.querySelector('.last-contribution-date').dateTime,'2026-11-09');assert.equal(x.d.querySelector('.pct').textContent,'1.9%');x.dom.window.close();
});
test('additional same-day contribution dynamically groups and refreshes summaries',()=>{
 const x=setup('daily-contributions.html',{date:'2026-11-07',amountCents:112,account:'credit-card-2'});assert.equal(x.d.querySelectorAll('.contribution-record').length,7);assert.equal(x.d.querySelector('.debt-paid').textContent,'$921.00');assert.equal(x.d.querySelector('.debt-left').textContent,'$48,192.44');
 const last=x.d.querySelectorAll('.contribution-record')[4];assert.equal(last.querySelector('.contribution-amount').textContent,'$2.12');assert.equal(last.querySelectorAll('dd')[1].textContent,'$900.00');x.dom.window.close();
});
console.log(count+' public contribution DOM tests passed');
