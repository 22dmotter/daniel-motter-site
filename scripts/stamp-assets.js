/* Cache-busting: GitHub Pages serves every file with max-age=600 at unchanged URLs, so a browser/CDN
   can pair fresh HTML with stale CSS/JS for up to 10 minutes. This stamps each local stylesheet and
   script reference with ?v=<first 10 hex of its SHA-256>, so new HTML always requests matching assets.
   Run after editing any .css/.js (and after sync-public-debt.js). Tests fail if a stamp is stale. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex').slice(0, 10);
// Matches local refs, optionally one level up (blog pages use ../asset.css).
const re = /(<link rel="stylesheet" href="|<script src=")((?:\.\.\/)?)([A-Za-z0-9._-]+\.(?:css|js))(?:\?v=[0-9a-f]+)?(")/g;
const blogDir = path.join(root, 'blog');
const files = fs.readdirSync(root).filter(f => f.endsWith('.html')).sort()
  .concat(fs.existsSync(blogDir) ? fs.readdirSync(blogDir).filter(f => f.endsWith('.html')).sort().map(f => 'blog/' + f) : []);
for (const file of files) {
  const p = path.join(root, file), s = fs.readFileSync(p, 'utf8');
  const out = s.replace(re, (_, a, up, asset, b) => a + up + asset + '?v=' + hash(asset) + b);
  if (out !== s) fs.writeFileSync(p, out);
}
console.log('Stamped local CSS/JS references with content hashes.');
