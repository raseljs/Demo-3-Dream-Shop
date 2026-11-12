// Customer delivery-history check through BD Courier (bdcourier.com). API key: Admin > Settings > General.
const db = require('../db');
const { getSettings } = require('./settings');

async function fraudCheck(phone) {
  // Our own history is always available
  const own = await db.one(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN delivery_status = 'cancel' THEN 1 ELSE 0 END) AS cancelled
     FROM orders WHERE phone = ?`,
    [phone]
  );
  const result = {
    phone,
    store: { total: Number(own.total) || 0, delivered: Number(own.delivered) || 0, cancelled: Number(own.cancelled) || 0 },
    courier: null,
    error: null,
  };
  const { general } = await getSettings();
  if (!general.bdcourier_api) {
    result.error = 'Add a BD Courier API key in General Settings to see courier-wide history.';
    return result;
  }
  try {
    const res = await fetch('https://bdcourier.com/api/courier-check', {
      method: 'POST',
      headers: { Authorization: `Bearer ${general.bdcourier_api}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ phone }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    result.courier = data.courierData || data.data || data;
  } catch (e) {
    result.error = 'BD Courier lookup failed: ' + e.message;
  }
  return result;
}

module.exports = { fraudCheck };
