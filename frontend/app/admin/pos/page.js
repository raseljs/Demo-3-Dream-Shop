'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Field, Modal, Spinner, Thumb } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { DISTRICTS, isValidPhone, qs, taka } from '@/lib/format';

const BLANK = { phone: '', name: '', address: '', city: '', area: 'inside', note: '' };
const priceOf = (x) => (Number(x.sale_price) > 0 ? Number(x.sale_price) : Number(x.regular_price));

export default function PosPage() {
  const { meta, toast } = useAdmin();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [cart, setCart] = useState([]);
  const [cust, setCust] = useState(BLANK);
  const [mode, setMode] = useState('walkin'); // walkin | delivery
  const [discount, setDiscount] = useState('');
  const [shipping, setShipping] = useState('');
  const [method, setMethod] = useState('cash');
  const [paid, setPaid] = useState('');
  const [quote, setQuote] = useState(null);
  const [chooser, setChooser] = useState(null);
  const [done, setDone] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [found, setFound] = useState(null);
  const searchRef = useRef(null);

  // products
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api(`/admin/products${qs({ search, category_id: category, status: 'published', with_variants: 1, per_page: 24, page })}`)
        .then((r) => { setProducts((prev) => (page === 1 ? r.data : [...prev, ...r.data])); setLastPage(r.last_page); })
        .catch((e) => toast(e.message, 'error'))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, category, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // prefill from "Incomplete orders → Create order"
  useEffect(() => {
    const raw = sessionStorage.getItem('pos_prefill');
    if (!raw) return;
    sessionStorage.removeItem('pos_prefill');
    try {
      const d = JSON.parse(raw);
      setMode('delivery');
      setCust({ ...BLANK, name: d.name || '', phone: d.phone || '', address: d.address || '' });
      setCart((d.items || []).map((i) => ({ key: `${i.product_id}-${i.variant_id || 0}`, product_id: i.product_id, variant_id: i.variant_id, name: i.name, variant_name: i.variant_name, image: null, price: i.price, qty: i.qty, stock: 9999 })));
    } catch { /* ignore */ }
  }, []);

  const items = useMemo(() => cart.map((c) => ({ product_id: c.product_id, variant_id: c.variant_id, qty: c.qty, price: c.price })), [cart]);
  useEffect(() => {
    if (!items.length) { setQuote(null); return; }
    const t = setTimeout(() => {
      api('/admin/checkout/quote', { method: 'POST', body: { items, area: cust.area, shipping: mode === 'walkin' ? 0 : shipping, discount } })
        .then(setQuote).catch(() => setQuote(null));
    }, 250);
    return () => clearTimeout(t);
  }, [items, cust.area, shipping, discount, mode]);

  const add = (p, v = null) => {
    const stock = v ? Number(v.qty) : Number(p.qty);
    if (stock <= 0) return toast('Out of stock', 'error');
    const key = `${p.id}-${v?.id || 0}`;
    setCart((c) => {
      const ex = c.find((x) => x.key === key);
      if (ex) return c.map((x) => (x.key === key ? { ...x, qty: Math.min(stock, x.qty + 1) } : x));
      return [...c, { key, product_id: p.id, variant_id: v?.id || null, name: p.name, variant_name: v?.name || null, image: v?.image || p.thumbnail, price: priceOf(v || p), qty: 1, stock }];
    });
    setChooser(null);
  };
  const pick = (p) => (p.type === 'variable' && p.variants?.length ? setChooser(p) : add(p));
  const upd = (key, patch) => setCart((c) => c.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const lookup = async () => {
    if (!isValidPhone(cust.phone)) return;
    try {
      const r = await api(`/admin/users?search=${encodeURIComponent(cust.phone.slice(-10))}&per_page=1`);
      const u = r.data[0];
      setFound(u || null);
      if (u) setCust((c) => ({ ...c, name: c.name || u.name, address: c.address || u.address || '' }));
    } catch { /* users permission may be missing */ }
  };

  const total = quote?.total ?? 0;
  const place = async () => {
    if (!cart.length) return toast('Cart is empty', 'error');
    if (mode === 'delivery' && (!isValidPhone(cust.phone) || !cust.address)) return toast('Phone and address are required for delivery orders', 'error');
    setPlacing(true);
    try {
      const paidAmount = paid === '' ? (mode === 'walkin' ? total : 0) : Number(paid);
      const o = await api('/admin/orders', {
        method: 'POST',
        body: {
          source: 'pos', ...cust, items, discount, shipping: mode === 'walkin' ? 0 : shipping, payment_method: method,
          paid_amount: paidAmount, payment_status: paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
          delivery_status: mode === 'walkin' ? 'delivered' : 'confirmed',
        },
      });
      setDone(o);
      setCart([]); setCust(BLANK); setDiscount(''); setShipping(''); setPaid(''); setFound(null);
      setPage(1);
    } catch (e) { toast(e.message, 'error'); } finally { setPlacing(false); }
  };

  return (
    <Guard perm="pos">
      <div className="grid gap-4 xl:grid-cols-[1fr_440px]">
        {/* Products */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative flex-1">
              <Icon name="barcode" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input ref={searchRef} autoFocus className="input h-10 pl-9" placeholder="Search name / scan SKU…" value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && products.length === 1) { pick(products[0]); setSearch(''); } }} />
            </div>
            <select className="input h-10 w-auto" value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }}>
              <option value="">All categories</option>
              {(meta?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {products.map((p) => (
              <button key={p.id} type="button" onClick={() => pick(p)} disabled={p.qty <= 0}
                className="group rounded-xl border border-slate-200 p-2 text-left transition hover:border-primary hover:shadow disabled:opacity-50">
                <Thumb src={p.thumbnail} size={140} className="!h-auto aspect-square !w-full" />
                <p className="mt-2 line-clamp-2 text-xs font-medium leading-4">{p.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">{taka(priceOf(p))}</span>
                  <span className={`text-[10px] ${p.qty <= 0 ? 'text-rose-600' : 'text-slate-500'}`}>{p.qty} pcs</span>
                </div>
              </button>
            ))}
          </div>
          {loading ? <div className="flex justify-center py-6"><Spinner /></div> : null}
          {!loading && page < lastPage ? <div className="mt-4 text-center"><button type="button" className="btn btn-outline" onClick={() => setPage(page + 1)}>Load More</button></div> : null}
          {!loading && !products.length ? <p className="py-10 text-center text-sm text-slate-500">No products found.</p> : null}
        </div>

        {/* Cart & checkout */}
        <div className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-4 xl:sticky xl:top-20">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-medium">
            {[['walkin', 'Walk-in sale'], ['delivery', 'Delivery order']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-lg py-2 ${mode === k ? 'bg-white shadow' : 'text-slate-500'}`}>{l}</button>
            ))}
          </div>

          <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
            {cart.map((c) => (
              <div key={c.key} className="flex items-center gap-2 py-2">
                <Thumb src={c.image} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{c.name}</p>
                  {c.variant_name ? <p className="text-[11px] text-slate-500">{c.variant_name}</p> : null}
                  <input type="number" className="mt-0.5 w-20 rounded border border-slate-200 px-1 text-xs" value={c.price} onChange={(e) => upd(c.key, { price: e.target.value })} title="Unit price" />
                </div>
                <div className="flex items-center rounded-lg border border-slate-200">
                  <button type="button" className="px-2 py-1" onClick={() => upd(c.key, { qty: Math.max(1, c.qty - 1) })}>−</button>
                  <span className="w-7 text-center text-xs font-semibold">{c.qty}</span>
                  <button type="button" className="px-2 py-1" onClick={() => upd(c.key, { qty: Math.min(c.stock, c.qty + 1) })}>+</button>
                </div>
                <span className="w-16 text-right text-xs font-semibold">{taka(c.price * c.qty)}</span>
                <button type="button" onClick={() => setCart((x) => x.filter((y) => y.key !== c.key))} className="text-slate-400 hover:text-rose-600" aria-label="Remove"><Icon name="x" className="h-4 w-4" /></button>
              </div>
            ))}
            {!cart.length ? <p className="py-8 text-center text-sm text-slate-400">Click products to add them</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Phone" className="col-span-2">
              <input className="input h-10" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} onBlur={lookup} placeholder={mode === 'walkin' ? 'Optional' : '01XXXXXXXXX'} />
              {found ? <p className="mt-1 text-xs text-emerald-600">Existing customer: {found.name} · {found.orders_count} orders</p> : null}
            </Field>
            <Field label="Name"><input className="input h-10" value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} placeholder={mode === 'walkin' ? 'Walk-in Customer' : ''} /></Field>
            <Field label="City">
              <select className="input h-10" value={cust.city} onChange={(e) => setCust({ ...cust, city: e.target.value })}>
                <option value="">—</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            {mode === 'delivery' ? (
              <>
                <Field label="Address" className="col-span-2"><input className="input h-10" value={cust.address} onChange={(e) => setCust({ ...cust, address: e.target.value })} /></Field>
                <Field label="Area">
                  <select className="input h-10" value={cust.area} onChange={(e) => setCust({ ...cust, area: e.target.value })}><option value="inside">Inside Dhaka</option><option value="outside">Outside Dhaka</option></select>
                </Field>
                <Field label="Shipping (৳)"><input type="number" className="input h-10" value={shipping} placeholder={String(quote?.shipping ?? 'auto')} onChange={(e) => setShipping(e.target.value)} /></Field>
              </>
            ) : null}
            <Field label="Discount (৳)"><input type="number" className="input h-10" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
            <Field label="Note"><input className="input h-10" value={cust.note} onChange={(e) => setCust({ ...cust, note: e.target.value })} /></Field>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Payment</p>
            <div className="flex flex-wrap gap-1.5">
              {['cash', 'bkash', 'nagad', 'card', 'bank', 'cod'].map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase ${method === m ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>{m}</button>
              ))}
            </div>
            <input type="number" className="input mt-2 h-10" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder={`Paid amount (default ${mode === 'walkin' ? 'full' : '0'})`} />
          </div>

          <dl className="space-y-1 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{taka(quote?.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{taka(quote?.shipping)}</dd></div>
            <div className="flex justify-between"><dt>Discount</dt><dd>-{taka(quote?.discount)}</dd></div>
            <div className="flex justify-between text-lg font-bold"><dt>Total</dt><dd className="text-primary">{taka(total)}</dd></div>
            {paid !== '' && Number(paid) > total ? <div className="flex justify-between text-emerald-700"><dt>Change</dt><dd>{taka(Number(paid) - total)}</dd></div> : null}
          </dl>
          <button type="button" onClick={place} disabled={placing || !cart.length} className="btn btn-primary h-12 w-full text-base">
            {placing ? 'Placing…' : mode === 'walkin' ? 'Complete Sale' : 'Place Order'}
          </button>
        </div>
      </div>

      <Modal open={!!chooser} onClose={() => setChooser(null)} title={chooser ? `Choose variant — ${chooser.name}` : ''}>
        <div className="grid gap-2 sm:grid-cols-2">
          {(chooser?.variants || []).map((v) => (
            <button key={v.id} type="button" disabled={v.qty <= 0} onClick={() => add(chooser, v)} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm hover:border-primary disabled:opacity-40">
              <span><b>{v.name}</b><span className="block text-xs text-slate-500">{v.qty} in stock</span></span>
              <span className="font-semibold text-primary">{taka(priceOf(v))}</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={!!done} onClose={() => setDone(null)} title="Order placed ✓"
        footer={<><a href={`/admin/invoices?ids=${done?.id}`} target="_blank" rel="noreferrer" className="btn btn-outline"><Icon name="print" className="h-4 w-4" /> Print Invoice</a><button type="button" className="btn btn-primary" onClick={() => { setDone(null); searchRef.current?.focus(); }}>New Sale</button></>}>
        {done ? <p className="text-center text-lg">Order <b>#{done.order_no}</b> — {taka(done.total)}</p> : null}
      </Modal>
    </Guard>
  );
}
