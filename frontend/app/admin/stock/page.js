'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Loading, PageHeader, Pager, SearchInput, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { fmtDate, qs } from '@/lib/format';

const TONE = {
  sale: 'bg-blue-50 text-blue-700', purchase: 'bg-emerald-50 text-emerald-700', return: 'bg-teal-50 text-teal-700',
  cancel: 'bg-amber-50 text-amber-800', order_deleted: 'bg-amber-50 text-amber-800', adjust: 'bg-slate-100 text-slate-700',
  import: 'bg-violet-50 text-violet-700', purchase_deleted: 'bg-rose-50 text-rose-700', return_deleted: 'bg-rose-50 text-rose-700',
};

function RefLink({ m }) {
  if (!m.ref_label) return <span className="text-slate-400">—</span>;
  if (m.ref_type === 'order' && m.ref_id) return <Link href={`/admin/orders/${m.ref_id}`} className="text-primary hover:underline">{m.ref_label}</Link>;
  if (m.ref_type === 'product' && m.ref_id) return <Link href={`/admin/products/${m.ref_id}`} className="text-primary hover:underline">{m.ref_label}</Link>;
  if (m.ref_type === 'purchase') return <Link href="/admin/purchases" className="text-primary hover:underline">{m.ref_label}</Link>;
  return <span>{m.ref_label}</span>;
}

function StockHistory() {
  const { toast } = useAdmin();
  const params = useSearchParams();
  const [f, setF] = useState({ search: '', reason: '', from_date: '', to_date: '', product_id: params.get('product_id') || '', page: 1 });
  const [data, setData] = useState(null);
  useEffect(() => { api(`/admin/stock-movements${qs(f)}`).then(setData).catch((e) => toast(e.message, 'error')); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps
  const setFilter = (k, v) => setF((x) => ({ ...x, [k]: v, page: 1 }));

  return (
    <>
      <PageHeader title="Stock history" subtitle="Every change to product quantity — sales, purchases, returns and edits" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={f.search} onChange={(v) => setFilter('search', v)} placeholder="Product name…" />
        <select className="input h-10 w-auto" value={f.reason} onChange={(e) => setFilter('reason', e.target.value)}>
          <option value="">All reasons</option>
          {Object.entries(data?.reasons || {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" className="input h-10 w-auto" value={f.from_date} onChange={(e) => setFilter('from_date', e.target.value)} aria-label="From date" />
        <input type="date" className="input h-10 w-auto" value={f.to_date} onChange={(e) => setFilter('to_date', e.target.value)} aria-label="To date" />
        {f.product_id ? <button type="button" className="btn btn-sm btn-outline" onClick={() => setFilter('product_id', '')}>Showing one product · show all</button> : null}
      </div>
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className={thCls}>When</th><th className={thCls}>Product</th><th className={`${thCls} text-right`}>Change</th><th className={`${thCls} text-right`}>Stock after</th><th className={thCls}>Reason</th><th className={thCls}>Reference</th><th className={thCls}>By</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className={`${tdCls} whitespace-nowrap text-xs text-slate-500`}>{fmtDate(m.created_at, true)}</td>
                    <td className={tdCls}>
                      {m.product_id ? <button type="button" className="text-left hover:text-primary" onClick={() => setFilter('product_id', String(m.product_id))}>{m.name}</button> : m.name}
                    </td>
                    <td className={`${tdCls} text-right font-bold tabular-nums ${m.change_qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{m.change_qty > 0 ? `+${m.change_qty}` : m.change_qty}</td>
                    <td className={`${tdCls} text-right tabular-nums`}>{m.balance ?? '—'}</td>
                    <td className={tdCls}><span className={`badge ${TONE[m.reason] || 'bg-slate-100'}`}>{m.reason_label}</span></td>
                    <td className={`${tdCls} text-xs`}><RefLink m={m} /></td>
                    <td className={`${tdCls} text-xs text-slate-500`}>{m.user_name || (m.reason === 'sale' ? 'Customer' : '—')}</td>
                  </tr>
                ))}
                {!data.data.length ? <tr><td colSpan={7} className="py-12 text-center text-slate-500">No stock changes found.</td></tr> : null}
              </tbody>
            </table>
            <Pager page={data.page} lastPage={data.last_page} total={data.total} onChange={(page) => setF((x) => ({ ...x, page }))} />
          </div>
        )}
      </Card>
    </>
  );
}

export default function Page() {
  return <Guard perm="inventory"><Suspense fallback={<Loading />}><StockHistory /></Suspense></Guard>;
}
