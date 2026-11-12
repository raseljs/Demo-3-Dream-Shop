'use client';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { api } from '@/lib/client';
import { fmtDate, PAYMENT_STATUS, STATUS, taka } from '@/lib/format';

const STEPS = ['pending', 'confirmed', 'on_the_way', 'delivered'];

function Timeline({ status }) {
  if (status === 'cancel') return <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">This order was cancelled.</p>;
  const at = STEPS.indexOf(status);
  return (
    <ol className="mt-4 grid grid-cols-4 gap-1">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-col items-center text-center">
          <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${i <= at ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
            {i < at ? <Icon name="check" className="h-4 w-4" strokeWidth={3} /> : i + 1}
          </span>
          <span className={`mt-1.5 text-[11px] font-medium md:text-xs ${i <= at ? 'text-slate-800' : 'text-slate-400'}`}>{STATUS[s].label}</span>
        </li>
      ))}
    </ol>
  );
}

export default function TrackOrder({ initial }) {
  const [q, setQ] = useState(initial);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async (value) => {
    if (!value.trim()) return;
    setBusy(true);
    setError('');
    try {
      setRows(await api(`/orders/track?q=${encodeURIComponent(value.trim())}`, { auth: false }));
    } catch (e) {
      setRows(null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (initial) search(initial); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="container-x py-8">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"><Icon name="truck" className="h-7 w-7" /></span>
          <h1 className="mt-3 text-2xl font-bold">Track Your Order</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your order number or the phone number used for the order.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); search(q); }} className="mt-6 flex gap-2">
          <input className="input h-12" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number or 01XXXXXXXXX" required />
          <button className="btn btn-primary h-12 px-6" disabled={busy}>{busy ? '…' : 'Track'}</button>
        </form>
        {error ? <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-6 space-y-4">
          {(rows || []).map((o) => (
            <div key={o.order_no} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">Order #{o.order_no}</p>
                  <p className="text-xs text-slate-500">{fmtDate(o.created_at, true)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{taka(o.total)}</p>
                  <span className={`badge ${PAYMENT_STATUS[o.payment_status]?.cls}`}>{PAYMENT_STATUS[o.payment_status]?.label}</span>
                </div>
              </div>
              <Timeline status={o.delivery_status} />
              {o.courier_tracking ? (
                <p className="mt-4 text-sm text-slate-600">Courier: <b className="capitalize">{o.courier}</b> · Tracking: <b>{o.courier_tracking}</b></p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
