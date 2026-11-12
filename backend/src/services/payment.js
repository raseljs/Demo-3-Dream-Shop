// Online payments: SSLCommerz (cards, Nagad, Rocket…) and bKash Tokenized Checkout.
const config = require('../config');
const { getSettings } = require('./settings');

const callback = (path) => `${config.backendUrl}/api/payment/${path}`;

// ---------- SSLCommerz ----------
const sslHost = (mode) => (mode === 'live' ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com');

async function sslcommerzInit(order) {
  const { payment } = await getSettings();
  const c = payment.sslcommerz;
  const body = new URLSearchParams({
    store_id: c.store_id,
    store_passwd: c.store_password,
    total_amount: String(order.total),
    currency: 'BDT',
    tran_id: order.order_no,
    success_url: callback('sslcommerz/success'),
    fail_url: callback('sslcommerz/fail'),
    cancel_url: callback('sslcommerz/cancel'),
    ipn_url: callback('sslcommerz/ipn'),
    cus_name: order.name,
    cus_email: order.email || 'customer@example.com',
    cus_add1: order.address,
    cus_city: order.city || 'Dhaka',
    cus_country: 'Bangladesh',
    cus_phone: order.phone,
    shipping_method: 'NO',
    product_name: (order.items || []).map((i) => i.name).join(', ').slice(0, 250) || 'Order',
    product_category: 'general',
    product_profile: 'general',
    num_of_item: String((order.items || []).length || 1),
    value_a: String(order.id),
  });
  const res = await fetch(`${sslHost(c.mode)}/gwprocess/v4/api.php`, { method: 'POST', body, signal: AbortSignal.timeout(20000) });
  const data = await res.json().catch(() => ({}));
  if (data.status !== 'SUCCESS' || !data.GatewayPageURL) throw new Error(data.failedreason || 'Could not start SSLCommerz payment');
  return data.GatewayPageURL;
}

async function sslcommerzValidate(val_id) {
  const { payment } = await getSettings();
  const c = payment.sslcommerz;
  const q = new URLSearchParams({ val_id, store_id: c.store_id, store_passwd: c.store_password, format: 'json' });
  const res = await fetch(`${sslHost(c.mode)}/validator/api/validationserverAPI.php?${q}`, { signal: AbortSignal.timeout(20000) });
  const data = await res.json().catch(() => ({}));
  return { ok: data.status === 'VALID' || data.status === 'VALIDATED', tran_id: data.tran_id, amount: Number(data.amount), bank_tran_id: data.bank_tran_id };
}

// ---------- bKash Tokenized ----------
const bkashBase = (mode) => (mode === 'live' ? 'https://tokenized.pay.bka.sh/v1.2.0-beta' : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta');

async function bkashToken(c) {
  const res = await fetch(`${bkashBase(c.mode)}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', username: c.username, password: c.password },
    body: JSON.stringify({ app_key: c.app_key, app_secret: c.app_secret }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.id_token) throw new Error(data.statusMessage || 'bKash authentication failed');
  return data.id_token;
}

async function bkashCall(path, body) {
  const { payment } = await getSettings();
  const c = payment.bkash;
  const token = await bkashToken(c);
  const res = await fetch(`${bkashBase(c.mode)}/tokenized/checkout/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: token, 'X-APP-Key': c.app_key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  return res.json().catch(() => ({}));
}

async function bkashCreate(order) {
  const data = await bkashCall('create', {
    mode: '0011',
    payerReference: order.phone,
    callbackURL: callback(`bkash/callback?order=${encodeURIComponent(order.order_no)}`),
    amount: String(order.total),
    currency: 'BDT',
    intent: 'sale',
    merchantInvoiceNumber: order.order_no,
  });
  if (!data.bkashURL) throw new Error(data.statusMessage || data.errorMessage || 'Could not start bKash payment');
  return data.bkashURL;
}

async function bkashExecute(paymentID) {
  const data = await bkashCall('execute', { paymentID });
  return { ok: data.transactionStatus === 'Completed', trxID: data.trxID, amount: Number(data.amount), message: data.statusMessage };
}

/** Returns a redirect URL for online methods, or null for COD. */
async function startPayment(order) {
  if (order.payment_method === 'sslcommerz') return sslcommerzInit(order);
  if (order.payment_method === 'bkash') return bkashCreate(order);
  return null;
}

module.exports = { startPayment, sslcommerzValidate, bkashExecute };
