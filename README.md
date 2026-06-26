# Flinn Built Inc. — Website (rebuilt from Wix)

This folder is a self-contained rebuild of `https://tflinn.wixsite.com/flinn-built-inc`,
ready to self-host on GitHub Pages.

## What's here

| File                  | Purpose                                   |
|-----------------------|-------------------------------------------|
| `index.html`          | Home page                                 |
| `step-1.html`         | "Step 1" process page                     |
| `design.html`         | Design page                               |
| `gallery.html`        | Project gallery (with click-to-enlarge)   |
| `contact.html`        | Contact page / form                       |
| `style.css`           | Shared stylesheet for all pages           |
| `localize_images.py`  | One-time script to download all images locally |
| `sitemap.xml`         | Lists all pages for search engines        |
| `robots.txt`          | Tells search engines what to crawl + where the sitemap is |
| `CNAME`               | Tells GitHub Pages to serve the site at `www.flinnbuilt.com` |
| `README.md`           | This file                                 |

All text content (services, About copy, Step 1 process, Design page copy,
gallery project names, contact info) was copied from the live Wix site.

## Step 1 — Make it self-contained (download the images)

Right now the HTML pages link directly to images hosted on Wix's CDN
(`static.wixstatic.com`) — so the site already looks right if you open
`index.html` in a browser. But for true self-hosting you don't want to
depend on Wix's servers long-term.

Run the helper script once, from inside this folder:

```bash
python3 localize_images.py
```

It will:
1. Create an `images/` folder
2. Download all 19 images used across the site (logo, hero background, About
   photos, and all gallery project photos)
3. Rewrite every `.html` file to point at the local `images/...` copies instead

No extra packages needed — it only uses Python's standard library. After it
runs, this folder has zero dependency on Wix.

## Step 2 — Preview locally

Just open `index.html` in your browser, or run a tiny local server:

```bash
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Step 3 — Push to GitHub Pages

1. Create a new repo on GitHub (e.g. `flinn-built-site`)
2. From inside this folder:
   ```bash
   git init
   git add .
   git commit -m "Rebuilt Flinn Built site from Wix export"
   git branch -M main
   git remote add origin https://github.com/<your-username>/flinn-built-site.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source → Deploy from branch → `main` / `(root)`**
4. Your site will first be live at `https://<your-username>.github.io/flinn-built-site/`

## Step 4 — Point www.flinnbuilt.com at your site

This folder already includes a `CNAME` file containing `www.flinnbuilt.com`,
and every page/sitemap/robots.txt is written to that domain — so once DNS is
set up, GitHub will serve the site at your real domain instead of the
`github.io` address. Two things need to happen:

**A. Add the domain in GitHub**
1. Go to your repo's **Settings → Pages**
2. Under "Custom domain," enter `www.flinnbuilt.com` and save
   (GitHub will commit the `CNAME` file for you if it isn't already there —
   since this folder already has one, it'll just confirm it)
3. Once DNS below is verified, tick **Enforce HTTPS** so visitors always get
   the secure `https://` version

**B. Add DNS records at your domain registrar** (wherever you bought
`flinnbuilt.com` — GoDaddy, Namecheap, Google Domains, etc. — look for "DNS
settings" or "DNS management"):

| Type  | Host / Name      | Value / Points to              |
|-------|------------------|--------------------------------|
| CNAME | `www`            | `<your-username>.github.io`    |
| A     | `@` (or blank)   | `185.199.108.153`              |
| A     | `@` (or blank)   | `185.199.109.153`              |
| A     | `@` (or blank)   | `185.199.110.153`              |
| A     | `@` (or blank)   | `185.199.111.153`              |

- The **CNAME** record makes `www.flinnbuilt.com` point at your GitHub Pages
  site — this is the one that matters most since the site is configured for
  `www`.
- The four **A** records point the bare `flinnbuilt.com` (no `www`) at
  GitHub's servers too, so visitors who type the address without `www` still
  land on the site (GitHub will redirect them to the `www` version
  automatically).
- DNS changes can take anywhere from a few minutes to ~24-48 hours to fully
  propagate. You can check status any time in **Settings → Pages** — GitHub
  will show a green checkmark once it verifies the domain and can issue an
  HTTPS certificate for it.

## SEO — already wired up for the new domain

Every page now includes a descriptive title, meta description, canonical URL,
Open Graph / Twitter preview tags, and `GeneralContractor` structured data
(schema.org JSON-LD) — all pointing at `https://www.flinnbuilt.com`, so once
your DNS is live, search engines and social previews will pick up the right
info immediately. `sitemap.xml` and `robots.txt` are included and reference
that same domain. After the site is live, consider submitting the sitemap URL
(`https://www.flinnbuilt.com/sitemap.xml`) to
[Google Search Console](https://search.google.com/search-console) to speed up
indexing.

## Notes / things you may want to adjust

- **Contact form**: Wix's contact form posted to Wix's own backend, which
  won't exist once self-hosted. `contact.html` now forwards submissions to
  **tim.e.flinn@gmail.com** via a `mailto:` link built by JavaScript — when a
  visitor clicks Submit, their email app opens pre-addressed and pre-filled
  with their info, ready to send. This needs no backend, no sign-ups, and
  works immediately on GitHub Pages.
  If you'd rather submissions land directly in your inbox without the
  visitor needing to hit "send" themselves, sign up for a free service like
  [Formspree](https://formspree.io) or
  [Netlify Forms](https://docs.netlify.com/forms/setup/) using
  tim.e.flinn@gmail.com as the recipient, then swap the form's behavior to
  POST to that service instead.
- **Footer copyright year** says "©2035" — that's what's on the live Wix
  site (likely a typo Wix never caught). Update it in each page's `<footer>`
  if you'd like it corrected.
- **"Get a Free Consultation" / "Start Your Project" buttons** link to the
  contact page — feel free to adjust copy/links as you see fit.
- All 19 source image URLs (for reference / re-downloading) are listed at
  the top of `localize_images.py`.
