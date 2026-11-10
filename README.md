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

## YouTube Shorts
The Shorts grid on Home and Channel (`#shorts`) is generated from **`youtube-shorts.js`**. Daniel posts on two channels: `@danielmotter62` (channel ID `UCdjRkPxSJKIUjvW5IwaKrvQ`, which hosts the featured Short `ap-y7-83m4E` and long-form video `GZ6XsM35GkQ`) and `@DanielEMotter` (`UCWDgb6-LZA7pFCzMnAUGw0g`). To add a Short, confirm it's public and embeddable (`https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/<id>&format=json` returns 200), copy its exact title, add it to the list (newest first, after the featured Short), then run `node scripts/sync-shorts.js`, `node scripts/stamp-assets.js` and the tests. The featured Short loads as a lazy iframe; the rest are lite thumbnails (`shorts-lite.js`, `shorts.css`) that link to YouTube and swap in the same embed on click. `tests/shorts.test.js` fails if the pages drift from the data.

## YouTube link
The channel URL is `https://www.youtube.com/@DanielEMotter`. To swap in the real one, find and replace that string across `index.html`, `about.html`, and `channel.html`, e.g.:
`sed -i 's#https://www.youtube.com/@DanielEMotter#https://youtube.com/@YOURHANDLE#g' *.html`

## Debt numbers and month counter
Add each recorded contribution to `debt-contributions.js`, then run `node scripts/sync-public-debt.js` and the history tests (see below). Public totals and progress derive from that one ledger. The day counter goes up by one every day, starting at 1 on Nov 3, 2026.

## SEO
Each page (including every blog article) has a keyword-focused title and description, a canonical URL, Open Graph/Twitter tags for link previews, and schema.org structured data. `robots.txt` and `sitemap.xml` are included. All URLs use `https://22dmotter.github.io/daniel-motter-site`; if you add a custom domain, find-and-replace that address across the HTML, `robots.txt`, and `sitemap.xml`.

