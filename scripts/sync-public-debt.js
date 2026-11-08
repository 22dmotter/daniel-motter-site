/* Run after editing debt-contributions.js or debt-breakdown.js to update no-JS HTML fallbacks.
   Tests deliberately fail if fallbacks diverge from the authoritative ledger. */
'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..'), C = require('../debt-contributions'), r = C.report();
const B = require('../debt-breakdown'), breakdown = B.report(r.remainingCents);
function escape(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function balanceRecords() {
  const rows = breakdown.named.map(d => {
    let detail = '';
    if (d.included) detail = '<details class="student-loans"><summary>View '+d.included.length+' student loans</summary><p class="history-note">Included in the <span class="debt-amount">'+C.money(d.balanceCents)+'</span> above—not additional debt.</p><ol class="included-loans">'+d.included.map(child => '<li><strong>'+escape(child.label)+'</strong><p>'+escape(child.description)+'</p><span class="included-balance">'+C.money(child.balanceCents)+'</span></li>').join('')+'</ol></details>';
    return '<li class="card balance-card"><h3>'+escape(d.label)+'</h3><b class="balance-value">'+C.money(d.balanceCents)+'</b><p class="history-note">Reported <time datetime="'+d.reportedDate+'">'+C.formatDate(d.reportedDate)+'</time></p>'+detail+'</li>';
  });
  if (!breakdown.mismatch && breakdown.unitemizedCents > 0) rows.push('<li class="card balance-card unitemized"><h3>Other debt—not yet itemized</h3><b class="balance-value">'+C.money(breakdown.unitemizedCents)+'</b><p class="history-note">Calculated remainder, not a separate reported account. More individual balances can be added as I report them.</p></li>');
  return rows.join('\n  ');
}
function balanceWarning() {
  return '<p id="breakdown-warning" class="breakdown-warning" role="alert"'+(breakdown.mismatch ? '' : ' hidden')+'>'+(breakdown.mismatch ? 'Update needed: the individual balance snapshots total <span class="debt-amount">'+C.money(breakdown.namedCents)+'</span>, which is <span class="debt-amount">'+C.money(breakdown.discrepancyCents)+'</span> above the current remaining total. The individual balances need updating. No unitemized amount is shown until the figures reconcile.' : '')+'</p>';
}
function balanceStatus() {
  return '<p id="breakdown-status" class="history-note">'+(breakdown.mismatch ? 'Individual snapshots do not currently reconcile with the overall total.' : breakdown.unitemizedCents === 0 ? 'The current remaining total is fully itemized by these reported snapshots.' : 'This is a partial breakdown. The calculated remainder fills the gap to the current remaining total.')+'</p>';
}
function records() {
  return r.days.map(d => '  <li class="card contribution-record"><p class="tag">Day ' + d.journeyDay + '</p><h3><time datetime="' + d.date + '">' + C.formatDate(d.date) + '</time></h3><dl class="contribution-amounts"><div><dt>Reported that day</dt><dd class="contribution-amount">' + C.money(d.amountCents) + '</dd></div><div><dt>Cumulative paid</dt><dd>' + C.money(d.cumulativeCents) + '</dd></div><div><dt>Remaining*</dt><dd>' + C.money(d.remainingCents) + '</dd></div></dl></li>').join('\n');
}
for (const file of ['index.html','about.html','daily-contributions.html','debt-breakdown.html']) {
  const p = path.join(root, file); let s = fs.readFileSync(p,'utf8');
  for (const [cls, val] of [['debt-start',r.startingCents],['debt-paid',r.paidCents],['debt-left',r.remainingCents]]) {
    s = s.replace(new RegExp('(<b class="'+cls+'">)[^<]*(</b>)','g'), (_,a,b) => a+C.money(val)+b);
  }
  s = s.replace(/(<(?:strong|span) class="pct"[^>]*>)[^<]*(<\/(?:strong|span)>)/g, (_,a,b) => a+r.percent.toFixed(1)+'%'+b);
  s = s.replace(/<div class="bar"><i[^>]*><\/i><\/div>/g, '<div class="bar"><i style="width:'+r.percent.toFixed(6)+'%"></i></div>');
  s = s.replace(/(<time class="last-contribution-date")[^>]*>[^<]*<\/time>/g, (_,a) => a+' datetime="'+r.lastDate+'">'+C.formatDate(r.lastDate)+'</time>');
  if (file === 'daily-contributions.html') s = s.replace(/(<!-- contribution-records:start -->)[\s\S]*?(<!-- contribution-records:end -->)/, (_,start,end) => start+'\n'+records()+'\n '+end);
  if (file === 'debt-breakdown.html') {
    s = s.replace(/(<!-- breakdown-records:start -->)[\s\S]*?(<!-- breakdown-records:end -->)/, (_,start,end) => start+'\n  '+balanceRecords()+'\n '+end);
    s = s.replace(/(<!-- breakdown-warning:start -->)[\s\S]*?(<!-- breakdown-warning:end -->)/, (_,start,end) => start+'\n '+balanceWarning()+'\n '+end);
    s = s.replace(/(<!-- breakdown-status:start -->)[\s\S]*?(<!-- breakdown-status:end -->)/, (_,start,end) => start+'\n '+balanceStatus()+'\n '+end);
  }
  fs.writeFileSync(p,s);
}
console.log('Synced public debt summaries and contribution records from the ledger.');
