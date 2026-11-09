'use strict';
// Blog: 50 static SEO articles built by scripts/build-blog.js from content/blog/*.md.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../debt-contributions'),{wordCount,CATEGORIES}=require('../scripts/build-blog'),root=path.join(__dirname,'..');
const SITE='https://22dmotter.github.io/daniel-motter-site/';let count=0;
function test(name,fn){fn();count++;console.log('ok - '+name);}
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const slugs=fs.readdirSync(path.join(root,'content/blog')).filter(f=>f.endsWith('.md')).map(f=>f.slice(0,-3)).sort();
const posts=slugs.map(s=>({slug:s,file:'blog/'+s+'.html',html:read('blog/'+s+'.html')}));
const meta=(h,re)=>{const m=h.match(re);return m&&m[1];};
const ld=h=>[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
const allHtml=()=>fs.readdirSync(root).filter(f=>f.endsWith('.html')).concat(fs.readdirSync(path.join(root,'blog')).filter(f=>f.endsWith('.html')).map(f=>'blog/'+f));
const decode=s=>s.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');

test('exactly 50 articles exist, one static page per source file, plus the blog index',()=>{
 assert.equal(slugs.length,50);for(const p of posts)assert(p.html.startsWith('<!DOCTYPE html>'),p.file);
 assert.equal(fs.readdirSync(path.join(root,'blog')).filter(f=>f.endsWith('.html')).length,51);assert(fs.existsSync(path.join(root,'blog/index.html')));
});
test('titles, descriptions and canonicals are present, unique and within length limits',()=>{
 const pages=posts.concat([{slug:'index',file:'blog/index.html',html:read('blog/index.html')}]);const seen={t:new Set(),d:new Set(),c:new Set(),h:new Set()};
 for(const p of pages){const t=decode(meta(p.html,/<title>([^<]+)<\/title>/)),d=decode(meta(p.html,/<meta name="description" content="([^"]+)"/)),c=meta(p.html,/<link rel="canonical" href="([^"]+)"/),h=meta(p.html,/<h1>([^<]+)<\/h1>/);
  assert(t&&t.length<=60,p.file+' title '+t);assert(d&&d.length>=70&&d.length<=155,p.file+' description length '+(d||'').length);
  assert.equal(c,SITE+(p.slug==='index'?'blog/':'blog/'+p.slug+'.html'),p.file);assert(h,p.file+' h1');
  for(const [k,v] of [['t',t],['d',d],['c',c],['h',h]]){assert(!seen[k].has(v),p.file+' duplicate '+k+': '+v);seen[k].add(v);}
  assert.equal(meta(p.html,/<meta property="og:url" content="([^"]+)"/),c,p.file);assert(p.html.includes('<meta property="og:title"'),p.file);assert(p.html.includes('<meta name="twitter:card"'),p.file);
  assert(p.html.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'),p.file);}
});
test('every article has valid Article, FAQPage and BreadcrumbList JSON-LD that matches the page',()=>{
 for(const p of posts){const g=ld(p.html),types=g.map(x=>x['@type']).sort();assert.deepEqual(types,['Article','BreadcrumbList','FAQPage'],p.file);
  const a=g.find(x=>x['@type']==='Article'),f=g.find(x=>x['@type']==='FAQPage'),b=g.find(x=>x['@type']==='BreadcrumbList');
  assert.equal(a.mainEntityOfPage,SITE+p.file,p.file);assert.equal(a.author.name,'Daniel Motter');assert(/^\d{4}-\d{2}-\d{2}$/.test(a.datePublished),p.file);assert(a.headline&&a.headline.length<=110,p.file);
  assert(f.mainEntity.length>=4,p.file);const visibleQs=[...p.html.match(/<section class="faq"[\s\S]*?<\/section>/)[0].matchAll(/<h3>([^<]+)<\/h3>/g)].map(m=>decode(m[1]));
  assert.deepEqual(f.mainEntity.map(q=>q.name),visibleQs,p.file+' FAQ JSON-LD must mirror visible FAQ');for(const q of f.mainEntity)assert(q.acceptedAnswer.text.length>20,p.file);
  assert.deepEqual(b.itemListElement.map(i=>i.position),[1,2,3],p.file);assert.equal(b.itemListElement[2].item,SITE+p.file);}
 const bi=ld(read('blog/index.html'));assert(bi.some(x=>x['@type']==='Blog'||(x['@graph']||[]).some(y=>y['@type']==='Blog')));
});
test('articles meet the minimum length and structure: direct answer first, H2 sections, FAQ, related links, disclaimer',()=>{
 for(const p of posts){const art=p.html.match(/<article class="article">([\s\S]*?)<\/article>/)[1];assert(wordCount(art)>=1000,p.file+' has '+wordCount(art)+' words');
  assert(art.trimStart().startsWith('<div class="answer">'),p.file);assert((art.match(/<h2 id=/g)||[]).length>=5,p.file);
  assert(art.includes('class="related"')&&(art.match(/class="related"[\s\S]*?<\/section>/)[0].match(/<a href=/g)||[]).length>=3,p.file);
  assert(art.includes('Educational, not financial advice'),p.file);assert(!/\*|\{(start|paid|left)\}|@journey|@faq/.test(art.replace(/<[^>]+>/g,'')),p.file+' has unrendered markup');}
});
test('article content is not duplicated across pages',()=>{
 const seen=new Map();for(const p of posts){for(const para of p.html.match(/<article class="article">([\s\S]*?)<\/article>/)[1].matchAll(/<p>([^]*?)<\/p>/g)){
  const t=para[1].replace(/<[^>]+>/g,'').trim();if(t.split(/\s+/).length<25||/^(Educational, not financial advice|I'm paying off my own debt in public)/.test(t))continue;
  assert(!seen.has(t),p.file+' repeats a paragraph from '+seen.get(t));seen.set(t,p.file);}}
});
test('every article and the index use only categories that exist and link CTAs to the tools and channel',()=>{
 const idx=read('blog/index.html');assert.equal(CATEGORIES.length,8);for(const [c] of CATEGORIES){assert(idx.includes('id="'+c+'"'),c);assert(posts.filter(p=>p.html.includes('href="./#'+c+'"')).length>=3,c+' has too few posts');}
 for(const p of posts){assert(idx.includes('href="'+p.slug+'.html"'),p.slug+' missing from blog index');
  for(const h of ['../calculate-your-payment.html','../debt-tracker.html','../daily-contributions.html','../channel.html'])assert(p.html.includes('href="'+h+'"'),p.file+' '+h);}
});
test('journey figures in every blog page match the ledger and use the site colors',()=>{
 const r=C.report();assert.equal(r.startingCents,4911344);
 for(const f of ['blog/index.html'].concat(posts.map(p=>p.file))){const h=read(f);
  assert(h.includes('<b class="debt-start">'+C.money(r.startingCents)+'</b>'),f);assert(h.includes('<b class="debt-paid">'+C.money(r.paidCents)+'</b>'),f);assert(h.includes('<b class="debt-left">'+C.money(r.remainingCents)+'</b>'),f);
  assert(h.includes('<strong class="pct">'+r.percent.toFixed(1)+'%</strong>'),f);}
 const css=read('blog.css');assert(/\.debt-paid\{[^}]*#22c55e/.test(css));assert(/\.debt-start,\s*\.debt-left\{[^}]*#ff3b3b|\.debt-left\{[^}]*#ff3b3b/.test(css));
});
test('Romans 13:8 is the only Bible verse cited, and there is no donation or payment collection',()=>{
 const books=/\b(Genesis|Exodus|Leviticus|Deuteronomy|Psalms?|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Ezekiel|Malachi|Matthew|Luke|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Hebrews|(?:Job|Numbers|Judges|Ruth|Samuel|Kings|Chronicles|Daniel|Mark|John|Acts|James|Peter|Timothy|Revelation) \d{1,3})\b/;
 for(const f of allHtml().filter(f=>f.startsWith('blog/'))){const t=read(f).replace(/<[^>]+>/g,' ');
  for(const m of t.matchAll(/\b[1-3]?\s?[A-Z][a-z]+ \d{1,3}:\d{1,3}\b/g))assert.equal(m[0].trim(),'Romans 13:8',f+' cites '+m[0]);assert(!books.test(t),f+' mentions another book of the Bible');
  assert(!/donate|paypal|venmo|cash\.app|<form/i.test(read(f)),f);}
});
test('no broken internal links or fragments anywhere on the site, including the blog',()=>{
 for(const f of allHtml()){const h=read(f),dir=path.dirname(f);
  for(const m of h.matchAll(/<a [^>]*href="([^"]+)"/g)){const u=decode(m[1]);if(/^(https?:|mailto:|tel:)/.test(u))continue;
   const [p0,frag]=u.split('#');let target=p0===''?f:path.posix.normalize(path.posix.join(dir,p0));if(p0===''||p0.endsWith('/')||p0==='.'||p0==='./')target=p0===''?f:path.posix.join(target,'index.html');
   target=target.replace(/^\.\//,'');assert(!target.startsWith('..'),f+' links outside the site: '+u);assert(fs.existsSync(path.join(root,target)),f+' broken link '+u);
   if(frag){const t=read(target);assert(t.includes('id="'+frag+'"'),f+' broken fragment '+u);}}}
});
test('sitemap lists every indexable page with lastmod, and robots.txt keeps its Sitemap line',()=>{
 const sm=read('sitemap.xml'),locs=[...sm.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod><\/url>/g)].map(m=>m[1]);
 assert.equal(locs.length,(sm.match(/<url>/g)||[]).length,'every url has lastmod');assert.equal(new Set(locs).size,locs.length);
 for(const f of allHtml().filter(f=>f!=='why-debt-is-bad.html'))assert(locs.includes(SITE+(f==='index.html'?'':f==='blog/index.html'?'blog/':f)),'sitemap missing '+f);
 assert(!locs.some(l=>l.endsWith('why-debt-is-bad.html')));assert.equal(locs.length,allHtml().length-1);
 assert(read('robots.txt').includes('Sitemap: '+SITE+'sitemap.xml'));
});
test('every page has Blog in the shared nav and footer, between Channel and Coming Soon',()=>{
 for(const f of allHtml().filter(f=>f!=='why-debt-is-bad.html')){const h=read(f),b=f.startsWith('blog/')?'./':'blog/',c=f.startsWith('blog/')?'../channel.html':'channel.html';
  const nav=[...h.match(/<nav aria-label="Main navigation">[\s\S]*?<\/ul>/)[0].matchAll(/<li><a href="([^"]+)"/g)].map(m=>m[1]);assert.equal(nav.length,8,f);assert.equal(nav[nav.indexOf(c)+1],b,f);
  const foot=[...h.match(/footer-links">([\s\S]*?)<\/div>/)[1].matchAll(/<a href="([^"]+)"/g)].map(m=>m[1]).filter(x=>!x.startsWith('mailto:'));assert.deepEqual(foot.slice(0,8),nav,f);}
});
test('blog pages never use innerHTML and load only local, stamped assets',()=>{
 for(const f of allHtml().filter(f=>f.startsWith('blog/'))){const h=read(f);assert(!/innerHTML/.test(h),f);
  for(const m of h.matchAll(/<script src="([^"]+)"/g))assert(/^\.\.\/[a-z-]+\.js\?v=[0-9a-f]{10}$/.test(m[1]),f+' '+m[1]);}
 assert(!/innerHTML/.test(read('scripts/build-blog.js').replace(/\/\/.*$/gm,'')));
});
test('committed blog pages match a fresh build from content/blog (build, sync, stamp)',()=>{
 const os=require('node:os'),cp=require('node:child_process'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'dm-blog-'));
 try{fs.cpSync(path.join(root,'content'),path.join(dir,'content'),{recursive:true});fs.mkdirSync(path.join(dir,'scripts'));
  for(const f of fs.readdirSync(root).filter(f=>/\.(html|css|js|txt)$/.test(f)))fs.copyFileSync(path.join(root,f),path.join(dir,f));
  for(const f of ['build-blog.js','sync-public-debt.js','stamp-assets.js'])fs.copyFileSync(path.join(root,'scripts',f),path.join(dir,'scripts',f));
  for(const f of ['build-blog.js','sync-public-debt.js','stamp-assets.js'])cp.execFileSync(process.execPath,[path.join(dir,'scripts',f)],{cwd:dir,stdio:'pipe'});
  for(const f of fs.readdirSync(path.join(root,'blog')))assert.equal(fs.readFileSync(path.join(dir,'blog',f),'utf8'),read('blog/'+f),'blog/'+f+' is stale: run node scripts/build-blog.js, sync-public-debt.js, stamp-assets.js');
  assert.equal(fs.readdirSync(path.join(dir,'blog')).length,fs.readdirSync(path.join(root,'blog')).length);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('only the site header and the Free tools sidebar are sticky; the TOC and breadcrumbs are static with no blur layer',()=>{
 const css=read('blog.css').replace(/\/\*[\s\S]*?\*\//g,''),rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({sel:m[1].trim(),body:m[2]})).filter(r=>!r.sel.startsWith('@'));
 const sticky=rules.filter(r=>/position:\s*sticky/.test(r.body)).map(r=>r.sel);assert.deepEqual(sticky.sort(),['.side-box','nav[aria-label="Main navigation"]'].sort());
 const blur=rules.filter(r=>/backdrop-filter:\s*(?!none)/.test(r.body)).map(r=>r.sel);assert.deepEqual(blur,['nav[aria-label="Main navigation"]']);
 assert(!rules.some(r=>r.sel.split(',').some(x=>x.trim()==='nav')),'bare nav selector would also hit .toc and .crumbs');
 const reset=rules.find(r=>r.sel==='nav.crumbs,nav.toc');assert(reset&&/position:static/.test(reset.body)&&/backdrop-filter:none/.test(reset.body));
 const side=rules.find(r=>r.sel==='.side-box'),header=rules.find(r=>r.sel==='nav[aria-label="Main navigation"]');
 assert(parseInt(side.body.match(/top:(\d+)px/)[1],10)>=110,'sidebar must clear the ~100px sticky header');
 assert(parseInt(side.body.match(/z-index:(\d+)/)[1],10)<parseInt(header.body.match(/z-index:(\d+)/)[1],10));
 for(const p of posts){assert(/<nav class="toc" aria-labelledby="toc-h">/.test(p.html),p.file);assert(!/<nav class="toc"[^>]*style=/.test(p.html),p.file);assert(p.html.indexOf('<nav class="toc"')<p.html.indexOf('<aside class="side"'),p.file);}
 assert(!/\.toc[^{]*\{[^}]*(sticky|fixed)/.test(css)&&!/\.toc[^{]*\{[^}]*(sticky|fixed)/.test(read('site-nav.css')));
});
console.log(count+' blog tests passed');
