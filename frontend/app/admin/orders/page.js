'use client';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import FraudCheck, { SuccessRate } from '@/components/admin/FraudCheck';
import { Card, Loading, Modal, PageHeader, Pager, PayBadge, SearchInput, Thumb, thCls, tdCls } from '@/components/admin/ui';
import { api, downloadCSV } from '@/lib/client';
import { fmtDate, qs, STATUS, taka } from '@/lib/format';

const TABS = [['', 'All'], ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['on_the_way', 'On the way'], ['delivered', 'Delivered'], ['cancel', 'Cancelled']];
const SOURCE = { web: 'bg-sky-100 text-sky-700', pos: 'bg-violet-100 text-violet-700', landing: 'bg-amber-100 text-amber-800', manual: 'bg-slate-100 text-slate-700' };

export default function OrdersPage({ searchParams }) {
  const sp = use(searchParams);
  const { meta, toast, user } = useAdmin();
  const [f, setF] = useState({ delivery_status: sp.delivery_status || '', payment_status: '', source: '', from_date: '', to_date: '', search: '', mine: '', assigned_to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [bulk, setBulk] = useState({ status: '', staff: '' });
  const [fraud, setFraud] = useState(null);
  const [courierResult, setCourierResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setPage(1); setF((x) => ({ ...x, delivery_status: sp.delivery_status || '' })); }, [sp.delivery_status]);
  const load = () => api(`/admin/orders${qs({ ...f, page, per_page: 25 })}`).then((d) => { setData(d); setSelected([]); }).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [f, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const setFilter = (k, v) => { setPage(1); setF((x) => ({ ...x, [k]: v })); };

  const changeStatus = async (o, status) => {
    try { await api(`/admin/orders/${o.id}`, { method: 'PUT', body: { delivery_status: status } }); toast(`#${o.order_no} → ${STATUS[status].label}`); load(); } catch (e) { toast(e.message, 'error'); }
  };
  const runBulk = async (body) => {
    setBusy(true);
    try {
      const r = await api('/admin/orders/bulk', { method: 'POST', body: { ids: selected, ...body } });
      toast(`${r.done} order(s) updated${r.errors.length ? `, ${r.errors.length} failed` : ''}`, r.errors.length ? 'error' : 'success');
      load();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const sendCourier = async (courier) => {
    if (!confirm(`Send ${selected.length} order(s) to ${courier}?`)) return;
    setBusy(true);
    try {
      const r = await api('/admin/orders/courier', { method: 'POST', body: { ids: selected, courier } });
      setCourierResult(r.results);
      load();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const exportCsv = () => downloadCSV('orders.csv', [
    ['Order', 'Date', 'Name', 'Phone', 'Address', 'City', 'Items', 'Total', 'Paid', 'Payment', 'Status', 'Courier', 'Tracking'],
    ...data.data.map((o) => [o.order_no, o.created_at, o.name, o.phone, o.address, o.city, o.items.map((i) => `${i.name}${i.variant_name ? ` (${i.variant_name})` : ''} x${i.qty}`).join('; '), o.total, o.paid_amount, o.payment_status, o.delivery_status, o.courier, o.courier_tracking]),
  ]);
  const allChecked = data?.data.length && selected.length === data.data.length;

  return (
    <Guard perm="orders">
      <PageHeader title="Web Orders" subtitle={data ? `${data.total} orders` : ''}
        actions={<>
          {data?.data.length ? <button type="button" className="btn btn-outline" onClick={exportCsv}><Icon name="file" className="h-4 w-4" /> Export</button> : null}
          <Link href="/admin/pos" className="btn btn-primary"><Icon name="plus" className="h-4 w-4" /> New Order</Link>
        </>} />

      <div className="no-scrollbar mb-3 flex gap-1 overflow-x-auto">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFilter('delivery_status', k)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${f.delivery_status === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-200'}`}>
            {l}{data?.counts ? <span className="ml-1.5 opacity-70">{k ? data.counts[k] || 0 : Object.values(data.counts).reduce((a, b) => a + b, 0)}</span> : null}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <SearchInput value={f.search} onChange={(v) => setFilter('search', v)} placeholder="Order #, name, phone…" />
        <select className="input h-10 w-auto" value={f.mine ? 'mine' : f.assigned_to} onChange={(e) => { const v = e.target.value; setPage(1); setF((x) => ({ ...x, mine: v === 'mine' ? '1' : '', assigned_to: v === 'mine' ? '' : v })); }}>
          <option value="">Scope: All orders</option>
          <option value="mine">My orders ({user.name})</option>
          {(meta?.staff || []).map((s) => <option key={s.id} value={s.id}>Assigned: {s.name}</option>)}
        </select>
        <select className="input h-10 w-auto" value={f.source} onChange={(e) => setFilter('source', e.target.value)}>
          <option value="">Source: All</option><option value="web">Website</option><option value="landing">Landing page</option><option value="pos">POS</option><option value="manual">Manual</option>
        </select>
        <select className="input h-10 w-auto" value={f.payment_status} onChange={(e) => setFilter('payment_status', e.target.value)}>
          <option value="">Payment: All</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="refunded">Refunded</option>
        </select>
        <input type="date" className="input h-10 w-auto" value={f.from_date} onChange={(e) => setFilter('from_date', e.target.value)} title="From date" />
        <input type="date" className="input h-10 w-auto" value={f.to_date} onChange={(e) => setFilter('to_date', e.target.value)} title="To date" />
      </div>

      {selected.length ? (
        <div className="sticky top-14 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          <b>{selected.length} selected</b>
          <select className="input input-sm h-9 w-auto text-slate-800" value={bulk.status} onChange={(e) => setBulk({ ...bulk, status: e.target.value })}>
            <option value="">Update status…</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button type="button" className="btn btn-sm btn-primary" disabled={!bulk.status || busy} onClick={() => runBulk({ delivery_status: bulk.status })}>Apply</button>
          <select className="input input-sm h-9 w-auto text-slate-800" value={bulk.staff} onChange={(e) => setBulk({ ...bulk, staff: e.target.value })}>
            <option value="">Assign to…</option>
            {(meta?.staff || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" className="btn btn-sm btn-primary" disabled={!bulk.staff || busy} onClick={() => runBulk({ assigned_to: bulk.staff })}>Bulk Assign</button>
          <span className="mx-1 h-6 w-px bg-white/20" />
          <button type="button" className="btn btn-sm bg-white/10 hover:bg-white/20" disabled={busy} onClick={() => sendCourier('pathao')}><Icon name="truck" className="h-4 w-4" /> Pathao</button>
          <button type="button" className="btn btn-sm bg-white/10 hover:bg-white/20" disabled={busy} onClick={() => sendCourier('steadfast')}><Icon name="truck" className="h-4 w-4" /> Steadfast</button>
          <a href={`/admin/invoices?ids=${selected.join(',')}`} target="_blank" rel="noreferrer" className="btn btn-sm bg-white/10 hover:bg-white/20"><Icon name="print" className="h-4 w-4" /> Invoices</a>
          <button type="button" className="ml-auto text-xs underline" onClick={() => setSelected([])}>Clear</button>
        </div>
      ) : null}

      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className={`${thCls} w-8`}><input type="checkbox" checked={!!allChecked} onChange={() => setSelected(allChecked ? [] : data.data.map((o) => o.id))} className="accent-[var(--primary)]" /></th>
                  <th className={thCls}>#</th><th className={thCls}>Customer</th><th className={thCls}>Items</th><th className={thCls}>Amount</th>
                  <th className={thCls}>Delivery Status</th><th className={thCls}>Payment</th><th className={thCls}>Assigned To</th><th className={`${thCls} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((o) => (
                  <tr key={o.id} className={`align-top hover:bg-slate-50/60 ${selected.includes(o.id) ? 'bg-primary/5' : ''}`}>
                    <td className={tdCls}><input type="checkbox" checked={selected.includes(o.id)} onChange={() => setSelected((s) => (s.includes(o.id) ? s.filter((x) => x !== o.id) : [...s, o.id]))} className="accent-[var(--primary)]" /></td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-primary">#{o.order_no}</Link>
                      <p className="text-xs text-slate-500">{fmtDate(o.created_at, true)}</p>
                      <span className={`badge mt-1 ${SOURCE[o.source] || ''}`}>{o.source}</span>
                    </td>
                    <td className={`${tdCls} min-w-52`}>
                      <Link href={`/admin/customers/${encodeURIComponent(o.phone)}`} className="font-medium hover:text-primary" title="Customer profile">{o.name}</Link>
                      <p className="text-xs"><a href={`tel:${o.phone}`} className="text-slate-600 hover:text-primary">{o.phone}</a></p>
                      <p className="line-clamp-2 text-xs text-slate-500">{o.address}{o.city ? `, ${o.city}` : ''}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <SuccessRate history={o.history} />
                        <button type="button" onClick={() => setFraud(o.phone)} className="badge bg-rose-50 text-rose-700 hover:bg-rose-100">Fraud</button>
                      </div>
                    </td>
                    <td className={`${tdCls} min-w-48`}>
                      {o.items.slice(0, 3).map((i, x) => (
                        <div key={x} className="mb-1 flex items-center gap-2">
                          <Thumb src={i.image} size={28} />
                          <span className="line-clamp-1 text-xs">{i.name}{i.variant_name ? ` (${i.variant_name})` : ''} <b>×{i.qty}</b></span>
                        </div>
                      ))}
                      {o.items.length > 3 ? <p className="text-xs text-slate-500">+{o.items.length - 3} more</p> : null}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <p className="font-semibold">{taka(o.total)}</p>
                      {Number(o.paid_amount) > 0 ? <p className="text-xs text-emerald-600">Paid {taka(o.paid_amount)}</p> : null}
                      <p className="text-xs uppercase text-slate-500">{o.payment_method}</p>
                    </td>
                    <td className={tdCls}>
                      <select value={o.delivery_status} onChange={(e) => changeStatus(o, e.target.value)} className={`rounded-lg border-0 px-2 py-1 text-xs font-semibold ${STATUS[o.delivery_status]?.cls}`}>
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      {o.courier_tracking ? <p className="mt-1 text-[11px] text-slate-500"><span className="capitalize">{o.courier}</span>: {o.courier_tracking}</p> : null}
                    </td>
                    <td className={tdCls}><PayBadge status={o.payment_status} /></td>
                    <td className={`${tdCls} text-xs`}>{o.assigned_name || <span className="text-slate-400">—</span>}</td>
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      <Link href={`/admin/orders/${o.id}`} className="btn btn-sm btn-ghost" title="View"><Icon name="eye" className="h-4 w-4" /></Link>
                      <a href={`/admin/invoices?ids=${o.id}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" title="Invoice"><Icon name="print" className="h-4 w-4" /></a>
                    </td>
                  </tr>
                ))}
                {!data.data.length ? <tr><td colSpan={9} className="py-14 text-center text-slate-500">No orders found.</td></tr> : null}
              </tbody>
            </table>
            <Pager page={data.page} lastPage={data.last_page} total={data.total} onChange={setPage} />
          </div>
        )}
      </Card>

      <FraudCheck phone={fraud} onClose={() => setFraud(null)} />
      <Modal open={!!courierResult} onClose={() => setCourierResult(null)} title="Courier result">
        <ul className="space-y-2 text-sm">
          {(courierResult || []).map((r) => (
            <li key={r.id} className={`rounded-lg px-3 py-2 ${r.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
              #{r.order_no}: {r.ok ? `Sent ✓ Tracking ${r.tracking}` : r.message}
            </li>
          ))}
        </ul>
      </Modal>
    </Guard>
  );
}
