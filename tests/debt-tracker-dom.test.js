/* Simulated DOM only; no browser automation or live data.
   npm install --prefix /tmp/dm-tracker-test jsdom@26 --no-audit --no-fund
   NODE_PATH=/tmp/dm-tracker-test/node_modules node tests/debt-tracker-dom.test.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const path = require('node:path');
const root = path.join(__dirname, '..');
const C = require('../debt-tracker-core');
let count = 0;
async function test(name, fn) { await fn(); count++; console.log('ok - ' + name); }
function setup({ raw, blocked = false, quota = false } = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root,'debt-tracker.html'),'utf8'), { url:'https://22dmotter.github.io/daniel-motter-site/debt-tracker.html', runScripts:'outside-only' });
  const w = dom.window;
  w.TextEncoder = TextEncoder;
  let saved = raw === undefined ? null : raw;
  const store = { getItem:()=>{ if(blocked) throw Error('blocked'); return saved; }, setItem:(k,v)=>{ if(blocked || quota) throw Error('unavailable'); saved=v; } };
  Object.defineProperty(w, 'localStorage', {value:store});
  w.confirm=()=>true;
  w.URL.createObjectURL=()=>{w.downloads=(w.downloads||0)+1;return 'blob:fake';};
  w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){};
  for(const f of ['debt-tracker-core.js','debt-tracker-ui.js']) w.eval(fs.readFileSync(path.join(root,f),'utf8'));
  return {w, dom, $:id=>w.document.getElementById(id), saved:()=>saved, changeStore:v=>{saved=v;} };
}
function submit(x,id) { x.$(id).dispatchEvent(new x.w.Event('submit',{bubbles:true,cancelable:true})); }
function add(x,name='Car <img src=x onerror=alert(1)>') {
  x.$('new-name').value=name;
  x.$('new-baseline').value='100.00';x.$('new-balance').value='100.00';
  submit(x,'add-debt-form');
  return x.w.document.querySelector('.debt-card');
}
function log(x,pay,balance) {
  const card=x.w.document.querySelector('.debt-card'), form=card.querySelector('.entry-form');
  form.querySelector('input[id^=payment-]').value=pay;form.querySelector('input[id^=balance-]').value=balance;
  form.dispatchEvent(new x.w.Event('submit',{bubbles:true,cancelable:true}));
}
async function importRaw(x,raw,size=Buffer.byteLength(raw)) {
  Object.defineProperty(x.$('import-file'),'files',{value:[{size,text:()=>Promise.resolve(raw)}],configurable:true});
  submit(x,'import-form'); await new Promise(resolve=>setImmediate(resolve));
}
(async()=>{
 await test('honest initial state and fully labelled static fields',()=>{
  const x=setup();assert.equal(x.w.document.querySelectorAll('.milestone.active').length,0);assert.equal(x.$('t-paid').textContent,'$0.00');
  x.w.document.querySelectorAll('#tracker-main input').forEach(i=>assert(x.w.document.querySelector('label[for="'+i.id+'"]')));
  assert(!x.$('save-status').textContent.includes('Saved in'));x.dom.window.close();
 });
 await test('add, log payment vs net reduction, undo, correct, and reload',()=>{
  const x=setup();const card=add(x);assert(card);assert.equal(x.$('add-error').textContent,'');assert.equal(card.querySelectorAll('img').length,0);assert(card.querySelector('h3').textContent.includes('<img'));
  assert(card.querySelector('.undo-entry').disabled);
  card.querySelectorAll('input').forEach(i=>assert(x.w.document.querySelector('label[for="'+i.id+'"]')));
  log(x,'30.00','75.00');assert.equal(x.$('t-paid').textContent,'$30.00');assert.equal(x.$('t-reduced').textContent,'$25.00');assert.equal(x.$('t-left').textContent,'$75.00');assert(x.$('save-status').textContent.startsWith('Saved'));
  const backup=x.saved();const again=setup({raw:backup});assert.equal(again.$('t-paid').textContent,'$30.00');assert.equal(again.w.document.querySelectorAll('.history tbody tr').length,2);
  x.w.document.querySelector('.undo-entry').click();assert.equal(x.$('t-paid').textContent,'$0.00');assert.equal(x.$('t-left').textContent,'$100.00');assert(x.w.document.querySelector('.undo-entry').disabled);
  log(x,'15.00','90.00');assert.equal(x.$('t-paid').textContent,'$15.00');assert.equal(x.$('t-reduced').textContent,'$10.00');
  x.$('export').click();assert.equal(x.w.downloads,1);assert(x.$('action-status').textContent.includes('unencrypted'));
  x.dom.window.close();again.dom.window.close();
 });
 await test('rising balance resets progress but not actual payments',()=>{
  const x=setup();add(x);log(x,'20','90');log(x,'0','110');assert.equal(x.$('t-paid').textContent,'$20.00');assert.equal(x.$('t-reduced').textContent,'−$10.00');assert.equal(x.$('t-bar').style.width,'0%');assert.equal(x.$('t-progress').getAttribute('aria-valuenow'),'0');x.dom.window.close();
 });
 await test('no false rounded 100% display with a cent remaining',()=>{
  const x=setup();add(x);log(x,'100','0.01');assert.equal(x.$('progress-label').textContent,'99.9% net debt reduction');assert.equal(x.w.document.querySelectorAll('.milestone.active').length,7);x.dom.window.close();
 });
 await test('invalid input does not change data, is announced and marked',()=>{
  const x=setup();add(x);const before=x.saved();log(x,'1.999','80');assert.equal(x.saved(),before);const err=x.w.document.querySelector('.entry-form .error');assert(err.textContent);assert(x.w.document.querySelector('input[aria-invalid=true]'));assert.equal(err.getAttribute('role'),'alert');x.dom.window.close();
 });
 await test('deletion, undo, clear cancellation protects data',()=>{
  const x=setup();add(x);log(x,'10','95');const before=x.saved();x.w.confirm=()=>false;
  x.w.document.querySelector('.remove-debt').click();x.w.document.querySelector('.undo-entry').click();x.$('clear').click();assert.equal(x.saved(),before);x.dom.window.close();
 });
 await test('full payoff, confirmed deletion and cleared last debt reset statuses',()=>{
  const x=setup();add(x);log(x,'110','0');assert.equal(x.$('progress-label').textContent,'100.0% net debt reduction');assert.equal(x.w.document.querySelectorAll('.milestone.active').length,9);
  x.w.document.querySelector('.remove-debt').click();assert.equal(x.w.document.querySelectorAll('.milestone.active').length,0);assert.equal(x.$('t-paid').textContent,'$0.00');assert.equal(x.$('t-progress').getAttribute('aria-valuenow'),'0');x.dom.window.close();
 });
 await test('import round trip is validated, confirmed, renders hostile text safely',async()=>{
  const x=setup();add(x);log(x,'30','75');const backup=x.saved();x.$('clear').click();assert.equal(x.w.document.querySelectorAll('.debt-card').length,0);
  await importRaw(x,backup);assert.equal(x.$('t-paid').textContent,'$30.00');assert.equal(x.w.document.querySelectorAll('.debt-card img').length,0);assert.equal(x.$('backup-error').textContent,'');x.dom.window.close();
 });
 await test('invalid, malicious, oversized and cancelled import leave current data intact',async()=>{
  const x=setup();add(x);const before=x.saved();
  for(const raw of ['{bad','{"version":2,"debts":[]}','{"version":1,"debts":[],"__proto__":{"x":1}}']){await importRaw(x,raw);assert.equal(x.saved(),before);assert(x.$('backup-error').textContent);}
  await importRaw(x,'{}',C.MAX_BYTES+1);assert.equal(x.saved(),before);
  x.w.confirm=()=>false;await importRaw(x,C.serialize(C.empty()));assert.equal(x.saved(),before);x.dom.window.close();
 });
 await test('blocked storage permits in-tab use, never falsely says saved',()=>{
  const x=setup({blocked:true});assert(x.$('save-status').textContent.includes('unavailable'));add(x);assert.equal(x.w.document.querySelectorAll('.debt-card').length,1);assert(x.$('save-status').textContent.includes('NOT saved'));assert(!x.$('save-status').classList.contains('storage-ok'));x.dom.window.close();
 });
 await test('quota failure retains changes in memory and offers export',()=>{
  const x=setup({quota:true});add(x);log(x,'20','85');assert.equal(x.$('t-left').textContent,'$85.00');assert(x.$('save-status').textContent.includes('NOT saved'));x.$('export').click();assert.equal(x.w.downloads,1);x.dom.window.close();
 });
 await test('corrupt stored data is locked, exportable, not overwritten until confirmation',async()=>{
  const x=setup({raw:'{broken'});assert(x.$('new-name').disabled);assert(x.$('save-status').textContent.includes('NOT been overwritten'));assert(x.$('export').textContent.includes('unreadable'));x.$('export').click();assert.equal(x.w.downloads,1);assert.equal(x.saved(),'{broken');
  x.w.confirm=()=>false; x.$('clear').click();assert.equal(x.saved(),'{broken');
  x.w.confirm=()=>true;await importRaw(x,C.serialize(C.empty()));assert(!x.$('new-name').disabled);assert.equal(JSON.parse(x.saved()).debts.length,0);x.dom.window.close();
 });
 await test('multi-tab conflicts do not overwrite newer data',()=>{
  const x=setup();add(x);const newer=C.serialize(C.empty());x.changeStore(newer);log(x,'20','90');assert.equal(x.saved(),newer);assert(x.$('save-status').textContent.includes('Another tab'));assert(x.$('new-name').disabled);x.dom.window.close();
 });
 await test('tracker nav project links are present and correctly based',()=>{
  const x=setup();const links=Array.from(x.w.document.querySelectorAll('nav ul a'));assert.equal(links.length,8);assert(links.some(n=>n.href==='https://22dmotter.github.io/daniel-motter-site/blog/'));assert(links.some(n=>n.href==='https://22dmotter.github.io/daniel-motter-site/coming-soon.html'));assert(links.some(n=>n.href==='https://22dmotter.github.io/daniel-motter-site/debt-tracker.html'&&n.getAttribute('aria-current')==='page'));x.dom.window.close();
 });
 console.log(count+' simulated DOM tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
