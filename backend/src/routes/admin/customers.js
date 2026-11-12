// Customer profiles (built from orders, so guest buyers are included) and bulk SMS marketing.
const express = require('express');
const db = require('../../db');
const H = require('../../utils/helpers');
const { ah, fail } = H;
const { can } = require('../../middleware/auth');
const { getSettings } = require('../../services/settings');
const { sendSms } = require('../../services/sms');

const router = express.Router();

const NOT_WALKIN = "o.phone <> 'walk-in'";
const AGG = `o.phone,
  (SELECT o2.name FROM orders o2 WHERE o2.phone = o.phone ORDER BY o2.id DESC LIMIT 1) AS name,
  (SELECT o3.city FROM orders o3 WHERE o3.phone = o.phone ORDER BY o3.id DESC LIMIT 1) AS city,
  COUNT(*) AS orders,
  SUM(CASE WHEN o.delivery_status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
  SUM(CASE WHEN o.delivery_status = 'cancel' THEN 1 ELSE 0 END) AS cancelled,
  COALESCE(SUM(CASE WHEN o.delivery_status = 'delivered' THEN o.total ELSE 0 END), 0) AS spent,
  MIN(o.created_at) AS first_order, MAX(o.created_at) AS last_order`;

// ---------- Customers ----------
router.get('/customers', can('users', 'orders'), ah(async (req, res) => {
  const q = req.query;
  const pg = H.pagination(req, 30, 500);
  const where = [NOT_WALKIN];
  const params = [];
  if (q.search) {
    const s = `%${String(q.search).trim()}%`;
    where.push('(o.phone LIKE ? OR o.name LIKE ?)');
    params.push(s, s);
  }
  const having = [];
  if (H.int(q.min_orders) > 1) { having.push('COUNT(*) >= ?'); params.push(H.int(q.min_orders)); }
  const w = `WHERE ${where.join(' AND ')}`;
  const h = having.length ? `HAVING ${having.join(' AND ')}` : '';
  const order = { spent: 'spent DESC', orders: 'orders DESC', cancelled: 'cancelled DESC' }[q.sort] || 'last_order DESC';
  const total = (await db.one(`SELECT COUNT(*) AS c FROM (SELECT o.phone FROM orders o ${w} GROUP BY o.phone ${h}) x`, params)).c;
  const rows = await db.query(`SELECT ${AGG} FROM orders o ${w} GROUP BY o.phone ${h} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, pg.per_page, pg.offset]);
  if (rows.length) {
    const blocked = await db.query('SELECT phone FROM blocklists WHERE phone IN (?)', [rows.map((r) => r.phone)]);
    for (const r of rows) r.blocked = blocked.some((b) => b.phone === r.phone);
  }
  res.json(H.paged(rows, total, pg));
}));

router.get('/customers/:phone', can('users', 'orders'), ah(async (req, res) => {
  const phone = H.normalizePhone(req.params.phone) || String(req.params.phone);
  const summary = await db.one(`SELECT ${AGG} FROM orders o WHERE o.phone = ? GROUP BY o.phone`, [phone]);
  if (!summary) fail(404, 'No orders from this number yet');
  const [orders, returns, account, blocked, incomplete] = await Promise.all([
    db.query(
      `SELECT o.id, o.order_no, o.total, o.delivery_status, o.payment_status, o.payment_method, o.source, o.address, o.created_at,
         (SELECT COALESCE(SUM(qty), 0) FROM order_items i WHERE i.order_id = o.id) AS items_qty
       FROM orders o WHERE o.phone = ? ORDER BY o.id DESC LIMIT 200`, [phone]
    ),
    db.query('SELECT r.id, r.order_id, r.refund_amount, r.created_at, o.order_no FROM returns r JOIN orders o ON o.id = r.order_id WHERE o.phone = ? ORDER BY r.id DESC', [phone]),
    db.one('SELECT id, name, email, created_at FROM users WHERE phone = ? AND is_staff = 0', [phone]),
    db.one('SELECT id, note FROM blocklists WHERE phone = ? LIMIT 1', [phone]),
    db.query('SELECT id, total, created_at, updated_at FROM incomplete_orders WHERE phone = ? ORDER BY id DESC LIMIT 20', [phone]),
  ]);
  const top = await db.query(
    `SELECT i.name, SUM(i.qty) AS qty FROM order_items i JOIN orders o ON o.id = i.order_id
     WHERE o.phone = ? AND o.delivery_status <> 'cancel' GROUP BY i.name ORDER BY qty DESC LIMIT 5`, [phone]
  );
  const delivered = Number(summary.delivered);
  const cancelled = Number(summary.cancelled);
  res.json({
    ...summary,
    order_count: Number(summary.orders),
    success_rate: delivered + cancelled ? Math.round((delivered / (delivered + cancelled)) * 100) : null,
    returns,
    account,
    blocked: blocked ? { id: blocked.id, note: blocked.note } : null,
    incomplete,
    top_products: top,
    orders,
  });
}));

// ---------- Bulk SMS ----------
async function audience(b) {
  const type = String(b.audience || 'all');
  let rows = [];
  if (type === 'custom') {
    const nums = String(b.numbers || '').split(/[\s,;]+/).map((n) => H.normalizePhone(n)).filter(Boolean);
    rows = nums.map((phone) => ({ phone, name: '' }));
  } else if (type === 'abandoned') {
    const days = Math.max(1, H.int(b.days, 7));
    rows = await db.query(
      'SELECT phone, name FROM incomplete_orders WHERE phone IS NOT NULL AND phone <> ? AND updated_at >= ? ORDER BY id DESC',
      ['', `${db.today(-days)} 00:00:00`]
    );
  } else {
    const having = [];
    const params = [];
    if (type === 'repeat') { having.push("SUM(CASE WHEN o.delivery_status = 'delivered' THEN 1 ELSE 0 END) >= ?"); params.push(Math.max(2, H.int(b.min_orders, 2))); }
    if (type === 'delivered') having.push("SUM(CASE WHEN o.delivery_status = 'delivered' THEN 1 ELSE 0 END) >= 1");
    if (type === 'inactive') { having.push('MAX(o.created_at) < ?'); params.push(`${db.today(-Math.max(1, H.int(b.days, 60)))} 00:00:00`); }
    const h = having.length ? `HAVING ${having.join(' AND ')}` : '';
    rows = await db.query(
      `SELECT o.phone, (SELECT o2.name FROM orders o2 WHERE o2.phone = o.phone ORDER BY o2.id DESC LIMIT 1) AS name
       FROM orders o WHERE ${NOT_WALKIN} GROUP BY o.phone ${h}`, params
    );
  }
  const blocked = new Set((await db.query('SELECT phone FROM blocklists')).map((r) => r.phone));
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const phone = H.normalizePhone(r.phone);
    if (!phone || seen.has(phone) || blocked.has(phone)) continue;
    seen.add(phone);
    out.push({ phone, name: String(r.name || '').trim() });
  }
  return { type, list: out };
}

router.post('/sms/audience', can('marketing'), ah(async (req, res) => {
  const { list } = await audience(req.body || {});
  res.json({ count: list.length, sample: list.slice(0, 5) });
}));

router.post('/sms/send', can('marketing'), ah(async (req, res) => {
  const b = req.body || {};
  const message = String(b.message || '').trim();
  if (!message) fail(422, 'Write the message first');
  const { sms } = await getSettings();
  if (!sms.sms_provider || sms.sms_provider === 'none') fail(422, 'Set up an SMS provider first (Settings → SMS Settings)');
  const { type, list } = await audience(b);
  if (!list.length) fail(422, 'No customers match this audience');
  const id = await db.insert('sms_campaigns', {
    audience: type, message, total: list.length, sent: 0, failed: 0, status: 'sending', created_by: req.user.id, created_at: db.now(),
  });
  res.status(201).json({ id, total: list.length });

  // Send in the background, a few per second, updating progress as we go
  (async () => {
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      const text = message.replace(/\{name\}/g, c.name || 'Customer');
      const r = await sendSms(c.phone, text).catch(() => ({ ok: false }));
      if (r && r.ok) sent++; else failed++;
      if (i % 10 === 9 || i === list.length - 1) await db.update('sms_campaigns', id, { sent, failed }).catch(() => {});
      await new Promise((ok) => setTimeout(ok, 150));
    }
    await db.update('sms_campaigns', id, { sent, failed, status: 'done', finished_at: db.now() }).catch(() => {});
  })();
}));

router.get('/sms/campaigns', can('marketing'), ah(async (req, res) => {
  const rows = await db.query(
    `SELECT c.*, u.name AS user_name FROM sms_campaigns c LEFT JOIN users u ON u.id = c.created_by ORDER BY c.id DESC LIMIT 50`
  );
  res.json(rows);
}));

module.exports = router;
