const express = require('express');
const db = require('../../db');
const H = require('../../utils/helpers');
const { ah } = H;

const router = express.Router();

const range = (from, to) => {
  const f = from || db.today().slice(0, 8) + '01';
  const t = to || db.today();
  return { from: f, to: t, fromTs: `${f} 00:00:00`, toTs: `${t} 23:59:59` };
};

// Cost of goods for each order (excluding returned quantities)
const COST = '(SELECT COALESCE(SUM(i.purchase_price * (i.qty - i.returned_qty)), 0) FROM order_items i WHERE i.order_id = o.id)';
const REFUND = '(SELECT COALESCE(SUM(r.refund_amount), 0) FROM returns r WHERE r.order_id = o.id)';

router.get('/profit-loss', ah(async (req, res) => {
  const r = range(req.query.from_date, req.query.to_date);
  const orders = await db.query(
    `SELECT o.id, o.order_no, o.name, o.phone, o.created_at, o.payment_method, o.payment_status, o.delivery_status,
            o.subtotal, o.discount, o.shipping, o.tax, o.total, ${COST} AS cost, ${REFUND} AS refund
     FROM orders o WHERE o.created_at BETWEEN ? AND ? AND o.delivery_status <> 'cancel' ORDER BY o.id DESC`,
    [r.fromTs, r.toTs]
  );
  for (const o of orders) o.profit = H.money(Number(o.subtotal) - Number(o.discount) - Number(o.cost) - Number(o.refund));
  const sum = (k) => H.money(orders.reduce((s, o) => s + Number(o[k] || 0), 0));
  const expenses = (await db.one('SELECT COALESCE(SUM(amount), 0) AS s FROM expenses WHERE expense_date BETWEEN ? AND ?', [r.from, r.to])).s;
  const gross = sum('profit');
  res.json({
    ...r,
    summary: {
      orders: orders.length, revenue: sum('total'), sales: sum('subtotal'), discount: sum('discount'), shipping: sum('shipping'),
      tax: sum('tax'), cost: sum('cost'), refund: sum('refund'), gross_profit: gross, expenses: H.money(expenses), net_profit: H.money(gross - expenses),
    },
    orders,
  });
}));

router.get('/sale', ah(async (req, res) => {
  const t = db.today();
  const periods = {
    today: [t, t],
    week: [db.today(-6), t],
    month: [t.slice(0, 8) + '01', t],
    all: ['2000-01-01', t],
  };
  const summary = {};
  for (const [k, [f, to]] of Object.entries(periods)) {
    summary[k] = await db.one(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS amount, COALESCE(SUM(CASE WHEN delivery_status = 'delivered' THEN total ELSE 0 END), 0) AS delivered
       FROM orders WHERE created_at BETWEEN ? AND ? AND delivery_status <> 'cancel'`, [`${f} 00:00:00`, `${to} 23:59:59`]
    );
  }
  const r = range(req.query.start_date, req.query.end_date);
  const daily = await db.query(
    `SELECT SUBSTR(created_at, 1, 10) AS day, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS amount
     FROM orders WHERE created_at BETWEEN ? AND ? AND delivery_status <> 'cancel' GROUP BY SUBSTR(created_at, 1, 10) ORDER BY day ASC`,
    [r.fromTs, r.toTs]
  );
  const by_source = await db.query(
    `SELECT source, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS amount FROM orders
     WHERE created_at BETWEEN ? AND ? AND delivery_status <> 'cancel' GROUP BY source`, [r.fromTs, r.toTs]
  );
  const by_status = await db.query(
    'SELECT delivery_status, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS amount FROM orders WHERE created_at BETWEEN ? AND ? GROUP BY delivery_status',
    [r.fromTs, r.toTs]
  );
  res.json({ ...r, summary, daily, by_source, by_status });
}));

router.get('/city', ah(async (req, res) => {
  const r = range(req.query.start_date, req.query.end_date);
  const params = [r.fromTs, r.toTs];
  let extra = '';
  if (req.query.city) { extra = ' AND city = ?'; params.push(req.query.city); }
  const rows = await db.query(
    `SELECT COALESCE(city, 'Unknown') AS city, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS amount FROM orders
     WHERE created_at BETWEEN ? AND ? AND delivery_status <> 'cancel'${extra} GROUP BY city ORDER BY amount DESC`, params
  );
  res.json({
    ...r, rows,
    summary: { cities: rows.length, orders: rows.reduce((s, x) => s + Number(x.orders), 0), amount: H.money(rows.reduce((s, x) => s + Number(x.amount), 0)) },
  });
}));

router.get('/product', ah(async (req, res) => {
  const r = range(req.query.from, req.query.to);
  let statuses = req.query.status || [];
  if (!Array.isArray(statuses)) statuses = String(statuses).split(',').filter(Boolean);
  const params = [r.fromTs, r.toTs];
  let extra = " AND o.delivery_status <> 'cancel'";
  if (statuses.length) { extra = ' AND o.delivery_status IN (?)'; params.push(statuses); }
  const rows = await db.query(
    `SELECT i.product_id, i.variant_id, MAX(i.sku) AS sku, MAX(i.name) AS name, MAX(i.variant_name) AS variant_name,
            SUM(i.qty - i.returned_qty) AS qty, SUM(i.price * (i.qty - i.returned_qty)) AS amount,
            SUM(i.purchase_price * (i.qty - i.returned_qty)) AS cost
     FROM order_items i JOIN orders o ON o.id = i.order_id
     WHERE o.created_at BETWEEN ? AND ?${extra}
     GROUP BY i.product_id, i.variant_id ORDER BY qty DESC`, params
  );
  res.json({
    ...r, rows,
    summary: { qty: rows.reduce((s, x) => s + Number(x.qty), 0), amount: H.money(rows.reduce((s, x) => s + Number(x.amount), 0)) },
  });
}));

module.exports = router;
