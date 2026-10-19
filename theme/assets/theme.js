/* ==========================================================================
   DR. HOME — theme.js
   Progressive enhancement only. Every flow here has a native fallback:
   - Menus are <details>, cart works via plain POST forms, gallery shows all
     images when JS is absent.
   Engine ownership: CSS owns hover/transition motion; this script only adds
   classes/attributes and scrolls the page. The 3D viewer has its own module
   (product-viewer.js) and its own element — it never touches page scroll.
   ========================================================================== */
(function () {
  'use strict';

  var d = document;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------ *
   * Reveal-on-scroll: one IntersectionObserver, one class, CSS animates.
   * ------------------------------------------------------------------ */
  function initReveal() {
    var targets = d.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    var enabled = d.documentElement.getAttribute('data-motion') === 'true' &&
      'IntersectionObserver' in window &&
      !reduceMotion.matches;

    if (!enabled) {
      targets.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------ *
   * Quantity steppers (event delegation — works inside re-rendered HTML)
   * ------------------------------------------------------------------ */
  d.addEventListener('click', function (e) {
    var minus = e.target.closest('[data-quantity-minus]');
    var plus = e.target.closest('[data-quantity-plus]');
    if (!minus && !plus) return;
    var wrap = (minus || plus).closest('[data-quantity]');
    var input = wrap && wrap.querySelector('input');
    if (!input) return;
    var value = parseInt(input.value, 10) || 1;
    var min = parseInt(input.getAttribute('min'), 10) || 1;
    var max = parseInt(input.getAttribute('max'), 10) || Infinity;
    value = plus ? Math.min(value + 1, max) : Math.max(value - 1, min);
    input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* ------------------------------------------------------------------ *
   * Live region helper
   * ------------------------------------------------------------------ */
  function announce(message) {
    var region = d.querySelector('[data-cart-status]');
    if (region) region.textContent = message;
  }

  /* ------------------------------------------------------------------ *
   * Cart drawer — native <dialog>; content refreshed from the
   * cart-drawer SECTION via Shopify's Section Rendering API.
   * ------------------------------------------------------------------ */
  var drawer = d.querySelector('[data-cart-drawer]');
  var drawerEnabled = d.body.getAttribute('data-cart-drawer') === 'true' && !!drawer && typeof drawer.showModal === 'function';

  function refreshCartCount(cart) {
    d.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = cart.item_count;
      el.hidden = cart.item_count === 0;
    });
  }

  function refreshDrawer() {
    return fetch(window.location.pathname + '?sections=cart-drawer', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (sections) {
        var html = sections['cart-drawer'];
        if (!html) return;
        var tpl = d.createElement('template');
        tpl.innerHTML = html;
        var fresh = tpl.content.querySelector('[data-cart-drawer]');
        if (fresh) drawer.innerHTML = fresh.innerHTML;
      })
      .catch(function () { /* drawer refresh is best-effort; cart page stays the source of truth */ });
  }

  function fetchCart() {
    return fetch(window.ShopifyRoutes.root + 'cart.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); });
  }

  function openDrawer() {
    if (!drawerEnabled) return;
    if (typeof drawer.open === 'boolean' && drawer.open) return;
    drawer.showModal();
  }

  d.addEventListener('click', function (e) {
    if (e.target.closest('[data-cart-drawer-close]')) {
      drawer && drawer.close();
      return;
    }
    var opener = e.target.closest('[data-cart-open]');
    if (opener && drawerEnabled) {
      e.preventDefault();
      openDrawer();
    }
  });

  if (drawer) {
    /* Click on the backdrop closes (the dialog element itself is the backdrop area) */
    drawer.addEventListener('click', function (e) {
      var rect = drawer.getBoundingClientRect();
      var inDialog = e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inDialog) drawer.close();
    });
  }

  d.addEventListener('change', function (e) {
    if (!e.target.matches('[data-cart-drawer] [data-quantity] input')) return;
    var drawerEl = e.target.closest('[data-cart-drawer]');
    var item = e.target.closest('.cart-drawer__item');
    var items = drawerEl.querySelectorAll('.cart-drawer__item');
    var index = Array.prototype.indexOf.call(items, item) + 1;
    var quantity = parseInt(e.target.value, 10) || 0;

    fetch(window.ShopifyRoutes.root + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: index, quantity: quantity })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('change failed');
        return r.json();
      })
      .then(function (cart) {
        refreshCartCount(cart);
        announce(window.ShopifyStrings.cartUpdated);
        return refreshDrawer();
      })
      .catch(function () {
        announce(window.ShopifyStrings.cartError);
      });
  });

  /* ------------------------------------------------------------------ *
   * Add to cart: intercept POST forms only when the drawer is available.
   * Otherwise the native form POST handles everything.
   * ------------------------------------------------------------------ */
  d.addEventListener('submit', function (e) {
    var form = e.target;
    var isAdd = form.matches('[data-product-form], [data-quick-add]');
    if (!isAdd || !drawerEnabled || !window.fetch) return;
    e.preventDefault();

    var button = form.querySelector('[data-add-to-cart]') || form.querySelector('button[type="submit"]');
    var label = form.querySelector('[data-add-to-cart-label]') || button;
    var original = label.textContent;

    if (button) button.setAttribute('aria-disabled', 'true');
    if (label && label !== button) label.textContent = window.ShopifyStrings.adding;

    fetch(window.ShopifyRoutes.root + 'cart/add.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form)
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (err) { throw new Error(err.description || 'error'); });
        return r.json();
      })
      .then(function () {
        if (label && label !== button) label.textContent = window.ShopifyStrings.added;
        announce(window.ShopifyStrings.added);
        return Promise.all([fetchCart(), refreshDrawer()]);
      })
      .then(function (results) {
        var cart = results[0];
        if (cart) refreshCartCount(cart);
        openDrawer();
      })
      .catch(function (err) {
        announce(err && err.message ? err.message : window.ShopifyStrings.cartError);
      })
      .finally(function () {
        if (button) button.removeAttribute('aria-disabled');
        setTimeout(function () {
          if (label && label !== button) label.textContent = original;
        }, 1600);
      });
  });

  /* ------------------------------------------------------------------ *
   * Header: close mobile menu on outside click / Escape; scrolled state
   * ------------------------------------------------------------------ */
  var menu = d.querySelector('[data-menu-drawer]');
  if (menu) {
    d.addEventListener('click', function (e) {
      if (menu.open && !menu.contains(e.target)) menu.removeAttribute('open');
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.open) menu.removeAttribute('open');
    });
  }

  var header = d.querySelector('[data-header]');
  if (header && header.getAttribute('data-sticky') === 'true') {
    var update = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 4);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * Hero stage tilt — the only JS-driven motion. Pointer-fine devices,
   * no reduced-motion, and opt-out via theme settings.
   * ------------------------------------------------------------------ */
  var stage = d.querySelector('[data-stage].is-tiltable');
  if (stage && !reduceMotion.matches && window.matchMedia('(pointer: fine)').matches) {
    var scene = stage.querySelector('[data-stage-scene]');
    if (scene) {
      var frame = null;
      var onMove = function (e) {
        if (frame) return;
        frame = requestAnimationFrame(function () {
          frame = null;
          var rect = stage.getBoundingClientRect();
          var x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;   /* ±3deg */
          var y = ((e.clientY - rect.top) / rect.height - 0.5) * -4;  /* ±2deg */
          scene.style.setProperty('--tilt-x', x.toFixed(2) + 'deg');
          scene.style.setProperty('--tilt-y', y.toFixed(2) + 'deg');
        });
      };
      var onLeave = function () {
        scene.style.setProperty('--tilt-x', '0deg');
        scene.style.setProperty('--tilt-y', '0deg');
      };
      stage.addEventListener('pointermove', onMove);
      stage.addEventListener('pointerleave', onLeave);
    }
  }

  /* ------------------------------------------------------------------ *
   * Product gallery thumbs + collection sort
   * ------------------------------------------------------------------ */
  var stageImage = d.querySelector('[data-stage-image]');
  if (stageImage) {
    d.addEventListener('click', function (e) {
      var thumb = e.target.closest('[data-thumb]');
      if (!thumb || !thumb.dataset.src) return;
      stageImage.src = thumb.dataset.src;
      var alt = thumb.querySelector('img');
      if (alt) stageImage.alt = alt.alt || stageImage.alt;
      d.querySelectorAll('[data-thumb]').forEach(function (t) {
        t.setAttribute('aria-selected', t === thumb ? 'true' : 'false');
      });
    });
  }

  var sortSelect = d.querySelector('[data-sort-select]');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      if (sortSelect.form) sortSelect.form.submit();
    });
  }

  /* ------------------------------------------------------------------ *
   * Variant selection: update hidden id, price, availability, button,
   * and gallery image — all from data attributes rendered by Liquid.
   * ------------------------------------------------------------------ */
  var productSection = d.querySelector('[data-product-section]');
  if (productSection && productSection.dataset.variants) {
    var variants = [];
    try { variants = JSON.parse(productSection.dataset.variants); } catch (err) { variants = []; }

    var formatMoney = function (cents) {
      return window.ShopifyMoney ? window.ShopifyMoney(cents) : (cents / 100).toFixed(2);
    };

    d.addEventListener('change', function (e) {
      if (!e.target.matches('[data-variant-option]')) return;

      /* Build the selected option vector in DOM order */
      var groups = Array.prototype.slice.call(productSection.querySelectorAll('.variant-picker__option'));
      var selected = groups.map(function (group) {
        var checked = group.querySelector('[data-variant-option]:checked');
        return checked ? checked.value : null;
      });

      var match = variants.find(function (v) {
        return v.options.length === selected.length &&
          v.options.every(function (opt, i) { return opt === selected[i]; });
      });

      var idInput = productSection.querySelector('[data-variant-id]');
      var availability = productSection.querySelector('[data-availability]');
      var button = productSection.querySelector('[data-add-to-cart]');
      var buttonLabel = productSection.querySelector('[data-add-to-cart-label]');
      var priceEl = productSection.querySelector('[data-price]');
      var skuEl = productSection.querySelector('[data-sku]');

      if (!match) return;

      if (idInput) idInput.value = match.id;

      if (priceEl && match.available !== undefined) {
        var compareHtml = match.compareAtPrice > match.price
          ? '<s class="price__compare">' + formatMoney(match.compareAtPrice) + '</s>' : '';
        var cls = match.compareAtPrice > match.price ? 'price__sale' : 'price__regular';
        priceEl.innerHTML = '<div class="price price--large"><span class="' + cls + '">' + formatMoney(match.price) + '</span>' + compareHtml + '</div>';
      }

      if (availability) {
        availability.classList.toggle('availability--out', !match.available);
        availability.textContent = match.available ? window.ShopifyStrings.inStock : window.ShopifyStrings.outOfStock;
      }

      if (button) button.disabled = !match.available;
      if (buttonLabel) buttonLabel.textContent = match.available ? window.ShopifyStrings.addToCart : window.ShopifyStrings.soldOut;
      if (skuEl && match.sku) skuEl.textContent = match.sku;

      if (match.featuredMediaId && stageImage) {
        var thumb = productSection.querySelector('[data-thumb][data-media-id="' + match.featuredMediaId + '"]');
        if (thumb && thumb.dataset.src) {
          stageImage.src = thumb.dataset.src;
          d.querySelectorAll('[data-thumb]').forEach(function (t) {
            t.setAttribute('aria-selected', t === thumb ? 'true' : 'false');
          });
        }
      }

      groups.forEach(function (group) {
        var checked = group.querySelector('[data-variant-option]:checked');
        var holder = group.querySelector('[data-selected-value]');
        if (holder && checked) holder.textContent = checked.value;
      });
    });
  }

  initReveal();
})();
