'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { api } from '@/lib/client';
import { productData, track } from '@/lib/pixel';
import { fmtDate, imgUrl, PAYMENT_STATUS, STATUS, taka } from '@/lib/format';

const METHOD = { cod: 'Cash on Delivery', bkash: 'bKash', sslcommerz: 'Card / Mobile Banking' };

export default function OrderSuccess({ orderNo, accessKey, paid, paymentFailed }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    api(`/orders/view/${encodeURIComponent(orderNo)}?key=${encodeURIComponent(accessKey)}`)
      .then((o) => {
        setOrder(o);
        // Facebook Pixel / GA purchase event (if added in Custom Code)
        if (!tracked.current && typeof window !== 'undefined') {
          tracked.current = true;
          // same event ID as the server-side Conversions API, so Facebook counts the purchase once
          const seen = `px_purchase_${o.order_no}`;
          let already = false;
          try { already = !!sessionStorage.getItem(seen); sessionStorage.setItem(seen, '1'); } catch { /* ignore */ }
          if (!already) track('Purchase', { ...productData(o.items || []), value: Number(o.total), num_items: (o.items || []).reduce((s, i) => s + Number(i.qty), 0) }, `order_${o.order_no}`);
          window.gtag?.('event', 'purchase', { transaction_id: o.order_no, value: o.total, currency: 'BDT' });
        }
      })
      .catch((e) => setError(e.message));
  }, [orderNo, accessKey]);

  const retry = async () => {
    setRetrying(true);
    try {
      const r = await api(`/payment/retry/${encodeURIComponent(orderNo)}`, { method: 'POST', body: { key: accessKey } });
      window.location.href = r.payment_url;
    } catch (e) {
      setError(e.message);
      setRetrying(false);
    }
  };

  if (error && !order) {
    return (
      <div className="container-x py-16 text-center">
        <h1 className="text-xl font-semibold">Order #{orderNo}</h1>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <Link href="/track-order" className="btn btn-primary mt-6">Track your order</Link>
      </div>
    );
  }
  if (!order) return <div className="container-x py-20 text-center text-slate-400">Loading your order…</div>;

  const unpaidOnline = order.payment_method !== 'cod' && order.payment_status !== 'paid';

  return (
    <div className="container-x py-8">
      <div className="mx-auto max-w-3xl">
        <div className="card overflow-hidden">
          <div className="bg-emerald-50 px-6 py-8 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white"><Icon name="check" className="h-9 w-9" strokeWidth={3} /></span>
            <h1 className="font-bn mt-4 text-2xl font-bold text-slate-900">ধন্যবাদ! আপনার অর্ডারটি গ্রহণ করা হয়েছে</h1>
            <p className="mt-1 text-slate-600">Thank you! Your order has been placed successfully.</p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-sm">Order No: <b className="text-primary">#{order.order_no}</b></p>
            <p className="mt-3 text-sm text-slate-500">We will call you shortly to confirm your order.</p>
          </div>

          {paymentFailed && unpaidOnline ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
              <span>Payment was not completed. You can try again or we will collect cash on delivery.</span>
              <button type="button" onClick={retry} disabled={retrying} className="btn btn-sm btn-primary">{retrying ? 'Please wait…' : 'Pay Now'}</button>
            </div>
          ) : null}
          {paid ? <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-3 text-sm text-emerald-700">Payment received. Thank you!</div> : null}

          <div className="grid gap-6 p-6 md:grid-cols-2">
            <div>
              <h2 className="mb-2 font-semibold">Delivery Details</h2>
              <p className="text-sm text-slate-600">{order.name}<br />{order.phone}<br />{order.address}{order.city ? `, ${order.city}` : ''}</p>
            </div>
            <div className="text-sm">
              <h2 className="mb-2 font-semibold">Order Info</h2>
              <p className="text-slate-600">Date: {fmtDate(order.created_at, true)}</p>
              <p className="text-slate-600">Payment: {METHOD[order.payment_method] || order.payment_method} · <span className={`badge ${PAYMENT_STATUS[order.payment_status]?.cls}`}>{PAYMENT_STATUS[order.payment_status]?.label}</span></p>
              <p className="mt-1 text-slate-600">Status: <span className={`badge ${STATUS[order.delivery_status]?.cls}`}>{STATUS[order.delivery_status]?.label}</span></p>
            </div>
          </div>

          <ul className="divide-y divide-slate-100 border-t border-slate-100 px-6">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3">
                <Image src={imgUrl(i.image)} alt="" width={56} height={56} className="h-14 w-14 rounded-lg border border-slate-100 bg-slate-50 object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-slate-500">{i.variant_name ? `${i.variant_name} · ` : ''}{i.qty} × {taka(i.price)}</p>
                </div>
                <span className="text-sm font-semibold">{taka(i.qty * i.price)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t border-slate-100 px-6 py-4 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{taka(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Shipping</dt><dd>{taka(order.shipping)}</dd></div>
            {Number(order.discount) > 0 ? <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="text-emerald-600">-{taka(order.discount)}</dd></div> : null}
            {Number(order.tax) > 0 ? <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd>{taka(order.tax)}</dd></div> : null}
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold"><dt>Total</dt><dd className="text-primary">{taka(order.total)}</dd></div>
          </dl>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn btn-primary">Continue Shopping</Link>
          <Link href={`/track-order?q=${encodeURIComponent(order.order_no)}`} className="btn btn-outline">Track Order</Link>
          <button type="button" onClick={() => window.print()} className="btn btn-ghost no-print"><Icon name="print" className="h-4 w-4" /> Print</button>
        </div>
      </div>
    </div>
  );
}
