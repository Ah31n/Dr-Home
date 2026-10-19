# Dr Home — Motion Playbook

**Rule zero:** the storefront must be fully usable — browsing, configuring, buying — with animation disabled, WebGL absent, or JavaScript off.

## Engine ownership (one owner per property)

| Effect | Owner | File |
| --- | --- | --- |
| Hover/focus states, card lift, button feedback, drawer slide | CSS transitions | `assets/base.css` |
| Hero product float, stage depth, reveal-on-enter | CSS keyframes/transitions, triggered by a JS-added class | `base.css` + `theme.js` |
| Hero pointer tilt | JS writes CSS custom properties (`--tilt-x/y`), rAF-throttled; CSS applies the transform | `theme.js` |
| Scroll position | Browser native scrolling. Nothing hijacks, snaps, or pins scroll. | — |
| 3D camera / model rotation | `<model-viewer>` internals, only in its own panel | `product-viewer.js` |

No animation libraries are used. No two engines write the same transform. The 3D panel uses `touch-action: pan-y` so vertical page scrolling is preserved over the model.

## Allowed motion (and why)

1. **Reveal** — content fades/rises once as it enters the viewport: orientation, not spectacle. Threshold small, margin −8%, elements reveal once and unobserve.
2. **Hover lift** — cards and buttons: direct feedback for pointer users.
3. **Stage float** — slow (7 s) ambient float on the hero product image: the "premium showroom" signature. Decorative only; the image is fully visible without it.
4. **Drawer slide** — cart drawer slides in: continuity of the cart's location.
5. **3D orbit** — shopper-initiated only. No auto-rotation by default; the control is opt-in, pauses on tab-hide, and is removed entirely under reduced motion.

## Hard gates

- `prefers-reduced-motion: reduce` → global 0.01ms animation/transition clamp + reveal elements forced visible + float/tilt/autorotate removed (CSS media query + JS matchMedia).
- No splash screens, no autoplay that delays content, no forced scroll, no cursor gimmicks, no per-tile choreography.
- Purchase path (title, price, variants, availability, add-to-cart) renders server-side and is never animated in or gated behind motion/3D.
- Theme settings expose motion switches (`motion_reveal_enabled`, `motion_stage_tilt`) so the merchant can dial everything back without code.

## Cleanup & lifecycle

- Reveal observer unobserves after reveal; listeners are passive where relevant.
- Stage tilt binds only on `(pointer: fine)` and never runs under reduced motion.
- 3D module loads only on product pages with real 3D media; fallback path removes the viewer element on error; rotation toggles pause on `visibilitychange`.
