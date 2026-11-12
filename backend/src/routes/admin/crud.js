// Generic, config-driven CRUD for simple admin resources.
const express = require('express');
const db = require('../../db');
const H = require('../../utils/helpers');
const { ah, fail } = H;
const { revalidate } = require('../../services/revalidate');

const toDateTime = (v) => {
  if (!v) return null;
  const s = String(v).replace('T', ' ');
  return s.length === 16 ? `${s}:00` : s.slice(0, 19);
};

function decode(def, row) {
  for (const f of def.json || []) row[f] = H.parseJSON(row[f], f === 'content' ? {} : []);
  return row;
}

async function encode(def, body, existing) {
  const data = {};
  for (const f of def.fields) {
    if (body[f] === undefined) continue;
    let v = body[f];
    if ((def.json || []).includes(f)) v = JSON.stringify(v ?? null);
    else if ((def.bools || []).includes(f)) v = H.bool(v);
    else if ((def.nums || []).includes(f)) v = H.money(v);
    else if ((def.ints || []).includes(f)) v = v === '' || v === null ? null : H.int(v);
    else if ((def.dates || []).includes(f)) v = toDateTime(v);
    else if (typeof v === 'string') v = v.trim() === '' ? null : v.trim();
    data[f] = v;
  }
  for (const f of def.required || []) {
    const val = data[f] !== undefined ? data[f] : existing && existing[f];
    if (val === null || val === undefined || val === '') fail(422, `${f.replace(/_/g, ' ')} is required`);
  }
  if (def.slug) {
    if (body.slug) data.slug = await H.uniqueSlug(def.table, body.slug, existing && existing.id);
    else if (!existing) data.slug = await H.uniqueSlug(def.table, data[def.slug] || body[def.slug]);
  }
  if (def.transform) await def.transform(data, body, existing);
  return data;
}

function makeCrud(def) {
  const r = express.Router();
  const from = def.from || `${def.table} t`;
  const select = def.select || 't.*';

  r.get('/', ah(async (req, res) => {
    const pg = H.pagination(req, def.perPage || 50, 1000);
    const where = [];
    const params = [];
    if (req.query.search && def.search) {
      where.push(`(${def.search.map((c) => `t.${c} LIKE ?`).join(' OR ')})`);
      def.search.forEach(() => params.push(`%${req.query.search}%`));
    }
    if (def.filters) def.filters(req.query, where, params);
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = (await db.one(`SELECT COUNT(*) AS c FROM ${from} ${w}`, params)).c;
    const rows = await db.query(`SELECT ${select} FROM ${from} ${w} ORDER BY ${def.order || 't.id DESC'} LIMIT ? OFFSET ?`, [...params, pg.per_page, pg.offset]);
    const out = H.paged(rows.map((row) => decode(def, row)), total, pg);
    if (def.summary) out.summary = await def.summary({ from, w, params });
    res.json(out);
  }));

  r.get('/:id', ah(async (req, res) => {
    const row = await db.one(`SELECT ${select} FROM ${from} WHERE t.id = ?`, [req.params.id]);
    if (!row) fail(404, 'Not found');
    res.json(decode(def, row));
  }));

  if (!def.noCreate) {
    r.post('/', ah(async (req, res) => {
      const data = await encode(def, req.body || {}, null);
      if (def.hasCreatedAt !== false) data.created_at = db.now();
      const id = await db.insert(def.table, data);
      revalidate(def.tags);
      res.status(201).json(decode(def, await db.one(`SELECT ${select} FROM ${from} WHERE t.id = ?`, [id])));
    }));
  }

  r.put('/:id', ah(async (req, res) => {
    const existing = await db.one(`SELECT * FROM ${def.table} WHERE id = ?`, [req.params.id]);
    if (!existing) fail(404, 'Not found');
    const data = await encode(def, req.body || {}, existing);
    await db.update(def.table, existing.id, data);
    revalidate(def.tags);
    res.json(decode(def, await db.one(`SELECT ${select} FROM ${from} WHERE t.id = ?`, [existing.id])));
  }));

  r.delete('/:id', ah(async (req, res) => {
    const existing = await db.one(`SELECT * FROM ${def.table} WHERE id = ?`, [req.params.id]);
    if (!existing) fail(404, 'Not found');
    if (def.beforeDelete) await def.beforeDelete(existing, req);
    await db.remove(def.table, existing.id);
    revalidate(def.tags);
    res.json({ ok: true });
  }));

  return r;
}

