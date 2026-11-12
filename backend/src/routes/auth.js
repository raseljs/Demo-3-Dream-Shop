const express = require('express');
const db = require('../db');
const H = require('../utils/helpers');
const { ah, fail } = H;
const { hashPassword, verifyPassword, signToken } = require('../utils/auth');
const { requireAuth, loadUser } = require('../middleware/auth');
const { getSettings } = require('../services/settings');
const { sendSms } = require('../services/sms');
const { logActivity } = require('../services/activity');

const router = express.Router();

const publicUser = (u) => ({
  id: u.id, name: u.name, phone: u.phone, email: u.email, address: u.address,
  is_staff: !!u.is_staff, role: u.role_name || (u.is_staff ? 'Staff' : 'Customer'), permissions: u.permissions || [],
});

async function otpRequired() {
  const { sms } = await getSettings();
  return Number(sms.otp_verification) === 1 && sms.sms_provider !== 'none';
}

async function checkOtp(phone, code) {
  const row = await db.one('SELECT * FROM otps WHERE phone = ? ORDER BY id DESC LIMIT 1', [phone]);
  if (!row || row.code !== String(code || '').trim() || row.expires_at < db.now()) fail(422, 'Invalid or expired OTP code.');
  await db.query('DELETE FROM otps WHERE phone = ?', [phone]);
}

router.post('/send-otp', ah(async (req, res) => {
  const phone = H.normalizePhone(req.body.phone);
  if (!phone) fail(422, 'Enter a valid mobile number.');
  const last = await db.one('SELECT expires_at FROM otps WHERE phone = ? ORDER BY id DESC LIMIT 1', [phone]);
  // expires_at is +5 min; block a resend within the first minute
  if (last && last.expires_at > db.now(4 / 1440)) fail(429, 'Please wait a minute before requesting another code.');
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.insert('otps', { phone, code, expires_at: db.now(5 / 1440) });
  const { general } = await getSettings();
  const r = await sendSms(phone, `${code} is your ${general.site_title} verification code.`);
  if (r.skipped) fail(503, 'SMS service is not configured.');
  res.json({ message: 'OTP sent to your phone.' });
}));

router.post('/register', ah(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = H.normalizePhone(req.body.phone);
  const email = String(req.body.email || '').trim() || null;
  const password = String(req.body.password || '');
  if (!name) fail(422, 'Please enter your name.');
  if (!phone) fail(422, 'Please enter a valid 11-digit mobile number.');
  if (password.length < 6) fail(422, 'Password must be at least 6 characters.');
  if (await db.one('SELECT id FROM users WHERE phone = ?', [phone])) fail(422, 'This phone number is already registered. Please log in.');
  if (email && await db.one('SELECT id FROM users WHERE email = ?', [email])) fail(422, 'This email is already registered.');
  if (await otpRequired()) await checkOtp(phone, req.body.otp);
  const id = await db.insert('users', { name, phone, email, password: hashPassword(password), is_staff: 0, is_verified: 1, status: 1, created_at: db.now() });
  const user = await loadUser(id);
  res.status(201).json({ token: signToken({ id }), user: publicUser(user) });
}));

router.post('/login', ah(async (req, res) => {
  const login = String(req.body.login || req.body.phone || req.body.email || '').trim();
  const password = String(req.body.password || '');
  const phone = H.normalizePhone(login);
  const row = phone
    ? await db.one('SELECT id, password, status FROM users WHERE phone = ?', [phone])
    : await db.one('SELECT id, password, status FROM users WHERE email = ?', [login]);
  if (!row || !verifyPassword(password, row.password)) fail(422, 'Wrong phone/email or password.');
  if (!row.status) fail(403, 'Your account is disabled.');
  const user = await loadUser(row.id);
  if (user.is_staff) logActivity(user, 'login', 'Signed in to the admin panel', req);
  res.json({ token: signToken({ id: row.id }), user: publicUser(user) });
}));

router.post('/reset-password', ah(async (req, res) => {
  const phone = H.normalizePhone(req.body.phone);
  const password = String(req.body.password || '');
  if (!phone) fail(422, 'Enter a valid mobile number.');
  if (password.length < 6) fail(422, 'Password must be at least 6 characters.');
  const user = await db.one('SELECT id FROM users WHERE phone = ?', [phone]);
  if (!user) fail(404, 'No account found with this number.');
  await checkOtp(phone, req.body.otp);
  await db.update('users', user.id, { password: hashPassword(password) });
  res.json({ message: 'Password updated. Please log in.' });
}));

router.get('/me', requireAuth, (req, res) => res.json(publicUser(req.user)));

router.put('/profile', requireAuth, ah(async (req, res) => {
  const data = {};
  if (req.body.name !== undefined) data.name = String(req.body.name).trim() || req.user.name;
  if (req.body.email !== undefined) data.email = String(req.body.email).trim() || null;
  if (req.body.address !== undefined) data.address = String(req.body.address).trim().slice(0, 500) || null;
  if (req.body.password) {
    const row = await db.one('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!verifyPassword(req.body.current_password || '', row.password)) fail(422, 'Current password is wrong.');
    if (String(req.body.password).length < 6) fail(422, 'New password must be at least 6 characters.');
    data.password = hashPassword(req.body.password);
  }
  await db.update('users', req.user.id, data);
  res.json(publicUser(await loadUser(req.user.id)));
}));

module.exports = router;
