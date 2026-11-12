// Bulk product tools: CSV export, CSV import (create new products / update price & stock by SKU),
// and bulk price change by category or brand.
const express = require('express');
const db = require('../../db');
const H = require('../../utils/helpers');
const { ah, fail } = H;
const { logMovement } = require('../../services/stock');
const { revalidate } = require('../../services/revalidate');

const router = express.Router();

const COLUMNS = ['id', 'type', 'sku', 'parent_sku', 'name', 'variant_name', 'category', 'brand', 'regular_price', 'sale_price', 'purchase_price', 'qty', 'status'];

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** RFC-4180 CSV parser (quotes, commas and new lines inside quotes, BOM, CRLF). */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true; // a quote only opens a quoted field at its start
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

// ---------- Export ----------
router.get('/export', ah(async (req, res) => {
  const products = await db.query(
    `SELECT p.*, b.name AS brand_name,
       (SELECT c.name FROM product_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.product_id = p.id ORDER BY c.parent_id IS NULL, c.id LIMIT 1) AS category_name
     FROM products p LEFT JOIN brands b ON b.id = p.brand_id ORDER BY p.id`
  );
  const variants = await db.query('SELECT * FROM product_variants ORDER BY product_id, id');
  const lines = [COLUMNS.join(',')];
  for (const p of products) {
    lines.push([p.id, p.type, p.sku, '', p.name, '', p.category_name, p.brand_name, p.regular_price, p.sale_price, p.purchase_price, p.qty, p.status].map(csvCell).join(','));
    for (const v of variants.filter((x) => Number(x.product_id) === Number(p.id))) {
      lines.push([v.id, 'variant', v.sku, p.sku, p.name, v.name, '', '', v.regular_price, v.sale_price, v.purchase_price, v.qty, ''].map(csvCell).join(','));
    }
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="products-${db.today()}.csv"`);
  res.send('﻿' + lines.join('\r\n'));
}));

// ---------- Import ----------
const money = (v) => (v === undefined || String(v).trim() === '' ? undefined : H.money(String(v).replace(/[^\d.-]/g, '')));
const intOrU = (v) => (v === undefined || String(v).trim() === '' ? undefined : H.int(String(v).replace(/[^\d-]/g, '')));

router.post('/import', ah(async (req, res) => {
  const dry = req.body.dry_run !== false;
  const table = parseCSV(req.body.csv);
  if (table.length < 2) fail(422, 'The file has no product rows. Export first to see the expected columns.');
  const head = table[0].map((h) => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
  if (!head.includes('sku') && !head.includes('id') && !head.includes('name')) fail(422, 'The first row must contain column names (sku, name, regular_price, sale_price, qty …)');
  if (table.length > 5001) fail(422, 'Please import at most 5000 rows at a time');

  const cats = await db.query('SELECT id, name, slug FROM categories');
  const brands = await db.query('SELECT id, name FROM brands');
  const findCat = (v) => { const k = String(v || '').trim().toLowerCase(); return k ? cats.find((c) => c.name.toLowerCase() === k || c.slug === k) : null; };
  const result = { created: 0, updated: 0, unchanged: 0, errors: [], dry_run: dry };
  const touched = new Set();

  for (let r = 1; r < table.length; r++) {
    const row = Object.fromEntries(head.map((h, i) => [h, table[r][i] !== undefined ? String(table[r][i]).trim() : undefined]));
    const lineNo = r + 1;
    const err = (m) => result.errors.push(`Row ${lineNo}: ${m}`);
    try {
      const regular = money(row.regular_price);
      const sale = money(row.sale_price);
      const purchase = money(row.purchase_price);
      const qty = intOrU(row.qty);
      if (regular !== undefined && sale !== undefined && sale > 0 && regular > 0 && sale > regular) { err('sale price is higher than the regular price'); continue; }

      // 1) a variation row
      let variant = null;
      if (row.sku) variant = await db.one('SELECT * FROM product_variants WHERE sku = ? LIMIT 1', [row.sku]);
      if (!variant && row.type === 'variant' && H.int(row.id)) variant = await db.one('SELECT * FROM product_variants WHERE id = ?', [H.int(row.id)]);
      if (variant) {
        const data = {};
        if (regular !== undefined) data.regular_price = regular;
        if (sale !== undefined) data.sale_price = sale;
        if (purchase !== undefined) data.purchase_price = purchase;
        if (qty !== undefined) data.qty = qty;
        const changed = Object.keys(data).filter((k) => Number(data[k]) !== Number(variant[k]));
        if (!changed.length) { result.unchanged++; continue; }
        result.updated++;
        if (!dry) {
          await db.update('product_variants', variant.id, data);
          if (data.qty !== undefined && data.qty !== H.int(variant.qty)) {
            await db.query('UPDATE products SET qty = (SELECT COALESCE(SUM(qty),0) FROM product_variants WHERE product_id = ?) WHERE id = ?', [variant.product_id, variant.product_id]);
            await logMovement({ product_id: variant.product_id, variant_id: variant.id, change: data.qty - H.int(variant.qty) },
              { reason: 'import', ref_type: 'import', ref_label: 'CSV import', user_id: req.user.id });
          }
          touched.add(variant.product_id);
        }
        continue;
      }
      if (row.type === 'variant') { err(`variation with SKU "${row.sku || row.id}" not found`); continue; }

      // 2) an existing product
      let p = null;
      if (row.sku) p = await db.one('SELECT * FROM products WHERE sku = ? LIMIT 1', [row.sku]);
      if (!p && H.int(row.id)) p = await db.one('SELECT * FROM products WHERE id = ?', [H.int(row.id)]);
      const cat = row.category ? findCat(row.category) : null;
      if (row.category && !cat) { err(`category "${row.category}" not found (create it first)`); continue; }

      let brandId;
      if (row.brand) {
        const b = brands.find((x) => x.name.toLowerCase() === row.brand.toLowerCase());
        if (b) brandId = b.id;
        else if (!dry) {
          brandId = await db.insert('brands', { name: row.brand, slug: await H.uniqueSlug('brands', row.brand), created_at: db.now() });
          brands.push({ id: brandId, name: row.brand });
        } else brandId = -1;
      }

      if (p) {
        const data = {};
        if (row.name) data.name = row.name;
        if (regular !== undefined) data.regular_price = regular;
        if (sale !== undefined) data.sale_price = sale;
        if (purchase !== undefined) data.purchase_price = purchase;
        if (qty !== undefined && p.type === 'simple') data.qty = qty;
        if (row.status === 'published' || row.status === 'draft') data.status = row.status;
        if (brandId !== undefined && brandId !== -1) data.brand_id = brandId;
        const changed = Object.keys(data).filter((k) => String(data[k]) !== String(p[k] ?? '') && Number(data[k]) !== Number(p[k]));
        const catChange = cat && !(await db.one('SELECT 1 AS x FROM product_categories WHERE product_id = ? AND category_id = ?', [p.id, cat.id]));
        if (!changed.length && !catChange && brandId !== -1) { result.unchanged++; continue; }
        result.updated++;
        if (!dry) {
          await db.update('products', p.id, { ...data, updated_at: db.now() });
          if (catChange) {
            await db.query('DELETE FROM product_categories WHERE product_id = ?', [p.id]);
            await db.query('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)', [p.id, cat.id]);
          }
          if (data.qty !== undefined && data.qty !== H.int(p.qty)) {
            await logMovement({ product_id: p.id, name: data.name || p.name, change: data.qty - H.int(p.qty) },
              { reason: 'import', ref_type: 'import', ref_label: 'CSV import', user_id: req.user.id });
          }
          touched.add(p.id);
        }
        continue;
      }

      // 3) a new product
      if (!row.name) { err('new products need a name'); continue; }
      if (!regular && !sale) { err(`"${row.name}" needs a regular_price`); continue; }
      result.created++;
      if (!dry) {
        const now = db.now();
        const id = await db.insert('products', {
          name: row.name, slug: await H.uniqueSlug('products', row.name), sku: row.sku || null, type: 'simple',
          regular_price: regular || sale, sale_price: sale || 0, purchase_price: purchase || 0, qty: qty || 0,
          brand_id: brandId && brandId > 0 ? brandId : null, status: row.status === 'draft' ? 'draft' : 'published',
          images: '[]', attributes: '[]', created_at: now, updated_at: now,
        });
        if (cat) await db.query('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)', [id, cat.id]);
        if (qty) await logMovement({ product_id: id, name: row.name, change: qty }, { reason: 'import', ref_type: 'import', ref_label: 'CSV import (new)', user_id: req.user.id });
      }
    } catch (e) {
      err(e.message);
    }
  }
  if (!dry) revalidate('products', 'home');
  res.json(result);
}));

// ---------- Bulk price change ----------
router.post('/bulk-price', ah(async (req, res) => {
  const b = req.body || {};
  const dry = b.dry_run !== false;
  const value = Number(b.value);
  if (!(value > 0)) fail(422, 'Enter how much to change the price');
  const mode = b.mode === 'fixed' ? 'fixed' : 'percent';
  const dir = b.direction === 'decrease' ? -1 : 1;
  const field = ['regular', 'sale', 'both'].includes(b.field) ? b.field : 'both';
  const roundTo = Math.max(0, H.int(b.round_to));
  if (mode === 'percent' && dir < 0 && value >= 100) fail(422, 'A decrease must be less than 100%');

  const where = [];
  const params = [];
  if (H.int(b.category_id)) { where.push('p.id IN (SELECT product_id FROM product_categories WHERE category_id = ?)'); params.push(H.int(b.category_id)); }
  if (H.int(b.brand_id)) { where.push('p.brand_id = ?'); params.push(H.int(b.brand_id)); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const products = await db.query(`SELECT p.id, p.name, p.type, p.regular_price, p.sale_price FROM products p ${w}`, params);
  if (!products.length) fail(422, 'No products match this category/brand');

  const calc = (price) => {
    const n = Number(price);
    if (!(n > 0)) return n;
    let out = mode === 'percent' ? n * (1 + (dir * value) / 100) : n + dir * value;
    if (roundTo > 0) out = Math.round(out / roundTo) * roundTo;
    return Math.max(1, H.money(out));
  };
  const next = (row) => {
    const reg = field === 'sale' ? Number(row.regular_price) : calc(row.regular_price);
    let sale = field === 'regular' ? Number(row.sale_price) : calc(row.sale_price);
    if (sale > 0 && reg > 0 && sale >= reg) sale = 0; // sale price above regular makes no sense → drop the discount
    return { regular_price: reg, sale_price: sale };
  };

  // only products whose price really changes are counted and shown
  const changed = [];
  let discountRemoved = 0;
  for (const p of products) {
    const before = { regular_price: Number(p.regular_price), sale_price: Number(p.sale_price) };
    const after = next(p);
    if (after.regular_price === before.regular_price && after.sale_price === before.sale_price && p.type !== 'variable') continue;
    if (before.sale_price > 0 && !(after.sale_price > 0)) discountRemoved += 1;
    changed.push({ p, before, after });
  }
  const preview = changed.slice(0, 8).map(({ p, before, after }) => ({ name: p.name, before, after }));
  if (!dry) {
    for (const { p } of changed) {
      await db.update('products', p.id, { ...next(p), updated_at: db.now() });
      if (p.type === 'variable') {
        const vs = await db.query('SELECT id, regular_price, sale_price FROM product_variants WHERE product_id = ?', [p.id]);
        for (const v of vs) await db.update('product_variants', v.id, next(v));
      }
    }
    revalidate('products', 'home');
  }
  res.json({ count: changed.length, matched: products.length, discount_removed: discountRemoved, preview, dry_run: dry });
}));

module.exports = router;
