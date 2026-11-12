// Flash sales: at the start time the flash price becomes the product's sale price, and at the end
// the original price comes back automatically. Checked every 30 seconds by the scheduler.
const db = require('../db');
const H = require('../utils/helpers');
const { revalidate } = require('./revalidate');

async function applySale(sale, conn) {
  const items = await db.query('SELECT * FROM flash_sale_items WHERE flash_sale_id = ?', [sale.id], conn);
  for (const it of items) {
    const p = await db.one('SELECT id, type, sale_price FROM products WHERE id = ?', [it.product_id], conn);
    if (!p) continue;
    const variants = p.type === 'variable' ? await db.query('SELECT id, sale_price FROM product_variants WHERE product_id = ?', [p.id], conn) : [];
    await db.query('UPDATE flash_sale_items SET original_sale_price = ?, original_variants = ? WHERE id = ?',
      [H.num(p.sale_price), JSON.stringify(variants.map((v) => [v.id, H.num(v.sale_price)])), it.id], conn);
    await db.query('UPDATE products SET sale_price = ? WHERE id = ?', [H.money(it.flash_price), p.id], conn);
    if (variants.length) await db.query('UPDATE product_variants SET sale_price = ? WHERE product_id = ?', [H.money(it.flash_price), p.id], conn);
  }
}

async function restoreSale(sale, conn) {
  const items = await db.query('SELECT * FROM flash_sale_items WHERE flash_sale_id = ? AND original_sale_price IS NOT NULL', [sale.id], conn);
  for (const it of items) {
    await db.query('UPDATE products SET sale_price = ? WHERE id = ?', [H.num(it.original_sale_price), it.product_id], conn);
    for (const [vid, price] of H.parseJSON(it.original_variants, [])) {
      await db.query('UPDATE product_variants SET sale_price = ? WHERE id = ? AND product_id = ?', [H.num(price), vid, it.product_id], conn);
    }
    await db.query('UPDATE flash_sale_items SET original_sale_price = NULL, original_variants = NULL WHERE id = ?', [it.id], conn);
  }
}

/** Start / stop flash sales whose time has come. Returns true if prices changed. */
async function tick() {
  const now = db.now();
  let changed = false;
  const running = await db.query("SELECT * FROM flash_sales WHERE state = 'running'");
  for (const s of running) {
    const over = s.ends_at <= now;
    if (over || !Number(s.status) || s.starts_at > now) {
      await db.tx((c) => restoreSale(s, c));
      await db.update('flash_sales', s.id, { state: over ? 'ended' : 'scheduled' });
      changed = true;
    }
  }
  const due = await db.query("SELECT * FROM flash_sales WHERE state = 'scheduled' AND status = 1 AND starts_at <= ? AND ends_at > ?", [now, now]);
  for (const s of due) {
    await db.tx((c) => applySale(s, c));
    await db.update('flash_sales', s.id, { state: 'running' });
    changed = true;
  }
  await db.query("UPDATE flash_sales SET state = 'ended' WHERE state = 'scheduled' AND ends_at <= ?", [now]);
  if (changed) revalidate('products', 'home');
  return changed;
}

/** Stop a sale right now (before editing or deleting it). */
async function stopSale(id) {
  const s = await db.one('SELECT * FROM flash_sales WHERE id = ?', [id]);
  if (s && s.state === 'running') {
    await db.tx((c) => restoreSale(s, c));
    await db.update('flash_sales', s.id, { state: 'scheduled' });
    revalidate('products', 'home');
  }
  return s;
}

/** The sale that is live right now, if any (for the storefront). */
async function activeSale() {
  const now = db.now();
  return db.one("SELECT id, title, starts_at, ends_at FROM flash_sales WHERE state = 'running' AND status = 1 AND ends_at > ? ORDER BY ends_at ASC LIMIT 1", [now]);
}

module.exports = { tick, stopSale, activeSale };
