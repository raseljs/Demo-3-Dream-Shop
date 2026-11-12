'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Modal, Spinner } from './ui';

function CourierTable({ data }) {
  if (!data || typeof data !== 'object') return null;
  const rows = Object.entries(data).filter(([, v]) => v && typeof v === 'object' && ('total_parcel' in v || 'success_parcel' in v));
  const summary = data.summary;
  if (!rows.length) return <pre className="max-h-60 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(data, null, 2)}</pre>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Courier</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Success</th><th className="px-3 py-2">Cancelled</th></tr></thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map(([k, v]) => (
          <tr key={k}><td className="px-3 py-2 font-medium capitalize">{v.name || k}</td><td className="px-3 py-2 text-center">{v.total_parcel}</td><td className="px-3 py-2 text-center text-emerald-600">{v.success_parcel}</td><td className="px-3 py-2 text-center text-rose-600">{v.cancelled_parcel}</td></tr>
        ))}
        {summary ? <tr className="font-semibold"><td className="px-3 py-2">Total</td><td className="px-3 py-2 text-center">{summary.total_parcel}</td><td className="px-3 py-2 text-center">{summary.success_parcel}</td><td className="px-3 py-2 text-center">{summary.cancelled_parcel}</td></tr> : null}
      </tbody>
    </table>
  );
}

export function SuccessRate({ history }) {
  if (!history || !Number(history.total)) return <span className="badge bg-sky-100 text-sky-700">New customer</span>;
  const done = Number(history.delivered) + Number(history.cancelled);
  const rate = done ? Math.round((Number(history.delivered) / done) * 100) : null;
  const cls = rate === null ? 'bg-slate-100 text-slate-600' : rate >= 80 ? 'bg-emerald-100 text-emerald-700' : rate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700';
  return <span className={`badge ${cls}`}>{history.total} orders{rate !== null ? ` · ${rate}% success` : ''}</span>;
}

export default function FraudCheck({ phone, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!phone) return;
    setData(null);
    api(`/admin/orders/fraud?phone=${encodeURIComponent(phone)}`).then(setData).catch((e) => setErr(e.message));
  }, [phone]);
  return (
    <Modal open={!!phone} onClose={onClose} title={`Fraud check — ${phone}`}>
      {err ? <p className="text-sm text-rose-600">{err}</p> : !data ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold">{data.store.total}</p><p className="text-xs text-slate-500">Orders here</p></div>
            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xl font-bold text-emerald-700">{data.store.delivered}</p><p className="text-xs text-slate-500">Delivered</p></div>
            <div className="rounded-xl bg-rose-50 p-3"><p className="text-xl font-bold text-rose-700">{data.store.cancelled}</p><p className="text-xs text-slate-500">Cancelled</p></div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Courier history (BD Courier)</p>
            {data.error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{data.error}</p> : <CourierTable data={data.courier} />}
          </div>
        </div>
      )}
    </Modal>
  );
}
