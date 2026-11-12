'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Loading, Modal, PageHeader, Pager, SearchInput, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { fmtDate, qs, taka } from '@/lib/format';

function PurchaseView({ id, onClose, onChanged }) {
  const { toast } = useAdmin();
  const [p, setP] = useState(null);
  useEffect(() => {
    setP(null);
    if (id) api(`/admin/purchases/${id}`).then(setP).catch((e) => toast(e.message, 'error'));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const paid = p ? p.payments.reduce((s, x) => s + Number(x.amount), 0) : 0;
  const del = async () => {
    if (!confirm(`Delete purchase #${id}? Its quantity will be taken back out of stock.`)) return;
    try { await api(`/admin/purchases/${id}`, { method: 'DELETE' }); toast('Purchase deleted'); onClose(); onChanged?.(); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <Modal open={!!id} onClose={onClose} size="max-w-2xl" title={`Purchase #${id}`} footer={<><button type="button" className="btn btn-outline text-rose-600" onClick={del}><Icon name="trash" className="h-4 w-4" /> Delete</button><button type="button" className="btn btn-primary" onClick={onClose}>Close</button></>}>
      {!p ? <Loading /> : (
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><p className="text-xs text-slate-500">Supplier</p><p className="font-medium">{p.supplier_name || '—'}</p>{p.supplier_phone ? <p className="text-xs text-slate-500">{p.supplier_phone}</p> : null}</div>
            <div><p className="text-xs text-slate-500">Invoice / date</p><p className="font-medium">{p.invoice_no || '—'}</p><p className="text-xs text-slate-500">{fmtDate(p.purchase_date)}</p></div>
            <div><p className="text-xs text-slate-500">Entered by</p><p className="font-medium">{p.user_name || '—'}</p><p className="text-xs text-slate-500">{fmtDate(p.created_at, true)}</p></div>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50"><tr><th className={thCls}>Product</th><th className={`${thCls} text-right`}>Qty</th><th className={`${thCls} text-right`}>Unit cost</th><th className={`${thCls} text-right`}>Total</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {p.items.map((i) => <tr key={i.id}><td className={tdCls}>{i.name}{i.variant_name ? <span className="text-slate-500"> ({i.variant_name})</span> : null}</td><td className={`${tdCls} text-right`}>{i.qty}</td><td className={`${tdCls} text-right`}>{taka(i.unit_cost)}</td><td className={`${tdCls} text-right`}>{taka(i.total)}</td></tr>)}
            </tbody>
          </table>
          <dl className="ml-auto max-w-xs space-y-1">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{taka(p.subtotal)}</dd></div>
            {Number(p.discount) ? <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd>− {taka(p.discount)}</dd></div> : null}
            <div className="flex justify-between font-bold"><dt>Total</dt><dd>{taka(p.total)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Paid with this purchase</dt><dd>{taka(paid)}</dd></div>
          </dl>
          {p.note ? <p className="rounded-lg bg-slate-50 p-3 text-slate-600">{p.note}</p> : null}
          <p className="text-xs text-slate-500">Later payments to the supplier are recorded on the Suppliers page and count against their total due.</p>
        </div>
      )}
    </Modal>
  );
}

function Purchases() {
  const { toast } = useAdmin();
  const [f, setF] = useState({ search: '', supplier_id: '', from_date: '', to_date: '', page: 1 });
  const [data, setData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [view, setView] = useState(null);
  const load = () => api(`/admin/purchases${qs(f)}`).then(setData).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api('/admin/suppliers?per_page=500').then((r) => setSuppliers(r.data)).catch(() => {}); }, []);
  const setFilter = (k, v) => setF((x) => ({ ...x, [k]: v, page: 1 }));

  return (
    <>
      <PageHeader title="Purchases" subtitle="Stock bought from suppliers" actions={<><Link href="/admin/suppliers" className="btn btn-outline">Suppliers</Link><Link href="/admin/purchases/new" className="btn btn-primary"><Icon name="plus" className="h-4 w-4" /> New purchase</Link></>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={f.search} onChange={(v) => setFilter('search', v)} placeholder="Invoice no. or supplier…" />
        <select className="input h-10 w-auto" value={f.supplier_id} onChange={(e) => setFilter('supplier_id', e.target.value)}>
          <option value="">All suppliers</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" className="input h-10 w-auto" value={f.from_date} onChange={(e) => setFilter('from_date', e.target.value)} aria-label="From date" />
        <input type="date" className="input h-10 w-auto" value={f.to_date} onChange={(e) => setFilter('to_date', e.target.value)} aria-label="To date" />
        {data ? <span className="ml-auto text-sm text-slate-600">Total purchased: <b>{taka(data.summary.total)}</b></span> : null}
      </div>
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className={thCls}>Purchase</th><th className={thCls}>Supplier</th><th className={`${thCls} text-right`}>Items</th><th className={`${thCls} text-right`}>Total</th><th className={`${thCls} text-right`}>Paid with it</th><th className={`${thCls} text-right`}>Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className={tdCls}><button type="button" className="font-semibold text-primary" onClick={() => setView(p.id)}>#{p.id}{p.invoice_no ? ` · ${p.invoice_no}` : ''}</button><p className="text-xs text-slate-500">{fmtDate(p.purchase_date)}</p></td>
                    <td className={tdCls}>{p.supplier_name || <span className="text-slate-400">—</span>}</td>
                    <td className={`${tdCls} text-right`}>{p.items_qty}</td>
                    <td className={`${tdCls} text-right font-semibold`}>{taka(p.total)}</td>
                    <td className={`${tdCls} text-right`}>{taka(p.paid)}</td>
                    <td className={`${tdCls} text-right`}><button type="button" className="btn btn-sm btn-ghost" onClick={() => setView(p.id)}><Icon name="eye" className="h-4 w-4" /></button></td>
                  </tr>
                ))}
                {!data.data.length ? <tr><td colSpan={6} className="py-12 text-center text-slate-500">No purchases yet. Record one when new stock arrives.</td></tr> : null}
              </tbody>
            </table>
            <Pager page={data.page} lastPage={data.last_page} total={data.total} onChange={(page) => setF((x) => ({ ...x, page }))} />
          </div>
        )}
      </Card>
      <PurchaseView id={view} onClose={() => setView(null)} onChanged={load} />
    </>
  );
}

export default function Page() {
  return <Guard perm="inventory"><Purchases /></Guard>;
}
