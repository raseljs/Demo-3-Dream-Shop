// Pricing, checkout and order lifecycle — shared by the storefront, landing pages and POS.
const db = require('../db');
const H = require('../utils/helpers');
const { getSettings } = require('./settings');
const { orderSms } = require('./sms');
const { logMovement } = require('./stock');
const { notifyNewOrder } = require('./notify');

const DELIVERY_STATUSES = ['pending', 'confirmed', 'on_the_way', 'delivered', 'cancel'];
const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'refunded'];

/** Resolve cart items against the database. Each line gets `error` when it can't be bought. */
async function loadLines(items, { staff = false, conn } = {}) {
  if (!Array.isArray(items) || !items.length) H.fail(422, 'Your cart is empty.');
  const ids = [...new Set(items.map((i) => H.int(i.product_id)).filter(Boolean))];
  const vids = [...new Set(items.map((i) => H.int(i.variant_id)).filter(Boolean))];
  const products = ids.length ? await db.query('SELECT * FROM products WHERE id IN (?)', [ids], conn) : [];
  const variants = vids.length ? await db.query('SELECT * FROM product_variants WHERE id IN (?)', [vids], conn) : [];

  return items.map((it) => {
    const qty = Math.max(1, H.int(it.qty, 1));
    const p = products.find((x) => Number(x.id) === H.int(it.product_id));
    if (!p || (!staff && p.status !== 'published')) {
      return { product_id: H.int(it.product_id), variant_id: null, qty, name: it.name || 'Unavailable product', price: 0, error: 'This product is no longer available' };
    }
    let v = null;
    if (it.variant_id) {
      v = variants.find((x) => Number(x.id) === H.int(it.variant_id) && Number(x.product_id) === Number(p.id)) || null;
    }
    const line = {
      product_id: p.id,
      variant_id: v ? v.id : null,
      name: p.name,
      slug: p.slug,
      variant_name: v ? v.name : null,
      sku: (v && v.sku) || p.sku || null,
      image: (v && v.image) || p.thumbnail || null,
      qty,
      regular_price: H.num((v || p).regular_price),
      price: H.priceOf(v || p),
      purchase_price: H.num((v && Number(v.purchase_price) > 0 ? v : p).purchase_price),
      stock: v ? H.int(v.qty) : H.int(p.qty),
      free_shipping: H.int(p.free_shipping),
      shipping_inside: H.num(p.shipping_inside),
      shipping_outside: H.num(p.shipping_outside),
      vat_type: p.vat_type,
      vat: H.num(p.vat),
      error: null,
    };
    if (staff && it.price !== undefined && it.price !== null && it.price !== '') line.price = H.money(it.price);
    if (p.type === 'variable' && !v) line.error = 'Please choose an option';
    else if (line.stock <= 0) line.error = 'Out of stock';
    else if (qty > line.stock) line.error = `Only ${line.stock} left in stock`;
    line.tax = H.money(line.vat_type === 'fixed' ? line.vat * qty : (line.price * qty * line.vat) / 100);
    line.line_total = H.money(line.price * qty);
    return line;
  });
}

async function couponDiscount(code, lines, subtotal) {
  if (!code) return { discount: 0, error: null, code: null };
  const c = await db.one('SELECT * FROM coupons WHERE code = ? AND status = 1', [String(code).trim().toUpperCase()]);
  const bad = (error) => ({ discount: 0, error, code: null });
  if (!c) return bad('Invalid coupon code');
  const n = db.now();
  if (c.start_date && n < c.start_date) return bad('This coupon is not active yet');
  if (c.end_date && n > c.end_date) return bad('This coupon has expired');
  const productIds = H.parseJSON(c.product_ids, []).map(Number).filter(Boolean);
  const eligible = productIds.length ? lines.filter((l) => productIds.includes(Number(l.product_id))) : lines;
  const base = eligible.reduce((s, l) => s + l.line_total, 0);
  if (!base) return bad('This coupon is not valid for the products in your cart');
  if (H.num(c.min_purchase) > 0 && subtotal < H.num(c.min_purchase)) return bad(`Minimum purchase ৳${H.num(c.min_purchase)} required for this coupon`);
  let discount = c.type === 'percent' ? (base * H.num(c.discount)) / 100 : H.num(c.discount);
  if (c.type === 'percent' && H.num(c.max_discount) > 0) discount = Math.min(discount, H.num(c.max_discount));
  return { discount: H.money(Math.min(discount, base)), error: null, code: c.code };
}

/**
 * Price a cart. input: { items, area: 'inside'|'outside', coupon, shipping?, discount? }
 * shipping/discount overrides are only honoured for staff (POS).
 */
