// Courier cash-on-delivery settlement: which delivered parcels the courier has paid for,
// how much they deducted as charge, and how much is still to be collected.
const express = require('express');
const db = require('../../db');
const H = require('../../utils/helpers');
const { ah, fail } = H;
const { can } = require('../../middleware/auth');

const guard = can('reports', 'orders');

const router = express.Router();

// Cash the courier should hand over for an order (nothing for prepaid orders or cancelled parcels)
const codOf = (o) => (o.delivery_status === 'cancel' || o.payment_method !== 'cod' ? 0 : H.money(Number(o.total)));

router.get('/settlements', guard, ah(async (req, res) => {
  const q = req.query;
  const pg = H.pagination(req, 50, 500);
  const where = ['o.courier IS NOT NULL'];
  const params = [];
  if (q.courier) { where.push('o.courier = ?'); params.push(q.courier); }
  if (q.state === 'settled') where.push('cs.id IS NOT NULL');
  if (q.state === 'pending') where.push("cs.id IS NULL AND o.delivery_status = 'delivered'");
  if (q.state === 'in_transit') where.push("cs.id IS NULL AND o.delivery_status NOT IN ('delivered', 'cancel')");
  if (q.state === 'returned') where.push("o.delivery_status = 'cancel'");
  if (q.from_date) { where.push('o.created_at >= ?'); params.push(`${q.from_date} 00:00:00`); }
  if (q.to_date) { where.push('o.created_at <= ?'); params.push(`${q.to_date} 23:59:59`); }
  if (q.search) {
    where.push('(o.order_no LIKE ? OR o.phone LIKE ? OR o.courier_tracking LIKE ?)');
    params.push(...Array(3).fill(`%${String(q.search).trim()}%`));
  }
  const w = `WHERE ${where.join(' AND ')}`;
  const from = 'orders o LEFT JOIN courier_settlements cs ON cs.order_id = o.id';
  const total = (await db.one(`SELECT COUNT(*) AS c FROM ${from} ${w}`, params)).c;
  const rows = await db.query(
    `SELECT o.id, o.order_no, o.name, o.phone, o.total, o.payment_method, o.delivery_status, o.courier, o.courier_tracking, o.created_at,
            cs.id AS settlement_id, cs.cod_amount, cs.courier_charge, cs.received_amount, cs.settled_at, cs.note AS settlement_note
     FROM ${from} ${w} ORDER BY o.id DESC LIMIT ? OFFSET ?`,
    [...params, pg.per_page, pg.offset]
  );
  for (const r of rows) r.cod_due = codOf(r);

  // Totals for the whole filtered list (not just this page)
  const all = await db.query(
    `SELECT o.total, o.payment_method, o.delivery_status, cs.id AS settlement_id, cs.courier_charge, cs.received_amount FROM ${from} ${w}`,
    params
  );
  const summary = { pending_cod: 0, pending_count: 0, in_transit_cod: 0, received: 0, charges: 0, settled_count: 0 };
  for (const r of all) {
    if (r.settlement_id) {
      summary.received += Number(r.received_amount);
      summary.charges += Number(r.courier_charge);
      summary.settled_count++;
    } else if (r.delivery_status === 'delivered') {
      summary.pending_cod += codOf(r);
      summary.pending_count++;
    } else if (r.delivery_status !== 'cancel') {
      summary.in_transit_cod += codOf(r);
    }
  }
  for (const k of ['pending_cod', 'in_transit_cod', 'received', 'charges']) summary[k] = H.money(summary[k]);
  const couriers = (await db.query('SELECT DISTINCT courier FROM orders WHERE courier IS NOT NULL ORDER BY courier')).map((r) => r.courier);
  res.json({ ...H.paged(rows, total, pg), summary, couriers });
}));

/**
 * Mark orders as settled. body: { items: [{ order_id, courier_charge, received_amount? }], settled_at, note }
 * received_amount defaults to COD amount − courier charge.
 */
router.post('/settlements', guard, ah(async (req, res) => {
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) fail(422, 'Select at least one order');
  let done = 0;
  const errors = [];
  for (const it of items) {
    const o = await db.one('SELECT id, order_no, total, payment_method, delivery_status, courier FROM orders WHERE id = ?', [H.int(it.order_id)]);
    if (!o) { errors.push(`#${it.order_id}: order not found`); continue; }
    if (!o.courier) { errors.push(`#${o.order_no}: not sent to a courier`); continue; }
    const cod = codOf(o);
    const charge = H.money(it.courier_charge);
    const received = it.received_amount !== undefined && it.received_amount !== '' ? H.money(it.received_amount) : H.money(cod - charge);
    const data = {
      cod_amount: cod, courier_charge: charge, received_amount: received,
      settled_at: b.settled_at || db.today(), note: H.nullIfEmpty(String(it.note ?? b.note ?? '').trim()),
    };
    const existing = await db.one('SELECT id FROM courier_settlements WHERE order_id = ?', [o.id]);
    if (existing) await db.update('courier_settlements', existing.id, data);
    else await db.insert('courier_settlements', { order_id: o.id, ...data, created_by: req.user.id, created_at: db.now() });
    done++;
  }
  res.json({ done, errors });
}));

router.delete('/settlements/:orderId', guard, ah(async (req, res) => {
  await db.query('DELETE FROM courier_settlements WHERE order_id = ?', [H.int(req.params.orderId)]);
  res.json({ ok: true });
}));

module.exports = router;
