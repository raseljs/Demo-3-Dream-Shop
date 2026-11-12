const express = require('express');
const db = require('../../db');
const H = require('../../utils/helpers');
const { ah, fail } = H;
const { revalidate } = require('../../services/revalidate');
const { getSettings } = require('../../services/settings');
const { logMovement } = require('../../services/stock');

const router = express.Router();

router.get('/', ah(async (req, res) => {
  const q = req.query;
  const pg = H.pagination(req, 20, 500);
  const where = [];
  const params = [];
  if (q.search) { where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.id IN (SELECT product_id FROM product_variants WHERE sku LIKE ?))'); params.push(`%${q.search}%`, `%${q.search}%`, `%${q.search}%`); }
  if (q.status) { where.push('p.status = ?'); params.push(q.status); }
  if (q.brand_id) { where.push('p.brand_id = ?'); params.push(q.brand_id); }
  if (q.category_id) { where.push('p.id IN (SELECT product_id FROM product_categories WHERE category_id = ?)'); params.push(q.category_id); }
  if (q.stock === 'out') where.push('p.qty <= 0');
  if (q.stock === 'low') {
    const { general } = await getSettings();
    where.push('p.qty <= ?');
    params.push(H.int(general.low_stock_alert, 5));
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await db.one(`SELECT COUNT(*) AS c FROM products p ${w}`, params)).c;
  const rows = await db.query(
    `SELECT p.id, p.name, p.slug, p.sku, p.type, p.thumbnail, p.regular_price, p.sale_price, p.purchase_price, p.qty, p.status, p.created_at,
            b.name AS brand_name,
            (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id) AS variants_count
     FROM products p LEFT JOIN brands b ON b.id = p.brand_id ${w}
     ORDER BY p.id DESC LIMIT ? OFFSET ?`,
    [...params, pg.per_page, pg.offset]
  );
  if (rows.length) {
    const cats = await db.query(
      'SELECT pc.product_id, c.name FROM product_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.product_id IN (?)',
      [rows.map((r) => r.id)]
    );
    for (const r of rows) r.categories = cats.filter((c) => Number(c.product_id) === Number(r.id)).map((c) => c.name);
  }
  // Variants are needed by POS & label printer
  if (q.with_variants && rows.length) {
    const vs = await db.query('SELECT id, product_id, name, sku, qty, regular_price, sale_price, purchase_price, image FROM product_variants WHERE product_id IN (?)', [rows.map((r) => r.id)]);
    for (const r of rows) r.variants = vs.filter((v) => Number(v.product_id) === Number(r.id));
  }
  res.json(H.paged(rows, total, pg));
}));

