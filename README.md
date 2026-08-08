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

## Hero graphic

The hero uses `assets/texas-hero-transparent.webp` — a Texas map marking The Colony,
generated in Claude Design (`texas-hero-graphic.html`, D3 + us-atlas counties) and
rendered at 1040px for a ~496px display box.

Because the artwork is square and its "The Colony" callout runs to the right edge,
`.hero-media` is `aspect-ratio: 1` and the image uses `object-fit: contain` — a
non-square frame would clip the label.

The design project exports this artwork two ways. The **transparent** variant is the
one in use: the map sits directly on the hero ink, so the 1px frame and its 14px mat
are the only container. The dark-background variant carries its own vignette and dot
grid, which at ~496px reads as a second rectangle inside the frame rather than as
texture.

Anything under `/assets/` is served `immutable, max-age=31536000`. Changing an image
means changing its filename, not overwriting it, or cached clients keep the old one.

The owner headshot is now used only in the About section.

## Editing notes

- Colors, fonts, and spacing are CSS custom properties at the top of `styles.css`.
- Type scales with `clamp()`; breakpoints are at 1180 / 1080 / 1024 / 900 / 720 / 560px.
  The nav drops at 1080 rather than the prototype's 900 — with the phone number and
  the Get-a-Quote button in the same bar, it runs out of room before 900.
- The phone number appears in six places (header, hero card, About, quote, footer,
  and JSON-LD) — grep for `9726240239` before changing it.
- The production hostname is hard-coded in `index.html` (canonical, `og:url`,
  `og:image`, JSON-LD `url`/`image`), `robots.txt`, and `sitemap.xml`. Moving to a
  custom domain means updating all three files — grep for `blacksmith-insurance-site`.

## URLs and deployment protection

Production (public, indexable):
**https://blacksmith-insurance-site.vercel.app**

The project has Vercel Authentication enabled at `all_except_custom_domains`. In
practice that gates the per-deployment URLs — the
`blacksmith-insurance-site-<hash>-…vercel.app` links shown in build output return
a 302 to Vercel SSO and carry `x-robots-tag: noindex`. The production alias above
is unaffected: it serves publicly with no auth and no noindex header.

So: share the production alias, not a build-output link. If you need to hand
someone a specific preview deployment, either add them to the Vercel team or turn
off Deployment Protection under Project → Settings.
