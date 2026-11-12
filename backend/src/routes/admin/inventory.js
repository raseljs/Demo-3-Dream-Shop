// Stock in (purchases from suppliers), supplier payments & dues, and the stock history.
const express = require('express');
const db = require('../../db');
const H = require('../../utils/helpers');
const { ah, fail } = H;
const O = require('../../services/orders');
const { REASONS } = require('../../services/stock');
const { revalidate } = require('../../services/revalidate');
const { can } = require('../../middleware/auth');

const guard = can('inventory');

const router = express.Router();

// ---------- Suppliers (list with dues) ----------
const SUPPLIER_COLS = `t.*,
  (SELECT COALESCE(SUM(p.total), 0) FROM purchases p WHERE p.supplier_id = t.id) AS purchased,
  (SELECT COALESCE(SUM(sp.amount), 0) FROM supplier_payments sp WHERE sp.supplier_id = t.id) AS paid`;

router.get('/suppliers', guard, ah(async (req, res) => {
  const pg = H.pagination(req, 50, 500);
  const where = [];
  const params = [];
  if (req.query.search) { where.push('(t.name LIKE ? OR t.phone LIKE ? OR t.company LIKE ?)'); params.push(...Array(3).fill(`%${req.query.search}%`)); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await db.one(`SELECT COUNT(*) AS c FROM suppliers t ${w}`, params)).c;
  const rows = await db.query(`SELECT ${SUPPLIER_COLS} FROM suppliers t ${w} ORDER BY t.name ASC LIMIT ? OFFSET ?`, [...params, pg.per_page, pg.offset]);
  for (const r of rows) r.due = H.money(Number(r.purchased) - Number(r.paid));
  const sum = await db.one(`SELECT
    (SELECT COALESCE(SUM(total), 0) FROM purchases) AS purchased,
    (SELECT COALESCE(SUM(amount), 0) FROM supplier_payments) AS paid`);
  res.json({ ...H.paged(rows, total, pg), summary: { purchased: Number(sum.purchased), paid: Number(sum.paid), due: H.money(Number(sum.purchased) - Number(sum.paid)) } });
}));

router.get('/suppliers/:id', guard, ah(async (req, res) => {
  const s = await db.one(`SELECT ${SUPPLIER_COLS} FROM suppliers t WHERE t.id = ?`, [req.params.id]);
  if (!s) fail(404, 'Supplier not found');
  s.due = H.money(Number(s.purchased) - Number(s.paid));
  s.purchases = await db.query('SELECT id, invoice_no, purchase_date, total, created_at FROM purchases WHERE supplier_id = ? ORDER BY id DESC LIMIT 200', [s.id]);
  s.payments = await db.query(
    `SELECT sp.*, u.name AS user_name FROM supplier_payments sp LEFT JOIN users u ON u.id = sp.created_by
     WHERE sp.supplier_id = ? ORDER BY sp.id DESC LIMIT 200`, [s.id]
  );
  res.json(s);
}));

const supplierData = (b) => {
  const name = String(b.name || '').trim();
  if (!name) fail(422, 'Supplier name is required');
  return {
    name,
    phone: H.nullIfEmpty(String(b.phone ?? '').trim()),
    company: H.nullIfEmpty(String(b.company ?? '').trim()),
    address: H.nullIfEmpty(String(b.address ?? '').trim()),
    note: H.nullIfEmpty(String(b.note ?? '').trim()),
  };
};

router.post('/suppliers', guard, ah(async (req, res) => {
  const id = await db.insert('suppliers', { ...supplierData(req.body || {}), created_at: db.now() });
  res.status(201).json({ id });
}));

router.put('/suppliers/:id', guard, ah(async (req, res) => {
  await db.update('suppliers', H.int(req.params.id), supplierData(req.body || {}));
  res.json({ ok: true });
}));

router.delete('/suppliers/:id', guard, ah(async (req, res) => {
  const used = await db.one('SELECT COUNT(*) AS c FROM purchases WHERE supplier_id = ?', [req.params.id]);
  if (Number(used.c)) fail(422, 'This supplier has purchases. Delete those purchases first.');
  await db.query('DELETE FROM supplier_payments WHERE supplier_id = ?', [req.params.id]);
  await db.remove('suppliers', H.int(req.params.id));
  res.json({ ok: true });
}));

