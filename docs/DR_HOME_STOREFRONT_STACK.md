# Dr Home Storefront Stack

**Decided:** 2026-10-19 · **Status:** Implemented on branch `arena/aa471442-dr-home`

## Choice

**Native Shopify Online Store 2.0 theme** (JSON templates, sections everywhere, app-extendable blocks). No headless frontend, no React, no framework runtime.

### Why (inspection notes)

| Considered | Outcome |
| --- | --- |
| Shopify-native theme | ✅ Chosen. The commerce journey (catalog, variants, live price/availability, cart, checkout) is guaranteed real — it is Shopify's own. No extra hosting, no Storefront API credentials, no duplicated catalog data. The brief's conservative default unless headless is requested or justified. |
| Headless (Storefront API + custom frontend) | ❌ Not requested; no Storefront API token exists in this session; no verified constraint requires it. Would add hosting, credentials, and risk of duplicated cart logic for zero verified benefit today. |

The Shopify connector was reported `unsupported` for this Arena conversation, so no Admin/Storefront API calls were possible from the build session. The theme is written against standard Liquid/OS 2.0 APIs and renders whatever the connected store returns at runtime.

## Motion stack

- **CSS** owns all hover/focus/reveal/float transitions (`base.css`). Zero animation libraries.
- **IntersectionObserver** (one instance, `theme.js`) only toggles the `is-revealed` class; CSS animates.
- **Pointer tilt** on the hero stage: `requestAnimationFrame`-throttled CSS custom properties, precise pointers only.
- **`<model-viewer>`** (vendored, lazy) owns the 3D scene when a real model exists — its own element, camera controls, and internal loop; never page scroll.
- One engine per property/scroll surface. `prefers-reduced-motion` disables every decorative behavior in CSS and JS.

## 3D commerce approach

The theme never fabricates a product model. Product pages detect Shopify 3D media (`media.media_type == 'model'`) and only then offer the "3D view" tab, lazily loading the vendored viewer and the merchant's GLB/USDZ. Without a model, the design still reads as premium through the CSS "stage" composition (layered gradients, arc, floor shadow, controlled float) built around the **real** product photos, with a static-first purchase path.

## Key files

```
theme/
  layout/theme.liquid          design tokens from theme settings; JS globals
  config/settings_schema.json  colors, type, layout, motion, cart, brand
  sections/                    header/announcement/hero/featured/banner/footer +
                               all main-* page sections + cart-drawer (SRA-refreshable)
  snippets/                    card, price, quantity, icons, address fields
  assets/base.css              design system (no frameworks)
  assets/theme.js              cart drawer, quick-add, variants, gallery, reveal, tilt
  assets/product-viewer.js     intent-gated 3D viewer
  assets/model-viewer.min.js   vendored @google/model-viewer 4.4.0 (loaded only when needed)
templates/                     OS 2.0 JSON templates incl. customers/*
preview/                       local design-preview harness (demo data, not shipped with the theme)
```
