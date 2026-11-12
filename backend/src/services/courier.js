// Courier integrations: Steadfast & Pathao. Credentials come from Admin > Settings > Courier.
const { getSettings } = require('./settings');

const due = (o) => Math.max(0, Number(o.total) - Number(o.paid_amount || 0));
const describe = (o) => (o.items || []).map((i) => `${i.name}${i.variant_name ? ` (${i.variant_name})` : ''} x${i.qty}`).join(', ').slice(0, 250);

async function steadfast(order) {
  const { courier } = await getSettings();
  const c = courier.steadfast;
  if (!Number(c.status)) throw new Error('Steadfast is disabled in Courier Settings');
  const res = await fetch(`${c.base_url.replace(/\/$/, '')}/create_order`, {
    method: 'POST',
    headers: { 'Api-Key': c.api_key, 'Secret-Key': c.secret_key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoice: order.order_no,
      recipient_name: order.name,
      recipient_phone: order.phone,
      recipient_address: [order.address, order.city].filter(Boolean).join(', ').slice(0, 250),
      cod_amount: due(order),
      note: order.note || describe(order),
    }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  const consignment = data.consignment || {};
  if (!res.ok || Number(data.status) !== 200 || !consignment.tracking_code) {
    throw new Error(data.message || (data.errors && JSON.stringify(data.errors)) || `Steadfast error (${res.status})`);
  }
  return { courier: 'steadfast', tracking: consignment.tracking_code, raw: consignment };
}

let pathaoToken = null;
async function pathaoAuth(c) {
  if (pathaoToken && pathaoToken.exp > Date.now()) return pathaoToken.value;
  const res = await fetch(`${c.base_url.replace(/\/$/, '')}/aladdin/api/v1/issue-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: c.client_id, client_secret: c.client_secret, grant_type: 'password', username: c.username, password: c.password }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) throw new Error(data.message || 'Pathao login failed — check Courier Settings');
  pathaoToken = { value: data.access_token, exp: Date.now() + (Number(data.expires_in || 3600) - 60) * 1000 };
  return pathaoToken.value;
}

async function pathao(order) {
  const { courier } = await getSettings();
  const c = courier.pathao;
  if (!Number(c.status)) throw new Error('Pathao is disabled in Courier Settings');
  const token = await pathaoAuth(c);
  const res = await fetch(`${c.base_url.replace(/\/$/, '')}/aladdin/api/v1/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      store_id: Number(c.store_id),
      merchant_order_id: order.order_no,
      recipient_name: order.name,
      recipient_phone: order.phone,
      recipient_address: [order.address, order.city].filter(Boolean).join(', ').slice(0, 220),
      delivery_type: 48,
      item_type: 2,
      special_instruction: order.note || '',
      item_quantity: (order.items || []).reduce((s, i) => s + Number(i.qty), 0) || 1,
      item_weight: 0.5,
      amount_to_collect: Math.round(due(order)),
      item_description: describe(order),
    }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  const consignment = data.data || {};
  if (!res.ok || !consignment.consignment_id) {
    throw new Error(data.message || (data.errors && JSON.stringify(data.errors)) || `Pathao error (${res.status})`);
  }
  return { courier: 'pathao', tracking: consignment.consignment_id, raw: consignment };
}

async function sendToCourier(name, order) {
  if (name === 'steadfast') return steadfast(order);
  if (name === 'pathao') return pathao(order);
  throw new Error('Unknown courier');
}

module.exports = { sendToCourier };
