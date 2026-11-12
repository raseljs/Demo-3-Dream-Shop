'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Field, Modal, PageHeader, ProductPicker, Thumb, Toggle, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { taka } from '@/lib/format';

const METHODS = ['Cash', 'bKash', 'Nagad', 'Rocket', 'Bank'];
const today = () => new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10);

function NewSupplier({ open, onClose, onCreated }) {
  const { toast } = useAdmin();
  const [f, setF] = useState({ name: '', phone: '', company: '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const r = await api('/admin/suppliers', { method: 'POST', body: f });
      onCreated({ id: r.id, ...f });
      setF({ name: '', phone: '', company: '' });
      onClose();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="New supplier" footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={save}>Add supplier</button></>}>
      <div className="space-y-3">
        <Field label="Name" required><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Company"><input className="input" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function NewPurchase() {
  const router = useRouter();
  const { toast } = useAdmin();
  const [suppliers, setSuppliers] = useState([]);
  const [addSupplier, setAddSupplier] = useState(false);
  const [lines, setLines] = useState([]);
  const [f, setF] = useState({ supplier_id: '', invoice_no: '', purchase_date: today(), discount: '', paid: '', payment_method: 'Cash', note: '', update_cost: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { api('/admin/suppliers?per_page=500').then((r) => setSuppliers(r.data)).catch(() => {}); }, []);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const pick = (p) => {
    const variable = p.type === 'variable' && p.variants?.length;
    setLines((ls) => {
      if (!variable && ls.some((l) => l.product_id === p.id)) return ls.map((l) => (l.product_id === p.id ? { ...l, qty: Number(l.qty || 0) + 1 } : l));
      return [...ls, {
        key: Math.random(), product_id: p.id, name: p.name, thumbnail: p.thumbnail, variants: variable ? p.variants : null,
        variant_id: '', stock: variable ? null : Number(p.qty), qty: 1, unit_cost: Number(p.purchase_price) || '',
      }];
    });
  };
  const upd = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const chooseVariant = (l, id) => {
    const v = l.variants.find((x) => String(x.id) === String(id));
    upd(l.key, { variant_id: id, stock: v ? Number(v.qty) : null, unit_cost: v && Number(v.purchase_price) ? Number(v.purchase_price) : l.unit_cost });
  };

  const subtotal = useMemo(() => lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unit_cost || 0), 0), [lines]);
  const discount = Math.min(Number(f.discount || 0), subtotal);
  const total = subtotal - discount;
  const due = Math.max(0, total - Number(f.paid || 0));

  const save = async () => {
    if (!lines.length) return toast('Add at least one product', 'error');
    if (lines.some((l) => l.variants && !l.variant_id)) return toast('Choose the size/colour for every variable product', 'error');
    if (Number(f.paid) > 0 && !f.supplier_id) return toast('Choose a supplier to record a payment', 'error');
    setSaving(true);
    try {
      await api('/admin/purchases', {
        method: 'POST',
        body: { ...f, supplier_id: f.supplier_id || null, items: lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id || null, qty: Number(l.qty), unit_cost: Number(l.unit_cost || 0) })) },
      });
      toast('Purchase saved — stock updated');
      router.push('/admin/purchases');
    } catch (e) { toast(e.message, 'error'); setSaving(false); }
  };

  return (
    <>
      <PageHeader title="New purchase" subtitle="Products you bought from a supplier. Their quantity is added to stock when you save." actions={<Link href="/admin/purchases" className="btn btn-outline">Back to purchases</Link>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card title="Products">
            <ProductPicker withVariants onPick={pick} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50"><tr><th className={thCls}>Product</th><th className={`${thCls} w-28`}>Qty</th><th className={`${thCls} w-32`}>Unit cost</th><th className={`${thCls} w-28 text-right`}>Total</th><th className="w-10" /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l) => (
                    <tr key={l.key}>
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <Thumb src={l.thumbnail} size={36} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{l.name}</p>
                            {l.variants ? (
                              <select className="input input-sm mt-1 w-48" value={l.variant_id} onChange={(e) => chooseVariant(l, e.target.value)}>
                                <option value="">Choose variation…</option>
                                {l.variants.map((v) => <option key={v.id} value={v.id}>{v.name} (stock {v.qty})</option>)}
                              </select>
                            ) : null}
                            {l.stock !== null ? <p className="text-xs text-slate-500">In stock now: {l.stock} → after: {l.stock + Number(l.qty || 0)}</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className={tdCls}><input type="number" min="1" className="input input-sm" value={l.qty} onChange={(e) => upd(l.key, { qty: e.target.value })} /></td>
                      <td className={tdCls}><input type="number" min="0" step="0.01" className="input input-sm" value={l.unit_cost} onChange={(e) => upd(l.key, { unit_cost: e.target.value })} placeholder="0" /></td>
                      <td className={`${tdCls} text-right font-medium`}>{taka(Number(l.qty || 0) * Number(l.unit_cost || 0))}</td>
                      <td className={tdCls}><button type="button" className="rounded p-1 text-rose-600 hover:bg-rose-50" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove"><Icon name="x" className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                  {!lines.length ? <tr><td colSpan={5} className="py-10 text-center text-slate-500">Search a product above to add it.</td></tr> : null}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Toggle checked={f.update_cost} onChange={(v) => setF((x) => ({ ...x, update_cost: v }))} label="Use these unit costs as the products' purchase price (for profit reports)" />
            </div>
          </Card>
          <Card title="Note"><textarea className="input" value={f.note} onChange={set('note')} placeholder="Optional" /></Card>
        </div>

        <div className="space-y-5">
          <Card title="Supplier & invoice">
            <div className="space-y-3">
              <Field label="Supplier">
                <div className="flex gap-2">
                  <select className="input" value={f.supplier_id} onChange={set('supplier_id')}>
                    <option value="">No supplier</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.company ? ` — ${s.company}` : ''}</option>)}
                  </select>
                  <button type="button" className="btn btn-outline shrink-0 px-3" onClick={() => setAddSupplier(true)} aria-label="New supplier"><Icon name="plus" className="h-4 w-4" /></button>
                </div>
              </Field>
              <Field label="Supplier invoice no."><input className="input" value={f.invoice_no} onChange={set('invoice_no')} /></Field>
              <Field label="Purchase date"><input type="date" className="input" value={f.purchase_date} onChange={set('purchase_date')} /></Field>
            </div>
          </Card>
          <Card title="Payment">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{taka(subtotal)}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Discount</dt><dd><input type="number" min="0" className="input input-sm w-28 text-right" value={f.discount} onChange={set('discount')} placeholder="0" /></dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold"><dt>Total</dt><dd>{taka(total)}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Paid now</dt><dd><input type="number" min="0" className="input input-sm w-28 text-right" value={f.paid} onChange={set('paid')} placeholder="0" /></dd></div>
              {Number(f.paid) > 0 ? (
                <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Paid by</dt><dd><select className="input input-sm w-28" value={f.payment_method} onChange={set('payment_method')}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></dd></div>
              ) : null}
              <div className={`flex justify-between font-semibold ${due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}><dt>Due to supplier</dt><dd>{taka(due)}</dd></div>
            </dl>
            <button type="button" className="btn btn-primary mt-4 w-full" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save purchase & add stock'}</button>
          </Card>
        </div>
      </div>
      <NewSupplier open={addSupplier} onClose={() => setAddSupplier(false)} onCreated={(s) => { setSuppliers((x) => [...x, s].sort((a, b) => a.name.localeCompare(b.name))); setF((x) => ({ ...x, supplier_id: String(s.id) })); }} />
    </>
  );
}

export default function Page() {
  return <Guard perm="inventory"><NewPurchase /></Guard>;
}
