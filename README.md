# Daniel Motter Website: Homepage

A single self-contained `index.html` (embedded CSS, only Google Fonts loaded externally). Dark theme, mobile-first.

## Preview
- Double-click `index.html` to open it in any browser, or
- Run `python3 -m http.server 8000` in this folder and visit http://localhost:8000

## Customize
- **Placeholders**: anything in a dashed red box (class `ph`) is placeholder content. Search for `ph"` or `PLACEHOLDER` and replace with real numbers/text.
- **Progress bar**: change `width:35%` in the `.bar i` CSS rule.
- **Videos**: replace each `[ VIDEO EMBED PLACEHOLDER ]` with `<iframe src="https://www.youtube.com/embed/VIDEO_ID" allowfullscreen></iframe>`.
- **YouTube / contact links**: update the `https://www.youtube.com/` and `mailto:` links.
- **Photo**: replace the `.portrait` div content with `<img src="daniel.jpg" alt="Daniel Motter" style="width:100%;height:100%;object-fit:cover;border-radius:14px">`.
- **Colors/fonts**: edit the CSS variables in `:root` (`--accent` is the red highlight).

## Deploy (free)
Published with GitHub Pages from the `main` branch root of the public repo: push to `main` and the site at https://22dmotter.github.io/daniel-motter-site/ updates within a few minutes. `.nojekyll` makes Pages serve the files as-is.

## New pages
- **about.html**: who Daniel is, placeholder payoff stats, faith section (Romans 13:8), what he offers (channel, upcoming PDF guide, coaching, affiliate tools like Dollarwise), and a call-to-action to the Channel page.
- **channel.html**: subscribe buttons, featured video slots, and what viewers will find.
- All three pages share the same nav (Home, About, Channel) and footer.

## YouTube link
The channel URL is `https://www.youtube.com/@DanielEMotter`. To swap in the real one, find and replace that string across `index.html`, `about.html`, and `channel.html`, e.g.:
`sed -i 's#https://www.youtube.com/@DanielEMotter#https://youtube.com/@YOURHANDLE#g' *.html`

## Debt numbers and month counter
Add each recorded contribution to `debt-contributions.js`, then run `node scripts/sync-public-debt.js` and the history tests (see below). Public totals and progress derive from that one ledger. The day counter goes up by one every day, starting at 1 on Nov 3, 2026.

## SEO
Each page has a keyword-focused title and description, a canonical URL, Open Graph/Twitter tags for link previews, and schema.org structured data. `robots.txt` and `sitemap.xml` are included. All URLs use `https://22dmotter.github.io/daniel-motter-site`; if you add a custom domain, find-and-replace that address across the HTML, `robots.txt`, and `sitemap.xml`.

## Get Out of Debt guide
`get-out-of-debt.html`: a practical SEO guide with a working payoff calculator, why debt hurts, a 7-step plan, snowball vs. avalanche comparison, ways to find extra money, Romans 13:8, and an FAQ (Article, HowTo, FAQ, and breadcrumb structured data). The old `why-debt-is-bad.html` address redirects here via a small `why-debt-is-bad.html` redirect page (GitHub Pages) and `_redirects` (Netlify only).

## Calculate Your Payment
`calculate-your-payment.html`: a monthly payment calculator (payment needed to pay off one debt by a deadline) and an in-depth multi-debt payoff planner (snowball or avalanche, rolled-over payments, per-debt payoff order and month-by-month schedule). The math lives in `payment-calculator.js` and runs in the visitor's browser only. Run `node tests/payment-calculator.test.js` to check it.


## Personal debt tracker
`debt-tracker.html` records each visitor's balances and actual payments locally, without a backend or account. `debt-tracker-core.js` contains integer-cent math, validation, milestones and persistence; `debt-tracker-ui.js` renders all user text with textContent. `debt-tracker.css` and the shared `site-nav.css` handle mobile layouts.

Storage key: `daniel-motter-debt-tracker-v1`. Version 1 JSON backups are strictly validated; unsupported versions or corrupt saved data are never silently reset. Limits: 50 debts, 5,000 combined history entries, $10m per amount, 2 MB backup. Opening balance snapshots are not fabricated payment events. Payment totals are separate from net balance reduction. Milestones are current, reversible statuses derived from tracked balances/history, not permanent awards or guessed dates. Deleting debts changes the baseline; undoing the latest entry restores the prior balance.

Local browser storage is neither encrypted nor cross-device sync. Shared profiles can see data; storage clearing, private browsing or storage failure may lose it. Download unencrypted JSON backups and keep them safe. Import replacement, debt deletion, undo and clearing require visitor confirmation. No bank credentials or contact details are requested, and there is no tracker data upload, analytics or network API. Do not add user backup files to this repository.

Tests: `node tests/debt-tracker.test.js` and `node tests/payment-calculator.test.js`. Simulated DOM interaction tests: install `jsdom@26` into a temporary directory (`npm install --prefix /tmp/dm-tracker-test jsdom@26 --no-audit --no-fund`), then run `NODE_PATH=/tmp/dm-tracker-test/node_modules node tests/debt-tracker-dom.test.js`. This is a test-only dependency, not shipped to visitors. Browser QA should cover empty/add/log/undo/delete/reload/export/import, invalid import, storage warnings, keyboard navigation and the seven-link nav at desktop/tablet/320 CSS pixels.


## Coming Soon
`coming-soon.html` is an informational page about a planned subscription-based personal finance application. It does not implement an app, accounts, signup, billing or backend storage, and announces no prices or launch date. The existing browser-only Debt Tracker remains a separate tool available without a subscription. Future application implementation/hosting is outside this static site's scope.


## Daniel's public daily contributions
`daily-contributions.html` is Daniel's self-reported payoff history, linked from the full green paid stat card on Home and About. These are recorded contribution dates, not verified bank settlement dates, and missing dates are not zero-payment entries. The initial $2.68 is confirmed for Nov 3, 2026 (Day 1); the five dated updates total $898.88. This public ledger is entirely separate from visitors' private local Debt Trackers.

For a new payment update, add a dated positive whole-cent contribution to **`debt-contributions.js`**, the one authoritative source for Daniel's starting amount, journey start and contributions. Multiple entries on the same date are grouped and chronological totals are derived automatically. Never add guessed dates or zero-value days. Run **`node scripts/sync-public-debt.js`** to refresh the Home/About/history HTML fallbacks, then **`node tests/debt-contributions.test.js`** and the existing regression tests before committing. The history test rejects stale fallbacks, so a ledger update cannot silently publish mismatched public totals. `public-debt-ui.js` derives all three live summaries from this same source without fetching an API or touching visitor storage. `public-debt.css` provides the linked-card focus styles and responsive history cards.

History checks: `node tests/debt-contributions.test.js`; optional simulated DOM checks using the same temporary jsdom installation: `NODE_PATH=/tmp/dm-tracker-test/node_modules node tests/debt-contributions-dom.test.js`.
