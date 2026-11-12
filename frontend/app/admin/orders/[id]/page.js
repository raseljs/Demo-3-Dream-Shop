'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import FraudCheck, { SuccessRate } from '@/components/admin/FraudCheck';
import { Card, Field, Loading, Modal, PageHeader, PayBadge, StatusBadge, Thumb, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { DISTRICTS, fmtDate, STATUS, taka } from '@/lib/format';

const EDITABLE = ['name', 'phone', 'email', 'address', 'city', 'area', 'note', 'admin_note', 'shipping', 'discount', 'delivery_status', 'payment_status', 'paid_amount', 'payment_method', 'transaction_id', 'assigned_to', 'courier', 'courier_tracking'];

function ReturnModal({ order, open, onClose, onDone }) {
  const { toast } = useAdmin();
  const [qty, setQty] = useState({});
  const [refund, setRefund] = useState('');
  const [note, setNote] = useState('');
  const [restock, setRestock] = useState(true);
  const auto = order.items.reduce((s, i) => s + (Number(qty[i.id]) || 0) * Number(i.price), 0);
  const submit = async () => {
    try {
      await api('/admin/returns', { method: 'POST', body: { order_id: order.id, items: Object.entries(qty).filter(([, q]) => Number(q) > 0).map(([id, q]) => ({ order_item_id: Number(id), qty: Number(q) })), refund_amount: refund === '' ? auto : refund, note, restock } });
      toast('Return recorded');
      onDone();
    } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Create Return" footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={submit}>Save Return</button></>}>
      <div className="space-y-3">
        {order.items.map((i) => {
          const max = i.qty - i.returned_qty;
          return (
            <div key={i.id} className="flex items-center gap-3">
              <Thumb src={i.image} size={36} />
              <div className="min-w-0 flex-1 text-sm"><p className="truncate">{i.name}</p><p className="text-xs text-slate-500">{i.variant_name} · can return {max}</p></div>
              <input type="number" min="0" max={max} disabled={!max} className="input input-sm w-20" value={qty[i.id] || ''} onChange={(e) => setQty({ ...qty, [i.id]: Math.min(max, Math.max(0, Number(e.target.value))) })} />
            </div>
          );
        })}
        <Field label={`Refund amount (auto: ${taka(auto)})`}><input type="number" className="input" value={refund} placeholder={String(auto)} onChange={(e) => setRefund(e.target.value)} /></Field>
        <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="accent-[var(--primary)]" /> Add returned items back to stock</label>
      </div>
    </Modal>
  );
}

export default function OrderDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { meta, toast, can } = useAdmin();
  const [order, setOrder] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [fraud, setFraud] = useState(null);
  const [returning, setReturning] = useState(false);

  const load = () => api(`/admin/orders/${id}`).then((o) => {
    setOrder(o);
    setForm(Object.fromEntries(EDITABLE.map((k) => [k, o[k] ?? ''])));
  }).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!order) return <Loading />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const total = Math.max(0, Number(order.subtotal) + Number(form.shipping || 0) + Number(order.tax) - Number(form.discount || 0));

  const save = async () => {
    setSaving(true);
    try {
      await api(`/admin/orders/${order.id}`, { method: 'PUT', body: form });
      toast('Order updated');
      load();
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  const courier = async (name) => {
    try {
      const r = await api('/admin/orders/courier', { method: 'POST', body: { ids: [order.id], courier: name } });
      const res = r.results[0];
      toast(res.ok ? `Sent to ${name}: ${res.tracking}` : res.message, res.ok ? 'success' : 'error');
      load();
    } catch (e) { toast(e.message, 'error'); }
  };
  const del = async () => {
    if (!confirm('Delete this order permanently? Stock will be restored.')) return;
    try { await api(`/admin/orders/${order.id}`, { method: 'DELETE' }); toast('Order deleted'); router.replace('/admin/orders'); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <Guard perm="orders">
      <PageHeader
        title={`Order #${order.order_no}`}
        subtitle={`${fmtDate(order.created_at, true)} · ${order.source.toUpperCase()}${order.created_by ? ' (by staff)' : ''}`}
        actions={<>
          <Link href="/admin/orders" className="btn btn-outline"><Icon name="chevron-left" className="h-4 w-4" /> Back</Link>
          <a href={`/admin/invoices?ids=${order.id}`} target="_blank" rel="noreferrer" className="btn btn-outline"><Icon name="print" className="h-4 w-4" /> Invoice</a>
          {can('returns') ? <button type="button" className="btn btn-outline" onClick={() => setReturning(true)}><Icon name="undo" className="h-4 w-4" /> Return</button> : null}
          <button type="button" className="btn btn-outline text-rose-600" onClick={del}><Icon name="trash" className="h-4 w-4" /></button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </>}
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card title={`Items (${order.items.length})`} actions={<div className="flex gap-2"><StatusBadge status={order.delivery_status} /><PayBadge status={order.payment_status} /></div>} bodyClass="">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className={thCls}>Product</th><th className={thCls}>Price</th><th className={thCls}>Qty</th><th className={`${thCls} text-right`}>Total</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <Thumb src={i.image} size={44} />
                          <div><p className="font-medium">{i.name}</p><p className="text-xs text-slate-500">{[i.variant_name, i.sku].filter(Boolean).join(' · ')}</p>
                            {i.returned_qty ? <span className="badge bg-rose-100 text-rose-700">{i.returned_qty} returned</span> : null}</div>
                        </div>
                      </td>
                      <td className={tdCls}>{taka(i.price)}</td>
                      <td className={tdCls}>{i.qty}</td>
                      <td className={`${tdCls} text-right font-semibold`}>{taka(i.price * i.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ml-auto max-w-sm space-y-2 border-t border-slate-100 p-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{taka(order.subtotal)}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Shipping</span><input type="number" className="input input-sm w-28 text-right" value={form.shipping} onChange={set('shipping')} /></div>
              <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span><input type="number" className="input input-sm w-28 text-right" value={form.discount} onChange={set('discount')} /></div>
              {Number(order.tax) > 0 ? <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{taka(order.tax)}</span></div> : null}
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold"><span>Total</span><span>{taka(total)}</span></div>
              <div className="flex justify-between text-emerald-700"><span>Paid</span><span>{taka(order.paid_amount)}</span></div>
              <div className="flex justify-between font-semibold text-rose-600"><span>Due</span><span>{taka(Math.max(0, total - Number(order.paid_amount)))}</span></div>
            </div>
          </Card>

          <Card title="Customer & Delivery" actions={<div className="flex items-center gap-2"><SuccessRate history={order.history} /><Link href={`/admin/customers/${encodeURIComponent(order.phone)}`} className="btn btn-sm btn-outline">Customer profile</Link><button type="button" onClick={() => setFraud(order.phone)} className="btn btn-sm btn-outline">Fraud check</button></div>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name"><input className="input" value={form.name} onChange={set('name')} /></Field>
              <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
              <Field label="Address" className="sm:col-span-2"><textarea className="input min-h-16" value={form.address} onChange={set('address')} /></Field>
              <Field label="City / District"><select className="input" value={form.city || ''} onChange={set('city')}><option value="">—</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Area"><select className="input" value={form.area} onChange={set('area')}><option value="inside">Inside Dhaka</option><option value="outside">Outside Dhaka</option></select></Field>
              <Field label="Customer note" className="sm:col-span-2"><input className="input" value={form.note || ''} onChange={set('note')} /></Field>
            </div>
          </Card>

          {order.returns?.length ? (
            <Card title="Returns">
              {order.returns.map((r) => (
                <div key={r.id} className="mb-2 rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="font-medium">{fmtDate(r.created_at, true)} · Refund {taka(r.refund_amount)}</p>
                  <p className="text-xs text-slate-500">{r.items.map((i) => `${i.name}${i.variant_name ? ` (${i.variant_name})` : ''} ×${i.qty}`).join(', ')}{r.note ? ` — ${r.note}` : ''}</p>
                </div>
              ))}
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card title="Status">
            <div className="space-y-4">
              <Field label="Delivery status">
                <select className="input" value={form.delivery_status} onChange={set('delivery_status')}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Assigned to">
                <select className="input" value={form.assigned_to || ''} onChange={set('assigned_to')}>
                  <option value="">— Nobody —</option>
                  {(meta?.staff || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Admin note (internal)"><textarea className="input min-h-16" value={form.admin_note || ''} onChange={set('admin_note')} /></Field>
            </div>
          </Card>
          <Card title="Payment">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Payment status">
                <select className="input" value={form.payment_status} onChange={set('payment_status')}>
                  <option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="refunded">Refunded</option>
                </select>
              </Field>
              <Field label="Paid amount (৳)"><input type="number" className="input" value={form.paid_amount} onChange={set('paid_amount')} /></Field>
              <Field label="Method"><input className="input" value={form.payment_method} onChange={set('payment_method')} /></Field>
              <Field label="Transaction ID"><input className="input" value={form.transaction_id || ''} onChange={set('transaction_id')} /></Field>
            </div>
          </Card>
          <Card title="Courier">
            {order.courier_tracking ? (
              <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Sent to <b className="capitalize">{order.courier}</b> · Tracking <b>{order.courier_tracking}</b></p>
            ) : (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => courier('pathao')} className="btn btn-dark"><Icon name="truck" className="h-4 w-4" /> Pathao</button>
                <button type="button" onClick={() => courier('steadfast')} className="btn btn-dark"><Icon name="truck" className="h-4 w-4" /> Steadfast</button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Courier"><input className="input" value={form.courier || ''} onChange={set('courier')} placeholder="e.g. RedX" /></Field>
              <Field label="Tracking no"><input className="input" value={form.courier_tracking || ''} onChange={set('courier_tracking')} /></Field>
            </div>
          </Card>
        </div>
      </div>
      <FraudCheck phone={fraud} onClose={() => setFraud(null)} />
      {returning ? <ReturnModal order={order} open={returning} onClose={() => setReturning(false)} onDone={() => { setReturning(false); load(); }} /> : null}
    </Guard>
  );
}
