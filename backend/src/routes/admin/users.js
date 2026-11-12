const express = require('express');
const db = require('../../db');
const H = require('../../utils/helpers');
const { ah, fail } = H;
const { hashPassword } = require('../../utils/auth');

const router = express.Router();

const COLS = 'u.id, u.name, u.phone, u.email, u.address, u.role_id, u.is_staff, u.status, u.created_at, r.name AS role_name';

router.get('/', ah(async (req, res) => {
  const pg = H.pagination(req, 25, 500);
  const where = [];
  const params = [];
  const role = req.query.role;
  if (role === 'customer') where.push('u.is_staff = 0');
  else if (role === 'staff') where.push('u.is_staff = 1');
  else if (role) { where.push('u.role_id = ?'); params.push(role); }
  if (req.query.search) {
    where.push('(u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)');
    params.push(...Array(3).fill(`%${req.query.search}%`));
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await db.one(`SELECT COUNT(*) AS c FROM users u ${w}`, params)).c;
  const rows = await db.query(
    `SELECT ${COLS}, (SELECT COUNT(*) FROM orders o WHERE o.phone = u.phone) AS orders_count
     FROM users u LEFT JOIN roles r ON r.id = u.role_id ${w} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
    [...params, pg.per_page, pg.offset]
  );
  res.json(H.paged(rows, total, pg));
}));

router.get('/:id', ah(async (req, res) => {
  const u = await db.one(`SELECT ${COLS} FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?`, [req.params.id]);
  if (!u) fail(404, 'User not found');
  res.json(u);
}));

async function payload(body, existing) {
  const data = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (!existing && !data.name) fail(422, 'Name is required');
  if (body.phone !== undefined) {
    const p = H.normalizePhone(body.phone);
    if (!p) fail(422, 'Enter a valid 11-digit phone number');
    const dup = await db.one('SELECT id FROM users WHERE phone = ?', [p]);
    if (dup && (!existing || Number(dup.id) !== Number(existing.id))) fail(422, 'This phone number is already used');
    data.phone = p;
  }
  if (!existing && !data.phone) fail(422, 'Phone is required');
  if (body.email !== undefined) data.email = String(body.email).trim() || null;
  if (body.address !== undefined) data.address = String(body.address).trim() || null;
  if (body.status !== undefined) data.status = H.bool(body.status);
  if (body.role_id !== undefined) {
    data.role_id = H.int(body.role_id) || null;
    data.is_staff = data.role_id ? 1 : 0;
  }
  if (body.password) {
    if (String(body.password).length < 6) fail(422, 'Password must be at least 6 characters');
    data.password = hashPassword(body.password);
  } else if (!existing) fail(422, 'Password is required');
  return data;
}

router.post('/', ah(async (req, res) => {
  const data = await payload(req.body || {}, null);
  const id = await db.insert('users', { ...data, is_verified: 1, status: data.status ?? 1, created_at: db.now() });
  res.status(201).json({ id });
}));

router.put('/:id', ah(async (req, res) => {
  const existing = await db.one('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!existing) fail(404, 'User not found');
  const data = await payload(req.body || {}, existing);
  if (Number(existing.id) === Number(req.user.id) && (data.role_id === null || data.status === 0)) fail(422, 'You cannot remove your own admin access');
  await db.update('users', existing.id, data);
  res.json({ ok: true });
}));

router.delete('/:id', ah(async (req, res) => {
  if (Number(req.params.id) === Number(req.user.id)) fail(422, 'You cannot delete your own account');
  await db.remove('users', H.int(req.params.id));
  res.json({ ok: true });
}));

module.exports = router;
