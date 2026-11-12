'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Guard } from '@/components/admin/AdminShell';
import { BarChart } from '@/components/admin/Charts';
import { Card, Loading, PageHeader, StatusBadge, Stat, useApi, thCls, tdCls } from '@/components/admin/ui';
import { fmtDate, qs, taka } from '@/lib/format';

export default function DashboardPage() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [applied, setApplied] = useState({});
  const { data, loading } = useApi(`/admin/dashboard${qs(applied)}`);

  return (
    <Guard perm="dashboard">
      <PageHeader
        title="Dashboard"
        subtitle={data ? `${fmtDate(data.from)} – ${fmtDate(data.to)}` : ''}
        actions={(
          <form onSubmit={(e) => { e.preventDefault(); setApplied(range); }} className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-500">From<input type="date" className="input input-sm mt-1 h-9" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
            <label className="text-xs text-slate-500">To<input type="date" className="input input-sm mt-1 h-9" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
            <button className="btn btn-sm btn-primary">Filter</button>
          </form>
        )}
      />
      {loading && !data ? <Loading /> : data ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Today's Sales" value={`${taka(data.today.amount)}`} icon="dollar" tone="bg-emerald-100 text-emerald-700" />
            <Stat label="Orders (period)" value={data.orders} icon="cart" />
            <Stat label="Revenue (period)" value={taka(data.revenue)} icon="chart" tone="bg-blue-100 text-blue-700" />
            <Stat label="New Customers" value={data.new_customers} icon="users" tone="bg-violet-100 text-violet-700" />
            <Stat label="Low Stock" value={data.low_stock} icon="alert" tone="bg-rose-100 text-rose-700" href="/admin/products?stock=low" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[['pending', 'Pending Orders', 'bg-amber-50 text-amber-700'], ['confirmed', 'Confirmed', 'bg-blue-50 text-blue-700'], ['on_the_way', 'On The Way', 'bg-indigo-50 text-indigo-700'], ['delivered', 'Delivered', 'bg-emerald-50 text-emerald-700'], ['cancel', 'Cancelled', 'bg-rose-50 text-rose-700']].map(([k, l, tone]) => (
              <Link key={k} href={`/admin/orders?delivery_status=${k}`} className={`rounded-2xl p-4 transition hover:shadow-md ${tone}`}>
                <p className="text-2xl font-bold">{data.statuses[k]}</p>
                <p className="text-xs font-medium">{l}</p>
              </Link>
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Card title="Sales Last 30 Days">
              <BarChart data={data.sales_30_days.map((d) => ({ label: d.day.slice(5), value: d.amount, sub: `${d.orders} orders` }))} />
            </Card>
            <Card title="Recent Orders" actions={<Link href="/admin/orders" className="text-sm font-medium text-primary">View all</Link>} bodyClass="">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr><th className={thCls}>#</th><th className={thCls}>Customer</th><th className={thCls}>Total</th><th className={thCls}>Status</th><th className={thCls}>Date</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recent_orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className={tdCls}><Link href={`/admin/orders/${o.id}`} className="font-medium text-primary">#{o.order_no}</Link></td>
                        <td className={tdCls}><p className="font-medium">{o.name}</p><p className="text-xs text-slate-500">{o.phone}</p></td>
                        <td className={tdCls}>{taka(o.total)}</td>
                        <td className={tdCls}><StatusBadge status={o.delivery_status} /></td>
                        <td className={`${tdCls} text-xs text-slate-500`}>{fmtDate(o.created_at)}</td>
                      </tr>
                    ))}
                    {!data.recent_orders.length ? <tr><td colSpan={5} className="py-10 text-center text-slate-500">No recent orders.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </Guard>
  );
}
