const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../../db');
const H = require('../../utils/helpers');
const { ah, fail } = H;
const { requireStaff, can, PERMISSIONS } = require('../../middleware/auth');
const { getSettings, saveGroup } = require('../../services/settings');
const { revalidate } = require('../../services/revalidate');
const { makeCrud, resources } = require('./crud');
const { activityLogger } = require('../../services/activity');

const router = express.Router();
router.use(requireStaff);
router.use(activityLogger); // records who changed what

// ---------- File upload (raw body: fetch(url, { body: file })) ----------
const TYPES = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
  'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'video/mp4': 'mp4', 'video/webm': 'webm',
};
const UPLOAD_ROOT = path.join(__dirname, '..', '..', '..', 'uploads');

router.post('/upload', express.raw({ type: () => true, limit: '60mb' }), ah(async (req, res) => {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) fail(422, 'Only JPG, PNG, WEBP, GIF, AVIF, ICO images or MP4/WEBM videos are allowed');
  const buf = req.body;
  if (!Buffer.isBuffer(buf) || !buf.length) fail(422, 'Empty file');
  if (!type.startsWith('video/') && buf.length > 8 * 1024 * 1024) fail(422, 'Images must be smaller than 8 MB');
  const [y, m] = db.today().split('-');
  const dir = path.join(UPLOAD_ROOT, y, m);
  fs.mkdirSync(dir, { recursive: true });
  const base = String(req.headers['x-filename'] || 'file').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'file';
  const name = `${base}-${H.randomToken(5)}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  res.status(201).json({ url: `/uploads/${y}/${m}/${name}` });
}));

// Import an image from a web link (the server downloads it, so it works for any site's photo link)
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|\[?::1\]?$)/i;
router.post('/upload/url', ah(async (req, res) => {
  let link;
  try { link = new URL(String(req.body?.url || '').trim()); } catch { fail(422, 'Paste a full image link starting with https://'); }
  if (!/^https?:$/.test(link.protocol) || PRIVATE_HOST.test(link.hostname)) fail(422, 'Paste a public image link starting with https://');
  let r;
  try {
    r = await fetch(link, {
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8' },
    });
  } catch { fail(422, 'Could not reach that link'); }
  if (!r.ok) fail(422, `Could not download the image (error ${r.status})`);
  const type = String(r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext || type.startsWith('video/')) fail(422, 'That link is not a JPG, PNG, WEBP, GIF or AVIF image');
  const buf = Buffer.from(await r.arrayBuffer());
  if (!buf.length) fail(422, 'The image is empty');
  if (buf.length > 8 * 1024 * 1024) fail(422, 'Images must be smaller than 8 MB');
  const [y, m] = db.today().split('-');
  const dir = path.join(UPLOAD_ROOT, y, m);
  fs.mkdirSync(dir, { recursive: true });
  const fromLink = decodeURIComponent(link.pathname.split('/').pop() || '');
  const base = String(req.body?.name || fromLink || 'image').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image';
  const name = `${base}-${H.randomToken(5)}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  res.status(201).json({ url: `/uploads/${y}/${m}/${name}` });
}));

// ---------- Product import: read a public page from a trusted catalogue site ----------
const IMPORT_HOSTS = /(^|\.)(dazzle\.com\.bd|daraz\.com\.bd)$/i;
router.post('/import/fetch', can('products'), ah(async (req, res) => {
  let link;
  try { link = new URL(String(req.body?.url || '').trim()); } catch { fail(422, 'Invalid link'); }
  if (link.protocol !== 'https:' || !IMPORT_HOSTS.test(link.hostname)) fail(422, 'Only dazzle.com.bd and daraz.com.bd pages can be imported');
  let r;
  try {
    r = await fetch(link, {
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
        accept: String(req.body?.accept || 'text/html,application/json;q=0.9,*/*;q=0.8'),
        'accept-language': 'en-US,en;q=0.9',
      },
    });
  } catch { fail(422, 'Could not reach that page'); }
  const body = await r.text();
  res.json({ status: r.status, type: r.headers.get('content-type') || '', body: body.slice(0, 4000000) });
}));

