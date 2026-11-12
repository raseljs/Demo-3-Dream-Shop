const crypto = require('crypto');
const db = require('../db');

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
const fail = (status, message, extra) => { throw new HttpError(status, message, extra); };

/** Wrap async route handlers so errors reach the error middleware (Express 4). */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** URL slug that keeps Bangla & other unicode letters. */
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180) || 'item';
}

async function uniqueSlug(table, base, ignoreId = null) {
  const root = slugify(base);
  let slug = root;
  for (let i = 2; i < 500; i++) {
    const row = await db.one(`SELECT id FROM ${table} WHERE slug = ? LIMIT 1`, [slug]);
    if (!row || (ignoreId && Number(row.id) === Number(ignoreId))) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

function parseJSON(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

const toJSON = (value) => (value === undefined ? undefined : JSON.stringify(value ?? null));

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
}

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const int = (v, d = 0) => Math.trunc(num(v, d));
const money = (v) => Math.round(num(v) * 100) / 100;
const bool = (v) => (v === true || v === 1 || v === '1' || v === 'true' || v === 'on' ? 1 : 0);
const nullIfEmpty = (v) => (v === '' || v === undefined ? null : v);

/** Normalise Bangladeshi mobile numbers to 01XXXXXXXXX. Returns null when invalid. */
function normalizePhone(phone) {
  let p = String(phone || '').replace(/[^\d+]/g, '');
  // Convert Bangla digits
  p = p.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
  p = p.replace(/^\+?88/, '');
  if (/^1\d{9}$/.test(p)) p = '0' + p;
  return /^01[3-9]\d{8}$/.test(p) ? p : null;
}

function pagination(req, defaultPer = 20, maxPer = 200) {
  const page = Math.max(1, int(req.query.page, 1));
  const per_page = Math.min(maxPer, Math.max(1, int(req.query.per_page, defaultPer)));
  return { page, per_page, offset: (page - 1) * per_page };
}

const paged = (data, total, { page, per_page }) => ({
  data,
  total: Number(total) || 0,
  page,
  per_page,
  last_page: Math.max(1, Math.ceil((Number(total) || 0) / per_page)),
});

const randomToken = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');

/** Effective selling price */
const priceOf = (row) => (num(row.sale_price) > 0 ? num(row.sale_price) : num(row.regular_price));

module.exports = {
  HttpError, fail, ah, slugify, uniqueSlug, parseJSON, toJSON, pick, num, int, money, bool,
  nullIfEmpty, normalizePhone, pagination, paged, randomToken, priceOf,
};
