// Storefront API (no login needed unless noted)
const express = require('express');
const db = require('../db');
const H = require('../utils/helpers');
const { ah, fail } = H;
const { requireAuth } = require('../middleware/auth');
const { publicSettings } = require('../services/settings');
const { quote, createOrder, getOrder } = require('../services/orders');
const { startPayment } = require('../services/payment');
const C = require('./catalog');
const { activeSale } = require('../services/flash');
const { sendPurchase } = require('../services/fbcapi');

const router = express.Router();

const menuMap = async () => {
  const rows = await db.query('SELECT location, items FROM menus');
  return Object.fromEntries(rows.map((m) => [m.location, H.parseJSON(m.items, [])]));
};

// Everything the shared layout needs (header, footer, menus) in one request
router.get('/layout', ah(async (req, res) => {
  const [settings, menus, cats] = await Promise.all([publicSettings(), menuMap(), C.allCategories()]);
  res.json({ settings, menus, categories: C.buildTree(cats) });
}));

router.get('/settings', ah(async (req, res) => res.json(await publicSettings())));

router.get('/home', ah(async (req, res) => {
  const sliders = await db.query('SELECT id, type, position, title, link, desktop_media, mobile_media FROM sliders WHERE status = 1 ORDER BY sort_order ASC, id ASC');
  const cats = await C.allCategories();
  const featured = cats.filter((c) => Number(c.featured));
  const homeCats = cats.filter((c) => Number(c.show_on_home));
  const sections = await Promise.all(homeCats.map(async (c) => ({
    category: { id: c.id, name: c.name, slug: c.slug, description: c.description },
    products: (await C.listProducts({ categoryIds: C.descendantIds(cats, c.id), per_page: 10 })).data,
  })));
  const latest = (await C.listProducts({ sort: 'latest', per_page: 10 })).data;
  // live flash sale (if any) with its products
  let flash = null;
  const sale = await activeSale();
  if (sale) {
    const rows = await db.query(
      `SELECT ${C.CARD_COLS} FROM flash_sale_items i JOIN products p ON p.id = i.product_id
       WHERE i.flash_sale_id = ? AND p.status = 'published' ORDER BY i.id`, [sale.id]
    );
    if (rows.length) flash = { id: sale.id, title: sale.title, starts_at: sale.starts_at, ends_at: sale.ends_at, products: rows.map(C.card) };
  }
  res.json({
    flash,
    sliders: sliders.filter((s) => s.position === 'hero'),
    banners: sliders.filter((s) => s.position === 'banner'),
    featured_categories: featured.map(({ id, name, slug, image }) => ({ id, name, slug, image })),
    sections: sections.filter((s) => s.products.length),
    latest,
  });
}));

router.get('/categories', ah(async (req, res) => res.json(C.buildTree(await C.allCategories()))));

router.get('/categories/:slug', ah(async (req, res) => {
  const cats = await C.allCategories();
  const cat = cats.find((c) => c.slug === req.params.slug);
  if (!cat) fail(404, 'Category not found');
  const trail = [];
  for (let c = cat; c; c = cats.find((x) => Number(x.id) === Number(c.parent_id))) trail.unshift({ name: c.name, slug: c.slug });
  res.json({ ...cat, children: cats.filter((c) => Number(c.parent_id) === Number(cat.id)), breadcrumb: trail });
}));

router.get('/brands', ah(async (req, res) => {
  res.json(await db.query('SELECT id, name, slug, logo FROM brands ORDER BY name ASC'));
}));

router.get('/products', ah(async (req, res) => {
  const q = req.query;
  let categoryIds = null;
  if (q.category) {
    const cats = await C.allCategories();
    const ids = String(q.category).split(',').map((s) => cats.find((c) => c.slug === s)).filter(Boolean).flatMap((c) => C.descendantIds(cats, c.id));
    categoryIds = ids.length ? ids : [0];
  }
  let brandIds = null;
  if (q.brand) {
    const rows = await db.query('SELECT id FROM brands WHERE slug IN (?)', [String(q.brand).split(',')]);
    brandIds = rows.length ? rows.map((r) => r.id) : [0];
  }
  res.json(await C.listProducts({
    categoryIds, brandIds, min: q.min, max: q.max, q: q.q || q.query, sort: q.sort, page: q.page, per_page: q.per_page || 16,
  }));
}));