async function quote(input, { staff = false, conn } = {}) {
  const settings = await getSettings();
  const lines = await loadLines(input.items, { staff, conn });
  const valid = lines.filter((l) => !l.error);
  const area = input.area === 'outside' ? 'outside' : 'inside';
  const subtotal = H.money(valid.reduce((s, l) => s + l.line_total, 0));

  const base = H.num(area === 'outside' ? settings.shipping.shipping_outside_dhaka : settings.shipping.shipping_inside_dhaka);
  const paying = valid.filter((l) => !l.free_shipping);
  let shipping = paying.length
    ? Math.max(...paying.map((l) => { const o = area === 'outside' ? l.shipping_outside : l.shipping_inside; return o > 0 ? o : base; }))
    : 0;
  if (staff && input.shipping !== undefined && input.shipping !== null && input.shipping !== '') shipping = H.num(input.shipping);

  const tax = H.money(valid.reduce((s, l) => s + l.tax, 0));
  const cp = await couponDiscount(input.coupon, valid, subtotal);
  let discount = cp.discount;
  if (staff && H.num(input.discount) > 0) discount += H.num(input.discount);
  discount = H.money(Math.min(discount, subtotal));

  const total = H.money(Math.max(0, subtotal + shipping + tax - discount));
  return { lines, subtotal, shipping: H.money(shipping), tax, discount, coupon: cp.code, coupon_error: cp.error, total, area };
}

/**
 * Add (sign +1) or remove (sign -1) the items' quantities from stock.
 * meta { reason, ref_type, ref_id, ref_label, user_id } → also written to the stock history.
 */
async function adjustStock(items, sign, conn, { check = false, meta = null } = {}) {
  for (const l of items) {
    const qty = H.int(l.qty) - H.int(l.returned_qty);
    if (!qty || !l.product_id) continue;
    const table = l.variant_id ? 'product_variants' : 'products';
    const id = l.variant_id || l.product_id;
    if (sign < 0 && check) {
      const r = await db.query(`UPDATE ${table} SET qty = qty - ? WHERE id = ? AND qty >= ?`, [qty, id, qty], conn);
      if (!r.affectedRows) H.fail(422, `Sorry, "${l.name}" just went out of stock.`);
    } else {
      await db.query(`UPDATE ${table} SET qty = qty + ? WHERE id = ?`, [sign * qty, id], conn);
    }
    if (l.variant_id) {
      // keep the parent's total stock in sync with its variants
      await db.query('UPDATE products SET qty = (SELECT COALESCE(SUM(qty),0) FROM product_variants WHERE product_id = ?) WHERE id = ?', [l.product_id, l.product_id], conn);
    }
    if (meta) {
      const name = l.name ? `${l.name}${l.variant_name ? ` (${l.variant_name})` : ''}` : null;
      await logMovement({ product_id: l.product_id, variant_id: l.variant_id, name, change: sign * qty }, meta, conn);
    }
  }
}

/**
 * Create an order.
 * opts: { user, staff (admin user for POS/manual orders), source: 'web'|'pos'|'landing'|'manual' }
 */
