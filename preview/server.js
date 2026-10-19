/*
 * preview/server.js — LOCAL DESIGN PREVIEW SERVER (demo only).
 *
 * Serves the real theme's CSS/JS/assets and renders the real theme templates
 * with the clearly-labelled demo catalog. Cart endpoints are in-memory mocks
 * so add / update / remove can be exercised. Checkout is deliberately NOT
 * simulated: the checkout buttons lead to a page that says the real checkout
 * happens on Shopify.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const engine = require('./shim/engine');

const PORT = process.env.PORT || 8923;
const PUBLIC = path.resolve(__dirname, 'public');

/* ---------------- in-memory demo cart ---------------- */
const cart = {
  items: [], // { key, product_handle, variant_id, quantity }
  get item_count() { return this.items.reduce((n, i) => n + i.quantity, 0); },
  get total_price() {
    return this.items.reduce((n, i) => {
      const p = engine.catalog.products.find(x => x.handle === i.product_handle);
      const v = p && p.variants.find(v => v.id === i.variant_id);
      return n + (v ? v.price * i.quantity : 0);
    }, 0);
  },
  note: '',
};

function cartItemView(i) {
  const p = engine.catalog.products.find(x => x.handle === i.product_handle);
  const v = p.variants.find(v => v.id === i.variant_id);
  return {
    key: i.key,
    line: i.key,
    quantity: i.quantity,
    title: p.title,
    product_title: p.title,
    handle: p.handle,
    url: p.url,
    image: v.featured_media ? v.featured_media.url : p.featured_media.url,
    price: v.price,
    final_price: v.price,
    final_line_price: v.price * i.quantity,
    line_price: v.price * i.quantity,
    variant: { id: v.id, title: v.title },
    product: {
      title: p.title,
      handle: p.handle,
      has_only_default_variant: p.has_only_default_variant,
      url: p.url,
      featured_media: p.featured_media,
    },
    variant_title: v.title === 'Default Title' ? null : v.title,
  };
}

function cartView() {
  return {
    item_count: cart.item_count,
    total_price: cart.total_price,
    note: cart.note,
    items: cart.items.map(cartItemView),
    currency: engine.baseGlobals.shop.currency,
  };
}

/* ---------------- context helpers ---------------- */
function globalsFor(req) {
  const origin = 'http://localhost:' + PORT;
  return {
    ...engine.baseGlobals,
    request: { ...engine.baseGlobals.request, origin },
    canonical_url: origin + req.url,
    cart: cartProxy(),
  };
}

function cartProxy() {
  const v = cartView();
  v.items = v.items.map(item => ({
    ...item,
    get product() {
      const p = engine.catalog.products.find(x => x.handle === item.handle);
      return { ...p, has_only_default_variant: p.has_only_default_variant };
    },
  }));
  return v;
}

function demoBanner() {
  return '<a class="preview-banner" href="/preview-about">Demo preview — sample data, not the live store. Read why →</a>' +
    '<style>.preview-banner{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:9999;background:#171512;color:#f6f4ef;font:600 12px/1.4 system-ui,sans-serif;letter-spacing:.04em;padding:9px 16px;border-radius:999px;text-decoration:none;box-shadow:0 8px 24px rgba(23,21,18,.35);}.preview-banner:hover{background:#B4551F;color:#fff;}</style>';
}

function send(res, status, body, type = 'text/html; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function html(body, req) {
  return body.replace('</body>', demoBanner() + '</body>');
}

