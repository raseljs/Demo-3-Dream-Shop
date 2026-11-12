// Admin: create and manage flash sales.
const express = require('express');
const db = require('../../db');
const H = require('../../utils/helpers');
const { ah, fail } = H;
const flash = require('../../services/flash');

const router = express.Router();

const toDateTime = (v) => {
  if (!v) return null;
  const s = String(v).replace('T', ' ');
  return s.length === 16 ? `${s}:00` : s.slice(0, 19);
};

router.get('/', ah(async (req, res) => {
  const rows = await db.query(
    `SELECT f.*, (SELECT COUNT(*) FROM flash_sale_items i WHERE i.flash_sale_id = f.id) AS items_count
     FROM flash_sales f ORDER BY f.id DESC LIMIT 200`
  );
  res.json({ data: rows, now: db.now() });
}));

router.get('/:id', ah(async (req, res) => {
  const f = await db.one('SELECT * FROM flash_sales WHERE id = ?', [req.params.id]);
  if (!f) fail(404, 'Flash sale not found');
  f.items = await db.query(
    `SELECT i.id, i.product_id, i.flash_price, p.name, p.thumbnail, p.type, p.regular_price,
       COALESCE(i.original_sale_price, p.sale_price) AS sale_price
     FROM flash_sale_items i JOIN products p ON p.id = i.product_id WHERE i.flash_sale_id = ? ORDER BY i.id`,
    [f.id]
  );
  res.json(f);
}));

async function save(body, existing) {
  const title = String(body.title || '').trim();
  if (!title) fail(422, 'Give the flash sale a name');
  const starts_at = toDateTime(body.starts_at);
  const ends_at = toDateTime(body.ends_at);
  if (!starts_at || !ends_at) fail(422, 'Choose the start and end time');
  if (ends_at <= starts_at) fail(422, 'The end time must be after the start time');
  const items = (Array.isArray(body.items) ? body.items : []).filter((i) => H.int(i.product_id));
  if (!items.length) fail(422, 'Add at least one product');
  const ids = [...new Set(items.map((i) => H.int(i.product_id)))];
  const products = await db.query('SELECT id, name, regular_price FROM products WHERE id IN (?)', [ids]);
  for (const it of items) {
    const p = products.find((x) => Number(x.id) === H.int(it.product_id));
    if (!p) fail(422, 'A product in this sale no longer exists');
    const price = H.money(it.flash_price);
    if (price <= 0) fail(422, `Enter a flash price for "${p.name}"`);
    if (Number(p.regular_price) > 0 && price >= Number(p.regular_price)) fail(422, `Flash price for "${p.name}" must be lower than its regular price (৳${Number(p.regular_price)})`);
  }
  // the same product can't be in two sales that overlap in time
  const clash = await db.one(
    `SELECT f.title, p.name FROM flash_sale_items i JOIN flash_sales f ON f.id = i.flash_sale_id JOIN products p ON p.id = i.product_id
     WHERE i.product_id IN (?) AND f.state <> 'ended' AND f.status = 1 AND f.id <> ? AND f.starts_at < ? AND f.ends_at > ? LIMIT 1`,
    [ids, existing ? existing.id : 0, ends_at, starts_at]
  );
  if (clash) fail(422, `"${clash.name}" is already in the flash sale "${clash.title}" at that time`);

  const data = { title, starts_at, ends_at, status: H.bool(body.status ?? 1) ? 1 : 0 };
  let id;
  if (existing) {
    await flash.stopSale(existing.id); // put original prices back before changing anything
    await db.update('flash_sales', existing.id, { ...data, state: 'scheduled' });
    await db.query('DELETE FROM flash_sale_items WHERE flash_sale_id = ?', [existing.id]);
    id = existing.id;
  } else {
    id = await db.insert('flash_sales', { ...data, state: 'scheduled', created_at: db.now() });
  }
  for (const it of items) await db.insert('flash_sale_items', { flash_sale_id: id, product_id: H.int(it.product_id), flash_price: H.money(it.flash_price) });
  await flash.tick(); // starts immediately if the start time has already passed
  return id;
}

router.post('/', ah(async (req, res) => res.status(201).json({ id: await save(req.body || {}, null) })));

router.put('/:id', ah(async (req, res) => {
  const existing = await db.one('SELECT * FROM flash_sales WHERE id = ?', [req.params.id]);
  if (!existing) fail(404, 'Flash sale not found');
  res.json({ id: await save(req.body || {}, existing) });
}));

router.delete('/:id', ah(async (req, res) => {
  const s = await flash.stopSale(H.int(req.params.id));
  if (!s) fail(404, 'Flash sale not found');
  await db.query('DELETE FROM flash_sale_items WHERE flash_sale_id = ?', [s.id]);
  await db.remove('flash_sales', s.id);
  res.json({ ok: true });
}));

module.exports = router;
