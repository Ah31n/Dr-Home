/*
 * preview/shim/engine.js — wires the Liquid subset engine to the REAL theme
 * files with the DEMO catalog. Local design preview only.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const Liquid = require('./liquid');
const catalog = require('../data/catalog');

const THEME = path.resolve(__dirname, '../../theme');
const read = p => fs.readFileSync(path.join(THEME, p), 'utf8');
const readJSON = p => JSON.parse(fs.readFileSync(path.join(THEME, p), 'utf8'));

const settingsData = readJSON('config/settings_data.json');
const schemaStrings = JSON.parse(read('locales/en.default.schema.json'));
const translations = JSON.parse(read('locales/en.default.json'));

const settings = { ...settingsData.current };
delete settings.sections;

function schemaDefaults(type) {
  try {
    const src = read('sections/' + type + '.liquid');
    const m = src.match(/{%\s*schema\s*}([\s\S]*?){%\s*endschema\s*}/);
    if (!m) return { settings: {}, blocks: {} };
    const schema = JSON.parse(m[1]);
    const out = {};
    for (const s of schema.settings || []) if (s.id !== undefined) out[s.id] = s.default;
    const blockDefs = {};
    for (const b of schema.blocks || []) {
      const defs = {};
      for (const s of b.settings || []) if (s.id !== undefined) defs[s.id] = s.default;
      blockDefs[b.type] = defs;
    }
    return { settings: out, blocks: blockDefs };
  } catch (e) {
    return { settings: {}, blocks: {} };
  }
}

/* Pluralized + interpolated translation lookup */
function translate(key, vars) {
  const parts = key.split('.');
  let node = translations;
  for (const p of parts) node = node && node[p];
  if (node === undefined || node === null) return '«' + key + '»';
  let str = node;
  if (typeof node === 'object') {
    const count = vars && vars.count !== undefined ? Number(vars.count) : null;
    if (count !== null && typeof node.one === 'string' && count === 1) str = node.one;
    else if (typeof node.other === 'string') str = node.other;
    else str = JSON.stringify(node);
  }
  return String(str).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name) => {
    const v = vars && vars[name];
    return v === undefined || v === null ? '' : String(v);
  });
}

