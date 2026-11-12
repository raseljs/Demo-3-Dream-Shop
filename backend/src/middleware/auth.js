const db = require('../db');
const { verifyToken } = require('../utils/auth');
const { parseJSON } = require('../utils/helpers');

// Every permission key used by admin routes (also shown in the Roles screen).
const PERMISSIONS = [
  'dashboard', 'pos', 'products', 'inventory', 'catalog', 'orders', 'returns', 'expenses',
  'reports', 'marketing', 'users', 'reviews', 'appearance', 'settings',
];

async function loadUser(id) {
  const user = await db.one(
    `SELECT u.id, u.name, u.phone, u.email, u.address, u.is_staff, u.status, u.role_id, r.name AS role_name, r.permissions
     FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
    [id]
  );
  if (!user || !user.status) return null;
  const perms = parseJSON(user.permissions, []);
  user.permissions = user.is_staff ? (perms.includes('*') ? ['*', ...PERMISSIONS] : perms) : [];
  return user;
}

/** Attaches req.user when a valid Bearer token is present. Never blocks. */
async function authOptional(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    const payload = token && verifyToken(token);
    req.user = payload ? await loadUser(payload.id) : null;
    next();
  } catch (e) {
    next(e);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Please log in first.' });
  next();
}

function requireStaff(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Please log in first.' });
  if (!req.user.is_staff) return res.status(403).json({ message: 'Admin access only.' });
  next();
}

const hasPerm = (user, perm) => !!user && (user.permissions.includes('*') || user.permissions.includes(perm));

/** Route guard: can('orders') */
const can = (...perms) => (req, res, next) => {
  if (perms.some((p) => hasPerm(req.user, p))) return next();
  res.status(403).json({ message: 'You do not have permission for this section.' });
};

module.exports = { PERMISSIONS, authOptional, requireAuth, requireStaff, can, hasPerm, loadUser };
