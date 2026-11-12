// Activity log, database backups, new-order alerts and integration tests.
const express = require('express');
const fs = require('fs');
const db = require('../../db');
const H = require('../../utils/helpers');
const { ah, fail } = H;
const { can } = require('../../middleware/auth');
const backup = require('../../services/backup');
const { getSettings } = require('../../services/settings');
const { sendTelegram } = require('../../services/notify');
const { sendSms } = require('../../services/sms');
const fbcapi = require('../../services/fbcapi');

const router = express.Router();

// ---------- Activity log ----------
router.get('/activity', can('settings'), ah(async (req, res) => {
  const q = req.query;
  const pg = H.pagination(req, 50, 500);
  const where = [];
  const params = [];
  if (q.user_id) { where.push('user_id = ?'); params.push(q.user_id); }
  if (q.action) { where.push('action = ?'); params.push(q.action); }
  if (q.entity) { where.push('entity = ?'); params.push(q.entity); }
  if (q.from_date) { where.push('created_at >= ?'); params.push(`${q.from_date} 00:00:00`); }
  if (q.to_date) { where.push('created_at <= ?'); params.push(`${q.to_date} 23:59:59`); }
  if (q.search) { where.push('(summary LIKE ? OR user_name LIKE ?)'); params.push(`%${q.search}%`, `%${q.search}%`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await db.one(`SELECT COUNT(*) AS c FROM activity_logs ${w}`, params)).c;
  const rows = await db.query(`SELECT * FROM activity_logs ${w} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, pg.per_page, pg.offset]);
  const entities = (await db.query('SELECT DISTINCT entity FROM activity_logs WHERE entity IS NOT NULL ORDER BY entity')).map((r) => r.entity);
  res.json({ ...H.paged(rows, total, pg), entities });
}));

// ---------- Backups ----------
router.get('/backups', can('settings'), ah(async (req, res) => {
  const { backup: cfg } = await getSettings();
  res.json({ data: backup.list(), settings: cfg });
}));

router.post('/backups', can('settings'), ah(async (req, res) => {
  const b = await backup.createBackup();
  res.status(201).json(b);
}));

router.get('/backups/:file', can('settings'), ah(async (req, res) => {
  const file = backup.fileFor(req.params.file);
  if (!file) fail(404, 'Backup not found');
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.file}"`);
  fs.createReadStream(file).pipe(res);
}));

router.delete('/backups/:file', can('settings'), ah(async (req, res) => {
  const file = backup.fileFor(req.params.file);
  if (!file) fail(404, 'Backup not found');
  fs.unlinkSync(file);
  res.json({ ok: true });
}));

// ---------- New-order alerts for the admin panel ----------
router.get('/notifications/orders', can('orders', 'dashboard'), ah(async (req, res) => {
  const after = H.int(req.query.after_id);
  const latest = await db.one('SELECT COALESCE(MAX(id), 0) AS id FROM orders');
  const orders = req.query.after_id !== undefined
    ? await db.query("SELECT id, order_no, name, phone, total, source, created_at FROM orders WHERE id > ? AND source <> 'pos' ORDER BY id ASC LIMIT 20", [after])
    : [];
  res.json({ latest_id: Number(latest.id), orders });
}));

router.post('/notifications/test', can('settings'), ah(async (req, res) => {
  const { notifications: n } = await getSettings();
  const out = {};
  if (n.telegram_bot_token && n.telegram_chat_id) {
    try {
      await sendTelegram(n.telegram_bot_token, n.telegram_chat_id, '✅ Test message from your shop. New orders will be sent here.');
      out.telegram = 'sent';
    } catch (e) { out.telegram = e.message; }
  } else out.telegram = 'Bot token or chat ID missing';
  if (n.sms_alert_phone) {
    const r = await sendSms(n.sms_alert_phone, 'Test: new order alerts are on.');
    out.sms = r.ok ? 'sent' : r.skipped ? 'SMS provider not set up' : (r.error || r.response || 'failed');
  }
  res.json(out);
}));

// ---------- Facebook Conversions API test ----------
router.post('/marketing/test-capi', can('settings'), ah(async (req, res) => {
  try {
    res.json(await fbcapi.sendTest(req));
  } catch (e) {
    fail(e.status || 422, e.message);
  }
}));

module.exports = router;
