const express = require('express');
const db = require('../../db');
const H = require('../../utils/helpers');
const { ah, fail } = H;
const { can } = require('../../middleware/auth');
const O = require('../../services/orders');
const { sendToCourier } = require('../../services/courier');
const { fraudCheck } = require('../../services/fraud');

const router = express.Router();

// ---------------- Orders ----------------
function orderFilters(q, user) {
  const where = [];
  const params = [];
  if (q.delivery_status) { where.push('o.delivery_status = ?'); params.push(q.delivery_status); }
  if (q.payment_status) { where.push('o.payment_status = ?'); params.push(q.payment_status); }
  if (q.source) { where.push('o.source = ?'); params.push(q.source); }
  if (q.from_date) { where.push('o.created_at >= ?'); params.push(`${q.from_date} 00:00:00`); }
  if (q.to_date) { where.push('o.created_at <= ?'); params.push(`${q.to_date} 23:59:59`); }
  if (q.mine === '1') { where.push('o.assigned_to = ?'); params.push(user.id); }
  if (q.assigned_to) { where.push('o.assigned_to = ?'); params.push(q.assigned_to); }
  if (q.search) {
    const s = String(q.search).trim();
    where.push('(o.order_no LIKE ? OR o.name LIKE ? OR o.phone LIKE ? OR o.courier_tracking LIKE ?)');
    params.push(`%${s}%`, `%${s}%`, `%${s}%`, `%${s}%`);
  }
  return { w: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

router.get('/orders', can('orders'), ah(async (req, res) => {
  const pg = H.pagination(req, 25, 500);
  const { w, params } = orderFilters(req.query, req.user);
  const total = (await db.one(`SELECT COUNT(*) AS c FROM orders o ${w}`, params)).c;
  const rows = await db.query(
    `SELECT o.id, o.order_no, o.name, o.phone, o.address, o.city, o.total, o.paid_amount, o.payment_method, o.payment_status,
            o.delivery_status, o.source, o.courier, o.courier_tracking, o.created_at, o.assigned_to, s.name AS assigned_name
     FROM orders o LEFT JOIN users s ON s.id = o.assigned_to ${w}
     ORDER BY o.id DESC LIMIT ? OFFSET ?`,
    [...params, pg.per_page, pg.offset]
  );
  if (rows.length) {
    const items = await db.query('SELECT order_id, name, variant_name, qty, price, image FROM order_items WHERE order_id IN (?)', [rows.map((r) => r.id)]);
    const phones = [...new Set(rows.map((r) => r.phone))];
    const history = await db.query(
      `SELECT phone, COUNT(*) AS total, SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
              SUM(CASE WHEN delivery_status = 'cancel' THEN 1 ELSE 0 END) AS cancelled
       FROM orders WHERE phone IN (?) GROUP BY phone`, [phones]
    );
    for (const r of rows) {
      r.items = items.filter((i) => Number(i.order_id) === Number(r.id));
      r.history = history.find((h) => h.phone === r.phone) || null;
    }
  }
  const counts = await db.query('SELECT delivery_status, COUNT(*) AS c FROM orders GROUP BY delivery_status');
  res.json({ ...H.paged(rows, total, pg), counts: Object.fromEntries(counts.map((c) => [c.delivery_status, c.c])) });
}));

router.get('/orders/fraud', can('orders', 'pos'), ah(async (req, res) => {
  const phone = H.normalizePhone(req.query.phone);
  if (!phone) fail(422, 'Invalid phone number');
  res.json(await fraudCheck(phone));
}));

router.get('/orders/:id', can('orders', 'pos'), ah(async (req, res) => {
  const order = await O.getOrder(H.int(req.params.id));
  if (!order) fail(404, 'Order not found');
  order.returns = await db.query('SELECT * FROM returns WHERE order_id = ? ORDER BY id DESC', [order.id]);
  order.returns.forEach((r) => { r.items = H.parseJSON(r.items, []); });
  order.history = await db.one(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN delivery_status = 'cancel' THEN 1 ELSE 0 END) AS cancelled FROM orders WHERE phone = ?`, [order.phone]
  );
  res.json(order);
}));

router.put('/orders/:id', can('orders'), ah(async (req, res) => {
  const id = H.int(req.params.id);
  const b = req.body || {};
  const order = await O.getOrder(id);
  if (!order) fail(404, 'Order not found');
  const data = {};
  for (const f of ['name', 'address', 'city', 'note', 'admin_note', 'courier', 'courier_tracking', 'transaction_id', 'payment_method', 'email']) {
    if (b[f] !== undefined) data[f] = H.nullIfEmpty(String(b[f] ?? '').trim());
  }
  if (b.phone !== undefined) {
    const p = H.normalizePhone(b.phone);
    if (!p) fail(422, 'Invalid phone number');
    data.phone = p;
  }
  if (b.area !== undefined) data.area = b.area === 'outside' ? 'outside' : 'inside';
  if (b.assigned_to !== undefined) data.assigned_to = H.int(b.assigned_to) || null;
  if (b.payment_status !== undefined && O.PAYMENT_STATUSES.includes(b.payment_status)) data.payment_status = b.payment_status;
  if (b.paid_amount !== undefined) data.paid_amount = H.money(b.paid_amount);
  if (b.shipping !== undefined || b.discount !== undefined) {
    data.shipping = b.shipping !== undefined ? H.money(b.shipping) : order.shipping;
    data.discount = b.discount !== undefined ? H.money(b.discount) : order.discount;
    data.total = H.money(Math.max(0, Number(order.subtotal) + data.shipping + Number(order.tax) - data.discount));
  }
  if (data.name === null) delete data.name;
  if (data.payment_method === null) delete data.payment_method;
  if (data.address === null) delete data.address;
  data.updated_at = db.now();
  await db.update('orders', id, data);
  if (b.delivery_status && b.delivery_status !== order.delivery_status) await O.changeStatus(id, b.delivery_status, { user: req.user });
  res.json(await O.getOrder(id));
}));

router.post('/orders/bulk', can('orders'), ah(async (req, res) => {
  const ids = (req.body.ids || []).map(Number).filter(Boolean);
  if (!ids.length) fail(422, 'Select at least one order');
  let done = 0;
  const errors = [];
  for (const id of ids) {
    try {
      if (req.body.delivery_status) await O.changeStatus(id, req.body.delivery_status, { user: req.user });
      const data = {};
      if (req.body.assigned_to !== undefined) data.assigned_to = H.int(req.body.assigned_to) || null;
      if (req.body.payment_status && O.PAYMENT_STATUSES.includes(req.body.payment_status)) data.payment_status = req.body.payment_status;
      if (Object.keys(data).length) await db.update('orders', id, { ...data, updated_at: db.now() });
      done++;
    } catch (e) {
      errors.push(`#${id}: ${e.message}`);
    }
  }
  res.json({ done, errors });
}));

