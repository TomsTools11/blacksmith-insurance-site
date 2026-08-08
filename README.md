# BlackSmith Agency — website

One-page marketing site for BlackSmith Agency, an independent insurance agency in
The Colony, Texas. Static HTML/CSS, no build step, deployed on Vercel.

Design source: [Blacksmith Insurance Demo Site](https://claude.ai/design/p/5326169f-8b33-41a5-ab46-818ac5599721?file=BlackSmith+Agency.dc.html) (Claude Design).

## Layout

```
index.html      the whole page
styles.css      all styles (design tokens in :root)
vercel.json     cache + security headers
robots.txt      / sitemap.xml
assets/         optimized art (logos, headshot, favicon, OG image)
```

## Local preview

No dependencies and no build. Open `index.html`, or serve it:

```bash
python3 -m http.server 8000
```

## Deploying

Vercel serves this repo as-is from the root — there is no framework and no build
command. Pushes to `main` publish to production; other branches get preview URLs.

The prototype exported from Claude Design (`.dc.html`) is **not** deployable on
its own: it renders through a client-side runtime that expects React to be
injected by the design host. This repo is the compiled, self-contained version —
same visual output, no runtime.

## Known gaps

Two things need a decision before this is a finished production site:

1. **The quote form has no backend.** The markup is complete and wire-up-ready
   (named fields, `required`, `autocomplete`). Submitting currently shows a
   notice pointing the visitor at the phone number rather than pretending to
   send. To connect it: add `action="…" method="post"` to `#quote-form` and
   delete the interceptor `<script>` at the bottom of `index.html`.

2. **The "Why BlackSmith" section uses a card, not a photo.** The design left an
   empty image slot there (captioned "DFW business owner, shop, or truck yard").
   Until a photo exists, that column is a bone-colored contact card. To swap in
   a real photo, replace the `<aside class="why-card">…</aside>` block with:

   ```html
   <aside class="why-media"><img src="/assets/why.jpg" alt="…"></aside>
   ```

   The `.why-media` styles are already in `styles.css`.

The owner headshot appears twice — hero and About — at different crops, because
no separate hero photo was supplied.

## Editing notes

- Colors, fonts, and spacing are CSS custom properties at the top of `styles.css`.
- Type scales with `clamp()`; breakpoints are at 1180 / 1024 / 900 / 720 / 560px.
- The phone number appears in six places (header, hero card, About, quote, footer,
  and JSON-LD) — grep for `9726240239` before changing it.
