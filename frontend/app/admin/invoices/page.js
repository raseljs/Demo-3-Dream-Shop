'use client';
import Image from 'next/image';
import { use, useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import Barcode from '@/components/admin/Barcode';
import { Loading } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { fmtDate, imgUrl, taka } from '@/lib/format';

function Invoice({ o, s }) {
  const due = Math.max(0, Number(o.total) - Number(o.paid_amount));
  return (
    <div className="invoice mx-auto mb-8 max-w-3xl bg-white p-8 shadow print:mb-0 print:max-w-none print:p-6 print:shadow-none" style={{ breakAfter: 'page' }}>
      <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
        <div>
          {s.logo ? <div className="rounded-lg bg-brand p-2 print:bg-brand"><Image src={imgUrl(s.logo)} alt="" width={160} height={40} className="h-10 w-auto" /></div> : <p className="text-2xl font-bold">{s.site_title}</p>}
          <p className="mt-2 text-xs text-slate-600">{s.address}</p>
          <p className="text-xs text-slate-600">{[s.phone, s.email].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold tracking-wide">INVOICE</p>
          <p className="text-sm">#{o.order_no}</p>
          <p className="text-xs text-slate-500">{fmtDate(o.created_at, true)}</p>
          <Barcode value={o.order_no} className="ml-auto mt-2 h-12 w-44" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 py-5 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Bill / Ship to</p>
          <p className="mt-1 font-semibold">{o.name}</p>
          <p>{o.phone}</p>
          <p className="text-slate-600">{o.address}{o.city ? `, ${o.city}` : ''}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase text-slate-500">Payment</p>
          <p className="mt-1 uppercase">{o.payment_method}</p>
          <p className="capitalize">{o.payment_status}</p>
          {o.courier_tracking ? <p className="mt-1 text-xs">Courier: <span className="capitalize">{o.courier}</span> — {o.courier_tracking}</p> : null}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-y border-slate-300 text-left text-xs uppercase"><th className="py-2">#</th><th className="py-2">Item</th><th className="py-2 text-right">Price</th><th className="py-2 text-center">Qty</th><th className="py-2 text-right">Total</th></tr></thead>
        <tbody>
          {o.items.map((i, x) => (
            <tr key={i.id} className="border-b border-slate-100">
              <td className="py-2">{x + 1}</td>
              <td className="py-2">{i.name}{i.variant_name ? <span className="text-slate-500"> — {i.variant_name}</span> : null}{i.sku ? <span className="block text-xs text-slate-400">{i.sku}</span> : null}</td>
              <td className="py-2 text-right">{taka(i.price)}</td>
              <td className="py-2 text-center">{i.qty}</td>
              <td className="py-2 text-right">{taka(i.price * i.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex justify-end">
        <dl className="w-64 space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{taka(o.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{taka(o.shipping)}</dd></div>
          {Number(o.discount) > 0 ? <div className="flex justify-between"><dt>Discount</dt><dd>-{taka(o.discount)}</dd></div> : null}
          {Number(o.tax) > 0 ? <div className="flex justify-between"><dt>Tax</dt><dd>{taka(o.tax)}</dd></div> : null}
          <div className="flex justify-between border-t border-slate-300 pt-1 text-base font-bold"><dt>Total</dt><dd>{taka(o.total)}</dd></div>
          <div className="flex justify-between"><dt>Paid</dt><dd>{taka(o.paid_amount)}</dd></div>
          <div className="flex justify-between font-bold"><dt>Due (COD)</dt><dd>{taka(due)}</dd></div>
        </dl>
      </div>
      {o.note ? <p className="mt-4 text-xs text-slate-600">Note: {o.note}</p> : null}
      <p className="mt-8 text-center text-xs text-slate-500">Thank you for shopping with {s.site_title}!</p>
    </div>
  );
}

export default function InvoicesPage({ searchParams }) {
  const sp = use(searchParams);
  const [orders, setOrders] = useState(null);
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    const ids = String(sp.ids || '').split(',').map(Number).filter(Boolean);
    Promise.all([api('/settings', { auth: false }), ...ids.map((id) => api(`/admin/orders/${id}`))])
      .then(([s, ...o]) => { setSettings(s); setOrders(o); })
      .catch(() => setOrders([]));
  }, [sp.ids]);
  if (!orders || !settings) return <Loading />;
  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">{orders.length} invoice(s)</p>
        <button type="button" onClick={() => window.print()} className="btn btn-primary"><Icon name="print" className="h-4 w-4" /> Print</button>
      </div>
      {orders.map((o) => <Invoice key={o.id} o={o} s={settings} />)}
    </div>
  );
}
