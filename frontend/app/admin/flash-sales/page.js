'use client';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Field, Loading, Modal, PageHeader, ProductPicker, Thumb, Toggle, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { discountPct, fmtDate, taka } from '@/lib/format';

// Sale times are Bangladesh time (UTC+6) on the server.
const bdNow = (addMin = 0) => new Date(Date.now() + 6 * 3600e3 + addMin * 60e3).toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
const toInput = (s) => String(s || '').replace(' ', 'T').slice(0, 16);
const toMs = (s) => new Date(`${String(s).replace(' ', 'T').slice(0, 19)}+06:00`).getTime();
const DURATIONS = [[3, '3 hours'], [6, '6 hours'], [12, '12 hours'], [24, '1 day'], [72, '3 days'], [168, '7 days']];
const STATE = {
  running: { label: 'Live now', cls: 'bg-emerald-100 text-emerald-800' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-800' },
  ended: { label: 'Ended', cls: 'bg-slate-100 text-slate-600' },
};

function left(ms) {
  if (ms <= 0) return '';
  const m = Math.floor(ms / 60e3);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m % 60}m` : `${m % 60}m`;
}

function SaleForm({ sale, onClose, onSaved }) {
  const { toast } = useAdmin();
  const [f, setF] = useState(null);
  const [pct, setPct] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sale) { setF(null); return; }
    if (!sale.id) { setF({ title: '', starts_at: bdNow(), ends_at: bdNow(24 * 60), status: true, items: [] }); return; }
    api(`/admin/flash-sales/${sale.id}`).then((s) => setF({
      title: s.title, starts_at: toInput(s.starts_at), ends_at: toInput(s.ends_at), status: !!Number(s.status),
      items: s.items.map((i) => ({ product_id: i.product_id, name: i.name, thumbnail: i.thumbnail, type: i.type, regular_price: Number(i.regular_price), sale_price: Number(i.sale_price), flash_price: Number(i.flash_price) })),
    })).catch((e) => { toast(e.message, 'error'); onClose(); });
  }, [sale]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sale) return null;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const add = (p) => setF((x) => (x.items.some((i) => i.product_id === p.id) ? x : {
    ...x,
    items: [...x.items, { product_id: p.id, name: p.name, thumbnail: p.thumbnail, type: p.type, regular_price: Number(p.regular_price), sale_price: Number(p.sale_price), flash_price: pct ? Math.round(Number(p.regular_price) * (1 - pct / 100)) : '' }],
  }));
  const upd = (id, v) => setF((x) => ({ ...x, items: x.items.map((i) => (i.product_id === id ? { ...i, flash_price: v } : i)) }));
  const applyPct = (v) => {
    setPct(v);
    if (Number(v) > 0 && Number(v) < 100) setF((x) => ({ ...x, items: x.items.map((i) => ({ ...i, flash_price: Math.round(i.regular_price * (1 - v / 100)) })) }));
  };
  const duration = (hours) => setF((x) => ({ ...x, ends_at: new Date(new Date(`${x.starts_at}:00Z`).getTime() + hours * 3600e3).toISOString().slice(0, 16) }));
  const save = async () => {
    setBusy(true);
    try {
      const body = { title: f.title, starts_at: f.starts_at, ends_at: f.ends_at, status: f.status ? 1 : 0, items: f.items.map((i) => ({ product_id: i.product_id, flash_price: i.flash_price })) };
      if (sale.id) await api(`/admin/flash-sales/${sale.id}`, { method: 'PUT', body });
      else await api('/admin/flash-sales', { method: 'POST', body });
      toast(sale.id ? 'Flash sale updated' : 'Flash sale created');
      onSaved();
      onClose();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} size="max-w-3xl" title={sale.id ? 'Edit flash sale' : 'New flash sale'}
      footer={f ? <><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={save}>{sale.id ? 'Save changes' : 'Create flash sale'}</button></> : null}>
      {!f ? <Loading /> : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required className="sm:col-span-2"><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. 11.11 Mega Flash Sale" autoFocus /></Field>
            <Field label="Starts (Bangladesh time)"><input type="datetime-local" className="input" value={f.starts_at} onChange={(e) => set('starts_at', e.target.value)} /></Field>
            <Field label="Ends"><input type="datetime-local" className="input" value={f.ends_at} onChange={(e) => set('ends_at', e.target.value)} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="mr-1 text-slate-500">Runs for:</span>
            {DURATIONS.map(([h, label]) => <button key={h} type="button" className="rounded-full border border-slate-200 px-2.5 py-1 hover:border-primary hover:text-primary" onClick={() => duration(h)}>{label}</button>)}
            <button type="button" className="ml-2 rounded-full border border-slate-200 px-2.5 py-1 hover:border-primary hover:text-primary" onClick={() => set('starts_at', bdNow())}>Start now</button>
          </div>
          <Toggle checked={f.status} onChange={(v) => set('status', v)} label="Active (turn off to pause without deleting)" />

          <div>
            <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
              <h4 className="font-semibold">Products ({f.items.length})</h4>
              <label className="flex items-center gap-2 text-sm">Set all to <input type="number" min="1" max="95" className="input input-sm w-20" value={pct} onChange={(e) => applyPct(e.target.value)} placeholder="%" /> off regular price</label>
            </div>
            <ProductPicker onPick={add} />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-slate-50"><tr><th className={thCls}>Product</th><th className={`${thCls} text-right`}>Regular</th><th className={`${thCls} text-right`}>Now</th><th className={`${thCls} w-32`}>Flash price</th><th className="w-10" /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {f.items.map((i) => {
                    const off = discountPct(i.regular_price, i.flash_price);
                    return (
                      <tr key={i.product_id}>
                        <td className={tdCls}><div className="flex items-center gap-2.5"><Thumb src={i.thumbnail} size={32} /><div className="min-w-0"><p className="truncate">{i.name}</p>{i.type === 'variable' ? <p className="text-[11px] text-slate-500">Same flash price for every size/colour</p> : null}</div></div></td>
                        <td className={`${tdCls} text-right`}>{taka(i.regular_price)}</td>
                        <td className={`${tdCls} text-right text-slate-500`}>{i.sale_price ? taka(i.sale_price) : '—'}</td>
                        <td className={tdCls}>
                          <input type="number" min="1" className={`input input-sm ${Number(i.flash_price) >= i.regular_price ? 'border-rose-400' : ''}`} value={i.flash_price} onChange={(e) => upd(i.product_id, e.target.value)} />
                          {off ? <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">{off}% off</p> : null}
                        </td>
                        <td className={tdCls}><button type="button" className="rounded p-1 text-rose-600 hover:bg-rose-50" onClick={() => setF((x) => ({ ...x, items: x.items.filter((y) => y.product_id !== i.product_id) }))} aria-label="Remove"><Icon name="x" className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                  {!f.items.length ? <tr><td colSpan={5} className="py-8 text-center text-slate-500">Search above to add products to this sale.</td></tr> : null}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">While the sale is live, these prices replace the products&apos; sale price everywhere on the shop. When it ends, the old prices come back automatically.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}

function FlashSales() {
  const { toast } = useAdmin();
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);
  const [, tick] = useState(0);
  const load = () => api('/admin/flash-sales').then(setData).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  const del = async (s) => {
    if (!confirm(`Delete "${s.title}"? If it is live, product prices go back to normal now.`)) return;
    try { await api(`/admin/flash-sales/${s.id}`, { method: 'DELETE' }); toast('Flash sale deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };
  const endNow = async (s) => {
    if (!confirm(`End "${s.title}" now? Prices go back to normal.`)) return;
    try {
      const full = await api(`/admin/flash-sales/${s.id}`);
      await api(`/admin/flash-sales/${s.id}`, { method: 'PUT', body: { title: full.title, starts_at: full.starts_at, ends_at: bdNow().replace('T', ' ') + ':00', status: full.status, items: full.items.map((i) => ({ product_id: i.product_id, flash_price: i.flash_price })) } });
      toast('Flash sale ended');
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Flash sales" subtitle="Time-limited prices with a countdown on the home page and product pages" actions={<button type="button" className="btn btn-primary" onClick={() => setEdit({})}><Icon name="plus" className="h-4 w-4" /> New flash sale</button>} />
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className={thCls}>Sale</th><th className={thCls}>Time</th><th className={`${thCls} text-right`}>Products</th><th className={thCls}>Status</th><th className={`${thCls} text-right`}>Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((s) => {
                  const now = Date.now();
                  const st = STATE[s.state] || STATE.scheduled;
                  const note = s.state === 'running' ? `ends in ${left(toMs(s.ends_at) - now)}` : s.state === 'scheduled' ? (Number(s.status) ? `starts in ${left(toMs(s.starts_at) - now)}` : 'paused') : '';
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className={tdCls}><button type="button" className="font-semibold hover:text-primary" onClick={() => setEdit(s)}>{s.title}</button></td>
                      <td className={`${tdCls} text-xs text-slate-600`}>{fmtDate(s.starts_at, true)}<br />→ {fmtDate(s.ends_at, true)}</td>
                      <td className={`${tdCls} text-right`}>{s.items_count}</td>
                      <td className={tdCls}><span className={`badge ${st.cls}`}>{st.label}</span>{note ? <p className="mt-1 text-[11px] text-slate-500">{note}</p> : null}</td>
                      <td className={`${tdCls} whitespace-nowrap text-right`}>
                        {s.state === 'running' ? <button type="button" className="btn btn-sm btn-outline" onClick={() => endNow(s)}>End now</button> : null}
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEdit(s)} aria-label="Edit"><Icon name="edit" className="h-4 w-4" /></button>
                        <button type="button" className="btn btn-sm btn-ghost text-rose-600" onClick={() => del(s)} aria-label="Delete"><Icon name="trash" className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  );
                })}
                {!data.data.length ? <tr><td colSpan={5} className="py-12 text-center text-slate-500">No flash sales yet. Create one to show a countdown deal on your home page.</td></tr> : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <SaleForm sale={edit} onClose={() => setEdit(null)} onSaved={load} />
    </>
  );
}

export default function Page() {
  return <Guard perm="marketing"><FlashSales /></Guard>;
}