router.get('/products/:slug', ah(async (req, res) => {
  const p = await db.one('SELECT * FROM products WHERE slug = ? AND status = ?', [req.params.slug, 'published']);
  if (!p) fail(404, 'Product not found');
  delete p.purchase_price;
  p.images = H.parseJSON(p.images, []);
  p.attributes = H.parseJSON(p.attributes, []);
  p.price = H.priceOf(p);
  const [variants, categories, brand, sizeChart, reviews] = await Promise.all([
    db.query('SELECT id, name, attrs, sku, qty, regular_price, sale_price, image FROM product_variants WHERE product_id = ? ORDER BY id', [p.id]),
    db.query('SELECT c.id, c.name, c.slug FROM categories c JOIN product_categories pc ON pc.category_id = c.id WHERE pc.product_id = ? ORDER BY c.parent_id IS NULL DESC, c.id', [p.id]),
    p.brand_id ? db.one('SELECT id, name, slug FROM brands WHERE id = ?', [p.brand_id]) : null,
    p.size_chart_id ? db.one('SELECT id, name, image FROM size_charts WHERE id = ?', [p.size_chart_id]) : null,
    db.query(`SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name FROM reviews r LEFT JOIN users u ON u.id = r.user_id
              WHERE r.product_id = ? AND r.status = 'approved' ORDER BY r.id DESC LIMIT 50`, [p.id]),
  ]);
  p.variants = variants.map((v) => ({ ...v, attrs: H.parseJSON(v.attrs, {}), price: H.priceOf(v) }));
  p.categories = categories;
  p.brand = brand;
  p.size_chart = sizeChart;
  p.reviews = reviews;
  p.rating = reviews.length ? Math.round((reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length) * 10) / 10 : 0;
  const sale = await activeSale();
  p.flash = sale && (await db.one('SELECT id FROM flash_sale_items WHERE flash_sale_id = ? AND product_id = ? LIMIT 1', [sale.id, p.id]))
    ? { title: sale.title, ends_at: sale.ends_at } : null;
  let related = [];
  if (categories.length) {
    related = (await C.listProducts({ categoryIds: categories.map((c) => c.id), excludeId: p.id, per_page: 8 })).data;
  }
  if (related.length < 4) {
    const more = (await C.listProducts({ excludeId: p.id, sort: 'latest', per_page: 8 })).data;
    related = [...related, ...more.filter((m) => !related.find((r) => r.id === m.id))].slice(0, 8);
  }
  p.related = related;
  res.json(p);
}));

router.get('/search', ah(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  res.json((await C.listProducts({ q, per_page: 8 })).data);
}));

router.get('/pages/:slug', ah(async (req, res) => {
  const page = await db.one('SELECT id, title, slug, content FROM pages WHERE slug = ? AND status = 1', [req.params.slug]);
  if (!page) fail(404, 'Page not found');
  res.json(page);
}));

router.get('/campaigns/:slug', ah(async (req, res) => {
  const c = await db.one('SELECT * FROM campaigns WHERE slug = ? AND status = 1', [req.params.slug]);
  if (!c) fail(404, 'Campaign not found');
  c.content = H.parseJSON(c.content, {});
  c.carousel = H.parseJSON(c.carousel, []);
  c.reviews = H.parseJSON(c.reviews, []);
  if (c.product_id) {
    const p = await db.one('SELECT id, name, slug, thumbnail, regular_price, sale_price, qty, type, attributes FROM products WHERE id = ?', [c.product_id]);
    if (p) {
      p.attributes = H.parseJSON(p.attributes, []);
      p.price = H.priceOf(p);
      p.variants = (await db.query('SELECT id, name, attrs, qty, regular_price, sale_price, image FROM product_variants WHERE product_id = ?', [p.id]))
        .map((v) => ({ ...v, attrs: H.parseJSON(v.attrs, {}), price: H.priceOf(v) }));
    }
    c.product = p;
  }
  res.json(c);
}));

// Sitemap data
router.get('/sitemap', ah(async (req, res) => {
  const [products, categories, pages] = await Promise.all([
    db.query("SELECT slug, updated_at FROM products WHERE status = 'published' ORDER BY id DESC LIMIT 5000"),
    db.query('SELECT slug FROM categories'),
    db.query('SELECT slug FROM pages WHERE status = 1'),
  ]);
  res.json({ products, categories, pages });
}));

// ---------- Cart / checkout ----------
const publicLines = (lines) => lines.map(({ purchase_price, vat, vat_type, ...l }) => l); // eslint-disable-line no-unused-vars

router.post('/checkout/quote', ah(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 100) : [];
  if (!items.length) return res.json({ lines: [], subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 });
  const q = await quote({ items, area: req.body.area, coupon: req.body.coupon });
  res.json({ ...q, lines: publicLines(q.lines) });
}));