// ---------- Lookups for forms & dropdowns ----------
router.get('/meta', ah(async (req, res) => {
  const [categories, brands, attributes, size_charts, staff, roles, expense_categories] = await Promise.all([
    db.query('SELECT id, name, parent_id FROM categories ORDER BY sort_order, name'),
    db.query('SELECT id, name FROM brands ORDER BY name'),
    db.query('SELECT id, name, options FROM attributes ORDER BY name'),
    db.query('SELECT id, name FROM size_charts ORDER BY name'),
    db.query('SELECT id, name FROM users WHERE is_staff = 1 AND status = 1 ORDER BY name'),
    db.query('SELECT id, name FROM roles ORDER BY id'),
    db.query('SELECT id, name FROM expense_categories ORDER BY name'),
  ]);
  attributes.forEach((a) => { a.options = H.parseJSON(a.options, []); });
  res.json({ categories, brands, attributes, size_charts, staff, roles, expense_categories, permissions: PERMISSIONS });
}));

// ---------- Dashboard ----------
router.get('/dashboard', can('dashboard'), ah(async (req, res) => {
  const { general } = await getSettings();
  const from = req.query.from || db.today().slice(0, 8) + '01';
  const to = req.query.to || db.today();
  const f = `${from} 00:00:00`;
  const t = `${to} 23:59:59`;
  const [low, customers, orders, statuses, sales, recent, todayRow] = await Promise.all([
    db.one("SELECT COUNT(*) AS c FROM products WHERE status = 'published' AND qty <= ?", [H.int(general.low_stock_alert, 5)]),
    db.one('SELECT COUNT(*) AS c FROM users WHERE is_staff = 0 AND created_at BETWEEN ? AND ?', [f, t]),
    db.one("SELECT COUNT(*) AS c, COALESCE(SUM(CASE WHEN delivery_status <> 'cancel' THEN total ELSE 0 END), 0) AS revenue FROM orders WHERE created_at BETWEEN ? AND ?", [f, t]),
    db.query('SELECT delivery_status, COUNT(*) AS c FROM orders WHERE created_at BETWEEN ? AND ? GROUP BY delivery_status', [f, t]),
    db.query(
      `SELECT SUBSTR(created_at, 1, 10) AS day, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS amount FROM orders
       WHERE created_at >= ? AND delivery_status <> 'cancel' GROUP BY SUBSTR(created_at, 1, 10) ORDER BY day`, [`${db.today(-29)} 00:00:00`]
    ),
    db.query('SELECT id, order_no, name, phone, total, delivery_status, payment_status, created_at FROM orders ORDER BY id DESC LIMIT 10'),
    db.one("SELECT COUNT(*) AS c, COALESCE(SUM(total), 0) AS amount FROM orders WHERE created_at >= ? AND delivery_status <> 'cancel'", [`${db.today()} 00:00:00`]),
  ]);
  // Fill missing days with zero for a smooth chart
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = db.today(-i);
    const row = sales.find((s) => s.day === d);
    days.push({ day: d, orders: row ? Number(row.orders) : 0, amount: row ? Number(row.amount) : 0 });
  }
  const st = Object.fromEntries(statuses.map((s) => [s.delivery_status, Number(s.c)]));
  res.json({
    from, to,
    low_stock: Number(low.c),
    new_customers: Number(customers.c),
    orders: Number(orders.c),
    revenue: Number(orders.revenue),
    today: { orders: Number(todayRow.c), amount: Number(todayRow.amount) },
    statuses: { pending: st.pending || 0, confirmed: st.confirmed || 0, on_the_way: st.on_the_way || 0, delivered: st.delivered || 0, cancel: st.cancel || 0 },
    sales_30_days: days,
    recent_orders: recent,
  });
}));

// ---------- Settings ----------
router.get('/settings', can('settings'), ah(async (req, res) => res.json(await getSettings())));
router.put('/settings/:group', can('settings'), ah(async (req, res) => {
  const saved = await saveGroup(req.params.group, req.body || {});
  revalidate('layout', 'home', 'products', 'campaigns', 'pages');
  res.json(saved);
}));

// ---------- Modules ----------
// POS staff may read the product list, only `products` permission can change it
router.use('/products', (req, res, next) => (req.method === 'GET' ? can('products', 'pos') : can('products'))(req, res, next), require('./products'));
router.use('/product-tools', can('products'), require('./product-tools'));
router.use('/reports', can('reports'), require('./reports'));
router.use('/', require('./inventory'));
router.use('/', require('./settlements'));
router.use('/flash-sales', can('marketing'), require('./flash'));
router.use('/', require('./customers'));
router.use('/', require('./system'));
router.use('/users', can('users'), require('./users'));
router.use('/', require('./orders'));

for (const [name, def] of Object.entries(resources)) {
  router.use(`/${name}`, can(def.perm), makeCrud(def));
}

module.exports = router;