/* ---------------- routes ---------------- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);
  const p = url.pathname;
  const q = url.searchParams;

  try {
    /* static assets: theme assets + demo images */
    if (p.startsWith('/assets/') || p.startsWith('/demo-assets/')) {
      const file = p.startsWith('/assets/')
        ? path.join(engine.THEME, p) /* real theme assets */
        : path.join(PUBLIC, p.replace(/^\//, ''));
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        const ext = path.extname(file);
        const types = { '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
        send(res, 200, fs.readFileSync(file), types[ext] || 'application/octet-stream');
      } else send(res, 404, 'not found', 'text/plain');
      return;
    }

    if (p.startsWith('/cdn/')) {
      const file = path.join(PUBLIC, p.replace('/cdn/', ''));
      if (fs.existsSync(file)) { send(res, 200, fs.readFileSync(file), 'image/png'); return; }
      send(res, 404, 'not found', 'text/plain');
      return;
    }

    /* cart mock endpoints */
    if (p === '/cart.js' || p === '/cart.json') { send(res, 200, JSON.stringify(cartView()), 'application/json'); return; }

    if (p === '/cart/add.js' && req.method === 'POST') {
      let raw = '';
      req.on('data', c => raw += c);
      req.on('end', () => {
        let id, qty = 1;
        if (raw.trim().startsWith('{')) {
          const j = JSON.parse(raw);
          id = j.id; qty = j.quantity || 1;
        } else {
          const params = new URLSearchParams(raw);
          id = parseInt(params.get('id'), 10); qty = parseInt(params.get('quantity'), 10) || 1;
        }
        const product = engine.catalog.products.find(x => x.variants.some(v => v.id === id));
        if (!product) { send(res, 404, JSON.stringify({ status: 404, message: 'variant not found' }), 'application/json'); return; }
        const variant = product.variants.find(v => v.id === id);
        if (!variant.available) { send(res, 422, JSON.stringify({ status: 422, message: 'sold out', description: 'This variant is sold out (demo data).' }), 'application/json'); return; }
        const existing = cart.items.find(i => i.variant_id === id);
        if (existing) existing.quantity += qty;
        else cart.items.push({ key: cart.items.length + 1, product_handle: product.handle, variant_id: id, quantity: qty });
        const item = cartItemView(cart.items.find(i => i.variant_id === id));
        send(res, 200, JSON.stringify(item), 'application/json');
      });
      return;
    }

    if (p === '/cart/change.js' && req.method === 'POST') {
      let raw = '';
      req.on('data', c => raw += c);
      req.on('end', () => {
        const j = JSON.parse(raw);
        const line = j.line || (j.id && j.id.line) || 0;
        const idx = (parseInt(line, 10) || 1) - 1;
        if (idx >= 0 && idx < cart.items.length) {
          if ((j.quantity || 0) <= 0) cart.items.splice(idx, 1);
          else cart.items[idx].quantity = j.quantity;
        }
        send(res, 200, JSON.stringify(cartView()), 'application/json');
      });
      return;
    }

    if (p === '/cart' && req.method === 'POST') {
      let raw = '';
      req.on('data', c => raw += c);
      req.on('end', () => {
        const params = new URLSearchParams(raw);
        cart.note = params.get('note') || '';
        if (params.get('checkout') !== null) {
          send(res, 200, html(checkoutNotice(), req));
          return;
        }
        if (params.get('update') !== null) {
          for (const [k, v] of params.entries()) {
            const m = k.match(/^updates\[(\d+)\]$/) || (k === 'updates[]' ? [null, cart.items[parseInt(v, 10) - 1] && null] : null);
            void m; void v;
          }
        }
        // handle updates[] in order of items
        const updates = params.getAll('updates[]').map(Number);
        updates.forEach((qty, idx) => {
          if (idx < cart.items.length) {
            if (qty <= 0) cart.items.splice(idx, 1);
            else cart.items[idx].quantity = qty;
          }
        });
        cart.items = cart.items.map((i, n) => ({ ...i, key: n + 1 }));
        send(res, 303, '', 'text/plain').statusCode = 303;
        res.setHeader('Location', '/cart');
        res.writeHead(303, { Location: '/cart' });
        res.end();
      });
      return;
    }

    /* section rendering API used by the drawer */
    if (q.get('sections')) {
      const globals = globalsFor(req);
      const out = {};
      for (const name of q.get('sections').split(',')) {
        out[name] = engine.renderSectionHTML(name, {}, globals);
      }
      send(res, 200, JSON.stringify(out), 'application/json');
      return;
    }

    /* pages */
    if (p === '/') {
      send(res, 200, html(engine.renderPage('index', globalsFor(req)), req));
      return;
    }
    if (p === '/collections/all' || p === '/collections') {
      const globals = globalsFor(req);
      globals.collection = engine.catalog.collections.all;
      globals.request = { ...globals.request, page_type: 'collection' };
      send(res, 200, html(engine.renderPage('collection', globals), req));
      return;
    }
    const productMatch = p.match(/^\/products\/([\w-]+)$/);
    if (productMatch) {
      const product = engine.productFor(productMatch[1]);
      if (!product) { notFound(req, res); return; }
      const globals = globalsFor(req);
      globals.product = product;
      globals.request = { ...globals.request, page_type: 'product' };
      send(res, 200, html(engine.renderPage('product', globals), req));
      return;
    }
    if (p === '/cart') {
      send(res, 200, html(engine.renderPage('cart', globalsFor(req)), req));
      return;
    }
    if (p === '/search') {
      const globals = globalsFor(req);
      const terms = q.get('q') || '';
      const results = terms ? engine.catalog.products.filter(x => (x.title + ' ' + x.type).toLowerCase().includes(terms.toLowerCase())) : [];
      globals.search = {
        performed: q.get('q') !== null,
        terms,
        results,
        results_count: results.length,
      };
      globals.request = { ...globals.request, page_type: 'search' };
      send(res, 200, html(engine.renderPage('search', globals), req));
      return;
    }
    const pageMatch = p.match(/^\/pages\/([\w-]+)$/);
    if (pageMatch) {
      const page = engine.catalog.pages[pageMatch[1]];
      if (!page) { notFound(req, res); return; }
      const globals = globalsFor(req);
      globals.page = page;
      globals.request = { ...globals.request, page_type: 'page' };
      send(res, 200, html(engine.renderPage('page', globals), req));
      return;
    }
    if (p === '/blogs/news' || p.startsWith('/blogs/')) {
      const globals = globalsFor(req);
      globals.blog = { title: 'News', articles: [], comments_enabled: false };
      const artMatch = p.match(/^\/blogs\/([\w-]+)\/([\w-]+)$/);
      if (artMatch) {
        globals.article = { title: 'Demo article', content: '<p>Demo placeholder.</p>', image: null, published_at: new Date(), author: 'Dr Home', comments_count: 0, comments_enabled: false, comments: [] };
        send(res, 200, html(engine.renderPage('article', globals), req));
        return;
      }
      send(res, 200, html(engine.renderPage('blog', globals), req));
      return;
    }

    /* account: demo just shows login */
    if (p.startsWith('/account') || p === '/account/login') {
      const globals = globalsFor(req);
      globals.request = { ...globals.request, page_type: 'login' };
      send(res, 200, html(engine.renderPage('customers/login', globals), req));
      return;
    }

    if (p === '/password') {
      const globals = globalsFor(req);
      globals.request = { ...globals.request, page_type: 'password' };
      send(res, 200, html(engine.renderPage('password', globals), req));
      return;
    }

    if (p === '/checkout') {
      send(res, 200, html(checkoutNotice(), req));
      return;
    }

    if (p === '/preview-about') {
      send(res, 200, html(previewAbout(), req));
      return;
    }

    notFound(req, res);
  } catch (err) {
    console.error(err);
    send(res, 500, '<pre>' + (err && err.stack || String(err)) + '</pre>');
  }
});