// ---------- Supplier payments ----------
router.post('/supplier-payments', guard, ah(async (req, res) => {
  const b = req.body || {};
  const supplier = await db.one('SELECT id FROM suppliers WHERE id = ?', [H.int(b.supplier_id)]);
  if (!supplier) fail(422, 'Choose a supplier');
  const amount = H.money(b.amount);
  if (amount <= 0) fail(422, 'Enter the amount paid');
  const id = await db.insert('supplier_payments', {
    supplier_id: supplier.id, purchase_id: H.int(b.purchase_id) || null, amount,
    method: H.nullIfEmpty(String(b.method ?? '').trim()), note: H.nullIfEmpty(String(b.note ?? '').trim()),
    paid_at: b.paid_at || db.today(), created_by: req.user.id, created_at: db.now(),
  });
  res.status(201).json({ id });
}));

router.delete('/supplier-payments/:id', guard, ah(async (req, res) => {
  await db.remove('supplier_payments', H.int(req.params.id));
  res.json({ ok: true });
}));

// ---------- Purchases (stock in) ----------
router.get('/purchases', guard, ah(async (req, res) => {
  const pg = H.pagination(req, 30, 200);
  const where = [];
  const params = [];
  if (req.query.supplier_id) { where.push('p.supplier_id = ?'); params.push(req.query.supplier_id); }
  if (req.query.from_date) { where.push('p.purchase_date >= ?'); params.push(req.query.from_date); }
  if (req.query.to_date) { where.push('p.purchase_date <= ?'); params.push(req.query.to_date); }
  if (req.query.search) { where.push('(p.invoice_no LIKE ? OR s.name LIKE ?)'); params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const from = 'purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id';
  const total = (await db.one(`SELECT COUNT(*) AS c FROM ${from} ${w}`, params)).c;
  const rows = await db.query(
    `SELECT p.*, s.name AS supplier_name,
       (SELECT COALESCE(SUM(qty), 0) FROM purchase_items i WHERE i.purchase_id = p.id) AS items_qty,
       (SELECT COALESCE(SUM(amount), 0) FROM supplier_payments sp WHERE sp.purchase_id = p.id) AS paid
     FROM ${from} ${w} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
    [...params, pg.per_page, pg.offset]
  );
  const sum = await db.one(`SELECT COALESCE(SUM(p.total), 0) AS total FROM ${from} ${w}`, params);
  res.json({ ...H.paged(rows, total, pg), summary: { total: Number(sum.total) } });
}));

router.get('/purchases/:id', guard, ah(async (req, res) => {
  const p = await db.one(
    `SELECT p.*, s.name AS supplier_name, s.phone AS supplier_phone, u.name AS user_name
     FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id LEFT JOIN users u ON u.id = p.created_by WHERE p.id = ?`,
    [req.params.id]
  );
  if (!p) fail(404, 'Purchase not found');
  p.items = await db.query('SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY id', [p.id]);
  p.payments = await db.query('SELECT * FROM supplier_payments WHERE purchase_id = ? ORDER BY id', [p.id]);
  res.json(p);
}));

router.post('/purchases', guard, ah(async (req, res) => {
  const b = req.body || {};
  const supplierId = H.int(b.supplier_id) || null;
  if (supplierId && !(await db.one('SELECT id FROM suppliers WHERE id = ?', [supplierId]))) fail(422, 'Supplier not found');
  const raw = (Array.isArray(b.items) ? b.items : []).filter((i) => H.int(i.product_id) && H.int(i.qty) > 0);
  if (!raw.length) fail(422, 'Add at least one product with a quantity');
  const updateCost = b.update_cost !== false;

  const id = await db.tx(async (conn) => {
    const lines = [];
    for (const it of raw) {
      const p = await db.one('SELECT id, name, type FROM products WHERE id = ?', [H.int(it.product_id)], conn);
      if (!p) fail(422, 'A product in this purchase no longer exists');
      let v = null;
      if (p.type === 'variable') {
        v = await db.one('SELECT id, name FROM product_variants WHERE id = ? AND product_id = ?', [H.int(it.variant_id), p.id], conn);
        if (!v) fail(422, `Choose a variation (size/colour) for "${p.name}"`);
      }
      const qty = H.int(it.qty);
      const cost = H.money(it.unit_cost);
      lines.push({ product_id: p.id, variant_id: v ? v.id : null, name: p.name, variant_name: v ? v.name : null, qty, unit_cost: cost, total: H.money(qty * cost) });
    }
    const subtotal = H.money(lines.reduce((s, l) => s + l.total, 0));
    const discount = Math.min(H.money(b.discount), subtotal);
    const pid = await db.insert('purchases', {
      supplier_id: supplierId, invoice_no: H.nullIfEmpty(String(b.invoice_no ?? '').trim()),
      purchase_date: b.purchase_date || db.today(), subtotal, discount, total: H.money(subtotal - discount),
      note: H.nullIfEmpty(String(b.note ?? '').trim()), created_by: req.user.id, created_at: db.now(),
    }, conn);
    const label = `Purchase #${pid}${b.invoice_no ? ` (${String(b.invoice_no).trim()})` : ''}`;
    for (const l of lines) {
      await db.insert('purchase_items', { purchase_id: pid, ...l }, conn);
      if (updateCost && l.unit_cost > 0) {
        if (l.variant_id) await db.query('UPDATE product_variants SET purchase_price = ? WHERE id = ?', [l.unit_cost, l.variant_id], conn);
        else await db.query('UPDATE products SET purchase_price = ? WHERE id = ?', [l.unit_cost, l.product_id], conn);
      }
    }
    await O.adjustStock(lines, +1, conn, { meta: { reason: 'purchase', ref_type: 'purchase', ref_id: pid, ref_label: label, user_id: req.user.id } });
    const paid = H.money(b.paid);
    if (paid > 0) {
      if (!supplierId) fail(422, 'Choose a supplier to record a payment');
      await db.insert('supplier_payments', {
        supplier_id: supplierId, purchase_id: pid, amount: paid, method: H.nullIfEmpty(String(b.payment_method ?? '').trim()),
        note: 'Paid with purchase', paid_at: b.purchase_date || db.today(), created_by: req.user.id, created_at: db.now(),
      }, conn);
    }
    return pid;
  });
  revalidate('products', 'home');
  res.status(201).json({ id });
}));

