// Facebook Conversions API: sends the Purchase event from the server, so orders are counted even
// when the browser pixel is blocked (ad blockers, iPhone privacy). The browser pixel sends the same
// event with the same event_id, and Facebook keeps only one of them.
const crypto = require('crypto');
const { getSettings } = require('./settings');

const GRAPH = 'https://graph.facebook.com/v21.0';
const sha = (v) => (v ? crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex') : undefined);

function cookie(req, name) {
  const m = String(req?.headers?.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function userData(order, req) {
  const phone = String(order.phone || '').replace(/\D/g, '');
  const intl = phone.startsWith('0') ? `88${phone}` : phone; // 01XXXXXXXXX → 8801XXXXXXXXX
  const [first, ...rest] = String(order.name || '').trim().split(/\s+/);
  const ip = String(req?.headers?.['x-forwarded-for'] || req?.ip || '').split(',')[0].trim();
  return {
    ph: phone && phone !== 'walk-in' ? [sha(intl)] : undefined,
    em: order.email ? [sha(order.email)] : undefined,
    fn: first ? [sha(first)] : undefined,
    ln: rest.length ? [sha(rest.join(' '))] : undefined,
    ct: order.city ? [sha(String(order.city).replace(/\s+/g, ''))] : undefined,
    country: [sha('bd')],
    external_id: phone ? [sha(intl)] : undefined,
    client_ip_address: ip || undefined,
    client_user_agent: req?.headers?.['user-agent'] || undefined,
    fbp: cookie(req, '_fbp'),
    fbc: cookie(req, '_fbc'),
  };
}

async function postEvents(pixel, token, events, testCode) {
  const body = { data: events };
  if (testCode) body.test_event_code = testCode;
  const res = await fetch(`${GRAPH}/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Facebook error (${res.status})`);
  return data;
}

/** Purchase event for a new order (fire-and-forget). */
async function sendPurchase(order, req) {
  try {
    const { marketing: m } = await getSettings();
    if (!Number(m.fb_capi_enabled) || !m.fb_pixel_id || !m.fb_capi_token) return;
    const origin = req?.headers?.origin || (req?.headers?.referer ? new URL(req.headers.referer).origin : '');
    await postEvents(m.fb_pixel_id, m.fb_capi_token, [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: `order_${order.order_no}`,
      action_source: 'website',
      event_source_url: origin ? `${origin}/checkout` : undefined,
      user_data: userData(order, req),
      custom_data: {
        currency: 'BDT',
        value: Number(order.total),
        order_id: order.order_no,
        content_type: 'product',
        content_ids: (order.items || []).map((i) => String(i.product_id)),
        contents: (order.items || []).map((i) => ({ id: String(i.product_id), quantity: Number(i.qty), item_price: Number(i.price) })),
        num_items: (order.items || []).reduce((s, i) => s + Number(i.qty), 0),
      },
    }], m.fb_test_event_code || undefined);
  } catch (e) {
    console.warn('[fb capi]', e.message);
  }
}

/** Send a test event (Events Manager → Test events) and return Facebook's answer. */
async function sendTest(req) {
  const { marketing: m } = await getSettings();
  if (!m.fb_pixel_id || !m.fb_capi_token) throw Object.assign(new Error('Enter the Pixel ID and access token first'), { status: 422 });
  return postEvents(m.fb_pixel_id, m.fb_capi_token, [{
    event_name: 'PageView',
    event_time: Math.floor(Date.now() / 1000),
    event_id: `test_${Date.now()}`,
    action_source: 'website',
    user_data: { client_ip_address: String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim() || undefined, client_user_agent: req.headers['user-agent'] },
  }], m.fb_test_event_code || undefined);
}

module.exports = { sendPurchase, sendTest };
