# Dr Home Shopify Storefront — Project Brief

**Updated:** 2026-10-19. **Status:** Greenfield storefront project; implementation repository will be freshly connected to Arena.ai.

## Product and delivery context

The user is starting a new e-commerce storefront project for **Dr Home / DR. HOME**. They have not built storefront code or a store project for it yet. They plan to connect a fresh GitHub repository to the Arena workspace and build from that baseline. The work is greenfield—not a redesign or migration of an existing Dr Home codebase.

A Shopify integration is available and has returned existing Shopify Admin catalog records. This means the storefront can be built to use the connected Shopify commerce platform and catalog. It does not prove that a published theme, domain, policies, payment configuration, or complete brand system is ready. Do not create a second Shopify store or duplicate catalog records without explicit instruction.

## Verified Shopify catalog observations

A read-only catalog inspection on 2026-10-19 found two active products:

- **Rechargeable USB Juicer** — type `Juicers`; vendor field `My Store`; SEO title `Rechargeable USB Juicer | DR. HOME`. Its SEO description states that product specifications and delivery details need confirmation.
- **Professional Travel Iron Box** — type `Garment Care`; vendor field `My Store`.

See `DR_HOME_STORE_PROFILE.md` for source details and unverified facts. The generic vendor value is not a confirmed manufacturer or supplier. The DR. HOME name does not support medical, doctor endorsement, or product efficacy claims.

## Desired outcome

Create a complete, trustworthy, responsive Dr Home Shopify e-commerce storefront in a fresh code repository, using the connected Shopify store/catalog for real product and commerce data. The requested visual bar is **premium and 3D-led**, with the polish and spatial storytelling of a prior project while retaining a distinct Dr Home identity. Use the original skillpack's conditional UI-stack method and motion-stack standards, plus the Dr Home 3D-commerce skill. No framework, theme architecture, CSS system, motion library, palette, typography, or deployment target has been approved yet; choose only after the actual requirements and Shopify integration path are inspected.

## Core commerce journey

The storefront should make it straightforward to discover products, understand verified details, choose a valid variant when available, see live price and availability, add/update/remove items from the cart, and continue through Shopify's supported checkout. Use premium 3D product storytelling as a visual signature—such as a product stage or interactive viewer when accurate assets make that possible—without hiding or delaying shopping actions. Include responsive layouts, accessible navigation/forms/controls, clear loading/empty/error/success states, and practical support/policy links once their approved content is available.

Never simulate catalog data, stock, cart success, payment, shipping, reviews, or completed orders. Product facts and transaction state should come from Shopify or approved user-provided sources.

## UI and motion constraints

- Follow `skills/ui-stack/SKILL.md`: inspect the new repo and integration before selecting platform/theme/framework/styling. Compare Shopify-native theme work with headless only if the user requirements or a verified constraint justify it.
- Follow `skills/motion-stack/SKILL.md`: begin with a usable static experience; add motion only for clear feedback, continuity, orientation, or storytelling. Prefer CSS for small transitions, avoid unnecessary libraries, preserve native scrolling, and keep one engine per animated property/scroll surface.
- Follow `skills/dr-home-3d-commerce/SKILL.md`: use accurate, approved product models or imagery; never present a generic/generated model as the exact SKU without verification. Keep an immediate static product-and-purchase path for reduced motion, WebGL failure, and low-power devices.
- Honor `prefers-reduced-motion`; core content and purchase actions must remain available without animation.
- Use real Shopify records and supplied/licensed assets. Do not invent product specifications, shipping/return promises, certifications, warranties, endorsements, or health claims.

## Decisions needed when implementation begins

Inspect the actual connected repository and use the UI-stack skill to compare a Shopify-native theme with a separate headless frontend. Unless headless is requested or a verified requirement justifies it, use a native Shopify theme as the conservative default for a conventional shop and record that assumption. Confirm brand assets and approved visual direction, target market/currency, product specifications, shipping/returns/warranty terms, domain, checkout/payment configuration, and any required Shopify app/theme permissions. Ask only for decisions that block architecture, factual content, customer safety, privacy, or launch readiness; document reversible assumptions for the rest.

## Scope boundaries

This brief and pack are instructions, not an implementation. No storefront files, Shopify Admin data, theme, store settings, DNS, or deployment were changed when this brief was prepared. Build and publication require a subsequent implementation request and appropriate explicit authorization.