function notFound(req, res) {
  send(res, 404, html(engine.renderPage('404', globalsFor(req)), req));
}

function checkoutNotice() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Checkout — demo preview</title></head>
  <body style="font-family:system-ui,sans-serif;background:#F6F4EF;color:#171512;display:grid;place-items:center;min-height:100dvh;margin:0;padding:24px;">
    <div style="max-width:560px;text-align:center;">
      <p style="letter-spacing:.16em;font-size:12px;font-weight:700;color:#B4551F;text-transform:uppercase;margin:0 0 12px;">Demo preview boundary</p>
      <h1 style="font-size:2rem;margin:0 0 12px;">Checkout is not simulated</h1>
      <p style="color:#5c564d;line-height:1.6;">In production this button hands the cart to <strong>Shopify's own secure checkout</strong> on the connected store. This local preview intentionally stops here — payment, shipping, and order completion are never faked.</p>
      <a href="/cart" style="display:inline-block;margin-top:20px;padding:12px 24px;border-radius:999px;background:#171512;color:#F6F4EF;text-decoration:none;">Back to cart</a>
    </div>
  </body></html>`;
}

function previewAbout() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>About this preview</title></head>
  <body style="font-family:system-ui,sans-serif;background:#F6F4EF;color:#171512;margin:0;padding:48px 24px;">
    <div style="max-width:640px;margin-inline:auto;line-height:1.7;">
      <p style="letter-spacing:.16em;font-size:12px;font-weight:700;color:#B4551F;text-transform:uppercase;margin:0 0 12px;">Local design preview</p>
      <h1 style="font-size:2rem;margin:0 0 16px;">What this preview is</h1>
      <p>This server renders the <strong>real theme files</strong> from <code>/theme</code> with a small Liquid engine and <strong>clearly-labelled sample data</strong>, so the design can be reviewed before the theme is uploaded to Shopify.</p>
      <h2 style="font-size:1.3rem;margin-top:28px;">What is sample data</h2>
      <ul><li>Product images (AI-generated stand-ins, not the real products)</li><li>Prices and currency</li><li>The travel iron's colour options and availability</li><li>Product descriptions</li></ul>
      <h2 style="font-size:1.3rem;margin-top:28px;">What is real</h2>
      <ul><li>Every template, section, snippet, style, and script under <code>/theme</code></li><li>The cart flows (add / update / remove via an in-memory cart)</li><li>Accessibility and reduced-motion behaviour</li></ul>
      <h2 style="font-size:1.3rem;margin-top:28px;">What is deliberately missing</h2>
      <ul><li>Checkout — production checkout happens on the connected Shopify store.</li><li>Real inventory, payments, shipping, and policies.</li></ul>
      <a href="/" style="display:inline-block;margin-top:24px;padding:12px 24px;border-radius:999px;background:#171512;color:#F6F4EF;text-decoration:none;">Back to the storefront</a>
    </div>
  </body></html>`;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dr Home design preview (demo data) → http://localhost:${PORT}`);
});