router.post('/orders/courier', can('orders'), ah(async (req, res) => {
  const ids = (req.body.ids || []).map(Number).filter(Boolean);
  const courier = String(req.body.courier || '');
  if (!ids.length) fail(422, 'Select at least one order');
  const results = [];
  for (const id of ids) {
    const order = await O.getOrder(id);
    if (!order) continue;
    if (order.courier_tracking) { results.push({ id, order_no: order.order_no, ok: false, message: `Already sent (${order.courier}: ${order.courier_tracking})` }); continue; }
    try {
      const r = await sendToCourier(courier, order);
      await db.update('orders', id, { courier: r.courier, courier_tracking: String(r.tracking), updated_at: db.now() });
      if (['pending', 'confirmed'].includes(order.delivery_status)) await O.changeStatus(id, 'on_the_way', { user: req.user });
      results.push({ id, order_no: order.order_no, ok: true, tracking: r.tracking });
    } catch (e) {
      results.push({ id, order_no: order.order_no, ok: false, message: e.message });
    }
  }
  res.json({ results });
}));

router.delete('/orders/:id', can('orders'), ah(async (req, res) => {
  const id = H.int(req.params.id);
  await db.tx(async (conn) => {
    const order = await O.getOrder(id, conn);
    if (!order) fail(404, 'Order not found');
    if (order.delivery_status !== 'cancel') await O.adjustStock(order.items, +1, conn, { meta: { reason: 'order_deleted', ref_type: 'order', ref_id: order.id, ref_label: `#${order.order_no}`, user_id: req.user.id } });
    await db.query('DELETE FROM order_items WHERE order_id = ?', [id], conn);
    await db.query('DELETE FROM returns WHERE order_id = ?', [id], conn);
    await db.query('DELETE FROM orders WHERE id = ?', [id], conn);
  });
  res.json({ ok: true });
}));

// Manual order from admin (phone orders) & POS
router.post('/orders', can('orders', 'pos'), ah(async (req, res) => {
  const source = req.body.source === 'pos' ? 'pos' : 'manual';
  const order = await O.createOrder(req.body, { staff: req.user, source });
  res.status(201).json(order);
}));

router.post('/checkout/quote', can('orders', 'pos'), ah(async (req, res) => {
  res.json(await O.quote(req.body || {}, { staff: true }));
}));

