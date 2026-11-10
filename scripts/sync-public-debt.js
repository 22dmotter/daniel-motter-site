/* Run after editing debt-contributions.js (contributions/accounts) or debt-breakdown.js (display details)
   to update no-JS HTML fallbacks, including per-debt progress bars and trackers.
   Tests deliberately fail if fallbacks diverge from the authoritative ledger. */
'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..'), C = require('../debt-contributions'), r = C.report();
const B = require('../debt-breakdown'), breakdown = B.report(r.remainingCents);
function escape(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function progressBlock(d) {
  if (d.startingCents === undefined) return '';
  const pct = d.percent.toFixed(1), nameId = 'debt-' + d.id + '-name';
  const valueText = C.money(d.paidCents) + ' of ' + C.money(d.startingCents) + ' paid, ' + C.money(d.balanceCents) + ' remaining (' + pct + '%)';
  // Every debt's tracker is a native disclosure, closed by default (never emit an open attribute).
  const tracker = '<details class="account-tracker"><summary>' + escape(d.label) + ' contribution tracker (' + d.days.length + (d.days.length === 1 ? ' payment' : ' payments') + ')</summary>'
    + (d.days.length
      ? '<ol class="account-history">' + d.days.map(h => '<li><time datetime="' + h.date + '">' + C.formatDate(h.date) + '</time><span class="account-contribution">' + C.money(h.amountCents) + '</span><span class="account-history-left">' + C.money(h.remainingCents) + ' left on this debt</span></li>').join('') + '</ol>'
      : '<p class="history-note account-empty">No contributions recorded yet.</p>')
    + '</details>';
  return '<div class="account-progress"><div class="account-bar" role="progressbar" aria-labelledby="' + nameId + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-valuetext="' + escape(valueText) + '"><i style="width:' + Math.min(100, d.percent).toFixed(6) + '%"></i></div><p class="account-pct"><span class="account-pct-value">' + pct + '%</span> paid off</p></div>'
    + '<dl class="account-amounts"><div><dt>Starting</dt><dd class="account-start">' + C.money(d.startingCents) + '</dd></div><div><dt>Paid</dt><dd class="account-paid">' + C.money(d.paidCents) + '</dd></div><div><dt>Remaining</dt><dd class="account-left">' + C.money(d.balanceCents) + '</dd></div></dl>'
    + tracker;
}
function balanceRecords() {
  const rows = breakdown.named.map(d => {
    let detail = '';
    if (d.included) detail = '<details class="student-loans"><summary>View '+d.included.length+' student loans</summary><p class="history-note">These starting balances make up the <span class="debt-amount">'+C.money(d.startingCents !== undefined ? d.startingCents : d.balanceCents)+'</span> starting balance—not additional debt.</p><ol class="included-loans">'+d.included.map(child => '<li><strong>'+escape(child.label)+'</strong><p>'+escape(child.description)+'</p><span class="included-balance">'+C.money(child.balanceCents)+'</span></li>').join('')+'</ol></details>';
    const idAttr = d.id ? ' id="debt-'+d.id+'"' : '', h3 = d.id ? '<h3 id="debt-'+d.id+'-name">' : '<h3>';
    return '<li class="card balance-card"'+idAttr+'>'+h3+escape(d.label)+'</h3><b class="balance-value">'+C.money(d.balanceCents)+'</b><p class="history-note">Remaining · itemized <time datetime="'+d.reportedDate+'">'+C.formatDate(d.reportedDate)+'</time></p>'+progressBlock(d)+detail+'</li>';
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
function splitNote(d) {
  if (!d.parts || d.parts.length < 2) return '';
  return '<p class="history-note contribution-split">Split: ' + d.parts.map(p => C.money(p.amountCents) + ' to ' + escape(p.label)).join(' · ') + '</p>';
}
function records() {
  return r.days.map(d => '  <li class="card contribution-record"><p class="tag">Day ' + d.journeyDay + '</p><h3><time datetime="' + d.date + '">' + C.formatDate(d.date) + '</time></h3><dl class="contribution-amounts"><div><dt>Reported that day</dt><dd class="contribution-amount">' + C.money(d.amountCents) + '</dd></div><div><dt>Cumulative paid</dt><dd>' + C.money(d.cumulativeCents) + '</dd></div><div><dt>Remaining*</dt><dd>' + C.money(d.remainingCents) + '</dd></div></dl>' + splitNote(d) + '</li>').join('\n');
}
// Blog pages (built by scripts/build-blog.js) carry the same journey classes, so keep them in sync too.
const blogDir = path.join(root, 'blog');
const blogFiles = fs.existsSync(blogDir) ? fs.readdirSync(blogDir).filter(f => f.endsWith('.html')).sort().map(f => 'blog/' + f) : [];
for (const file of ['index.html','about.html','daily-contributions.html','debt-breakdown.html', ...blogFiles]) {
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
