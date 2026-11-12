'use client';
import Link from 'next/link';
import { use, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard } from '@/components/admin/AdminShell';
import { BarChart, HBars } from '@/components/admin/Charts';
import { Card, Loading, PageHeader, Stat, StatusBadge, useApi, thCls, tdCls } from '@/components/admin/ui';
import { downloadCSV } from '@/lib/client';
import { DISTRICTS, fmtDate, qs, STATUS, taka } from '@/lib/format';

const TITLES = { 'profit-loss': 'Profit & Loss Report', sale: 'Sales Report', city: 'City Wise Sales Report', product: 'Products Report' };
const KEYS = { 'profit-loss': ['from_date', 'to_date'], sale: ['start_date', 'end_date'], city: ['start_date', 'end_date'], product: ['from', 'to'] };

function Filters({ type, onApply }) {
  const [a, b] = KEYS[type];
  const [f, setF] = useState({ [a]: '', [b]: '', city: '', status: [] });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onApply({ [a]: f[a], [b]: f[b], ...(type === 'city' ? { city: f.city } : {}), ...(type === 'product' ? { status: f.status.join(',') } : {}) }); }}
      className="mb-5 flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4">
      <label className="text-xs text-slate-500">From<input type="date" className="input mt-1 h-10" value={f[a]} onChange={(e) => setF({ ...f, [a]: e.target.value })} /></label>
      <label className="text-xs text-slate-500">To<input type="date" className="input mt-1 h-10" value={f[b]} onChange={(e) => setF({ ...f, [b]: e.target.value })} /></label>
      {type === 'city' ? (
        <label className="text-xs text-slate-500">City<select className="input mt-1 h-10" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}><option value="">All cities</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></label>
      ) : null}
      {type === 'product' ? (
        <div className="text-xs text-slate-500">Order status
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(STATUS).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setF({ ...f, status: f.status.includes(k) ? f.status.filter((x) => x !== k) : [...f.status, k] })}
                className={`rounded-lg border px-2.5 py-2 text-xs ${f.status.includes(k) ? 'border-primary bg-primary text-white' : 'border-slate-300 text-slate-600'}`}>{v.label}</button>
            ))}
          </div>
        </div>
      ) : null}
      <button className="btn btn-primary h-10">Filter</button>
    </form>
  );
}

