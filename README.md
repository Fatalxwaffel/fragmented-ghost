# Fragmented Ghost — App Hub

Static site for [fragmentedghost.com](https://fragmentedghost.com): experimental audio tools, simulations, visual worlds, and Android releases.

## Local

Open `index.html` in a browser, or:

```bash
npx --yes serve .
```

## Deploy

Import this repo in Vercel (or Cloudflare Pages / GitHub Pages) and set the production domain to `fragmentedghost.com`.

## Notes

- App catalog and social links live in the `SITE_CONFIG` / `APPS` blocks inside `index.html` (keep `SOURCE.html` in sync).
- GhostPhase web preview: `apps/ghostphase/`
- Preview APK: `downloads/ghostphase-3d.apk`
- Card / hero art: `assets/`
- No paid subscriptions on this site.

## Sections

- `#apps` — catalog
- `#store` — Downloads (APKs)
- `#roadmap` — upcoming work
- `#about` — studio notes
