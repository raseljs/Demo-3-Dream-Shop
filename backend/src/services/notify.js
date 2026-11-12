// Alerts to the shop owner when a new order comes in: Telegram message and/or SMS.
const { getSettings } = require('./settings');
const { sendSms } = require('./sms');

const tk = (n) => `৳${Number(n || 0).toLocaleString('en-IN')}`;

async function sendTelegram(token, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.description || `Telegram error (${res.status})`);
  return data;
}

function orderText(order) {
  const items = (order.items || []).slice(0, 8).map((i) => `• ${i.name}${i.variant_name ? ` (${i.variant_name})` : ''} × ${i.qty}`).join('\n');
  return [
    `🛒 New order #${order.order_no}`,
    `${order.name} · ${order.phone}`,
    order.address ? `📍 ${order.address}` : null,
    items,
    `Total: ${tk(order.total)} (${order.payment_method === 'cod' ? 'Cash on delivery' : order.payment_method})`,
  ].filter(Boolean).join('\n');
}

/** Fire-and-forget: never blocks or breaks checkout. */
async function notifyNewOrder(order) {
  try {
    const { notifications: n } = await getSettings();
    if (Number(n.telegram_enabled) && n.telegram_bot_token && n.telegram_chat_id) {
      sendTelegram(n.telegram_bot_token, n.telegram_chat_id, orderText(order)).catch((e) => console.warn('[notify] telegram:', e.message));
    }
    if (Number(n.sms_alert_enabled) && n.sms_alert_phone) {
      sendSms(n.sms_alert_phone, `New order #${order.order_no}: ${order.name}, ${tk(order.total)}`).catch(() => {});
    }
  } catch (e) {
    console.warn('[notify]', e.message);
  }
}

module.exports = { notifyNewOrder, sendTelegram, orderText };