## Blog (50 SEO articles)
`/blog/` holds 50 static articles answering common debt and personal-finance questions, plus `blog/index.html` with eight categories. **Edit the Markdown sources in `content/blog/*.md`, never the generated HTML.** Each source has front matter (`title`, `h1`, `description` ≤155 characters, `category`, `related` slugs, `answer` for the opening short answer) and a body using `##`/`###` headings, `- ` and `1. ` lists, `|` tables, `> ` callouts, `@journey` (Daniel's live payoff box), and `@faq` followed by `Q:`/`A:` lines. Inline `{start}`, `{paid}` and `{left}` render ledger figures from `debt-contributions.js`.

Rebuild in this order after editing an article, the ledger, or any CSS/JS:
1. `node scripts/build-blog.js` regenerates every post (Article, FAQPage and BreadcrumbList JSON-LD, canonical, Open Graph tags, breadcrumbs, related links, CTAs, disclaimer), the blog index, and `sitemap.xml` (with `lastmod` from git).
2. `node scripts/sync-public-debt.js` (also refreshes blog journey figures).
3. `node scripts/stamp-assets.js` (also stamps `../` asset references in `blog/*.html`).

`tests/blog.test.js` checks that 50 posts exist; titles, descriptions, canonicals and H1s are unique; JSON-LD is valid and mirrors the visible FAQ; every article has at least 1,000 words; no paragraph is duplicated across articles; there are no broken internal links or fragments anywhere on the site; the sitemap lists every page; journey figures match the ledger; Romans 13:8 is the only verse cited; and the committed HTML matches a fresh build. Example figures in the articles were computed, not estimated; recompute them if you change an example.

**Search Console:** github.io project sites can't be domain properties. Add a URL-prefix property for `https://22dmotter.github.io/daniel-motter-site/`, verify it with the HTML meta tag Google provides (add it to the `<head>` of `index.html`), then submit `sitemap.xml`. Crawlers only read `robots.txt` at the host root, so the `Sitemap:` line in this subpath's `robots.txt` isn't discovered automatically.

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
`daily-contributions.html` is Daniel's self-reported payoff history, linked from the full green paid stat card on Home and About. These are recorded contribution dates, not verified bank settlement dates, and missing dates are not zero-payment entries. The initial $2.68 is confirmed for Nov 3, 2026 (Day 1); the six dated updates through Nov 8, 2026 total $899.88. This public ledger is entirely separate from visitors' private local Debt Trackers.

For a new payment update, add a dated positive whole-cent contribution **with its `account` id** to **`debt-contributions.js`**, the one authoritative source for Daniel's starting amount, per-debt starting balances, journey start and contributions. Example: `Object.freeze({ date: '2026-11-09', amountCents: 2500, account: 'car-loan' })`. Multiple entries on the same date are grouped and chronological totals are derived automatically. Never add guessed dates or zero-value days. Run **`node scripts/sync-public-debt.js`** to refresh the Home/About/history HTML fallbacks, then **`node tests/debt-contributions.test.js`** and the existing regression tests before committing. The history test rejects stale fallbacks, so a ledger update cannot silently publish mismatched public totals. `public-debt-ui.js` derives all three live summaries from this same source without fetching an API or touching visitor storage. `public-debt.css` provides the linked-card focus styles and responsive history cards.

History checks: `node tests/debt-contributions.test.js`; optional simulated DOM checks using the same temporary jsdom installation: `NODE_PATH=/tmp/dm-tracker-test/node_modules node tests/debt-contributions-dom.test.js`.


## Daniel's public debt breakdown
`debt-breakdown.html` (linked from the remaining-balance cards on Home, About and daily contributions) shows each debt with its starting balance, paid amount (green), remaining balance (red), an accessible progress bar (`role="progressbar"` labelled by the debt name, with `aria-valuetext` such as "$898.88 of $3,619.57 paid, $2,720.69 remaining (24.8%)") and its own dated contribution tracker. Every tracker is a native `<details>` disclosure, closed by default, for example "Credit Card 2 contribution tracker (5 payments)" or "Car loan contribution tracker (0 payments)".

**One source of truth.** `debt-contributions.js` defines the four accounts once, each with an id and starting balance:

| id | Debt | Starting balance |
|---|---|---|
| `car-loan` | Car loan | $15,209.13 |
| `credit-card-1` | Credit Card 1 | $612.41 |
| `student-loans` | Student loans (combined) | $29,672.33 |
| `credit-card-2` | Credit Card 2 | $3,619.57 |

These add up to the overall starting debt of $49,113.44, and validation rejects the ledger if they don't. Every contribution names the account it paid. Credit Card 2 received $895.81: the Nov 3–5, 2026 contributions plus $373.13 of Nov 6. Credit Card 1 received $24.07: the other $2.07 of Nov 6, the Nov 7 and Nov 8 $1.00 payments, and the Nov 9 $20.00 payment. A day paid across two debts is recorded as two entries with the same date; the daily contributions page still shows one day total (Nov 6: $375.20) with a "Split:" note listing the parts. Each debt's remaining balance is its starting balance minus its tagged contributions, so the four debts always add up to the overall remaining total ($48,193.56 as of Nov 9, 2026). No balances are typed into `debt-breakdown.js`. That file only holds display details per account id: the itemized date and the student-loan subloans. Validation rejects:
- a contribution with no account or an unknown account
- a debt paid beyond its starting balance
- duplicate or malformed ids
- breakdown details for an unknown or missing account

**Maintenance steps**
1. Add the contribution to `debt-contributions.js` with `date`, `amountCents` and `account`. Never guess the account. If Daniel hasn't said which debt was paid, ask before publishing.
2. Run `node scripts/sync-public-debt.js` to regenerate the no-JS fallbacks: Home/About/history totals and every breakdown card's bar, amounts and tracker. The sync script refuses to run, leaving the pages untouched, if the ledger doesn't validate.
3. Run `node scripts/stamp-assets.js` (see Cache-busting below), then run all tests before committing. The tests fail if the HTML fallbacks are stale, if an entry is untagged, or if per-debt totals don't reconcile with the overall totals.
4. To add a new debt: add an account (id, label, starting balance) and increase `startingCents` by the same amount, then add a matching entry in `debt-breakdown.js` `details`.

The six student-loan subloans in `details['student-loans'].included` are their starting balances. They must add up exactly to the account's $29,672.33 starting balance and are never counted again in the total. If student-loan payments are recorded later, the combined card's bar and tracker update. The subloan figures stay labelled as starting balances until Daniel reports updated per-loan amounts. No rates, due dates, account identifiers or original screenshot are published.

The mismatch guard still exists. If the itemized figures ever exceed the overall remaining total, the page (including the no-JS fallback) shows an "Update needed" warning and omits any unitemized amount instead of showing a negative or made-up account.

Breakdown checks: `node tests/debt-breakdown.test.js` and `NODE_PATH=/tmp/dm-tracker-test/node_modules node tests/debt-breakdown-dom.test.js` (same temporary jsdom installation as above). No visitor tracker data, bank account details, payment collection or backend is involved.

## Cache-busting (run after any CSS/JS change)
GitHub Pages serves every file with `Cache-Control: max-age=600`. With unchanged asset URLs, a browser or CDN edge can pair new HTML with CSS/JS cached up to 10 minutes earlier. That happened on Nov 9, 2026: the new footer markup rendered without its new CSS, and stale breakdown JS re-rendered the trackers uncollapsed. Every local stylesheet and script reference therefore carries `?v=<first 10 hex characters of the file's SHA-256>`. After editing any `.css` or `.js` file (including `debt-contributions.js` for a new payment), run `node scripts/stamp-assets.js`. `tests/debt-breakdown.test.js` fails if any stamp is missing or stale.

## Footer
All pages share one footer (`<footer class="site-footer">`, styled in `site-nav.css`). It has a brand block (name plus Romans 13:8), then links in main-nav order followed by Daily Contributions and Debt Breakdown, with the current page marked `aria-current="page"`, then the legal line. Tests check the order and that the footer rules win the CSS cascade on every page.
