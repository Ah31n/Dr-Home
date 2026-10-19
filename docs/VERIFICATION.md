# Dr Home — Verification Report

**Date:** 2026-10-19 · **Scope:** theme code in `theme/`, preview harness in `preview/` · **Branch:** `arena/aa471442-dr-home`

Legend: PASS / FAIL / BLOCKED / NOT TESTED

## dr-home-3d-commerce checklist

- [x] **PASS** — Premium feel via composition/hierarchy, not effects: layered CSS stage, restrained motion, strong type scale. No site-wide 3D gimmicks.
- [x] **PASS** — No modeled feature is claimed as fact: the theme renders 3D only for merchant-uploaded media and renders *no* model otherwise. Preview stand-in images are labeled demo assets and exist only in `preview/`.
- [x] **PASS (code level)** — Price/variant/availability/cart/checkout come from Shopify objects (`product.selected_or_first_available_variant`, `cart`, `/cart/*.js`, Shopify checkout POST). No simulated commerce in the theme.
- [x] **PASS** — Useful before 3D loads / without 3D: buy box and gallery render server-side; viewer loads only on user intent.
- [x] **PASS (implemented, NOT TESTED on real devices)** — Reduced motion (CSS clamp + JS), keyboard controls (native elements, focus-visible, variant radios, drawer focus trap via `<dialog>`), aria labels/live regions, `touch-action: pan-y` on the viewer, 48px targets.
- [x] **NOT TESTED on hardware** — Mobile/network/bundle impact measured: no representative device or lab measurement was possible in this environment. First-party bundle is small (≈34 KB CSS + ≈15 KB JS + 1.07 MB vendored model-viewer that loads *only* when a product actually has 3D media).
- [x] **PASS** — One engine per animated property; scene/viewer resources are created lazily and removed on error; listeners passive where possible; observer unobserves after reveal.
- [x] **PASS** — Asset provenance documented: the only generated assets are two demo stand-in images in `preview/public/demo-assets`, labeled in-page and excluded from the theme package.

## Storefront core

- [x] **PASS (local render of all 17 templates + section API)** — home, product ×2 (default + option variant), collection, search, cart, page, blog/article, 404, password, all customer templates.
- [x] **PASS (local)** — cart add/update/remove via mocked `/cart/*.js` mirroring Shopify's Ajax API; drawer refresh via Section Rendering API.
- [ ] **BLOCKED (environment)** — Live verification against the real store: the Shopify connector is `unsupported` in this Arena session, so theme upload, real checkout, taxes/shipping, and published policies could not be exercised. Checkout is deliberately not simulated anywhere.
- [x] **PASS** — No storefront files on Shopify were changed; no store/catalog records created or duplicated.

## Accessibility & responsiveness

- [x] **PASS (static review)** — Landmarks/skip link, labelled icon buttons, `aria-pressed` toggles, `aria-selected` thumbs, `aria-live` cart announcements, pluralized strings, visible focus, zoom-safe rem/clamp type, single-column mobile layouts, native `<details>` menu and accordions without JS.
- [x] **NOT TESTED** — Screen reader passes (no SR in environment).

## Known limitations

1. Live store verification pending (see BLOCKED above) — do `docs/SHOPIFY_GO_LIVE.md` steps on the real store.
2. Policy/shipping/return content intentionally absent until the merchant publishes real policies.
3. Vendor hidden until the `My Store` placeholder is replaced.
4. Product 3D tab appears only after the merchant uploads verified 3D media.
