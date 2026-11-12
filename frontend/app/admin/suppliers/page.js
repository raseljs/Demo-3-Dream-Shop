'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Field, Loading, Modal, PageHeader, Pager, SearchInput, Stat, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { fmtDate, qs, taka, telLink } from '@/lib/format';

const METHODS = ['Cash', 'bKash', 'Nagad', 'Rocket', 'Bank'];
const today = () => new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10);
const EMPTY = { name: '', phone: '', company: '', address: '', note: '' };

function SupplierForm({ supplier, onClose, onSaved }) {
  const { toast } = useAdmin();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (supplier) setF({ ...EMPTY, ...Object.fromEntries(Object.entries(supplier).map(([k, v]) => [k, v ?? ''])) }); }, [supplier]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    try {
      if (supplier.id) await api(`/admin/suppliers/${supplier.id}`, { method: 'PUT', body: f });
      else await api('/admin/suppliers', { method: 'POST', body: f });
      toast(supplier.id ? 'Supplier updated' : 'Supplier added');
      onSaved();
      onClose();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open={!!supplier} onClose={onClose} title={supplier?.id ? 'Edit supplier' : 'New supplier'} footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={save}>{supplier?.id ? 'Save changes' : 'Add supplier'}</button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" required><input className="input" value={f.name} onChange={set('name')} autoFocus /></Field>
        <Field label="Phone"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Company" className="sm:col-span-2"><input className="input" value={f.company} onChange={set('company')} /></Field>
        <Field label="Address" className="sm:col-span-2"><input className="input" value={f.address} onChange={set('address')} /></Field>
        <Field label="Note" className="sm:col-span-2"><textarea className="input" value={f.note} onChange={set('note')} /></Field>
      </div>
    </Modal>
  );
}

