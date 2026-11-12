// Stock history: every change to a product's (or variant's) quantity is recorded with a reason,
// so the shop can see exactly why stock went up or down.
const db = require('../db');
const H = require('../utils/helpers');

const REASONS = {
  sale: 'Sold',
  cancel: 'Order cancelled',
  order_deleted: 'Order deleted',
  return: 'Returned',
  return_deleted: 'Return removed',
  purchase: 'Stock in (purchase)',
  purchase_deleted: 'Purchase deleted',
  adjust: 'Manual adjustment',
  import: 'CSV import',
};

/**
 * Record one movement. meta: { reason, ref_type, ref_id, ref_label, user_id }
 * Reads the current balance after the change, so call it after the UPDATE.
 */
async function logMovement({ product_id, variant_id = null, name = null, change }, meta = {}, conn) {
  if (!meta.reason || !change) return;
  const row = variant_id
    ? await db.one('SELECT qty FROM product_variants WHERE id = ?', [variant_id], conn)
    : await db.one('SELECT qty FROM products WHERE id = ?', [product_id], conn);
  let label = name;
  if (!label) {
    const p = await db.one('SELECT name FROM products WHERE id = ?', [product_id], conn);
    const v = variant_id ? await db.one('SELECT name FROM product_variants WHERE id = ?', [variant_id], conn) : null;
    label = p ? `${p.name}${v ? ` (${v.name})` : ''}` : null;
  }
  await db.insert('stock_movements', {
    product_id: product_id || null,
    variant_id: variant_id || null,
    name: label ? String(label).slice(0, 255) : null,
    change_qty: H.int(change),
    balance: row ? H.int(row.qty) : null,
    reason: meta.reason,
    ref_type: meta.ref_type || null,
    ref_id: meta.ref_id || null,
    ref_label: meta.ref_label ? String(meta.ref_label).slice(0, 60) : null,
    user_id: meta.user_id || null,
    created_at: db.now(),
  }, conn);
}

module.exports = { REASONS, logMovement };
