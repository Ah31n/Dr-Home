# Dr Home — Shopify storefront (OS 2.0 theme)

A premium, 3D-led Shopify Online Store 2.0 theme for **Dr Home / DR. HOME**, built greenfield on a conservative native-theme stack so every commerce path (catalog → variants → price/availability → cart → Shopify checkout) is real and Shopify-powered.

> ⚠️ **Nothing is published yet.** This repo contains an installable theme package + a local design preview. See `docs/SHOPIFY_GO_LIVE.md` for merchant steps, and `docs/STACK_DECISION.md` for why a native theme was chosen.

## What's inside

| Path | Purpose |
| --- | --- |
| `theme/` | The Shopify theme (installable package). Production rendering is Shopify's own Liquid engine with the store's real catalog, prices, stock, cart, and checkout. |
| `preview/` | Local design-preview harness (demo data, clearly labeled). `node preview/server.js` → http://localhost:8923 |
| `docs/` | Stack decision, motion playbook, go-live guide, verification report, original brief/skillpack. |

## Design direction

"Warm porcelain showroom": porcelain background, ink typography (Playfair Display / Assistant by default, merchant-swappable), a single copper accent, layered CSS stage lighting around **real product photography**, and restrained single-owner motion. No framework, no animation library, ~34 KB of first-party CSS + ~15 KB of first-party JS.

**3D story without fake 3D:** the theme never presents a generated model as a real SKU. Product pages detect genuine Shopify 3D media and only then offer an intent-gated "3D view" (vendored `<model-viewer>` 4.4.0, GLB/USDZ from the merchant, keyboard/touch operable, photo fallback). The signature depth look is CSS composition over real photos, so the store is premium even before any model exists.

## Integrity rules baked into the code

- All product facts, prices, availability, cart state, and checkout come from Shopify at runtime — nothing simulated in the theme.
- No invented specifications, shipping/returns promises, certifications, warranties, medical/efficacy claims, or endorsements anywhere in copy.
- Policy/legal links render only from the store's own published policies.
- The generic `My Store` vendor value is not displayed unless the merchant opts in after fixing it.
- Demo data exists only inside `preview/` and is labeled in-page.

## Quick start

```bash
# design preview (demo data)
node preview/server.js

# theme package for Shopify Admin upload
cd theme && zip -r ../dr-home-theme.zip . -x '.*'
```

## Docs

- `docs/STACK_DECISION.md` — architecture decision + assumptions
- `docs/DR_HOME_STOREFRONT_STACK.md` — stack/motion/3D approach
- `docs/MOTION_PLAYBOOK.md` — engine ownership + reduced-motion gates
- `docs/SHOPIFY_GO_LIVE.md` — merchant configuration & publish steps
- `docs/VERIFICATION.md` — checklist results (PASS / BLOCKED / NOT TESTED)