const publicOrder = (o) => ({
  id: o.id, order_no: o.order_no, name: o.name, phone: o.phone, address: o.address, city: o.city, area: o.area, note: o.note,
  subtotal: o.subtotal, shipping: o.shipping, discount: o.discount, tax: o.tax, total: o.total, paid_amount: o.paid_amount,
  payment_method: o.payment_method, payment_status: o.payment_status, delivery_status: o.delivery_status,
  courier: o.courier, courier_tracking: o.courier_tracking, created_at: o.created_at,
  items: (o.items || []).map((i) => ({ id: i.id, product_id: i.product_id, name: i.name, variant_name: i.variant_name, image: i.image, qty: i.qty, price: i.price })),
});

router.post('/orders', ah(async (req, res) => {
  const source = req.body.source === 'landing' ? 'landing' : 'web';
  const order = await createOrder(req.body, { user: req.user, source });
  sendPurchase(order, req); // Facebook Conversions API (runs in the background)
  let payment_url = null;
  let payment_error = null;
  try {
    payment_url = await startPayment(order);
  } catch (e) {
    payment_error = e.message;
  }
  res.status(201).json({ order: publicOrder(order), key: order.access_key, payment_url, payment_error });
}));

router.get('/orders/view/:orderNo', ah(async (req, res) => {
  const order = await getOrder(String(req.params.orderNo));
  const owner = req.user && Number(order?.user_id) === Number(req.user.id);
  if (!order || (!owner && order.access_key !== req.query.key)) fail(404, 'Order not found');
  res.json(publicOrder(order));
}));

// Track by order number or phone number
router.get('/orders/track', ah(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) fail(422, 'Enter your order number or phone number');
  const phone = H.normalizePhone(q);
  const rows = phone
    ? await db.query('SELECT order_no, created_at, total, delivery_status, payment_status, courier, courier_tracking FROM orders WHERE phone = ? ORDER BY id DESC LIMIT 10', [phone])
    : await db.query('SELECT order_no, created_at, total, delivery_status, payment_status, courier, courier_tracking FROM orders WHERE order_no = ? LIMIT 1', [q.replace(/^#/, '')]);
  if (!rows.length) fail(404, 'No order found. Please check the number and try again.');
  res.json(rows);
}));

// Abandoned-checkout capture ("Incomplete orders" in admin)
router.post('/incomplete', ah(async (req, res) => {
  const b = req.body || {};
  const phone = H.normalizePhone(b.phone);
  const token = String(b.token || '').slice(0, 64);
  if (!token || !phone) return res.json({ ok: false });
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 50).map((i) => ({
    product_id: H.int(i.product_id), variant_id: H.int(i.variant_id) || null, name: String(i.name || '').slice(0, 255),
    variant_name: i.variant_name ? String(i.variant_name).slice(0, 255) : null, qty: H.int(i.qty, 1), price: H.num(i.price),
  }));
  const data = {
    name: String(b.name || '').slice(0, 150) || null, phone, email: b.email ? String(b.email).slice(0, 150) : null,
    address: String(b.address || '').slice(0, 500) || null, items: JSON.stringify(items), total: H.money(b.total), updated_at: db.now(),
  };
  const row = await db.one('SELECT id FROM incomplete_orders WHERE token = ?', [token]);
  if (row) await db.update('incomplete_orders', row.id, data);
  else await db.insert('incomplete_orders', { ...data, token, created_at: db.now() });
  res.json({ ok: true });
}));

router.post('/reviews', requireAuth, ah(async (req, res) => {
  const product_id = H.int(req.body.product_id);
  const rating = Math.min(5, Math.max(1, H.int(req.body.rating, 5)));
  const comment = String(req.body.comment || '').trim().slice(0, 2000);
  if (!product_id) fail(422, 'Product missing');
  if (!comment) fail(422, 'Please write a short review');
  await db.insert('reviews', { product_id, user_id: req.user.id, rating, comment, status: 'pending', created_at: db.now() });
  res.status(201).json({ message: 'Thank you! Your review will appear after approval.' });
}));

// ---------- Customer area ----------
router.get('/my/orders', requireAuth, ah(async (req, res) => {
  const rows = await db.query(
    `SELECT id, order_no, created_at, total, delivery_status, payment_status,
            (SELECT COUNT(*) FROM order_items i WHERE i.order_id = orders.id) AS items_count
     FROM orders WHERE user_id = ? OR phone = ? ORDER BY id DESC LIMIT 200`,
    [req.user.id, req.user.phone || '-']
  );
  const count = (s) => rows.filter((r) => r.delivery_status === s).length;
  res.json({ orders: rows, stats: { total: rows.length, pending: count('pending') + count('confirmed') + count('on_the_way'), delivered: count('delivered') } });
}));

router.get('/my/orders/:orderNo', requireAuth, ah(async (req, res) => {
  const order = await getOrder(String(req.params.orderNo));
  if (!order || (Number(order.user_id) !== Number(req.user.id) && order.phone !== req.user.phone)) fail(404, 'Order not found');
  res.json(publicOrder(order));
}));

module.exports = router;
