/* Run after editing debt-contributions.js to update no-JS HTML fallbacks.
   Tests deliberately fail if fallbacks diverge from the authoritative ledger. */
'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..'), C = require('../debt-contributions'), r = C.report();
function records() {
  return r.days.map(d => '  <li class="card contribution-record"><p class="tag">Day ' + d.journeyDay + '</p><h3><time datetime="' + d.date + '">' + C.formatDate(d.date) + '</time></h3><dl class="contribution-amounts"><div><dt>Reported that day</dt><dd class="contribution-amount">' + C.money(d.amountCents) + '</dd></div><div><dt>Cumulative paid</dt><dd>' + C.money(d.cumulativeCents) + '</dd></div><div><dt>Remaining*</dt><dd>' + C.money(d.remainingCents) + '</dd></div></dl></li>').join('\n');
}
for (const file of ['index.html','about.html','daily-contributions.html']) {
  const p = path.join(root, file); let s = fs.readFileSync(p,'utf8');
  for (const [cls, val] of [['debt-start',r.startingCents],['debt-paid',r.paidCents],['debt-left',r.remainingCents]]) {
    s = s.replace(new RegExp('(<b class="'+cls+'">)[^<]*(</b>)','g'), (_,a,b) => a+C.money(val)+b);
  }
  s = s.replace(/(<(?:strong|span) class="pct"[^>]*>)[^<]*(<\/(?:strong|span)>)/g, (_,a,b) => a+r.percent.toFixed(1)+'%'+b);
  s = s.replace(/<div class="bar"><i[^>]*><\/i><\/div>/g, '<div class="bar"><i style="width:'+r.percent.toFixed(6)+'%"></i></div>');
  s = s.replace(/(<time class="last-contribution-date")[^>]*>[^<]*<\/time>/g, (_,a) => a+' datetime="'+r.lastDate+'">'+C.formatDate(r.lastDate)+'</time>');
  if (file === 'daily-contributions.html') s = s.replace(/(<!-- contribution-records:start -->)[\s\S]*?(<!-- contribution-records:end -->)/, (_,start,end) => start+'\n'+records()+'\n '+end);
  fs.writeFileSync(p,s);
}
console.log('Synced public debt summaries and contribution records from the ledger.');
