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

- App catalog, plans, and social links live in the `SITE_CONFIG` / `APPS` / `PLANS` blocks inside `index.html`.
- Put secure checkout URLs in `purchaseUrl` / `checkoutUrl` — not direct private APK links.
- Optional APK sample: `downloads/ghostphase-3d.apk` (from the packaged WebView build).

## Sections

- `#apps` — catalog
- `#store` — GhostPhase 3D Pro / plans
- `#roadmap` — upcoming work
- `#about` — studio notes