function formatMoney(cents) {
  const value = (Number(cents) || 0) / 100;
  return catalog.shop.money_format.replace(/\{\{\s*amount\s*\}\}/, value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
}

function makeContext(globals, opts) {
  const ctx = {
    globals,
    translate,
    formatMoney,
    renderSnippet(name, vars, scope, c, out) {
      let src;
      try { src = read('snippets/' + name + '.liquid'); } catch (e) {
        out.push(`<!-- missing snippet: ${name} -->`);
        return;
      }
      const inner = new Liquid.Scope(scope);
      for (const [k, v] of Object.entries(vars)) inner.set(k, v);
      const tokens = Liquid.tokenize(src);
      const nodes = Liquid.parse(tokens);
      Liquid.renderNodes(nodes, inner, c, out);
    },
    renderSectionByName(name, templateSettings, scope, c, out) {
      let src;
      try { src = read('sections/' + name + '.liquid'); } catch (e) {
        out.push(`<!-- missing section: ${name} -->`);
        return;
      }
      const def = schemaDefaults(name);
      const tpl = templateSettings || {};

      /* PREVIEW-ONLY fallbacks: when a picker is unset (as shipped), render
         demo records so the design is reviewable. On a real store these stay
         empty and the theme shows its normal empty states. */
      if (!tpl.settings) tpl.settings = {};
      if (name === 'hero-stage' && !tpl.settings.product) {
        tpl.settings.product = catalog.products[0];
      }
      if (name === 'featured-collection' && !tpl.settings.collection) {
        tpl.settings.collection = 'frontpage';
      }

      const sectionSettings = { ...def.settings, ...tpl.settings };
      const blocks = [];
      const blockOrder = tpl.block_order || Object.keys(tpl.blocks || {});
      for (const key of blockOrder) {
        const b = (tpl.blocks || {})[key];
        blocks.push({
          id: key,
          type: b.type,
          settings: { ...(def.blocks[b.type] || {}), ...b.settings },
          shopify_attributes: '',
        });
      }
      const inner = new Liquid.Scope(scope);
      inner.set('section', { id: name, settings: sectionSettings, blocks });
      const tokens = Liquid.tokenize(src);
      const nodes = Liquid.parse(tokens);
      Liquid.renderNodes(nodes, inner, c, out);
    },
    renderSectionGroup(groupName, scope, c, out) {
      let order = null;
      let tplSections = {};
      try {
        const group = readJSON('sections/' + groupName + '.json');
        order = group.order;
        tplSections = group.sections;
      } catch (e) {
        const g = settingsData.current.sections && settingsData.current.sections[groupName];
        if (g) { order = Object.keys(g.sections || {}); tplSections = g.sections || {}; }
      }
      out.push(`<div data-section-group="${groupName}">`);
      for (const key of order || []) {
        const s = tplSections[key];
        if (!s) continue;
        out.push(`<div id="shopify-section-${key}" class="shopify-section">`);
        c.renderSectionByName(s.type, s, scope, c, out);
        out.push('</div>');
      }
      out.push('</div>');
    },
    formAction(kind, target) {
      switch (kind) {
        case 'product': return '/cart/add';
        case 'customer_login': return '/account/login';
        case 'recover_customer_password': return '/account/recover';
        case 'create_customer': return '/account/register';
        case 'reset_customer_password': return '/account/reset';
        case 'activate_customer_password': return '/account/activate';
        case 'guest_login': return '/account/login';
        case 'new_comment': return target ? `/blogs/${target.blog_handle || 'news'}/comments` : '/blogs/news/comments';
        case 'customer_address': return target && target.id ? `/account/addresses/${target.id}` : '/account/addresses';
        case 'storefront_password': return '/password';
        default: return '/';
      }
    },
  };
  return ctx;
}

const FONT_LIBRARY = {
  playfair_display_n4: { family: 'Playfair Display', fallback_families: 'Georgia, serif', style: 'normal', weight: '400' },
  assistant_n4: { family: 'Assistant', fallback_families: 'system-ui, sans-serif', style: 'normal', weight: '400' },
  assistant_n7: { family: 'Assistant', fallback_families: 'system-ui, sans-serif', style: 'normal', weight: '700' },
};

const baseGlobals = {
  page_title: '',
  page_description: null,
  current_page: 1,
  current_tags: null,
  shop: {
    ...catalog.shop,
    get shipping_policy() { return catalog.shop.shipping_policy; },
    get refund_policy() { return catalog.shop.refund_policy; },
  },
  routes: {
    root_url: '/',
    cart_url: '/cart',
    cart_add_url: '/cart/add',
    cart_change_url: '/cart/change',
    cart_update_url: '/cart/update',
    search_url: '/search',
    all_products_collection_url: '/collections/all',
    account_url: '/account',
    account_login_url: '/account/login',
    account_register_url: '/account/register',
    account_addresses_url: '/account/addresses',
    account_logout_url: '/account/logout',
  },
  settings,
  collections: catalog.collections,
  linklists: catalog.linklists,
  pages: catalog.pages,
  customer: null,
  request: { locale: { iso_code: 'en' }, origin: '', page_type: 'index' },
  content_for_header: '<!-- preview: content_for_header is provided by Shopify in production -->',
  powered_by_link: '<a target="_blank" rel="noopener" href="https://www.shopify.com" class="link">Powered by Shopify</a>',
  all_country_option_tags:
    '<option value="Pakistan" data-provinces="[]">Pakistan</option>' +
    '<option value="United Arab Emirates" data-provinces="[]">United Arab Emirates</option>' +
    '<option value="United States" data-provinces=\'[["AL","Alabama"]]\'>United States</option>' +
    '<option value="United Kingdom" data-provinces="[]">United Kingdom</option>',
};

function productFor(routeHandle) {
  return catalog.products.find(p => p.handle === routeHandle) || null;
}

/* Render a full page: layout + JSON template sections. */
function renderPage(templateName, extraGlobals) {
  const globals = { ...baseGlobals, ...extraGlobals };

  /* Resolve font_picker handles to font objects the layout expects. */
  for (const key of ['type_heading_font', 'type_body_font']) {
    if (typeof globals.settings[key] === 'string') {
      globals.settings[key] = FONT_LIBRARY[globals.settings[key]] || FONT_LIBRARY.assistant_n4;
    }
  }

  /* Derive page_title the way Shopify would. */
  if (!globals.page_title) {
    globals.page_title =
      (globals.product && globals.product.title) ||
      (globals.collection && globals.collection.title) ||
      (globals.page && globals.page.title) ||
      (globals.search && globals.search.performed ? 'Search' : '') ||
      '';
  }

  const scope = new Liquid.Scope(null);
  const ctx = makeContext(globals);

  const template = readJSON('templates/' + templateName + '.json');
  const parts = [];
  for (const key of template.order) {
    const s = template.sections[key];
    parts.push(`<div id="shopify-section-${key}" class="shopify-section">`);
    ctx.renderSectionByName(s.type, s, scope, ctx, parts);
    parts.push('</div>');
  }
  const content = parts.join('\n');

  globals.content_for_layout = content;
  globals.request = { ...globals.request, page_type: templateName.replace('.json', '') };
  const scope2 = new Liquid.Scope(null);
  const layout = Liquid.renderTemplate(read('layout/theme.liquid'), scope2, makeContext(globals));
  return layout;
}

/* Render the cart-drawer section alone (for the ?sections= API the theme JS uses). */
function renderSectionHTML(name, templateSettings, extraGlobals) {
  const globals = { ...baseGlobals, ...extraGlobals };
  const scope = new Liquid.Scope(null);
  const ctx = makeContext(globals);
  const parts = [];
  ctx.renderSectionByName(name, templateSettings || {}, scope, ctx, parts);
  return parts.join('\n');
}

module.exports = {
  renderPage,
  renderSectionHTML,
  makeContext,
  baseGlobals,
  settings,
  catalog,
  schemaDefaults,
  productFor,
  THEME,
  bannerMessage: 'DEMO PREVIEW — sample data, not the live store',
};
