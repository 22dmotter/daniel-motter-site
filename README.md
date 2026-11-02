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
Drag the folder onto Netlify Drop, or push to GitHub Pages / Cloudflare Pages.

## New pages
- **about.html**: who Daniel is, placeholder payoff stats, faith section (Romans 13:8), what he offers (channel, upcoming PDF guide, coaching, affiliate tools like Dollarwise), and a call-to-action to the Channel page.
- **channel.html**: subscribe buttons, featured video slots, and what viewers will find.
- All three pages share the same nav (Home, About, Channel) and footer.

## YouTube link
The channel URL is `https://www.youtube.com/@danielmotter62`. To swap in the real one, find and replace that string across `index.html`, `about.html`, and `channel.html`, e.g.:
`sed -i 's#https://www.youtube.com/@danielmotter62#https://youtube.com/@YOURHANDLE#g' *.html`

## Debt numbers and month counter
At the bottom of `index.html` and `about.html`, edit `DEBT_START` and `PAID` to update the totals; the progress bar and "left to go" calculate automatically. "Months in" counts up automatically on the 3rd of each month, starting at 1 on Nov 3, 2026.

## SEO
Each page has a keyword-focused title and description, a canonical URL, Open Graph/Twitter tags for link previews, and schema.org structured data. `robots.txt` and `sitemap.xml` are included. All URLs use `https://danielmottersite.netlify.app`; if you add a custom domain, find-and-replace that address across the HTML, `robots.txt`, and `sitemap.xml`.