router.delete('/purchases/:id', guard, ah(async (req, res) => {
  await db.tx(async (conn) => {
    const p = await db.one('SELECT * FROM purchases WHERE id = ?', [req.params.id], conn);
    if (!p) fail(404, 'Purchase not found');
    const items = await db.query('SELECT * FROM purchase_items WHERE purchase_id = ?', [p.id], conn);
    // take the purchased quantity back out of stock (fails if it was already sold)
    await O.adjustStock(items.filter((i) => i.product_id), -1, conn, {
      check: true, meta: { reason: 'purchase_deleted', ref_type: 'purchase', ref_id: p.id, ref_label: `Purchase #${p.id}`, user_id: req.user.id },
    });
    await db.query('DELETE FROM purchase_items WHERE purchase_id = ?', [p.id], conn);
    await db.query('DELETE FROM supplier_payments WHERE purchase_id = ?', [p.id], conn);
    await db.remove('purchases', p.id, conn);
  });
  revalidate('products', 'home');
  res.json({ ok: true });
}));

// ---------- Stock history ----------
router.get('/stock-movements', guard, ah(async (req, res) => {
  const pg = H.pagination(req, 50, 500);
  const where = [];
  const params = [];
  if (req.query.product_id) { where.push('m.product_id = ?'); params.push(req.query.product_id); }
  if (req.query.reason) { where.push('m.reason = ?'); params.push(req.query.reason); }
  if (req.query.from_date) { where.push('m.created_at >= ?'); params.push(`${req.query.from_date} 00:00:00`); }
  if (req.query.to_date) { where.push('m.created_at <= ?'); params.push(`${req.query.to_date} 23:59:59`); }
  if (req.query.search) { where.push('m.name LIKE ?'); params.push(`%${req.query.search}%`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await db.one(`SELECT COUNT(*) AS c FROM stock_movements m ${w}`, params)).c;
  const rows = await db.query(
    `SELECT m.*, u.name AS user_name FROM stock_movements m LEFT JOIN users u ON u.id = m.user_id ${w}
     ORDER BY m.id DESC LIMIT ? OFFSET ?`,
    [...params, pg.per_page, pg.offset]
  );
  for (const r of rows) r.reason_label = REASONS[r.reason] || r.reason;
  res.json({ ...H.paged(rows, total, pg), reasons: REASONS });
}));

module.exports = router;
