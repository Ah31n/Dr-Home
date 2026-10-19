# Dr Home — Shopify Go-Live Guide (merchant steps)

The repository contains an uninstalled theme package. Nothing has been published to the store. To review and launch:

## 1. Package the theme

```bash
cd theme
zip -r ../dr-home-theme.zip . -x '.*'
```

(A prebuilt package is not stored in Git — `dist/` is ignored — so run this to produce `dist/dr-home-theme.zip`.)

## 2. Upload as an unpublished theme

Shopify Admin → **Online Store → Themes → Add theme → Upload zip file**. Review it with *"Preview"* — this does not affect customers.

## 3. Configure (Theme editor)

- **Colors / Typography / Logo** — replace the reversible defaults with approved brand assets.
- **Hero stage** — pick the featured product (defaults show the design; pick the real one).
- **Featured collection** — attach a real collection (e.g. create "Featured appliances" containing the two products).
- **Footer menus** — point the two menu blocks at real menus. When policy pages (shipping, refunds, privacy, terms) are published in **Settings → Policies**, add them to the footer menu — the theme renders whatever pages exist and invents none.
- **Announcement bar** — optional text/link.

## 4. Product data (Shopify Admin)

- Replace the `My Store` vendor value with the real brand when known (the theme intentionally does not display vendor by default).
- Complete the SEO description and product specifications for both products (the current SEO description says details need confirmation).
- Upload real product photography per product. Optional: upload a verified 3D model (GLB/USDZ) via "Add media" — the product page automatically offers a 3D view tab only for products that have one.
- Set real pricing/compare-at pricing; the theme derives all sale/stock states from it.

## 5. Commerce settings

- **Settings → Payments** — configure the payment provider (checkout is Shopify's own).
- **Settings → Shipping and delivery** — real rates; nothing is promised in the theme.
- **Markets/currency** — set the target market; the theme renders store money formats only.

## 6. Publish

Themes → **Publish** on the Dr Home theme. Test an order with a real payment method / Bogus Gateway in a test market first if desired.

## Notes

- Password page: if the store is password-protected, the theme's `templates/password.json` renders a branded gate automatically.
- The `preview/` folder is a local-only design harness. It is **not** part of the theme package and is never deployed.
