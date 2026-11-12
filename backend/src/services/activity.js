// Activity log: records every change made in the admin panel (who, what, when).
const db = require('../db');

const SKIP = [/^\/upload/, /^\/checkout\/quote/, /^\/sms\/audience/, /^\/notifications/, /^\/marketing\/test/];
const PREVIEW = /^\/product-tools\/(import|bulk-price)$/; // previews (dry runs) change nothing
const SECRET = /pass|secret|token|api_key|app_key|key$/i;
const VERB = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

const ENTITY = {
  orders: 'Order', products: 'Product', categories: 'Category', brands: 'Brand', coupons: 'Coupon', users: 'User', roles: 'Role',
  returns: 'Return', expenses: 'Expense', 'expense-categories': 'Expense category', sliders: 'Slider', pages: 'Page', menus: 'Menu',
  campaigns: 'Landing page', reviews: 'Review', blocklists: 'Blocklist', attributes: 'Attribute', 'size-charts': 'Size chart',
  settings: 'Settings', purchases: 'Purchase', suppliers: 'Supplier', 'supplier-payments': 'Supplier payment', settlements: 'COD settlement',
  'flash-sales': 'Flash sale', sms: 'SMS campaign', backups: 'Backup', incomplete: 'Incomplete order',
};

function describe(method, path, body) {
  const parts = path.split('?')[0].split('/').filter(Boolean);
  const [res, id, sub] = parts;
  const entity = ENTITY[res] || res;
  let action = VERB[method] || method.toLowerCase();
  let summary;
  if (res === 'orders' && id === 'bulk') {
    action = 'update';
    const n = (body.ids || []).length;
    const what = body.delivery_status ? `status → ${body.delivery_status}` : body.assigned_to !== undefined ? 'assigned to staff' : 'changed';
    summary = `${n} order(s) ${what}`;
  } else if (res === 'orders' && id === 'courier') {
    action = 'update';
    summary = `${(body.ids || []).length} order(s) sent to ${body.courier}`;
  } else if (res === 'settings') {
    summary = `${id} settings saved`;
  } else if (res === 'sms' && id === 'send') {
    summary = `Bulk SMS sent to "${body.audience}" customers`;
  } else if (res === 'product-tools') {
    summary = id === 'import' ? 'CSV import' : 'Bulk price change';
  } else {
    const keys = Object.keys(body || {}).filter((k) => !SECRET.test(k) && !['items', 'variants', 'long_des', 'content', 'images'].includes(k));
    const label = body?.name || body?.title || body?.code || '';
    const verb = { create: 'Created', update: 'Updated', delete: 'Deleted' }[action] || action;
    summary = `${verb} ${entity.toLowerCase()}${id && !/^\d+$/.test(id) ? ` ${id}` : ''}${id && /^\d+$/.test(id) ? ` #${id}` : ''}${label ? ` "${String(label).slice(0, 60)}"` : ''}${sub ? ` (${sub})` : ''}`;
    if (action === 'update' && keys.length && keys.length <= 4) summary += `: ${keys.join(', ')}`;
    if (res === 'orders' && body?.delivery_status) summary += ` → ${body.delivery_status}`;
  }
  return { action, entity, entity_id: id && /^\d+$/.test(id) ? id : null, summary: summary.slice(0, 255) };
}

function mask(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 2) return obj;
  if (Array.isArray(obj)) return obj.length > 20 ? `[${obj.length} items]` : obj.map((v) => mask(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET.test(k)) out[k] = v ? '••••' : v;
    else if (typeof v === 'string' && v.length > 200) out[k] = `${v.slice(0, 200)}…`;
    else out[k] = mask(v, depth + 1);
  }
  return out;
}

/** Express middleware for the admin router (after the staff check). */
function activityLogger(req, res, next) {
  // path relative to /api/admin (taken now: Express rewrites req.url again after routing)
  const path = String(req.originalUrl || req.path || req.url || '').split('?')[0].replace(/^\/api\/admin(?=\/|$)/, '') || '/';
  if (req.method === 'GET' || req.method === 'OPTIONS' || SKIP.some((r) => r.test(path))) return next();
  if (PREVIEW.test(path) && req.body?.dry_run !== false) return next();
  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.user) return;
    const info = describe(req.method, path, req.body || {});
    let details = null;
    try { details = JSON.stringify(mask(req.body || {})).slice(0, 2000); } catch { /* ignore */ }
    db.insert('activity_logs', {
      user_id: req.user.id, user_name: req.user.name, ...info, details,
      ip: String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().slice(0, 60), created_at: db.now(),
    }).catch(() => {});
  });
  next();
}

/** For events outside the admin router (e.g. staff login). */
function logActivity(user, action, summary, req) {
  return db.insert('activity_logs', {
    user_id: user?.id || null, user_name: user?.name || null, action, entity: 'Account', entity_id: null, summary,
    ip: String(req?.headers?.['x-forwarded-for'] || req?.ip || '').split(',')[0].trim().slice(0, 60) || null, created_at: db.now(),
  }).catch(() => {});
}

module.exports = { activityLogger, logActivity };