// ---------------- Incomplete (abandoned) orders ----------------
router.get('/incomplete', can('orders'), ah(async (req, res) => {
  const pg = H.pagination(req, 25, 500);
  const where = [];
  const params = [];
  if (req.query.search) { where.push('(name LIKE ? OR phone LIKE ?)'); params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await db.one(`SELECT COUNT(*) AS c FROM incomplete_orders ${w}`, params)).c;
  const rows = await db.query(`SELECT * FROM incomplete_orders ${w} ORDER BY updated_at DESC LIMIT ? OFFSET ?`, [...params, pg.per_page, pg.offset]);
  rows.forEach((r) => { r.items = H.parseJSON(r.items, []); });
  res.json(H.paged(rows, total, pg));
}));

router.delete('/incomplete/:id', can('orders'), ah(async (req, res) => {
  await db.remove('incomplete_orders', H.int(req.params.id));
  res.json({ ok: true });
}));

// ---------------- Returns ----------------
router.get('/returns', can('returns'), ah(async (req, res) => {
  const pg = H.pagination(req, 25, 500);
  const where = [];
  const params = [];
  if (req.query.search) { where.push('(o.order_no LIKE ? OR o.name LIKE ? OR o.phone LIKE ?)'); params.push(...Array(3).fill(`%${req.query.search}%`)); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await db.one(`SELECT COUNT(*) AS c FROM returns r JOIN orders o ON o.id = r.order_id ${w}`, params)).c;
  const rows = await db.query(
    `SELECT r.*, o.order_no, o.name, o.phone, o.address FROM returns r JOIN orders o ON o.id = r.order_id ${w}
     ORDER BY r.id DESC LIMIT ? OFFSET ?`, [...params, pg.per_page, pg.offset]
  );
  rows.forEach((r) => { r.items = H.parseJSON(r.items, []); });
  res.json(H.paged(rows, total, pg));
}));

router.post('/returns', can('returns', 'orders'), ah(async (req, res) => {
  const b = req.body || {};
  const orderId = H.int(b.order_id);
  const restock = b.restock !== false;
  const id = await db.tx(async (conn) => {
    const order = await O.getOrder(orderId, conn);
    if (!order) fail(404, 'Order not found');
    const returned = [];
    for (const r of b.items || []) {
      const item = order.items.find((i) => Number(i.id) === H.int(r.order_item_id));
      const qty = H.int(r.qty);
      if (!item || qty <= 0) continue;
      if (qty > item.qty - item.returned_qty) fail(422, `Cannot return more than ${item.qty - item.returned_qty} of "${item.name}"`);
      await db.query('UPDATE order_items SET returned_qty = returned_qty + ? WHERE id = ?', [qty, item.id], conn);
      if (restock) await O.adjustStock([{ ...item, qty, returned_qty: 0 }], +1, conn, { meta: { reason: 'return', ref_type: 'order', ref_id: order.id, ref_label: `#${order.order_no}`, user_id: req.user.id } });
      returned.push({ order_item_id: item.id, product_id: item.product_id, variant_id: item.variant_id, name: item.name, variant_name: item.variant_name, qty, price: item.price, restocked: restock });
    }
    if (!returned.length) fail(422, 'Choose at least one item to return');
    const refund = H.money(b.refund_amount ?? returned.reduce((s, r) => s + r.qty * r.price, 0));
    const rid = await db.insert('returns', { order_id: order.id, items: JSON.stringify(returned), refund_amount: refund, note: H.nullIfEmpty(b.note), created_by: req.user.id, created_at: db.now() }, conn);
    if (refund > 0 && Number(order.paid_amount) > 0) {
      const paid = Math.max(0, Number(order.paid_amount) - refund);
      await db.update('orders', order.id, { paid_amount: paid, payment_status: paid <= 0 ? 'refunded' : 'partial', updated_at: db.now() }, conn);
    }
    return rid;
  });
  res.status(201).json({ id });
}));

router.delete('/returns/:id', can('returns'), ah(async (req, res) => {
  await db.tx(async (conn) => {
    const r = await db.one('SELECT * FROM returns WHERE id = ?', [req.params.id], conn);
    if (!r) fail(404, 'Not found');
    for (const it of H.parseJSON(r.items, [])) {
      await db.query(
        'UPDATE order_items SET returned_qty = CASE WHEN returned_qty > ? THEN returned_qty - ? ELSE 0 END WHERE id = ?',
        [it.qty, it.qty, it.order_item_id], conn
      );
      if (it.restocked) await O.adjustStock([{ ...it, returned_qty: 0 }], -1, conn, { meta: { reason: 'return_deleted', ref_type: 'order', ref_id: r.order_id, ref_label: `Return #${r.id}`, user_id: req.user.id } });
    }
    await db.remove('returns', r.id, conn);
  });
  res.json({ ok: true });
}));

module.exports = router;
