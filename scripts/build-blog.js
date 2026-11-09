/* Builds /blog/*.html from content/blog/*.md (a tiny Markdown subset), plus blog/index.html and sitemap.xml.
   Run: node scripts/build-blog.js && node scripts/sync-public-debt.js && node scripts/stamp-assets.js
   Daniel's figures are read from debt-contributions.js; sync-public-debt.js keeps them current afterwards. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = path.join(__dirname, '..'), SRC = path.join(root, 'content', 'blog'), OUT = path.join(root, 'blog');
const SITE = 'https://22dmotter.github.io/daniel-motter-site/';
const C = require('../debt-contributions'), R = C.report();
const PUBLISHED = '2026-11-09';
const CATEGORIES = [
  ['basics', 'Debt basics', 'What debt is, how much is too much, and where to begin.'],
  ['strategies', 'Payoff strategies', 'Snowball, avalanche and practical ways to get debt-free faster.'],
  ['interest', 'Interest & credit cards', 'How interest, APR and minimum payments really work.'],
  ['loans', 'Loans: student, car, personal & home', 'Repayment, consolidation, refinancing and paying loans off early.'],
  ['credit', 'Credit scores', 'How scores work and what paying off debt does to them.'],
  ['budgeting', 'Budgeting & saving', 'Budgets, emergency funds and finding money for your debt plan.'],
  ['hardship', 'Hard situations', 'Collections, medical bills, payday loans, settlement and bankruptcy.'],
  ['faith', 'Faith, freedom & wealth', 'Giving, staying debt-free and building net worth.']
];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = s => s.toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = C.money;
function parse(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('Missing front matter: ' + file);
  const meta = {};
  m[1].split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  for (const k of ['title', 'h1', 'description', 'category', 'related', 'answer']) if (!meta[k]) throw new Error(file + ' missing ' + k);
  meta.slug = path.basename(file, '.md');
  meta.related = meta.related.split(',').map(s => s.trim()).filter(Boolean);
  meta.body = m[2];
  return meta;
}
function inline(s) {
  let out = esc(s);
  out = out.replace(/\{start\}/g, '<b class="debt-start">' + money(R.startingCents) + '</b>')
    .replace(/\{paid\}/g, '<b class="debt-paid">' + money(R.paidCents) + '</b>')
    .replace(/\{left\}/g, '<b class="debt-left">' + money(R.remainingCents) + '</b>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, h) => {
    const ext = /^https?:/.test(h);
    return '<a href="' + h + '"' + (ext ? ' rel="noopener" target="_blank"' : '') + '>' + t + '</a>';
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return out;
}
function render(meta) {
  const blocks = meta.body.trim().split(/\n{2,}/);
  const html = [], toc = [], faqs = [];
  for (const block of blocks) {
    const b = block.trim();
    if (b === '@journey') { html.push(journey()); continue; }
    if (b.startsWith('@faq')) {
      const pairs = b.split('\n').slice(1).join('\n').split(/\n(?=Q: )/);
      pairs.forEach(p => { const mm = p.match(/^Q: (.+)\nA: ([\s\S]+)$/); if (!mm) throw new Error(meta.slug + ' bad FAQ: ' + p); faqs.push({ q: mm[1].trim(), a: mm[2].trim().replace(/\n/g, ' ') }); });
      toc.push(['faq', 'Frequently asked questions']);
      html.push('<section class="faq" aria-labelledby="faq"><h2 id="faq">Frequently asked questions</h2>' + faqs.map(f => '<h3>' + inline(f.q) + '</h3><p>' + inline(f.a) + '</p>').join('') + '</section>');
      continue;
    }
    if (b.startsWith('## ')) { const t = b.slice(3).trim(), id = slugify(t); toc.push([id, t]); html.push('<h2 id="' + id + '">' + inline(t) + '</h2>'); continue; }
    if (b.startsWith('### ')) { html.push('<h3>' + inline(b.slice(4).trim()) + '</h3>'); continue; }
    if (b.startsWith('> ')) { html.push('<div class="callout">' + b.split('\n').map(l => '<p>' + inline(l.replace(/^> ?/, '')) + '</p>').join('') + '</div>'); continue; }
    if (b.startsWith('|')) {
      const rows = b.split('\n').filter(l => !/^\|\s*-/.test(l)).map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
      html.push('<div class="table-wrap"><table><thead><tr>' + rows[0].map(c => '<th scope="col">' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' + rows.slice(1).map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (/^- /.test(b)) { html.push('<ul>' + b.split(/\n(?=- )/).map(l => '<li>' + inline(l.slice(2).replace(/\n/g, ' ')) + '</li>').join('') + '</ul>'); continue; }
    if (/^\d+\. /.test(b)) { html.push('<ol>' + b.split(/\n(?=\d+\. )/).map(l => '<li>' + inline(l.replace(/^\d+\. /, '').replace(/\n/g, ' ')) + '</li>').join('') + '</ol>'); continue; }
    html.push('<p>' + inline(b.replace(/\n/g, ' ')) + '</p>');
  }
  if (!faqs.length) throw new Error(meta.slug + ' needs an @faq block');
  return { html: html.join('\n'), toc, faqs };
}
function journey() {
  return '<aside class="journey" aria-labelledby="journey-h"><h2 id="journey-h">Follow my real payoff journey</h2>'
    + '<p>I\'m paying off my own debt in public, one recorded contribution at a time. These numbers update from the same ledger as the rest of the site.</p>'
    + '<div class="journey-stats"><div><b class="debt-start">' + money(R.startingCents) + '</b><small>Starting debt</small></div><div><b class="debt-paid">' + money(R.paidCents) + '</b><small>Paid off so far</small></div><div><b class="debt-left">' + money(R.remainingCents) + '</b><small>Still to go</small></div></div>'
    + '<div class="bar"><i style="width:' + R.percent.toFixed(6) + '%"></i></div><p class="byline"><strong class="pct">' + R.percent.toFixed(1) + '%</strong> paid off so far</p>'
    + '<div class="cta-row"><a class="btn" href="../calculate-your-payment.html">Calculate your payment</a><a class="btn ghost" href="../debt-tracker.html">Track your debts</a><a class="btn ghost" href="../daily-contributions.html">See my daily contributions</a><a class="btn ghost" href="../channel.html">Watch the channel</a></div></aside>';
}
const NAV = [['index.html','Home'],['about.html','About'],['get-out-of-debt.html','Get Out of Debt'],['calculate-your-payment.html','Calculate Your Payment'],['debt-tracker.html','Debt Tracker'],['channel.html','Channel'],['blog/','Blog'],['coming-soon.html','Coming Soon']];
function nav() {
  return '<nav aria-label="Main navigation"><div class="wrap">\n <a href="../index.html" class="logo">Daniel Motter<span>.</span></a>\n <ul>' + NAV.map(([h, t]) => '<li><a href="' + (h === 'blog/' ? './' : '../' + h) + '"' + (h === 'blog/' ? ' class="active"' : '') + '>' + t + '</a></li>').join('') + '</ul>\n <a href="../channel.html" class="btn sm">Watch My Videos</a>\n</div></nav>';
}
function footer() {
  const links = NAV.concat([['daily-contributions.html','Daily Contributions'],['debt-breakdown.html','Debt Breakdown']]);
  return '<footer class="site-footer"><div class="wrap">\n <div class="footer-brand"><strong>Daniel Motter</strong><p class="footer-verse">"Let no debt remain outstanding, except the continuing debt to love one another." Romans 13:8</p></div>\n <div class="links footer-links">' + links.map(([h, t]) => '<a href="' + (h === 'blog/' ? './' : '../' + h) + '">' + t + '</a>').join('') + '</div>\n <div class="footer-legal">© <span id="yr"></span> Daniel Motter. Not financial advice; just my story.</div>\n</div></footer>';
}
function head(o) {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + esc(o.title) + '</title>\n<meta name="description" content="' + esc(o.description) + '">\n<meta name="author" content="Daniel Motter">\n<meta name="robots" content="index, follow, max-image-preview:large">\n<meta name="theme-color" content="#0b0d10">\n'
    + '<link rel="canonical" href="' + o.url + '">\n<meta property="og:type" content="' + o.ogType + '">\n<meta property="og:site_name" content="Daniel Motter">\n<meta property="og:title" content="' + esc(o.title) + '">\n<meta property="og:description" content="' + esc(o.description) + '">\n<meta property="og:url" content="' + o.url + '">\n<meta property="og:image" content="' + SITE + 'daniel-motter.jpg">\n'
    + '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="' + esc(o.title) + '">\n<meta name="twitter:description" content="' + esc(o.description) + '">\n<meta name="twitter:image" content="' + SITE + 'daniel-motter.jpg">\n'
    + o.jsonld.map(j => '<script type="application/ld+json">' + JSON.stringify(j).replace(/</g, '\\u003c') + '</script>\n').join('')
    + '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">\n'
    + '<link rel="stylesheet" href="../blog.css">\n<link rel="stylesheet" href="../site-nav.css">\n</head>\n';
}
function tail() {
  return '<script>document.getElementById(\'yr\').textContent=new Date().getFullYear();</script>\n<script src="../debt-contributions.js"></script>\n<script src="../public-debt-ui.js"></script>\n</body>\n</html>\n';
}
const author = { '@type': 'Person', name: 'Daniel Motter', url: SITE + 'about.html' };
function wordCount(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length; }
function build() {
  const files = fs.readdirSync(SRC).filter(f => f.endsWith('.md')).sort();
  const posts = files.map(f => parse(path.join(SRC, f)));
  const bySlug = new Map(posts.map(p => [p.slug, p]));
  const cats = new Map(CATEGORIES.map(c => [c[0], c]));
  for (const p of posts) {
    if (!cats.has(p.category)) throw new Error(p.slug + ' unknown category ' + p.category);
    for (const r of p.related) if (!bySlug.has(r) || r === p.slug) throw new Error(p.slug + ' bad related ' + r);
  }
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.html')) fs.unlinkSync(path.join(OUT, f));
  for (const p of posts) {
    const { html, toc, faqs } = render(p);
    const url = SITE + 'blog/' + p.slug + '.html', cat = cats.get(p.category);
    const fullTitle = (p.title + ' | Daniel Motter').length <= 60 ? p.title + ' | Daniel Motter' : p.title;
    const answerHtml = '<div class="answer"><p><strong>Short answer:</strong> ' + inline(p.answer) + '</p></div>';
    const words = wordCount(answerHtml + html);
    const jsonld = [
      { '@context': 'https://schema.org', '@type': 'Article', headline: p.h1, description: p.description, author, publisher: { '@type': 'Person', name: 'Daniel Motter', url: SITE }, datePublished: PUBLISHED, dateModified: PUBLISHED, mainEntityOfPage: url, image: SITE + 'daniel-motter.jpg', articleSection: cat[1], wordCount: words, inLanguage: 'en-US' },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*?([^*]+)\*\*?/g, '$1').replace(/\{start\}/g, money(R.startingCents)).replace(/\{paid\}/g, money(R.paidCents)).replace(/\{left\}/g, money(R.remainingCents)) } })) },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE }, { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + 'blog/' }, { '@type': 'ListItem', position: 3, name: p.h1, item: url }] }
    ];
    const related = p.related.map(s => bySlug.get(s));
    const minutes = Math.max(4, Math.round(words / 230));
    const page = head({ title: fullTitle, description: p.description, url, ogType: 'article', jsonld })
      + '<body class="blog-page">\n' + nav() + '\n<main>\n<div class="wrap">\n'
      + '<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="../index.html">Home</a></li><li><a href="./">Blog</a></li><li><a href="./#' + cat[0] + '">' + esc(cat[1]) + '</a></li></ol></nav>\n'
      + '<header class="blog-hero"><span class="eyebrow">' + esc(cat[1]) + '</span><h1>' + esc(p.h1) + '</h1><p class="byline">By <a href="../about.html">Daniel Motter</a> · <time datetime="' + PUBLISHED + '">' + C.formatDate(PUBLISHED) + '</time> · ' + minutes + ' min read</p></header>\n'
      + '<div class="layout"><article class="article">\n' + answerHtml + '\n'
      + '<nav class="toc" aria-labelledby="toc-h"><h2 id="toc-h">On this page</h2><ol>' + toc.map(([id, t]) => '<li><a href="#' + id + '">' + inline(t) + '</a></li>').join('') + '</ol></nav>\n'
      + html + '\n'
      + '<section class="related" aria-labelledby="related-h"><h2 id="related-h">Keep reading</h2><ul>' + related.map(r => '<li><a href="' + r.slug + '.html">' + esc(r.h1) + '</a></li>').join('') + '</ul></section>\n'
      + '<div class="disclaimer"><p><strong>Educational, not financial advice.</strong> I\'m sharing what I\'ve learned while paying off my own debt. I\'m not a licensed financial, tax or legal professional. Rules, rates and lender terms change and vary by state, so check current details with the lender, an official source or a qualified professional before you decide.</p></div>\n'
      + '</article>\n<aside class="side" aria-label="Tools"><div class="side-box"><h2>Free tools</h2><ul><li><a href="../calculate-your-payment.html">Payoff calculator &amp; planner</a></li><li><a href="../debt-tracker.html">Private debt tracker</a></li><li><a href="../get-out-of-debt.html">Get out of debt: the full plan</a></li><li><a href="../daily-contributions.html">My daily contributions</a></li><li><a href="../debt-breakdown.html">My debt breakdown</a></li><li><a href="./">All articles</a></li></ul></div></aside>\n</div>\n</div>\n</main>\n'
      + footer() + '\n' + tail();
    fs.writeFileSync(path.join(OUT, p.slug + '.html'), page);
  }
  // Blog index
  const indexUrl = SITE + 'blog/';
  const indexJson = [
    { '@context': 'https://schema.org', '@type': 'Blog', name: 'Daniel Motter Blog: Debt & Money Questions Answered', url: indexUrl, author, blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.h1, url: SITE + 'blog/' + p.slug + '.html', datePublished: PUBLISHED })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE }, { '@type': 'ListItem', position: 2, name: 'Blog', item: indexUrl }] }
  ];
  const sections = CATEGORIES.map(([id, name, blurb]) => {
    const list = posts.filter(p => p.category === id);
    if (!list.length) return '';
    return '<section class="cat" id="' + id + '" aria-labelledby="' + id + '-h"><h2 id="' + id + '-h">' + esc(name) + '</h2><p>' + esc(blurb) + '</p><ul class="blog-grid">' + list.map(p => '<li class="blog-card"><a href="' + p.slug + '.html"><h3>' + esc(p.h1) + '</h3><p>' + esc(p.description) + '</p></a></li>').join('') + '</ul></section>';
  }).join('\n');
  const index = head({ title: 'Debt & Money Blog: 50 Questions Answered | Daniel Motter', description: 'Clear, practical answers to the 50 biggest debt and money questions: payoff strategies, interest, credit scores, budgeting, loans and more.', url: indexUrl, ogType: 'website', jsonld: indexJson })
    + '<body class="blog-page">\n' + nav() + '\n<main>\n<div class="wrap">\n<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="../index.html">Home</a></li><li><a href="./" aria-current="page">Blog</a></li></ol></nav>\n'
    + '<header class="blog-hero"><span class="eyebrow">The blog</span><h1>Your debt &amp; money questions, answered.</h1><p class="lead">' + posts.length + ' plain-English guides to the questions people ask most about debt and personal finance, with real math and practical next steps. I\'m paying off ' + '<b class="debt-start">' + money(R.startingCents) + '</b> of my own debt in public, and I write what I\'m learning along the way.</p>'
    + '<div class="cat-nav">' + CATEGORIES.filter(c => posts.some(p => p.category === c[0])).map(c => '<a href="#' + c[0] + '">' + esc(c[1]) + '</a>').join('') + '</div></header>\n'
    + sections + '\n' + journey() + '\n<div class="disclaimer"><p><strong>Educational, not financial advice.</strong> These articles share general information and my own experience. Check current terms with your lender or a qualified professional before you make decisions.</p></div>\n</div>\n</main>\n' + footer() + '\n' + tail();
  fs.writeFileSync(path.join(OUT, 'index.html'), index);
  // Sitemap: every public page, lastmod from the last commit touching it (today if uncommitted changes).
  const today = new Date().toISOString().slice(0, 10);
  const lastmod = rel => { try { const dirty = cp.execFileSync('git', ['status', '--porcelain', '--', rel], { cwd: root, encoding: 'utf8' }).trim(); if (dirty) return today; const d = cp.execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], { cwd: root, encoding: 'utf8' }).trim(); return d || today; } catch (e) { return today; } };
  const rootPages = fs.readdirSync(root).filter(f => f.endsWith('.html') && f !== 'why-debt-is-bad.html').sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
  const entries = rootPages.map(f => [f === 'index.html' ? SITE : SITE + f, f]).concat([[indexUrl, 'blog/index.html']], posts.map(p => [SITE + 'blog/' + p.slug + '.html', 'blog/' + p.slug + '.html']));
  fs.writeFileSync(path.join(root, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries.map(([u, f]) => '  <url><loc>' + u + '</loc><lastmod>' + lastmod(f) + '</lastmod></url>').join('\n') + '\n</urlset>\n');
  console.log('Built ' + posts.length + ' blog posts, blog index and sitemap (' + entries.length + ' URLs).');
}
module.exports = { parse, render, wordCount, CATEGORIES };
if (require.main === module) build();