function PayForm({ supplier, onClose, onSaved }) {
  const { toast } = useAdmin();
  const [f, setF] = useState({ amount: '', method: 'Cash', paid_at: today(), note: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (supplier) setF({ amount: supplier.due > 0 ? String(supplier.due) : '', method: 'Cash', paid_at: today(), note: '' }); }, [supplier]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    try {
      await api('/admin/supplier-payments', { method: 'POST', body: { ...f, supplier_id: supplier.id } });
      toast(`Payment of ${taka(f.amount)} recorded`);
      onSaved();
      onClose();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open={!!supplier} onClose={onClose} title={`Pay ${supplier?.name || ''}`} footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={save}>Record payment</button></>}>
      {supplier ? <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">Current due: <b className="text-rose-600">{taka(supplier.due)}</b></p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount" required><input type="number" min="0" className="input" value={f.amount} onChange={set('amount')} autoFocus /></Field>
        <Field label="Paid by"><select className="input" value={f.method} onChange={set('method')}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
        <Field label="Date"><input type="date" className="input" value={f.paid_at} onChange={set('paid_at')} /></Field>
        <Field label="Note"><input className="input" value={f.note} onChange={set('note')} placeholder="Optional" /></Field>
      </div>
    </Modal>
  );
}

function SupplierHistory({ id, onClose, onChanged }) {
  const { toast } = useAdmin();
  const [s, setS] = useState(null);
  const load = () => api(`/admin/suppliers/${id}`).then(setS).catch((e) => toast(e.message, 'error'));
  useEffect(() => { setS(null); if (id) load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const delPayment = async (p) => {
    if (!confirm(`Delete this payment of ${taka(p.amount)}?`)) return;
    try { await api(`/admin/supplier-payments/${p.id}`, { method: 'DELETE' }); toast('Payment deleted'); load(); onChanged(); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <Modal open={!!id} onClose={onClose} size="max-w-3xl" title={s ? s.name : 'Supplier'}>
      {!s ? <Loading /> : (
        <div className="space-y-5 text-sm">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Purchased</p><p className="text-lg font-bold">{taka(s.purchased)}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Paid</p><p className="text-lg font-bold text-emerald-600">{taka(s.paid)}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Due</p><p className={`text-lg font-bold ${s.due > 0 ? 'text-rose-600' : ''}`}>{taka(s.due)}</p></div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-semibold">Purchases</h4>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {s.purchases.map((p) => <li key={p.id} className="flex justify-between px-3 py-2"><span>#{p.id}{p.invoice_no ? ` · ${p.invoice_no}` : ''}<span className="block text-xs text-slate-500">{fmtDate(p.purchase_date)}</span></span><b>{taka(p.total)}</b></li>)}
                {!s.purchases.length ? <li className="px-3 py-6 text-center text-slate-500">No purchases</li> : null}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Payments</h4>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {s.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span>{fmtDate(p.paid_at)}{p.method ? ` · ${p.method}` : ''}<span className="block text-xs text-slate-500">{p.note || (p.purchase_id ? `With purchase #${p.purchase_id}` : '')}</span></span>
                    <span className="flex items-center gap-1"><b className="text-emerald-600">{taka(p.amount)}</b>{!p.purchase_id ? <button type="button" className="rounded p-1 text-rose-600 hover:bg-rose-50" onClick={() => delPayment(p)} aria-label="Delete payment"><Icon name="trash" className="h-3.5 w-3.5" /></button> : null}</span>
                  </li>
                ))}
                {!s.payments.length ? <li className="px-3 py-6 text-center text-slate-500">No payments</li> : null}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Suppliers() {
  const { toast } = useAdmin();
  const [f, setF] = useState({ search: '', page: 1 });
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);
  const [pay, setPay] = useState(null);
  const [history, setHistory] = useState(null);
  const load = () => api(`/admin/suppliers${qs(f)}`).then(setData).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps
  const del = async (s) => {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    try { await api(`/admin/suppliers/${s.id}`, { method: 'DELETE' }); toast('Supplier deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Suppliers" subtitle="Who you buy from, and how much you still owe them" actions={<><Link href="/admin/purchases" className="btn btn-outline">Purchases</Link><button type="button" className="btn btn-primary" onClick={() => setEdit({})}><Icon name="plus" className="h-4 w-4" /> New supplier</button></>} />
      {data ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Stat label="Total purchased" value={taka(data.summary.purchased)} icon="boxes" />
          <Stat label="Total paid" value={taka(data.summary.paid)} icon="check-circle" tone="bg-emerald-50 text-emerald-600" />
          <Stat label="Total due" value={taka(data.summary.due)} icon="alert" tone="bg-rose-50 text-rose-600" />
        </div>
      ) : null}
      <div className="mb-4"><SearchInput value={f.search} onChange={(v) => setF({ search: v, page: 1 })} placeholder="Name, phone or company…" /></div>
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className={thCls}>Supplier</th><th className={`${thCls} text-right`}>Purchased</th><th className={`${thCls} text-right`}>Paid</th><th className={`${thCls} text-right`}>Due</th><th className={`${thCls} text-right`}>Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className={tdCls}>
                      <button type="button" className="font-semibold text-slate-800 hover:text-primary" onClick={() => setHistory(s.id)}>{s.name}</button>
                      <p className="text-xs text-slate-500">{s.company || ''}{s.company && s.phone ? ' · ' : ''}{s.phone ? <a href={telLink(s.phone)} className="hover:text-primary">{s.phone}</a> : null}</p>
                    </td>
                    <td className={`${tdCls} text-right`}>{taka(s.purchased)}</td>
                    <td className={`${tdCls} text-right text-emerald-600`}>{taka(s.paid)}</td>
                    <td className={`${tdCls} text-right font-semibold ${s.due > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{taka(s.due)}</td>
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => setPay(s)}>Pay</button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setHistory(s.id)} aria-label="History"><Icon name="history" className="h-4 w-4" /></button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEdit(s)} aria-label="Edit"><Icon name="edit" className="h-4 w-4" /></button>
                      <button type="button" className="btn btn-sm btn-ghost text-rose-600" onClick={() => del(s)} aria-label="Delete"><Icon name="trash" className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
                {!data.data.length ? <tr><td colSpan={5} className="py-12 text-center text-slate-500">No suppliers yet. Add the people or companies you buy stock from.</td></tr> : null}
              </tbody>
            </table>
            <Pager page={data.page} lastPage={data.last_page} total={data.total} onChange={(page) => setF((x) => ({ ...x, page }))} />
          </div>
        )}
      </Card>
      <SupplierForm supplier={edit} onClose={() => setEdit(null)} onSaved={load} />
      <PayForm supplier={pay} onClose={() => setPay(null)} onSaved={load} />
      <SupplierHistory id={history} onClose={() => setHistory(null)} onChanged={load} />
    </>
  );
}

export default function Page() {
  return <Guard perm="inventory"><Suppliers /></Guard>;
}
