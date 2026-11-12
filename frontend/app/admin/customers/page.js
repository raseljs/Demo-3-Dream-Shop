'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Loading, PageHeader, Pager, SearchInput, thCls, tdCls } from '@/components/admin/ui';
import { api, downloadCSV } from '@/lib/client';
import { fmtDate, qs, taka } from '@/lib/format';

const SORTS = [
  { id: '', label: 'Recent order' },
  { id: 'spent', label: 'Most spent' },
  { id: 'orders', label: 'Most orders' },
  { id: 'cancelled', label: 'Most cancelled' },
];

function rate(c) {
  const d = Number(c.delivered);
  const x = Number(c.cancelled);
  return d + x ? Math.round((d / (d + x)) * 100) : null;
}

function Customers() {
  const { toast } = useAdmin();
  const [f, setF] = useState({ search: '', sort: '', min_orders: '', page: 1 });
  const [data, setData] = useState(null);
  useEffect(() => { api(`/admin/customers${qs(f)}`).then(setData).catch((e) => toast(e.message, 'error')); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps
  const setFilter = (k, v) => setF((x) => ({ ...x, [k]: v, page: 1 }));
  const exportAll = async () => {
    try {
      const all = await api(`/admin/customers${qs({ ...f, page: 1, per_page: 500 })}`);
      downloadCSV('customers.csv', [['Name', 'Phone', 'City', 'Orders', 'Delivered', 'Cancelled', 'Spent', 'First order', 'Last order'], ...all.data.map((c) => [c.name, c.phone, c.city, c.orders, c.delivered, c.cancelled, c.spent, c.first_order, c.last_order])]);
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Customers" subtitle="Everyone who ordered, grouped by phone number — guests included" actions={<button type="button" className="btn btn-outline" onClick={exportAll}>Export CSV</button>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={f.search} onChange={(v) => setFilter('search', v)} placeholder="Name or phone…" />
        <select className="input h-10 w-auto" value={f.sort} onChange={(e) => setFilter('sort', e.target.value)} aria-label="Sort">
          {SORTS.map((s) => <option key={s.id} value={s.id}>Sort: {s.label}</option>)}
        </select>
        <select className="input h-10 w-auto" value={f.min_orders} onChange={(e) => setFilter('min_orders', e.target.value)} aria-label="Minimum orders">
          <option value="">Any number of orders</option>
          <option value="2">2+ orders (repeat)</option>
          <option value="5">5+ orders</option>
          <option value="10">10+ orders</option>
        </select>
      </div>
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className={thCls}>Customer</th><th className={`${thCls} text-right`}>Orders</th><th className={`${thCls} text-right`}>Delivered</th><th className={`${thCls} text-right`}>Cancelled</th><th className={thCls}>Success</th><th className={`${thCls} text-right`}>Spent</th><th className={thCls}>Last order</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((c) => {
                  const r = rate(c);
                  return (
                    <tr key={c.phone} className="hover:bg-slate-50">
                      <td className={tdCls}>
                        <Link href={`/admin/customers/${encodeURIComponent(c.phone)}`} className="font-semibold text-slate-800 hover:text-primary">{c.name || 'No name'}</Link>
                        {c.blocked ? <span className="badge ml-2 bg-rose-100 text-rose-700">Blocked</span> : null}
                        <p className="text-xs text-slate-500">{c.phone}{c.city ? ` · ${c.city}` : ''}</p>
                      </td>
                      <td className={`${tdCls} text-right font-semibold`}>{c.orders}</td>
                      <td className={`${tdCls} text-right text-emerald-600`}>{c.delivered}</td>
                      <td className={`${tdCls} text-right ${Number(c.cancelled) ? 'text-rose-600' : 'text-slate-400'}`}>{c.cancelled}</td>
                      <td className={tdCls}>{r === null ? <span className="text-xs text-slate-400">No result yet</span> : (
                        <div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${r >= 80 ? 'bg-emerald-500' : r >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${r}%` }} /></div><span className="text-xs font-medium">{r}%</span></div>
                      )}</td>
                      <td className={`${tdCls} text-right font-semibold`}>{taka(c.spent)}</td>
                      <td className={`${tdCls} text-xs text-slate-500`}>{fmtDate(c.last_order)}</td>
                    </tr>
                  );
                })}
                {!data.data.length ? <tr><td colSpan={7} className="py-12 text-center text-slate-500">No customers found.</td></tr> : null}
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
  return <Guard perm="orders"><Customers /></Guard>;
}
