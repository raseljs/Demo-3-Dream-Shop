// Shared catalog queries (storefront + admin)
const db = require('../db');
const H = require('../utils/helpers');

const PRICE = '(CASE WHEN p.sale_price > 0 THEN p.sale_price ELSE p.regular_price END)';
const CARD_COLS = 'p.id, p.name, p.slug, p.thumbnail, p.images, p.regular_price, p.sale_price, p.qty, p.type, p.sku';

async function allCategories() {
  return db.query('SELECT id, name, slug, parent_id, image, featured, show_on_home, sort_order, description FROM categories ORDER BY sort_order ASC, id ASC');
}

function buildTree(rows) {
  const map = new Map(rows.map((r) => [Number(r.id), { ...r, children: [] }]));
  const roots = [];
  for (const node of map.values()) {
    const parent = node.parent_id ? map.get(Number(node.parent_id)) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** id of a category plus all of its descendants */
function descendantIds(rows, id) {
  const ids = [Number(id)];
  for (let i = 0; i < ids.length; i++) {
    for (const r of rows) if (Number(r.parent_id) === ids[i] && !ids.includes(Number(r.id))) ids.push(Number(r.id));
  }
  return ids;
}

const card = (p) => {
  const images = H.parseJSON(p.images, []);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    thumbnail: p.thumbnail || images[0] || null,
    hover_image: images.find((i) => i !== p.thumbnail) || null,
    regular_price: H.num(p.regular_price),
    sale_price: H.num(p.sale_price),
    price: H.priceOf(p),
    in_stock: H.int(p.qty) > 0,
    type: p.type,
  };
};

/**
 * Product listing with filters.
 * opts: { categoryIds, brandIds, min, max, q, sort, page, per_page, excludeId, includeDraft }
 */
async function listProducts(opts = {}) {
  const where = [];
  const params = [];
  if (!opts.includeDraft) { where.push('p.status = ?'); params.push('published'); }
  if (opts.categoryIds && opts.categoryIds.length) {
    where.push('p.id IN (SELECT product_id FROM product_categories WHERE category_id IN (?))');
    params.push(opts.categoryIds);
  }
  if (opts.brandIds && opts.brandIds.length) { where.push('p.brand_id IN (?)'); params.push(opts.brandIds); }
  if (H.num(opts.min) > 0) { where.push(`${PRICE} >= ?`); params.push(H.num(opts.min)); }
  if (H.num(opts.max) > 0) { where.push(`${PRICE} <= ?`); params.push(H.num(opts.max)); }
  if (opts.q) {
    where.push('(p.name LIKE ? OR p.sku LIKE ?)');
    params.push(`%${opts.q}%`, `%${opts.q}%`);
  }
  if (opts.excludeId) { where.push('p.id <> ?'); params.push(opts.excludeId); }
  const order = {
    latest: 'p.id DESC',
    price_asc: `${PRICE} ASC, p.id DESC`,
    price_desc: `${PRICE} DESC, p.id DESC`,
    name_asc: 'p.name ASC',
  }[opts.sort] || 'p.sort_order DESC, p.id DESC';
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const page = Math.max(1, H.int(opts.page, 1));
  const per_page = Math.min(100, Math.max(1, H.int(opts.per_page, 16)));
  const totalRow = await db.one(`SELECT COUNT(*) AS c FROM products p ${w}`, params);
  const rows = await db.query(
    `SELECT ${CARD_COLS} FROM products p ${w} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, per_page, (page - 1) * per_page]
  );
  return H.paged(rows.map(card), totalRow.c, { page, per_page });
}

module.exports = { PRICE, CARD_COLS, allCategories, buildTree, descendantIds, card, listProducts };
