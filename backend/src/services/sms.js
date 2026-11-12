const { getSettings } = require('./settings');

const fill = (tpl, data) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (data[k] ?? ''));

/**
 * Send an SMS using the provider chosen in Admin > Settings > SMS.
 *  - bulksmsbd: http://bulksmsbd.net (API key + sender ID)
 *  - custom:    any GET URL with {phone} and {message} placeholders
 */
async function sendSms(phone, message) {
  const { sms } = await getSettings();
  if (!sms.sms_provider || sms.sms_provider === 'none') return { ok: false, skipped: true };
  const number = '88' + String(phone).replace(/^\+?88/, '');
  let url;
  if (sms.sms_provider === 'bulksmsbd') {
    const q = new URLSearchParams({ api_key: sms.api_key, type: 'text', number, senderid: sms.sender_id, message });
    url = `http://bulksmsbd.net/api/smsapi?${q}`;
  } else if (sms.sms_provider === 'custom' && sms.custom_url) {
    url = fill(sms.custom_url, { phone: encodeURIComponent(number), message: encodeURIComponent(message), api_key: sms.api_key, sender_id: sms.sender_id });
  } else {
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    return { ok: res.ok, response: text.slice(0, 500) };
  } catch (e) {
    console.warn('[sms] failed:', e.message);
    return { ok: false, error: e.message };
  }
}

const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', on_the_way: 'On the way', delivered: 'Delivered', cancel: 'Cancelled' };

async function orderSms(order, kind = 'placed') {
  const { sms } = await getSettings();
  const enabled = kind === 'placed' ? Number(sms.order_sms) === 1 : Number(sms.status_sms) === 1;
  if (!enabled) return;
  const tpl = kind === 'placed' ? sms.order_template : sms.status_template;
  const text = fill(tpl, {
    name: order.name,
    order_no: order.order_no,
    total: order.total,
    status: STATUS_LABEL[order.delivery_status] || order.delivery_status,
  });
  sendSms(order.phone, text).catch(() => {});
}

module.exports = { sendSms, orderSms, STATUS_LABEL };