router.get('/:id', ah(async (req, res) => {
  const p = await db.one('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!p) fail(404, 'Product not found');
  p.images = H.parseJSON(p.images, []);
  p.attributes = H.parseJSON(p.attributes, []);
  p.category_ids = (await db.query('SELECT category_id FROM product_categories WHERE product_id = ?', [p.id])).map((r) => r.category_id);
  p.variants = (await db.query('SELECT * FROM product_variants WHERE product_id = ? ORDER BY id', [p.id])).map((v) => ({ ...v, attrs: H.parseJSON(v.attrs, {}) }));
  res.json(p);
}));

async function saveProduct(body, existing, user = null) {
  const name = String(body.name || '').trim();
  if (!name) fail(422, 'Product name is required');
  const type = body.type === 'variable' ? 'variable' : 'simple';
  const images = (Array.isArray(body.images) ? body.images : []).filter(Boolean);
  const data = {
    name,
    sku: H.nullIfEmpty(String(body.sku ?? '').trim()),
    type,
    short_des: H.nullIfEmpty(body.short_des),
    long_des: H.nullIfEmpty(body.long_des),
    purchase_price: H.money(body.purchase_price),
    regular_price: H.money(body.regular_price),
    sale_price: H.money(body.sale_price),
    qty: H.int(body.qty),
    brand_id: H.int(body.brand_id) || null,
    size_chart_id: H.int(body.size_chart_id) || null,
    vat_type: body.vat_type === 'fixed' ? 'fixed' : 'percent',
    vat: H.money(body.vat),
    free_shipping: H.bool(body.free_shipping),
    shipping_inside: H.money(body.shipping_inside),
    shipping_outside: H.money(body.shipping_outside),
    thumbnail: H.nullIfEmpty(body.thumbnail) || images[0] || null,
    images: JSON.stringify(images),
    video: H.nullIfEmpty(body.video),
    attributes: JSON.stringify(Array.isArray(body.attributes) ? body.attributes : []),
    meta_title: H.nullIfEmpty(body.meta_title),
    meta_description: H.nullIfEmpty(body.meta_description),
    status: body.status === 'draft' ? 'draft' : 'published',
    sort_order: H.int(body.sort_order),
    updated_at: db.now(),
  };
  if (data.regular_price > 0 && data.sale_price > data.regular_price) fail(422, 'Sale price cannot be higher than the regular price');

  const variants = type === 'variable' ? (Array.isArray(body.variants) ? body.variants : []) : [];
  if (type === 'variable') {
    if (!variants.length) fail(422, 'Add at least one variation (or switch to Simple product)');
    for (const v of variants) {
      v.regular_price = H.money(v.regular_price);
      v.sale_price = H.money(v.sale_price);
      if (!v.regular_price && !v.sale_price) { v.regular_price = data.regular_price; v.sale_price = data.sale_price; }
      v.purchase_price = H.money(v.purchase_price || data.purchase_price);
      v.qty = H.int(v.qty);
    }
    // product card shows the cheapest option
    const cheapest = variants.reduce((a, b) => (H.priceOf(b) < H.priceOf(a) ? b : a));
    data.regular_price = cheapest.regular_price;
    data.sale_price = cheapest.sale_price;
    data.qty = variants.reduce((s, v) => s + v.qty, 0);
  }

  if (body.slug && (!existing || body.slug !== existing.slug)) data.slug = await H.uniqueSlug('products', body.slug, existing && existing.id);
  else if (!existing) data.slug = await H.uniqueSlug('products', name);

  return db.tx(async (conn) => {
    let id;
    // remember stock before the change so manual edits show up in the stock history
    const before = existing ? await db.one('SELECT qty, type FROM products WHERE id = ?', [existing.id], conn) : null;
    const beforeVariants = existing ? await db.query('SELECT id, qty, name FROM product_variants WHERE product_id = ?', [existing.id], conn) : [];
    if (existing) {
      id = existing.id;
      await db.update('products', id, data, conn);
    } else {
      id = await db.insert('products', { ...data, created_at: db.now() }, conn);
    }
    // categories
    await db.query('DELETE FROM product_categories WHERE product_id = ?', [id], conn);
    const catIds = [...new Set((body.category_ids || []).map(Number).filter(Boolean))];
    for (const cid of catIds) await db.query('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)', [id, cid], conn);
    // variants
    const keep = [];
    for (const v of variants) {
      const row = {
        product_id: id,
        name: String(v.name || Object.values(v.attrs || {}).join(' / ') || 'Option').slice(0, 255),
        attrs: JSON.stringify(v.attrs || {}),
        sku: H.nullIfEmpty(v.sku),
        qty: v.qty,
        purchase_price: v.purchase_price,
        regular_price: v.regular_price,
        sale_price: v.sale_price,
        image: H.nullIfEmpty(v.image),
      };
      const vid = H.int(v.id);
      const owned = vid && (await db.one('SELECT id FROM product_variants WHERE id = ? AND product_id = ?', [vid, id], conn));
      if (owned) { await db.update('product_variants', vid, row, conn); keep.push(vid); }
      else keep.push(await db.insert('product_variants', row, conn));
    }
    if (keep.length) await db.query('DELETE FROM product_variants WHERE product_id = ? AND id NOT IN (?)', [id, keep], conn);
    else await db.query('DELETE FROM product_variants WHERE product_id = ?', [id], conn);

    const meta = { reason: 'adjust', ref_type: 'product', ref_id: id, ref_label: existing ? 'Edited product' : 'Opening stock', user_id: user ? user.id : null };
    if (type === 'simple') {
      const diff = H.int(data.qty) - (before && before.type === 'simple' ? H.int(before.qty) : 0);
      if (diff) await logMovement({ product_id: id, name, change: diff }, meta, conn);
    } else {
      const after = await db.query('SELECT id, qty, name FROM product_variants WHERE product_id = ?', [id], conn);
      for (const v of after) {
        const old = beforeVariants.find((b) => Number(b.id) === Number(v.id));
        const diff = H.int(v.qty) - (old ? H.int(old.qty) : 0);
        if (diff) await logMovement({ product_id: id, variant_id: v.id, name: `${name} (${v.name})`, change: diff }, meta, conn);
      }
    }
    return id;
  });
}

router.post('/', ah(async (req, res) => {
  const id = await saveProduct(req.body || {}, null, req.user);
  revalidate('products', 'home');
  res.status(201).json({ id });
}));

router.put('/:id', ah(async (req, res) => {
  const existing = await db.one('SELECT id, slug FROM products WHERE id = ?', [req.params.id]);
  if (!existing) fail(404, 'Product not found');
  await saveProduct(req.body || {}, existing, req.user);
  revalidate('products', 'home');
  res.json({ id: existing.id });
}));

// Quick inline updates from the list (status / stock / price)
router.patch('/:id', ah(async (req, res) => {
  const current = await db.one('SELECT id, name, qty, type FROM products WHERE id = ?', [req.params.id]);
  if (!current) fail(404, 'Product not found');
  const data = {};
  if (req.body.status !== undefined) data.status = req.body.status === 'draft' ? 'draft' : 'published';
  if (req.body.qty !== undefined) data.qty = H.int(req.body.qty);
  if (req.body.sale_price !== undefined) data.sale_price = H.money(req.body.sale_price);
  if (req.body.regular_price !== undefined) data.regular_price = H.money(req.body.regular_price);
  data.updated_at = db.now();
  await db.update('products', req.params.id, data);
  if (data.qty !== undefined && current.type === 'simple' && data.qty !== H.int(current.qty)) {
    await logMovement({ product_id: current.id, name: current.name, change: data.qty - H.int(current.qty) },
      { reason: 'adjust', ref_type: 'product', ref_id: current.id, ref_label: 'Quick stock edit', user_id: req.user.id });
  }
  revalidate('products', 'home');
  res.json({ ok: true });
}));

router.post('/:id/duplicate', ah(async (req, res) => {
  const p = await db.one('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!p) fail(404, 'Product not found');
  const copy = { ...p };
  delete copy.id;
  copy.name = `${p.name} (Copy)`;
  copy.slug = await H.uniqueSlug('products', `${p.slug}-copy`);
  copy.sku = p.sku ? `${p.sku}-COPY` : null;
  copy.status = 'draft';
  copy.created_at = copy.updated_at = db.now();
  const id = await db.tx(async (conn) => {
    const nid = await db.insert('products', copy, conn);
    await db.query('INSERT INTO product_categories (product_id, category_id) SELECT ?, category_id FROM product_categories WHERE product_id = ?', [nid, p.id], conn);
    const vs = await db.query('SELECT * FROM product_variants WHERE product_id = ?', [p.id], conn);
    for (const v of vs) { const nv = { ...v, product_id: nid }; delete nv.id; await db.insert('product_variants', nv, conn); }
    return nid;
  });
  res.status(201).json({ id });
}));

router.delete('/:id', ah(async (req, res) => {
  const id = H.int(req.params.id);
  await db.tx(async (conn) => {
    await db.query('DELETE FROM product_categories WHERE product_id = ?', [id], conn);
    await db.query('DELETE FROM product_variants WHERE product_id = ?', [id], conn);
    await db.query('DELETE FROM reviews WHERE product_id = ?', [id], conn);
    await db.query('DELETE FROM products WHERE id = ?', [id], conn);
  });
  revalidate('products', 'home');
  res.json({ ok: true });
}));

module.exports = router;
