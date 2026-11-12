'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Field, Loading, Modal, PageHeader, Pager, SearchInput, Stat, StatusBadge, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { fmtDate, qs, taka } from '@/lib/format';

const TABS = [
  { id: 'pending', label: 'Delivered, not paid yet' },
  { id: 'in_transit', label: 'With courier' },
  { id: 'settled', label: 'Paid by courier' },
  { id: 'returned', label: 'Returned / cancelled' },
  { id: '', label: 'All' },
];
const today = () => new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10);

function SettleModal({ orders, onClose, onDone }) {
  const { toast } = useAdmin();
  const [rows, setRows] = useState([]);
  const [charge, setCharge] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setRows((orders || []).map((o) => ({ order_id: o.id, order_no: o.order_no, cod: Number(o.cod_due), courier_charge: '', received_amount: '' }))); setCharge(''); setNote(''); }, [orders]);
  const applyAll = (v) => { setCharge(v); setRows((rs) => rs.map((r) => ({ ...r, courier_charge: v, received_amount: '' }))); };
  const upd = (i, patch) => setRows((rs) => rs.map((r, x) => (x === i ? { ...r, ...patch } : r)));
  const recv = (r) => (r.received_amount !== '' ? Number(r.received_amount) : r.cod - Number(r.courier_charge || 0));
  const totals = rows.reduce((t, r) => ({ cod: t.cod + r.cod, charge: t.charge + Number(r.courier_charge || 0), recv: t.recv + recv(r) }), { cod: 0, charge: 0, recv: 0 });
  const save = async () => {
    setBusy(true);
    try {
      const r = await api('/admin/settlements', { method: 'POST', body: { settled_at: date, note, items: rows.map((x) => ({ order_id: x.order_id, courier_charge: x.courier_charge || 0, received_amount: x.received_amount })) } });
      toast(`${r.done} order(s) marked as paid by courier`);
      if (r.errors?.length) toast(r.errors.join(' · '), 'error');
      onDone();
      onClose();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open={!!orders} onClose={onClose} size="max-w-2xl" title={`Record courier payment (${rows.length} order${rows.length === 1 ? '' : 's'})`}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={save}>Save — received {taka(totals.recv)}</button></>}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Field label="Charge per parcel" hint="Fills every row; change any row below"><input type="number" min="0" className="input" value={charge} onChange={(e) => applyAll(e.target.value)} placeholder="e.g. 60" /></Field>
        <Field label="Payment date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. invoice no." /></Field>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[440px] text-sm">
        <thead className="bg-slate-50"><tr><th className={thCls}>Order</th><th className={`${thCls} text-right`}>COD</th><th className={`${thCls} w-28`}>Charge</th><th className={`${thCls} w-32`}>Received</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={r.order_id}>
              <td className={tdCls}>#{r.order_no}</td>
              <td className={`${tdCls} text-right`}>{taka(r.cod)}</td>
              <td className={tdCls}><input type="number" min="0" className="input input-sm" value={r.courier_charge} onChange={(e) => upd(i, { courier_charge: e.target.value, received_amount: '' })} placeholder="0" /></td>
              <td className={tdCls}><input type="number" className="input input-sm" value={r.received_amount !== '' ? r.received_amount : recv(r)} onChange={(e) => upd(i, { received_amount: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="font-semibold"><td className={tdCls}>Total</td><td className={`${tdCls} text-right`}>{taka(totals.cod)}</td><td className={tdCls}>{taka(totals.charge)}</td><td className={tdCls}>{taka(totals.recv)}</td></tr></tfoot>
      </table></div>
    </Modal>
  );
}

function Settlements() {
  const { toast } = useAdmin();
  const [f, setF] = useState({ state: 'pending', courier: '', search: '', from_date: '', to_date: '', page: 1 });
  const [data, setData] = useState(null);
  const [sel, setSel] = useState([]);
  const [settle, setSettle] = useState(null);
  const load = () => api(`/admin/settlements${qs(f)}`).then((d) => { setData(d); setSel([]); }).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps
  const setFilter = (k, v) => setF((x) => ({ ...x, [k]: v, page: 1 }));
  const selectable = useMemo(() => (data?.data || []).filter((o) => !o.settlement_id && o.delivery_status !== 'cancel'), [data]);
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const undo = async (o) => {
    if (!confirm(`Undo the courier payment for #${o.order_no}?`)) return;
    try { await api(`/admin/settlements/${o.id}`, { method: 'DELETE' }); toast('Moved back to unpaid'); load(); } catch (e) { toast(e.message, 'error'); }
  };
  const s = data?.summary;

  return (
    <>
      <PageHeader title="COD settlement" subtitle="Match the cash the courier collects with what they actually pay you" />
      {s ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label={`Courier owes you (${s.pending_count} delivered)`} value={taka(s.pending_cod)} icon="alert" tone="bg-rose-50 text-rose-600" />
          <Stat label="Still with courier" value={taka(s.in_transit_cod)} icon="truck" tone="bg-indigo-50 text-indigo-600" />
          <Stat label={`Received (${s.settled_count} orders)`} value={taka(s.received)} icon="check-circle" tone="bg-emerald-50 text-emerald-600" />
          <Stat label="Courier charges" value={taka(s.charges)} icon="dollar" tone="bg-amber-50 text-amber-700" />
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:w-fit">
        {TABS.map((t) => <button key={t.id} type="button" onClick={() => setFilter('state', t.id)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${f.state === t.id ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{t.label}</button>)}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={f.search} onChange={(v) => setFilter('search', v)} placeholder="Order #, phone, tracking…" />
        <select className="input h-10 w-auto" value={f.courier} onChange={(e) => setFilter('courier', e.target.value)}>
          <option value="">All couriers</option>
          {(data?.couriers || []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" className="input h-10 w-auto" value={f.from_date} onChange={(e) => setFilter('from_date', e.target.value)} aria-label="Order from date" />
        <input type="date" className="input h-10 w-auto" value={f.to_date} onChange={(e) => setFilter('to_date', e.target.value)} aria-label="Order to date" />
        {sel.length ? <button type="button" className="btn btn-primary ml-auto" onClick={() => setSettle(data.data.filter((o) => sel.includes(o.id)))}><Icon name="check" className="h-4 w-4" /> Record payment for {sel.length}</button> : null}
      </div>
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className={`${thCls} w-10`}><input type="checkbox" aria-label="Select all" checked={selectable.length > 0 && sel.length === selectable.length} onChange={(e) => setSel(e.target.checked ? selectable.map((o) => o.id) : [])} disabled={!selectable.length} /></th>
                  <th className={thCls}>Order</th><th className={thCls}>Courier</th><th className={thCls}>Status</th><th className={`${thCls} text-right`}>COD</th><th className={`${thCls} text-right`}>Charge</th><th className={`${thCls} text-right`}>Received</th><th className={`${thCls} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className={tdCls}>{!o.settlement_id && o.delivery_status !== 'cancel' ? <input type="checkbox" aria-label={`Select #${o.order_no}`} checked={sel.includes(o.id)} onChange={() => toggle(o.id)} /> : null}</td>
                    <td className={tdCls}><Link href={`/admin/orders/${o.id}`} className="font-semibold text-primary">#{o.order_no}</Link><p className="text-xs text-slate-500">{o.name} · {fmtDate(o.created_at)}</p></td>
                    <td className={tdCls}><p className="capitalize">{o.courier}</p>{o.courier_tracking ? <p className="text-xs text-slate-500">{o.courier_tracking}</p> : null}</td>
                    <td className={tdCls}><StatusBadge status={o.delivery_status} />{o.payment_method !== 'cod' ? <p className="mt-1 text-[11px] text-slate-500">Prepaid</p> : null}</td>
                    <td className={`${tdCls} text-right font-semibold`}>{taka(o.settlement_id ? o.cod_amount : o.cod_due)}</td>
                    <td className={`${tdCls} text-right`}>{o.settlement_id ? taka(o.courier_charge) : <span className="text-slate-400">—</span>}</td>
                    <td className={`${tdCls} text-right`}>{o.settlement_id ? <><b className="text-emerald-600">{taka(o.received_amount)}</b><p className="text-[11px] text-slate-500">{fmtDate(o.settled_at)}</p></> : <span className="text-slate-400">—</span>}</td>
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      {o.settlement_id ? <button type="button" className="btn btn-sm btn-ghost" onClick={() => undo(o)}>Undo</button>
                        : o.delivery_status !== 'cancel' ? <button type="button" className="btn btn-sm btn-outline" onClick={() => setSettle([o])}>Mark paid</button> : null}
                    </td>
                  </tr>
                ))}
                {!data.data.length ? <tr><td colSpan={8} className="py-12 text-center text-slate-500">No orders here. Orders show up once they are sent to a courier.</td></tr> : null}
              </tbody>
            </table>
            <Pager page={data.page} lastPage={data.last_page} total={data.total} onChange={(page) => setF((x) => ({ ...x, page }))} />
          </div>
        )}
      </Card>
      <SettleModal orders={settle} onClose={() => setSettle(null)} onDone={load} />
    </>
  );
}

export default function Page() {
  return <Guard perm="orders"><Settlements /></Guard>;
}
