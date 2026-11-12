'use client';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import FraudCheck from '@/components/admin/FraudCheck';
import { Card, Loading, PageHeader, PayBadge, StatusBadge, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { fmtDate, taka, telLink, waLink } from '@/lib/format';

function Profile({ phone }) {
  const { toast, can } = useAdmin();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [fraud, setFraud] = useState(null);
  const load = () => api(`/admin/customers/${encodeURIComponent(phone)}`).then(setC).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const block = async () => {
    const note = prompt('Why block this number? (shown to staff)', 'Fake / repeated cancelled orders');
    if (note === null) return;
    try { await api('/admin/blocklists', { method: 'POST', body: { phone: c.phone, note } }); toast('Number blocked — it can no longer place orders'); load(); } catch (e) { toast(e.message, 'error'); }
  };
  const unblock = async () => {
    if (!confirm('Unblock this number?')) return;
    try { await api(`/admin/blocklists/${c.blocked.id}`, { method: 'DELETE' }); toast('Number unblocked'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  if (error) return <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="font-semibold">{error}</p><Link href="/admin/customers" className="btn btn-outline mt-4">All customers</Link></div>;
  if (!c) return <Loading />;
  const rateTone = c.success_rate === null ? 'text-slate-400' : c.success_rate >= 80 ? 'text-emerald-600' : c.success_rate >= 50 ? 'text-amber-600' : 'text-rose-600';

  return (
    <>
      <PageHeader
        title={c.name || c.phone}
        subtitle={`${c.phone}${c.city ? ` · ${c.city}` : ''} · customer since ${fmtDate(c.first_order)}`}
        actions={<>
          <a href={telLink(c.phone)} className="btn btn-outline"><Icon name="phone" className="h-4 w-4" /> Call</a>
          <a href={waLink(`88${c.phone.replace(/^\+?88/, '')}`)} target="_blank" rel="noreferrer" className="btn btn-outline"><Icon name="whatsapp" className="h-4 w-4" /> WhatsApp</a>
          <button type="button" className="btn btn-outline" onClick={() => setFraud(c.phone)}><Icon name="shield" className="h-4 w-4" /> Fraud check</button>
          {can('users') ? (c.blocked
            ? <button type="button" className="btn btn-outline text-emerald-700" onClick={unblock}>Unblock</button>
            : <button type="button" className="btn btn-outline text-rose-600" onClick={block}><Icon name="ban" className="h-4 w-4" /> Block</button>) : null}
        </>}
      />
      {c.blocked ? <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><b>Blocked.</b> {c.blocked.note || 'This number cannot place orders.'}</div> : null}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {[
          ['Orders', c.order_count, ''],
          ['Delivered', c.delivered, 'text-emerald-600'],
          ['Cancelled', c.cancelled, Number(c.cancelled) ? 'text-rose-600' : ''],
          ['Success rate', c.success_rate === null ? '—' : `${c.success_rate}%`, rateTone],
          ['Total spent', taka(c.spent), ''],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card title={`Orders (${c.order_count})`} bodyClass="">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className={thCls}>Order</th><th className={`${thCls} text-right`}>Items</th><th className={`${thCls} text-right`}>Total</th><th className={thCls}>Status</th><th className={thCls}>Payment</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {c.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className={tdCls}><Link href={`/admin/orders/${o.id}`} className="font-semibold text-primary">#{o.order_no}</Link><p className="text-xs text-slate-500">{fmtDate(o.created_at, true)}{o.source === 'pos' ? ' · POS' : ''}</p></td>
                    <td className={`${tdCls} text-right`}>{o.items_qty}</td>
                    <td className={`${tdCls} text-right font-semibold`}>{taka(o.total)}</td>
                    <td className={tdCls}><StatusBadge status={o.delivery_status} /></td>
                    <td className={tdCls}><PayBadge status={o.payment_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Most bought">
            {c.top_products.length ? (
              <ul className="space-y-2 text-sm">{c.top_products.map((p) => <li key={p.name} className="flex justify-between gap-3"><span className="min-w-0 truncate">{p.name}</span><b className="shrink-0">× {p.qty}</b></li>)}</ul>
            ) : <p className="text-sm text-slate-500">Nothing yet.</p>}
          </Card>
          <Card title="Account">
            {c.account ? (
              <div className="text-sm"><p className="font-medium">{c.account.name}</p>{c.account.email ? <p className="text-slate-500">{c.account.email}</p> : null}<p className="mt-1 text-xs text-slate-500">Registered {fmtDate(c.account.created_at)}</p></div>
            ) : <p className="text-sm text-slate-500">Orders as a guest (no account).</p>}
          </Card>
          {c.returns.length ? (
            <Card title="Returns">
              <ul className="space-y-2 text-sm">{c.returns.map((r) => <li key={r.id} className="flex justify-between"><Link href={`/admin/orders/${r.order_id}`} className="text-primary">#{r.order_no}</Link><span>{taka(r.refund_amount)}</span></li>)}</ul>
            </Card>
          ) : null}
          {c.incomplete.length ? (
            <Card title="Left checkout without ordering">
              <ul className="space-y-2 text-sm">{c.incomplete.map((i) => <li key={i.id} className="flex justify-between"><span className="text-slate-500">{fmtDate(i.updated_at || i.created_at, true)}</span><span>{taka(i.total)}</span></li>)}</ul>
              <Link href="/admin/incomplete" className="mt-3 inline-block text-sm text-primary">See incomplete orders</Link>
            </Card>
          ) : null}
        </div>
      </div>
      <FraudCheck phone={fraud} onClose={() => setFraud(null)} />
    </>
  );
}

export default function Page({ params }) {
  const { phone } = use(params);
  return <Guard perm="orders"><Profile phone={decodeURIComponent(phone)} /></Guard>;
}
