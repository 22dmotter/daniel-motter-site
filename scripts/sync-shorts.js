/* Regenerates the Shorts grid on Home and Channel from youtube-shorts.js.
   The featured Short is a lazy-loaded iframe; the rest are lite thumbnails (a real link to the Short)
   that shorts-lite.js swaps for the same iframe on click, so the page stays fast. Run stamp-assets.js after. */
'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..'), S = require('../youtube-shorts');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
function item(v) {
  const cap = '<figcaption>' + (v.id === S.featured ? '<span class="short-tag">Featured</span>' : '') + esc(v.title) + '</figcaption>';
  if (v.id === S.featured) return '  <figure class="short-item"><div class="short"><iframe src="https://www.youtube.com/embed/' + v.id + '" title="' + esc(v.title) + '" loading="lazy" allow="' + ALLOW + '" allowfullscreen></iframe></div>' + cap + '</figure>';
  return '  <figure class="short-item"><div class="short lite"><a class="short-play" href="https://www.youtube.com/shorts/' + v.id + '" data-short-id="' + v.id + '" data-short-title="' + esc(v.title) + '" target="_blank" rel="noopener" aria-label="Play Short: ' + esc(v.title) + '"><img src="https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg" alt="" width="480" height="360" loading="lazy" decoding="async"><span class="short-icon" aria-hidden="true"></span></a></div>' + cap + '</figure>';
}
function markup() { return S.shorts.map(item).join('\n'); }
module.exports = { markup, ALLOW };
if (require.main === module) {
  for (const file of ['index.html', 'channel.html']) {
    const p = path.join(root, file), s = fs.readFileSync(p, 'utf8');
    if (!/<!-- shorts:start -->[\s\S]*?<!-- shorts:end -->/.test(s)) throw new Error(file + ' is missing shorts markers');
    fs.writeFileSync(p, s.replace(/(<!-- shorts:start -->)[\s\S]*?(<!-- shorts:end -->)/, (_, a, b) => a + '\n' + markup() + '\n  ' + b));
  }
  console.log('Synced ' + S.shorts.length + ' Shorts into index.html and channel.html.');
}