// ---------- Resource definitions ----------
const resources = {
  brands: {
    perm: 'catalog', table: 'brands', fields: ['name', 'logo', 'meta_title', 'meta_description', 'meta_keywords'],
    required: ['name'], slug: 'name', search: ['name'], order: 't.name ASC', tags: ['products', 'layout'],
    select: 't.*, (SELECT COUNT(*) FROM products p WHERE p.brand_id = t.id) AS products_count',
    beforeDelete: (row) => db.query('UPDATE products SET brand_id = NULL WHERE brand_id = ?', [row.id]),
  },
  categories: {
    perm: 'catalog', table: 'categories',
    fields: ['name', 'parent_id', 'image', 'description', 'featured', 'show_on_home', 'sort_order'],
    ints: ['parent_id', 'sort_order'], bools: ['featured', 'show_on_home'], required: ['name'], slug: 'name', search: ['name'],
    from: 'categories t LEFT JOIN categories pc ON pc.id = t.parent_id',
    select: 't.*, pc.name AS parent_name, (SELECT COUNT(*) FROM product_categories x WHERE x.category_id = t.id) AS products_count',
    order: 't.sort_order ASC, t.id ASC', perPage: 500, tags: ['layout', 'home', 'products'],
    transform: (data, body, existing) => {
      if (existing && data.parent_id && Number(data.parent_id) === Number(existing.id)) fail(422, 'A category cannot be its own parent');
    },
    beforeDelete: async (row) => {
      await db.query('UPDATE categories SET parent_id = ? WHERE parent_id = ?', [row.parent_id || null, row.id]);
      await db.query('DELETE FROM product_categories WHERE category_id = ?', [row.id]);
    },
  },
  attributes: {
    perm: 'catalog', table: 'attributes', fields: ['name', 'options'], json: ['options'], required: ['name'], order: 't.name ASC',
  },
  'size-charts': {
    perm: 'catalog', table: 'size_charts', fields: ['name', 'image'], required: ['name'], tags: ['products'],
  },
  coupons: {
    perm: 'marketing', table: 'coupons',
    fields: ['code', 'type', 'discount', 'max_discount', 'min_purchase', 'start_date', 'end_date', 'product_ids', 'status'],
    nums: ['discount', 'max_discount', 'min_purchase'], bools: ['status'], json: ['product_ids'], dates: ['start_date', 'end_date'],
    required: ['code'], search: ['code'],
    transform: (data) => {
      if (data.code) data.code = String(data.code).toUpperCase().replace(/\s+/g, '');
      if (data.type && !['fixed', 'percent'].includes(data.type)) data.type = 'fixed';
    },
  },
  'expense-categories': { perm: 'expenses', table: 'expense_categories', fields: ['name'], required: ['name'], order: 't.name ASC' },
  expenses: {
    perm: 'expenses', table: 'expenses', fields: ['details', 'amount', 'expense_date', 'category_id'],
    nums: ['amount'], ints: ['category_id'], required: ['details', 'amount'], search: ['details'],
    from: 'expenses t LEFT JOIN expense_categories c ON c.id = t.category_id', select: 't.*, c.name AS category_name',
    order: 't.expense_date DESC, t.id DESC',
    transform: (data, body, existing) => { if (!existing && !data.expense_date) data.expense_date = db.today(); },
    filters: (q, where, params) => {
      if (q.from) { where.push('t.expense_date >= ?'); params.push(q.from); }
      if (q.to) { where.push('t.expense_date <= ?'); params.push(q.to); }
      if (q.category) { where.push('t.category_id = ?'); params.push(q.category); }
    },
    summary: async ({ from, w, params }) => {
      const total = (await db.one(`SELECT COALESCE(SUM(t.amount),0) AS s FROM ${from} ${w}`, params)).s;
      const by_category = await db.query(`SELECT COALESCE(c.name, 'Uncategorized') AS name, SUM(t.amount) AS amount FROM ${from} ${w} GROUP BY c.name ORDER BY amount DESC`, params);
      return { total, by_category };
    },
  },
  blocklists: {
    perm: 'users', table: 'blocklists', fields: ['phone', 'note'], required: ['phone'], search: ['phone', 'note'],
    transform: (data) => {
      if (data.phone !== undefined) {
        const p = H.normalizePhone(data.phone);
        if (!p) fail(422, 'Enter a valid 11-digit phone number');
        data.phone = p;
      }
    },
  },
  pages: {
    perm: 'appearance', table: 'pages', fields: ['title', 'content', 'status'], bools: ['status'], slug: 'title',
    required: ['title'], search: ['title'], order: 't.id ASC', tags: ['pages', 'layout'],
  },
  sliders: {
    perm: 'appearance', table: 'sliders',
    fields: ['type', 'position', 'title', 'link', 'desktop_media', 'mobile_media', 'sort_order', 'status'],
    ints: ['sort_order'], bools: ['status'], required: ['desktop_media'], order: 't.position ASC, t.sort_order ASC, t.id ASC', tags: ['home'],
  },
  menus: {
    perm: 'appearance', table: 'menus', fields: ['name', 'location', 'items'], json: ['items'], required: ['name', 'location'],
    order: 't.id ASC', tags: ['layout'],
    transform: (data) => { if (data.location) data.location = H.slugify(data.location).replace(/-/g, '_'); },
  },
  roles: {
    perm: 'users', table: 'roles', fields: ['name', 'permissions'], json: ['permissions'], required: ['name'], order: 't.id ASC',
    select: 't.*, (SELECT COUNT(*) FROM users u WHERE u.role_id = t.id) AS users_count',
    beforeDelete: async (row) => {
      if (H.parseJSON(row.permissions, []).includes('*')) fail(422, 'The main Admin role cannot be deleted');
      const used = await db.one('SELECT COUNT(*) AS c FROM users WHERE role_id = ?', [row.id]);
      if (used.c) fail(422, 'Move the users of this role to another role first');
    },
  },
  reviews: {
    perm: 'reviews', table: 'reviews', fields: ['status', 'rating', 'comment'], ints: ['rating'], noCreate: true,
    from: 'reviews t LEFT JOIN products p ON p.id = t.product_id LEFT JOIN users u ON u.id = t.user_id',
    select: 't.*, p.name AS product_name, p.slug AS product_slug, u.name AS user_name, u.phone AS user_phone',
    tags: ['products'],
    filters: (q, where, params) => { if (q.status) { where.push('t.status = ?'); params.push(q.status); } },
  },
  campaigns: {
    perm: 'marketing', table: 'campaigns', fields: ['title', 'product_id', 'image', 'content', 'carousel', 'reviews', 'status'],
    json: ['content', 'carousel', 'reviews'], ints: ['product_id'], bools: ['status'], slug: 'title', required: ['title'],
    search: ['title'], from: 'campaigns t LEFT JOIN products p ON p.id = t.product_id', select: 't.*, p.name AS product_name',
    tags: ['campaigns'],
  },
};

module.exports = { makeCrud, resources };
