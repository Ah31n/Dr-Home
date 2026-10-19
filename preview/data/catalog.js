/*
 * preview/data/catalog.js — DEMO CATALOG FOR THE LOCAL DESIGN PREVIEW ONLY.
 *
 * These records are NOT the real Shopify catalog. They exist so the real
 * theme files can be rendered locally for design review. Prices, variants,
 * availability, and copy here are invented placeholders, clearly labeled as
 * demo data everywhere they appear. The production theme renders whatever
 * the connected Shopify store actually returns — never these files.
 */

const IMG = {
  juicer: '/demo-assets/demo-juicer.png',
  iron: '/demo-assets/demo-iron.png',
};

function media(url, alt, id) {
  return {
    id,
    media_type: 'image',
    alt,
    url,
    preview_image: { url, alt },
    sources: [{ format: 'jpg', url }],
  };
}

const juicer = {
  id: 8001,
  title: 'Rechargeable USB Juicer',
  handle: 'rechargeable-usb-juicer',
  type: 'Juicers',
  vendor: 'My Store',
  description:
    '<p>A compact rechargeable juicer for fresh blends at home or on the go. ' +
    'Charges over USB. Product specifications and delivery details are being confirmed and will be published before launch.</p>' +
    '<p><em>Demo preview note: this description stands in for the real Shopify product copy.</em></p>',
  url: '/products/rechargeable-usb-juicer',
  available: true,
  price: 349900,
  compare_at_price: 429900,
  price_varies: false,
  has_only_default_variant: true,
  options_with_values: [],
  options: [],
  featured_media: media(IMG.juicer, 'Demo stand-in image — Rechargeable USB Juicer', 90001),
  media: [media(IMG.juicer, 'Demo stand-in image — Rechargeable USB Juicer', 90001)],
  variants: [
    {
      id: 90001,
      title: 'Default Title',
      option1: null,
      options: [],
      available: true,
      price: 349900,
      compare_at_price: 429900,
      sku: 'DH-JUI-001',
      featured_media: media(IMG.juicer, 'Demo stand-in image — Rechargeable USB Juicer', 90001),
      quantity_rule: { max: null },
    },
  ],
  selected_or_first_available_variant: null, // set below
};

const iron = {
  id: 8002,
  title: 'Professional Travel Iron Box',
  handle: 'professional-travel-iron-box',
  type: 'Garment Care',
  vendor: 'My Store',
  description:
    '<p>A compact travel iron with a folding handle for garment care away from home. ' +
    'Full specifications will be confirmed and published before launch.</p>' +
    '<p><em>Demo preview note: this description stands in for the real Shopify product copy.</em></p>',
  url: '/products/professional-travel-iron-box',
  available: true,
  price: 429900,
  compare_at_price: null,
  price_varies: false,
  has_only_default_variant: false,
  options_with_values: [
    { name: 'Colour', position: 1, selected_value: 'White & Copper', values: ['White & Copper', 'Graphite'] },
  ],
  options: ['White & Copper'],
  featured_media: media(IMG.iron, 'Demo stand-in image — Professional Travel Iron Box', 90002),
  media: [media(IMG.iron, 'Demo stand-in image — Professional Travel Iron Box', 90002)],
  variants: [
    {
      id: 90002,
      title: 'White & Copper',
      option1: 'White & Copper',
      options: ['White & Copper'],
      available: true,
      price: 429900,
      compare_at_price: null,
      sku: 'DH-IRN-WC',
      featured_media: media(IMG.iron, 'Demo stand-in image — Professional Travel Iron Box', 90002),
      quantity_rule: { max: null },
    },
    {
      id: 90003,
      title: 'Graphite',
      option1: 'Graphite',
      options: ['Graphite'],
      available: false,
      price: 429900,
      compare_at_price: null,
      sku: 'DH-IRN-GR',
      featured_media: null,
      quantity_rule: { max: null },
    },
  ],
  selected_or_first_available_variant: null, // set below
};

juicer.selected_or_first_available_variant = juicer.variants[0];
iron.selected_or_first_available_variant = iron.variants[0];
iron.price_varies = false;

const products = [juicer, iron];

const collections = {
  all: {
    id: 1,
    handle: 'all',
    title: 'All products',
    description: '<p>The full Dr Home range. Demo preview collection.</p>',
    url: '/collections/all',
    products,
    products_count: products.length,
    featured_image: null,
    sort_by: null,
    default_sort_by: 'manual',
  },
  frontpage: {
    id: 2,
    handle: 'frontpage',
    title: 'Home page',
    description: '',
    url: '/collections/frontpage',
    products,
    products_count: products.length,
    featured_image: null,
    sort_by: null,
    default_sort_by: 'manual',
  },
};

const linklists = {
  'main-menu': {
    handle: 'main-menu',
    title: 'Main menu',
    links: [
      { title: 'Home', url: '/', current: false },
      { title: 'Catalog', url: '/collections/all', current: false },
      { title: 'Contact', url: '/pages/contact', current: false },
    ],
  },
  footer: {
    handle: 'footer',
    title: 'Footer menu',
    links: [
      { title: 'Search', url: '/search', current: false },
      { title: 'Log in', url: '/account/login', current: false },
      { title: 'Contact', url: '/pages/contact', current: false },
    ],
  },
  'support-menu': {
    handle: 'support-menu',
    title: 'Support',
    links: [
      { title: 'Search', url: '/search', current: false },
      { title: 'Contact', url: '/pages/contact', current: false },
    ],
  },
};

const pages = {
  contact: {
    title: 'Contact',
    content:
      '<p>This is a demo placeholder page. In production, this page is created and edited in Shopify Admin, and its form and contact details come from the store configuration.</p>',
  },
};

const shop = {
  name: 'Dr Home',
  url: '',
  money_format: 'Rs {{amount}}',
  currency: { iso_code: 'PKR' },
  customer_accounts_enabled: true,
  shipping_policy: { url: null, title: 'Shipping' },
  refund_policy: { url: null, title: 'Refund policy' },
};

module.exports = { products, collections, linklists, pages, shop };
