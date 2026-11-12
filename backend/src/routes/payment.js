// Payment gateway callbacks → mark order paid → send the customer back to the storefront.
const express = require('express');
const db = require('../db');
const config = require('../config');
const { ah, fail } = require('../utils/helpers');
const { getOrder } = require('../services/orders');
const { startPayment, sslcommerzValidate, bkashExecute } = require('../services/payment');

const router = express.Router();

const successUrl = (o, extra = '') => `${config.frontendUrl}/order-success/${encodeURIComponent(o.order_no)}?key=${o.access_key}${extra}`;

async function markPaid(order, trx, amount) {
  const paid = Number(amount) || Number(order.total);
  await db.update('orders', order.id, {
    payment_status: paid >= Number(order.total) ? 'paid' : 'partial',
    paid_amount: paid,
    transaction_id: trx || null,
    updated_at: db.now(),
  });
}

// ---- SSLCommerz (POST form callbacks) ----
router.post('/sslcommerz/success', ah(async (req, res) => {
  const order = await getOrder(String(req.body.tran_id || ''));
  if (!order) return res.redirect(`${config.frontendUrl}/?payment=failed`);
  const v = await sslcommerzValidate(req.body.val_id);
  if (v.ok && v.tran_id === order.order_no) {
    await markPaid(order, v.bank_tran_id || req.body.val_id, v.amount);
    return res.redirect(successUrl(order, '&paid=1'));
  }
  res.redirect(successUrl(order, '&payment=failed'));
}));

router.post(['/sslcommerz/fail', '/sslcommerz/cancel'], ah(async (req, res) => {
  const order = await getOrder(String(req.body.tran_id || ''));
  if (!order) return res.redirect(`${config.frontendUrl}/?payment=failed`);
  res.redirect(successUrl(order, '&payment=failed'));
}));

router.post('/sslcommerz/ipn', ah(async (req, res) => {
  const order = await getOrder(String(req.body.tran_id || ''));
  if (order && order.payment_status !== 'paid' && req.body.val_id) {
    const v = await sslcommerzValidate(req.body.val_id);
    if (v.ok && v.tran_id === order.order_no) await markPaid(order, v.bank_tran_id, v.amount);
  }
  res.send('OK');
}));

// ---- bKash (GET redirect) ----
router.get('/bkash/callback', ah(async (req, res) => {
  const order = await getOrder(String(req.query.order || ''));
  if (!order) return res.redirect(`${config.frontendUrl}/?payment=failed`);
  if (req.query.status === 'success' && req.query.paymentID) {
    const r = await bkashExecute(String(req.query.paymentID));
    if (r.ok) {
      await markPaid(order, r.trxID, r.amount);
      return res.redirect(successUrl(order, '&paid=1'));
    }
  }
  res.redirect(successUrl(order, '&payment=failed'));
}));

// Try paying again for an unpaid online order
router.post('/retry/:orderNo', ah(async (req, res) => {
  const order = await getOrder(String(req.params.orderNo));
  if (!order || order.access_key !== req.body.key) fail(404, 'Order not found');
  if (order.payment_status === 'paid') fail(422, 'This order is already paid');
  const url = await startPayment(order);
  if (!url) fail(422, 'This order is Cash on Delivery');
  res.json({ payment_url: url });
}));

module.exports = router;
