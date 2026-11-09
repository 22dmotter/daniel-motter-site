/* Public YouTube Shorts shown on Home and Channel. Titles are copied verbatim from YouTube oEmbed
   (checked 2026-11-09; every entry returned HTTP 200, so it is public and embeddable).
   Daniel publishes on two channels: @danielmotter62 (UCdjRkPxSJKIUjvW5IwaKrvQ, the source of the
   featured Short and long-form video already on the site) and @DanielEMotter (UCWDgb6-LZA7pFCzMnAUGw0g).
   Order: featured first, then newest first. After editing, run node scripts/sync-shorts.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DanielShorts = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var featured = 'ap-y7-83m4E';
  var shorts = [
    { id: 'ap-y7-83m4E', title: 'Day 1 of Becoming Debt Free | How to Get Out of Debt FAST (My Debt Payoff Journey)', channel: '@danielmotter62', published: '2026-11-03' },
    { id: 'vhKMcF7J-wY', title: '1 Like = 1 Cent Off My $50,000 Debt 💸 | Help Me Get Debt Free!', channel: '@danielmotter62', published: '2026-11-09' },
    { id: '5X0FzhK5aKs', title: 'I\'m $50,000 in Debt, Day 3 Changed Everything 😳 | Debt Free Journey', channel: '@danielmotter62', published: '2026-11-09' },
    { id: 'L682RKj82Nw', title: 'Day 6 of paying of 50k in debt.', channel: '@danielmotter62', published: '2026-11-09' },
    { id: 'gSOsZp-KYp0', title: 'Paying Off $50K in Debt | Day 5 of My Debt Free Journey', channel: '@danielmotter62', published: '2026-11-08' },
    { id: 'kBH7lrqXLfI', title: 'Paying Off Over $50K in Debt | Day 4 of My Debt Free Journey', channel: '@danielmotter62', published: '2026-11-08' },
    { id: 'oDocZtVtS80', title: 'Day one of Paying off 50k of Debt', channel: '@DanielEMotter', published: '2026-11-07' },
    { id: 'gcMUTylpG_0', title: 'Day 2 of Becoming Debt Free | How to Get Out of Debt FAST ($50K Debt Payoff Journey)', channel: '@danielmotter62', published: '2026-11-05' }
  ];
  return Object.freeze({ featured: featured, shorts: Object.freeze(shorts.map(Object.freeze)) });
}));
