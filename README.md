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
At the bottom of `index.html` and `about.html`, edit `DEBT_START` and `PAID` to update the totals; the progress bar and "left to go" calculate automatically. The day counter goes up by one every day, starting at 1 on Nov 3, 2026.

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

Tests: `node tests/debt-tracker.test.js` and `node tests/payment-calculator.test.js`. Simulated DOM interaction tests: install `jsdom@26` into a temporary directory (`npm install --prefix /tmp/dm-tracker-test jsdom@26 --no-audit --no-fund`), then run `NODE_PATH=/tmp/dm-tracker-test/node_modules node tests/debt-tracker-dom.test.js`. This is a test-only dependency, not shipped to visitors. Browser QA should cover empty/add/log/undo/delete/reload/export/import, invalid import, storage warnings, keyboard navigation and the six-link nav at desktop/tablet/320 CSS pixels.
