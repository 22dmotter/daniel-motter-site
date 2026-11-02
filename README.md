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
- **Email signup**: set the form's `action` to your provider's endpoint (Kit, MailerLite, Formspree). While it's `#`, submitting just shows a thank-you message.
- **Colors/fonts**: edit the CSS variables in `:root` (`--accent` is the red highlight).

## Deploy (free)
Drag the folder onto Netlify Drop, or push to GitHub Pages / Cloudflare Pages.

## New pages
- **about.html**: who Daniel is, placeholder payoff stats, faith section (Proverbs 22:7, Romans 13:8), what he offers (channel, free tracker, upcoming PDF guide, coaching, affiliate tools like Dollarwise), and a call-to-action to the Channel page.
- **channel.html**: subscribe buttons, featured video slots, and what viewers will find.
- All three pages share the same nav (Home, About, Channel) and footer.

## YouTube link
The placeholder channel URL is `https://youtube.com/@DanielMotter`. To swap in the real one, find and replace that string across `index.html`, `about.html`, and `channel.html`, e.g.:
`sed -i 's#https://youtube.com/@DanielMotter#https://youtube.com/@YOURHANDLE#g' *.html`
