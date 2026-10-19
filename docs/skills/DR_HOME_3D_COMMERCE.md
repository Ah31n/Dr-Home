---
name: dr-home-3d-commerce
description: Design, plan, or implement premium 3D storytelling and product interactions for the Dr Home Shopify storefront. Use with the Dr Home storefront skill and the uploaded ui-stack, motion-stack, performance, and accessibility modules.
---

# Dr Home Premium 3D Commerce

Use this skill when the Dr Home storefront should feel premium and spatially rich, with meaningful 3D product presentation. Transfer the prior project's **craft and quality bar**—polished composition, considered depth, restrained motion, and high visual finish—not its brand identity, copy, exact layout, or assets. The store should remain a clear, fast, trustworthy e-commerce experience first.

## Required companion skills

Load together:

- `skills/dr-home-storefront/SKILL.md` for the Dr Home storefront and Shopify commerce requirements.
- `skills/ui-stack/SKILL.md` for project inspection and conditional framework/rendering choices.
- `skills/motion-stack/SKILL.md` for animation purpose, engine ownership, reduced motion, and cleanup.
- `skills/performance/SKILL.md` and `skills/accessibility-responsive/SKILL.md` for 3D loading, fallbacks, responsive behavior, and assistive alternatives.
- `skills/dr-home-shopify/SKILL.md` when pulling product facts, variants, pricing, or availability from Shopify.

Read `docs/DR_HOME_PROJECT_BRIEF.md`, `docs/DR_HOME_STORE_PROFILE.md`, and `docs/DR_HOME_STOREFRONT_STACK.md` before making design or stack decisions.

## Visual direction

Use a premium product-showroom direction: accurate hero product presentation, deliberate scale and negative space, carefully controlled lighting/material response, strong typographic hierarchy, and restrained transitions. Product, price, variant choices, availability, and purchase actions should stay visually primary. Keep the 3D scene in service of product understanding, not as a site-wide effect or obstacle to shopping.

No palette, typography, logo system, or product-render style has been verified. Use supplied brand assets and approved references. If those are missing, propose a small reversible art direction or ask for assets when realism, identity, or product accuracy depends on them. Do not copy distinctive visual expression, layouts, assets, or copy from the previous project.

## 3D planning workflow

1. **Inspect product evidence.** Review Shopify product records, variant/options, media, user-supplied product photos, and any licensed CAD/GLB/glTF assets. Record what each source actually proves. A product name or generic image is not enough to invent exact shape, controls, materials, scale, internals, performance, or safety.
2. **Choose the 3D job.** Select one or two useful purposes: a hero-stage reveal, an interactive orbit/zoom viewer, a variant-specific appearance preview backed by verified data, or a subtle spatial transition between commerce sections. Do not add all of them by default.
3. **Protect product truth.** A generated or generic model must never be presented as the exact sellable SKU unless verified against product references and approved. If accurate assets are unavailable, ask for approved model/photos or use a clearly representative visual with a 2D product-image fallback; do not fabricate controls, accessories, materials, labels, dimensions, or parts.
4. **Fit the project stack.** Follow `skills/ui-stack/SKILL.md`. Use the existing Shopify theme approach when one exists. In a fresh build, choose a renderer based on the approved architecture and real need. Three.js is a candidate for imperative WebGL scenes; React Three Fiber only fits an approved React-based frontend. Do not add React or a large renderer solely to animate a product card. Check current versions, license, bundle cost, browser support, and Shopify/theme compatibility before adoption.
5. **Build a static commerce baseline.** Render title, verified images, selected variant, live price/availability, and add-to-cart without waiting for WebGL or animation. Lazy-load 3D below the critical path or after user intent where appropriate. Keep layout dimensions stable to avoid shifts.
6. **Add motion with one owner.** Use CSS for small hover/focus states; use the existing renderer for camera/object interaction; use Motion only for meaningful React state/presence if the project is React-based. Reserve GSAP for complex sequencing. Do not allow multiple engines to write the same transform or control the same scroll surface. Keep native page scrolling.
7. **Provide graceful alternatives.** Include an optimized static product image when WebGL is unsupported, the model fails, data is slow, or reduced motion is requested. Make model controls operable by keyboard as well as pointer/touch. Provide accessible labels and text that explain what the model shows; do not put essential specifications only in the 3D scene.

## Premium without blocking commerce

- Keep the main purchase action, product title, price, variant selection, and availability visible and usable without animation.
- Avoid long splash screens, autoplay that delays content, forced scroll, pinned product galleries that trap reading, cursor gimmicks, and elaborate motion on every tile.
- Make orbit, drag, zoom, reset, and close controls discoverable, labeled, keyboard-operable, and touch-friendly. Do not hijack page scrolling for model rotation.
- Let shoppers inspect the product at their own pace. Autoplay/auto-rotation is optional and should stop on interaction, pause when hidden, and have a reduced-motion alternative.
- Never claim that a render proves a feature, medical benefit, certification, material, or real-world performance. Dr Home's brand name is not medical evidence.

## Motion, accessibility, and performance gates

Follow the source `motion-stack` skill and `docs/MOTION_PLAYBOOK.md`:

- Honor `prefers-reduced-motion` by removing auto-rotation, camera travel, parallax, and nonessential choreography while preserving the final product view and all controls.
- Respect keyboard focus, screen-reader names, touch targets, contrast, zoom/reflow, and non-3D reading order. Do not rely on color, hover, or model movement alone.
- Lazy-load the renderer/model; compress and size assets; avoid loading a 3D engine on pages that do not need it; cap rendering quality based on measurement and device capability.
- Handle no-WebGL, WebGL context loss, model/network errors, and low-power/mobile cases. Dispose scene resources and clean up listeners, observers, animation loops, and workers.
- Measure a baseline and the built result on a representative desktop and mid/low-end phone. Report bundle impact, load behavior, and limitations rather than promising FPS or Core Web Vitals without measurements.

## Verification checklist

- [ ] The design feels premium through product accuracy, hierarchy, and art direction—not merely added effects.
- [ ] Every modeled feature and variant relationship is supported by actual product evidence.
- [ ] Shopify price, variant, availability, cart, and checkout behavior remain real and functional.
- [ ] The page is useful before 3D loads and when 3D is unavailable.
- [ ] Reduced-motion, keyboard, touch, screen-reader, zoom, and responsive paths work.
- [ ] Mobile/network/bundle impact was measured or marked NOT TESTED.
- [ ] Each animated property and scroll surface has one owner, and scene resources clean up correctly.
- [ ] Visual assets and references have documented provenance, rights, and approval status.

Report PASS, FAIL, BLOCKED, or NOT TESTED per check. Do not claim storefront publication or checkout success unless verified against the target environment.