function ProfitLoss({ d }) {
  const s = d.summary;
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders" value={s.orders} icon="cart" />
        <Stat label="Revenue" value={taka(s.revenue)} icon="dollar" tone="bg-blue-100 text-blue-700" />
        <Stat label="Cost of goods" value={taka(s.cost)} icon="package" tone="bg-slate-100 text-slate-700" />
        <Stat label="Gross profit" value={taka(s.gross_profit)} icon="chart" tone="bg-emerald-100 text-emerald-700" />
        <Stat label="Discount" value={taka(s.discount)} icon="tag" tone="bg-amber-100 text-amber-700" />
        <Stat label="Refunds" value={taka(s.refund)} icon="undo" tone="bg-rose-100 text-rose-700" />
        <Stat label="Expenses" value={taka(s.expenses)} icon="file" tone="bg-rose-100 text-rose-700" />
        <Stat label="Net profit" value={taka(s.net_profit)} icon="award" tone={s.net_profit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} />
      </div>
      <Card title="Orders" bodyClass="" actions={<button type="button" className="btn btn-sm btn-outline" onClick={() => downloadCSV('profit-loss.csv', [['Date', 'Order', 'Customer', 'Payment', 'Revenue', 'Discount', 'Shipping', 'Tax', 'Cost', 'Profit'], ...d.orders.map((o) => [o.created_at, o.order_no, o.name, o.payment_status, o.total, o.discount, o.shipping, o.tax, o.cost, o.profit])])}><Icon name="file" className="h-4 w-4" /> Export Excel</button>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>{['Date', 'Order #', 'Customer', 'Payment', 'Revenue', 'Discount', 'Shipping', 'Tax', 'Profit'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {d.orders.map((o) => (
                <tr key={o.id}>
                  <td className={`${tdCls} text-xs`}>{fmtDate(o.created_at)}</td>
                  <td className={tdCls}><Link href={`/admin/orders/${o.id}`} className="text-primary">#{o.order_no}</Link></td>
                  <td className={tdCls}>{o.name}</td>
                  <td className={`${tdCls} capitalize`}>{o.payment_status}</td>
                  <td className={tdCls}>{taka(o.total)}</td><td className={tdCls}>{taka(o.discount)}</td><td className={tdCls}>{taka(o.shipping)}</td><td className={tdCls}>{taka(o.tax)}</td>
                  <td className={`${tdCls} font-semibold ${o.profit < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{taka(o.profit)}</td>
                </tr>
              ))}
              {!d.orders.length ? <tr><td colSpan={9} className="py-10 text-center text-slate-500">No orders in this period.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function Sales({ d }) {
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['all', 'All time']].map(([k, l]) => (
          <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">{l}</p>
            <p className="text-xl font-bold">{taka(d.summary[k].amount)}</p>
            <p className="text-xs text-slate-500">{d.summary[k].orders} orders · delivered {taka(d.summary[k].delivered)}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card title={`Daily sales (${fmtDate(d.from)} – ${fmtDate(d.to)})`}>
          {d.daily.length ? <BarChart data={d.daily.map((x) => ({ label: x.day.slice(5), value: Number(x.amount), sub: `${x.orders} orders` }))} /> : <p className="py-10 text-center text-sm text-slate-500">No sales in this period.</p>}
        </Card>
        <div className="space-y-5">
          <Card title="By source"><HBars data={d.by_source.map((x) => ({ label: `${x.source} (${x.orders})`, value: Number(x.amount) }))} /></Card>
          <Card title="By status">
            <ul className="space-y-2 text-sm">{d.by_status.map((x) => <li key={x.delivery_status} className="flex items-center justify-between"><StatusBadge status={x.delivery_status} /><span>{x.orders} · {taka(x.amount)}</span></li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function City({ d }) {
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Total Cities" value={d.summary.cities} icon="map-pin" />
        <Stat label="Total Sales" value={taka(d.summary.amount)} icon="dollar" tone="bg-emerald-100 text-emerald-700" />
        <Stat label="Total Orders" value={d.summary.orders} icon="cart" tone="bg-blue-100 text-blue-700" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="City Wise Breakdown" bodyClass="" actions={<button type="button" className="btn btn-sm btn-outline" onClick={() => downloadCSV('city-sales.csv', [['City', 'Orders', 'Sales'], ...d.rows.map((r) => [r.city, r.orders, r.amount])])}>Export</button>}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className={thCls}>#</th><th className={thCls}>City</th><th className={thCls}>Total Orders</th><th className={thCls}>Total Sales (৳)</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{d.rows.map((r, i) => <tr key={r.city}><td className={tdCls}>{i + 1}</td><td className={tdCls}>{r.city}</td><td className={tdCls}>{r.orders}</td><td className={tdCls}>{taka(r.amount)}</td></tr>)}</tbody>
          </table>
        </Card>
        <Card title="City Wise Sales Chart"><HBars data={d.rows.slice(0, 12).map((r) => ({ label: r.city, value: Number(r.amount) }))} /></Card>
      </div>
    </>
  );
}

function Products({ d }) {
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Stat label="Total Items Sold" value={d.summary.qty} icon="package" />
        <Stat label="Total Sales Amount" value={taka(d.summary.amount)} icon="dollar" tone="bg-emerald-100 text-emerald-700" />
      </div>
      <Card bodyClass="" title="Products" actions={<button type="button" className="btn btn-sm btn-outline" onClick={() => downloadCSV('product-sales.csv', [['Model', 'Product', 'Variant', 'Qty', 'Sales', 'Cost'], ...d.rows.map((r) => [r.sku, r.name, r.variant_name, r.qty, r.amount, r.cost])])}>Export</button>}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className={thCls}>Product Model</th><th className={thCls}>Product Name</th><th className={thCls}>Qty Sold</th><th className={thCls}>Total Sale</th><th className={thCls}>Profit</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {d.rows.map((r) => (
              <tr key={`${r.product_id}-${r.variant_id}`}><td className={`${tdCls} text-xs`}>{r.sku || '—'}</td><td className={tdCls}>{r.name}{r.variant_name ? <span className="text-slate-500"> ({r.variant_name})</span> : null}</td><td className={tdCls}>{r.qty}</td><td className={tdCls}>{taka(r.amount)}</td><td className={tdCls}>{taka(r.amount - r.cost)}</td></tr>
            ))}
            {!d.rows.length ? <tr><td colSpan={5} className="py-10 text-center text-slate-500">No sales in this period.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export default function ReportPage({ params }) {
  const { type } = use(params);
  return <Report key={type} type={type} />;
}

function Report({ type }) {
  const [filters, setFilters] = useState({});
  const { data, loading, error } = useApi(TITLES[type] ? `/admin/reports/${type}${qs(filters)}` : null);
  if (!TITLES[type]) return <p className="p-8 text-center">Unknown report.</p>;
  const View = { 'profit-loss': ProfitLoss, sale: Sales, city: City, product: Products }[type];
  return (
    <Guard perm="reports">
      <PageHeader title={TITLES[type]} subtitle={data ? `${fmtDate(data.from)} – ${fmtDate(data.to)}` : ''} />
      <Filters type={type} onApply={setFilters} />
      {error ? <p className="text-rose-600">{error}</p> : loading && !data ? <Loading /> : data ? <View d={data} /> : null}
    </Guard>
  );
}
