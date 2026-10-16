# BlackSmith Agency — website

One-page marketing site for BlackSmith Agency, an Allstate insurance agency in
The Colony, Texas. Static HTML/CSS, no build step, deployed on Vercel.

The agency is captive to Allstate, so the copy must not claim to shop or compare
carriers. An earlier draft (from the design prototype) was written for an
independent agency and sold exactly that — "multiple carriers", "we shop the
market", "we aren't tied to one company". Those claims were rewritten; keep them
out. Allstate's own brand and advertising rules govern how the name and any logo
may be used, and this site currently uses the name in text only, with no Allstate
logo or trademark asset.

Design source: [Blacksmith Insurance Demo Site](https://claude.ai/design/p/5326169f-8b33-41a5-ab46-818ac5599721?file=BlackSmith+Agency.dc.html) (Claude Design).

## Layout

```
index.html      the whole page
styles.css      all styles (design tokens in :root)
api/quote.js    Vercel function: quote form → AgencyZoom lead
scripts/        agencyzoom-ids.js — one-time id lookup for the env vars
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

## Quote form → AgencyZoom

The quote form posts to `/api/quote`, a Vercel serverless function
(`api/quote.js`, zero dependencies) that creates a lead in AgencyZoom via
their official API (`POST /v1/api/leads/create`; spec at
`https://app.agencyzoom.com/openapi/agencyzoom.yaml`). Credentials live in
Vercel environment variables, never in the browser. A honeypot field
(`website`) silently drops bot submissions; real failures show the office
phone number instead of a fake success.

Until the env vars below are set, the function returns "The form is not
configured yet" and the visitor is pointed at the phone number — the site
never pretends to send.

### Setup (one time)

1. **Credentials.** The API logs in like a user (`/v1/api/auth/login`) and the
   lead is created with that user's permissions. Use the agency owner's
   AgencyZoom login — or better, a dedicated "API/Website" user so the
   password can be rotated without touching the owner's. There is no scoped
   API token for this; the Zapier key/secret pair in-app is for Zapier only.

2. **Look up ids.** The create-lead call needs a pipeline, stage, lead source,
   and producer. List yours (read-only):

   ```bash
   AGENCYZOOM_USERNAME=owner@agency.com AGENCYZOOM_PASSWORD='…' node scripts/agencyzoom-ids.js
   ```

   Tip: create a "Website" lead source in AgencyZoom first (Settings → Lead
   Sources) so form leads are traceable in reports.

3. **Set env vars** in Vercel → Project → Settings → Environment Variables
   (Production, and Preview if previews should create real leads):

   | Variable | Value |
   | --- | --- |
   | `AGENCYZOOM_USERNAME` | login email from step 1 |
   | `AGENCYZOOM_PASSWORD` | its password |
   | `AGENCYZOOM_PIPELINE_ID` | from step 2 |
   | `AGENCYZOOM_STAGE_ID` | from step 2 (stage inside that pipeline) |
   | `AGENCYZOOM_LEAD_SOURCE_ID` | from step 2 |
   | `AGENCYZOOM_ASSIGN_TO` | employee id of the producer |
   | `AGENCYZOOM_TAGS` | optional, e.g. `website;quote-form` |
   | `AGENCYZOOM_COUNTRY` | optional, defaults to `USA` |

4. **Redeploy**, submit the form on the live site, and confirm the lead lands
   in AgencyZoom with the right pipeline/stage/source/assignee.

What gets sent: name (split into first/last), email, phone, and a note with
the selected coverage line and the free-text details. AgencyZoom's API is
rate-limited (120 calls/min as of Aug 2026); the function caches its login
token across warm invocations to stay well under it.

## Known gaps

One thing needs a decision before this is a finished production site:

1. **The "Why BlackSmith" section uses a card, not a photo.** The design left an
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
