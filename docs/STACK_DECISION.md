# Dr Home — Stack Decision Record

**Date:** 2026-10-19 · **Branch:** `arena/aa471442-dr-home` · **Status:** Decided (reversible)

## Inputs inspected

| Input | State in this session |
| --- | --- |
| Repository | Fresh clone, empty baseline (README only) — confirmed greenfield |
| Shopify connector in Arena | `unsupported` for this conversation — no Admin API or Storefront API access from this session |
| Catalog evidence | From the project brief's verified 2026-10-19 read-only inspection: two active products — *Rechargeable USB Juicer* (type `Juicers`) and *Professional Travel Iron Box* (type `Garment Care`). Vendor field is the generic `My Store`. Prices, variants, media, and descriptions were **not** visible to this session. |

## Decision: native Shopify Online Store 2.0 theme

Per `skills/ui-stack` (as summarized in the project brief): *"Unless headless is requested or a verified requirement justifies it, use a native Shopify theme as the conservative default."*

- Headless is **not requested** and is **not justified** by any verified constraint: there is no Storefront API token in this session, no approved hosting/deployment target, and no requirement that rules out Liquid.
- A native theme guarantees the core commerce journey is **real**: product data, variants, live price/availability, cart, and checkout are Shopify's own once the theme is applied to the existing store. Nothing about commerce can be silently faked by this codebase.
- Zero additional running infrastructure or per-store credentials in the repo.

**Consequence:** the storefront cannot be fully rendered inside this sandbox (Liquid renders on Shopify). To make the design reviewable here, `preview/` contains a local design-preview harness that renders the *actual theme templates* through a Liquid engine with clearly-labelled demo data. It is a development aid, not a store.

## Reversible assumptions (documented, not blocking)

1. **3D assets:** No verified GLB/USDZ models exist for the two SKUs. The theme therefore never fabricates one. It renders `<model-viewer>` **only** for media the merchant uploads to the product in Shopify Admin (Shopify's native 3D media), with an automatic fallback to product photos otherwise. A "3D-led" stage (layered depth, stage lighting, restrained tilt) is built in CSS around the **real** product media.
2. **Brand system:** No approved palette/type/logo provided. A small, reversible art direction ("warm porcelain showroom, ink type, copper accent, display serif") is proposed, entirely driven by theme settings the merchant can change.
3. **Currency/markets:** Nothing is hardcoded; all money renders through Shopify's `money` filters and store settings. The preview harness shows a clearly-labelled demo currency.
4. **Copy:** No product specifications, shipping/returns promises, certifications, warranties, health/medical claims, or endorsements are invented anywhere. Policy links resolve only to pages configured in the merchant's store.
5. **Vendor field:** The literal `My Store` vendor value is deliberately not surfaced in templates (it is not a confirmed manufacturer).

## What this repository deliberately does NOT do

- It does not publish, install, or activate anything on the Shopify store.
- It does not create stores, products, or duplicate catalog records.
- It does not contain real prices/stock — those flow from the store at runtime.