async function createOrder(input, { user = null, staff = null, source = 'web' } = {}) {
  const settings = await getSettings();
  const name = String(input.name || '').trim();
  // POS walk-in sales may skip the phone number
  const phone = H.normalizePhone(input.phone) || (staff && !String(input.phone || '').trim() ? 'walk-in' : null);
  let address = String(input.address || '').trim();
  if (!name && !staff) H.fail(422, 'Please enter your name.');
  if (!phone) H.fail(422, 'Please enter a valid 11-digit mobile number (01XXXXXXXXX).');
  if (!address) {
    if (staff) address = 'Walk-in customer';
    else H.fail(422, 'Please enter your delivery address.');
  }

  if (!staff) {
    if (!user && !Number(settings.general.guest_checkout)) H.fail(401, 'Please log in to place an order.');
    const blocked = await db.one('SELECT id FROM blocklists WHERE phone = ? LIMIT 1', [phone]);
    if (blocked) H.fail(403, 'Sorry, we cannot accept orders from this number. Please call us.');
  }

  let payment_method = String(input.payment_method || 'cod');
  if (!staff) {
    const enabled = Object.entries(settings.payment).filter(([, v]) => Number(v.status) === 1).map(([k]) => k);
    if (!enabled.includes(payment_method)) payment_method = enabled[0] || 'cod';
  }

  const q = await quote(input, { staff: !!staff });
  const bad = q.lines.find((l) => l.error);
  if (bad) H.fail(422, `${bad.name}: ${bad.error}`);
  if (input.coupon && q.coupon_error) H.fail(422, q.coupon_error);

  const created = db.now();
  const delivery_status = staff && DELIVERY_STATUSES.includes(input.delivery_status) ? input.delivery_status : 'pending';
  let payment_status = staff && PAYMENT_STATUSES.includes(input.payment_status) ? input.payment_status : 'unpaid';
  let paid_amount = staff ? H.money(input.paid_amount ?? (payment_status === 'paid' ? q.total : 0)) : 0;
  if (staff && paid_amount >= q.total && q.total > 0) payment_status = 'paid';

  const order = await db.tx(async (conn) => {
    await adjustStock(q.lines, -1, conn, { check: true });
    const id = await db.insert('orders', {
      access_key: H.randomToken(12),
      user_id: user ? user.id : H.int(input.user_id) || null,
      name: name || 'Walk-in Customer',
      phone,
      email: H.nullIfEmpty(input.email),
      address,
      city: H.nullIfEmpty(input.city),
      area: q.area,
      note: H.nullIfEmpty(String(input.note || '').slice(0, 500)),
      source,
      campaign_id: H.int(input.campaign_id) || null,
      subtotal: q.subtotal,
      shipping: q.shipping,
      discount: q.discount,
      tax: q.tax,
      total: q.total,
      paid_amount,
      coupon_code: q.coupon,
      payment_method,
      payment_status,
      delivery_status,
      assigned_to: staff ? staff.id : null,
      created_by: staff ? staff.id : null,
      created_at: created,
      updated_at: created,
    }, conn);
    const order_no = `${settings.general.order_prefix || ''}${100000 + Number(id)}`;
    await db.query('UPDATE orders SET order_no = ? WHERE id = ?', [order_no, id], conn);
    for (const l of q.lines) {
      await logMovement(
        { product_id: l.product_id, variant_id: l.variant_id, name: `${l.name}${l.variant_name ? ` (${l.variant_name})` : ''}`, change: -H.int(l.qty) },
        { reason: 'sale', ref_type: 'order', ref_id: id, ref_label: `#${order_no}`, user_id: staff ? staff.id : null },
        conn
      );
    }
    for (const l of q.lines) {
      await db.insert('order_items', {
        order_id: id, product_id: l.product_id, variant_id: l.variant_id, name: l.name, variant_name: l.variant_name,
        sku: l.sku, image: l.image, qty: l.qty, price: l.price, purchase_price: l.purchase_price, tax: l.tax,
      }, conn);
    }
    if (input.incomplete_token) await db.query('DELETE FROM incomplete_orders WHERE token = ?', [String(input.incomplete_token)], conn);
    await db.query('DELETE FROM incomplete_orders WHERE phone = ?', [phone], conn);
    return getOrder(id, conn);
  });

  orderSms(order, 'placed');
  if (source !== 'pos') notifyNewOrder(order);
  return order;
}

async function getOrder(idOrNo, conn) {
  const order = await db.one(
    `SELECT o.*, s.name AS assigned_name FROM orders o LEFT JOIN users s ON s.id = o.assigned_to
     WHERE ${typeof idOrNo === 'number' ? 'o.id = ?' : 'o.order_no = ?'}`,
    [idOrNo],
    conn
  );
  if (!order) return null;
  order.items = await db.query('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', [order.id], conn);
  return order;
}

/** Change delivery status and keep stock consistent (cancel → restock, un-cancel → deduct). */
async function changeStatus(orderId, status, { conn, notify = true, user = null } = {}) {
  if (!DELIVERY_STATUSES.includes(status)) H.fail(422, 'Invalid status');
  const run = async (c) => {
    const order = await getOrder(Number(orderId), c);
    if (!order) H.fail(404, 'Order not found');
    if (order.delivery_status === status) return order;
    const ref = { ref_type: 'order', ref_id: order.id, ref_label: `#${order.order_no}`, user_id: user ? user.id : null };
    if (status === 'cancel') await adjustStock(order.items, +1, c, { meta: { reason: 'cancel', ...ref } });
    if (order.delivery_status === 'cancel') await adjustStock(order.items, -1, c, { meta: { reason: 'sale', ...ref } });
    const data = { delivery_status: status, updated_at: db.now() };
    if (status === 'delivered' && order.payment_status !== 'paid' && order.payment_method === 'cod') {
      data.payment_status = 'paid';
      data.paid_amount = order.total;
    }
    await db.update('orders', order.id, data, c);
    return { ...order, ...data };
  };
  const updated = conn ? await run(conn) : await db.tx(run);
  if (notify) orderSms(updated, 'status');
  return updated;
}

module.exports = { DELIVERY_STATUSES, PAYMENT_STATUSES, loadLines, quote, createOrder, getOrder, changeStatus, adjustStock };
