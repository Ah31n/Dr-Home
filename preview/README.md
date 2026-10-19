# Dr Home — local design preview (demo data)

`node server.js` → http://localhost:8923

This harness renders the **real theme files** in `../theme` with a small Liquid engine so the design can be reviewed locally before the theme is uploaded to Shopify.

**Sample data (clearly labeled in-page):** product images are AI-generated stand-ins, prices/currency are invented, the travel iron's color options and the sold-out variant are demo-only, and product descriptions are placeholders.

**Real:** every template/section/snippet/style/script under `../theme`; the cart add/update/remove flows against an in-memory cart; accessibility and reduced-motion behavior.

**Deliberately absent:** checkout (production checkout is Shopify's own — the button leads to a boundary page), inventory, payments, shipping, policies.

This folder is a development aid only — it is not part of the theme package and is never deployed with it. The production theme renders whatever the connected Shopify store returns.
