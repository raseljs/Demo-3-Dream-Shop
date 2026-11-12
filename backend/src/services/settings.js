const db = require('../db');
const { parseJSON } = require('../utils/helpers');

// Each settings group is stored as one JSON row in the `settings` table.
const DEFAULTS = {
  general: {
    site_title: 'My Shop',
    tagline: 'Trusted source for 100% original products',
    logo: '',
    favicon: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    fb_link: '',
    x_link: '',
    yt_link: '',
    insta_link: '',
    guest_checkout: 1,
    bdcourier_api: '',
    copyright: '',
    custom_code: '',
    meta_description: '',
    primary_color: '#FC6D04',
    header_color: '#0054CF',
    about_title: '',
    about_text: '',
    about_image: '',
    low_stock_alert: 5,
    order_prefix: '',
  },
  shipping: {
    shipping_inside_dhaka: 60,
    shipping_outside_dhaka: 120,
    inside_label: 'Inside Dhaka',
    inside_time: 'Delivery within 1-2 business days',
    outside_label: 'Outside Dhaka',
    outside_time: 'Delivery within 3-5 business days',
  },
  courier: {
    pathao: { status: 0, base_url: 'https://api-hermes.pathao.com', client_id: '', client_secret: '', username: '', password: '', store_id: '' },
    steadfast: { status: 0, base_url: 'https://portal.packzy.com/api/v1', api_key: '', secret_key: '' },
  },
  payment: {
    cod: { status: 1, label: 'Cash on Delivery', description: 'Pay when you receive your order' },
    bkash: { status: 0, label: 'bKash', description: 'Pay securely with bKash', mode: 'sandbox', app_key: '', app_secret: '', username: '', password: '' },
    sslcommerz: { status: 0, label: 'Card / Mobile Banking', description: 'Visa, Mastercard, Nagad, Rocket & more', mode: 'sandbox', store_id: '', store_password: '' },
  },
  sms: {
    otp_verification: 0,
    order_sms: 0,
    status_sms: 0,
    sms_provider: 'none',
    api_key: '',
    sender_id: '',
    custom_url: '',
    order_template: 'Dear {name}, your order #{order_no} has been received. Total: {total} Tk. Thank you!',
    status_template: 'Dear {name}, your order #{order_no} is now {status}.',
  },
  marketing: {
    fb_pixel_id: '',
    fb_capi_enabled: 0,
    fb_capi_token: '',
    fb_test_event_code: '',
  },
  notifications: {
    telegram_enabled: 0,
    telegram_bot_token: '',
    telegram_chat_id: '',
    sms_alert_enabled: 0,
    sms_alert_phone: '',
  },
  backup: {
    auto_backup: 1,
    backup_hour: 3,
    keep_days: 7,
  },
};

let cache = null;
let cacheAt = 0;

function merge(def, val) {
  const out = { ...def };
  for (const k of Object.keys(val || {})) {
    if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) out[k] = { ...def[k], ...(val[k] || {}) };
    else out[k] = val[k];
  }
  return out;
}

async function getSettings() {
  if (cache && Date.now() - cacheAt < 30000) return cache;
  const rows = await db.query('SELECT name, value FROM settings');
  const stored = Object.fromEntries(rows.map((r) => [r.name, parseJSON(r.value, {})]));
  const out = {};
  for (const group of Object.keys(DEFAULTS)) out[group] = merge(DEFAULTS[group], stored[group]);
  cache = out;
  cacheAt = Date.now();
  return out;
}

async function saveGroup(group, values) {
  if (!DEFAULTS[group]) throw Object.assign(new Error('Unknown settings group'), { status: 422 });
  const current = (await getSettings())[group];
  const next = merge(current, values);
  const exists = await db.one('SELECT name FROM settings WHERE name = ?', [group]);
  if (exists) await db.query('UPDATE settings SET value = ? WHERE name = ?', [JSON.stringify(next), group]);
  else await db.query('INSERT INTO settings (name, value) VALUES (?, ?)', [group, JSON.stringify(next)]);
  cache = null;
  return next;
}

/** Settings safe to expose to the storefront (no secrets). */
async function publicSettings() {
  const s = await getSettings();
  const { bdcourier_api, ...general } = s.general; // eslint-disable-line no-unused-vars
  const payment_methods = Object.entries(s.payment)
    .filter(([, v]) => Number(v.status) === 1)
    .map(([key, v]) => ({ key, label: v.label, description: v.description }));
  return {
    ...general,
    fb_pixel_id: String(s.marketing.fb_pixel_id || '').replace(/\D/g, ''),
    shipping: s.shipping,
    payment_methods,
    otp_verification: Number(s.sms.otp_verification) === 1 && s.sms.sms_provider !== 'none',
  };
}

module.exports = { DEFAULTS, getSettings, saveGroup, publicSettings };
