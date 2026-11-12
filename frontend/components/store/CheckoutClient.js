'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { api, getUser } from '@/lib/client';
import { DISTRICTS, imgUrl, isValidPhone, taka } from '@/lib/format';
import { useCart } from './CartProvider';
import { QtyStepper } from './CartDrawer';
import { productData, track } from '@/lib/pixel';

const newToken = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function CheckoutClient({ settings, buy }) {
  const router = useRouter();
  const cart = useCart();
  const ship = settings.shipping || {};
  const methods = settings.payment_methods?.length ? settings.payment_methods : [{ key: 'cod', label: 'Cash on Delivery', description: 'Pay when you receive your order' }];

  const [buyItem, setBuyItem] = useState(buy);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '', area: 'inside', note: '' });
  const [payment, setPayment] = useState(methods[0].key);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [user, setUser] = useState(null);
  const token = useRef('');

  const items = useMemo(
    () => (buyItem ? [buyItem] : cart.items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty }))),
    [buyItem, cart.items]
  );
  const itemsKey = JSON.stringify(items);

  // Prefill from account / last order
  useEffect(() => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('checkout_info') || 'null'); } catch { /* ignore */ }
    const u = getUser();
    setUser(u);
    setForm((f) => ({
      ...f,
      ...(saved || {}),
      ...(u ? { name: u.name || saved?.name || '', phone: u.phone || saved?.phone || '', email: u.email || '', address: u.address || saved?.address || '' } : {}),
    }));
    token.current = sessionStorage.getItem('checkout_token') || newToken();
    sessionStorage.setItem('checkout_token', token.current);
  }, []);

  // Live price / shipping / coupon calculation from the server
  useEffect(() => {
    if (!cart.ready) return;
    if (!items.length) { setQuote(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    api('/checkout/quote', { method: 'POST', body: { items, area: form.area, coupon }, auth: false })
      .then((q) => { if (!cancelled) setQuote(q); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemsKey, form.area, coupon, cart.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Facebook Pixel: checkout started (once, when the prices are first known)
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (checkoutTracked.current || !quote?.lines?.length) return;
    checkoutTracked.current = true;
    const lines = quote.lines.filter((l) => !l.error);
    track('InitiateCheckout', { ...productData(lines), num_items: lines.reduce((s, l) => s + Number(l.qty), 0) });
  }, [quote]);

  // Save abandoned checkout ("Incomplete orders" in admin) once a valid phone is typed
  useEffect(() => {
    if (!isValidPhone(form.phone) || !quote?.lines?.length) return;
    const t = setTimeout(() => {
      fetch('/api/incomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.current, name: form.name, phone: form.phone, email: form.email, address: form.address, total: quote.total,
          items: quote.lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, name: l.name, variant_name: l.variant_name, qty: l.qty, price: l.price })),
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [form.phone, form.name, form.address, quote?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const lineKey = (l) => `${l.product_id}-${l.variant_id || 0}`;
  const setQty = (l, q) => (buyItem ? setBuyItem({ ...buyItem, qty: q }) : cart.update(lineKey(l), q));
  const removeLine = (l) => (buyItem ? setBuyItem(null) : cart.remove(lineKey(l)));

  const areaCharge = (area) => {
    const base = Number(area === 'outside' ? ship.shipping_outside_dhaka : ship.shipping_inside_dhaka) || 0;
    const lines = (quote?.lines || []).filter((l) => !l.error);
    if (!lines.length) return base;
    const paying = lines.filter((l) => !l.free_shipping);
    if (!paying.length) return 0;
    return Math.max(...paying.map((l) => { const o = Number(area === 'outside' ? l.shipping_outside : l.shipping_inside); return o > 0 ? o : base; }));
  };

  const guestBlocked = !Number(settings.guest_checkout) && !user;
  const hasErrors = quote?.lines?.some((l) => l.error);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Please enter your full name.');
    if (!isValidPhone(form.phone)) return setError('Please enter a valid 11-digit mobile number (01XXXXXXXXX).');
    if (!form.address.trim()) return setError('Please enter your delivery address.');
    if (hasErrors) return setError('Please remove unavailable items from your order.');
    setPlacing(true);
    try {
      const r = await api('/orders', {
        method: 'POST',
        body: { ...form, items, coupon, payment_method: payment, incomplete_token: token.current },
      });
      localStorage.setItem('checkout_info', JSON.stringify({ name: form.name, phone: form.phone, address: form.address, city: form.city, area: form.area }));
      sessionStorage.removeItem('checkout_token');
      if (!buyItem) cart.clear();
      if (r.payment_url) { window.location.href = r.payment_url; return; }
      router.push(`/order-success/${encodeURIComponent(r.order.order_no)}?key=${r.key}${r.payment_error ? '&payment=failed' : ''}`);
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  };

  if (cart.ready && !items.length) {
    return (
      <div className="container-x py-16 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400"><Icon name="cart" className="h-8 w-8" /></span>
        <h1 className="mt-4 text-xl font-semibold">Your cart is empty</h1>
        <p className="mt-1 text-sm text-slate-500">Add some products before checking out.</p>
        <Link href="/shop" className="btn btn-primary mt-6">Start Shopping</Link>
      </div>
    );
  }

  const radioCard = (active) => `flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${active ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`;

  return (
    <div className="container-x py-6 md:py-8">
      <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
      <p className="text-sm text-slate-500">Complete your order</p>

      {guestBlocked ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Please <Link href="/login?next=/checkout" className="font-semibold underline">log in</Link> or <Link href="/register?next=/checkout" className="font-semibold underline">create an account</Link> to place an order.
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <section className="card p-5 md:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Icon name="user" className="h-5 w-5 text-primary" /> Customer Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="name">Full Name *</label>
                <input id="name" className="input" value={form.name} onChange={set('name')} placeholder="আপনার নাম লিখুন" autoComplete="name" required />
              </div>
              <div>
                <label className="label" htmlFor="phone">Phone Number *</label>
                <input id="phone" className="input" value={form.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" inputMode="tel" autoComplete="tel" required />
              </div>
              <div>
                <label className="label" htmlFor="city">City / District</label>
                <select id="city" className="input" value={form.city} onChange={set('city')}>
                  <option value="">Select district</option>
                  {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="address">Delivery Address *</label>
                <textarea id="address" rows={2} className="input min-h-20" value={form.address} onChange={set('address')} placeholder="বাসা/রোড নম্বর, এলাকা, থানা" autoComplete="street-address" required />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="note">Order Note (optional)</label>
                <input id="note" className="input" value={form.note} onChange={set('note')} placeholder="Any special instruction" />
              </div>
            </div>
          </section>

          <section className="card p-5 md:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Icon name="truck" className="h-5 w-5 text-primary" /> Delivery Area *</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[['inside', ship.inside_label || 'Inside Dhaka', ship.inside_time], ['outside', ship.outside_label || 'Outside Dhaka', ship.outside_time]].map(([key, label, time]) => (
                <label key={key} className={radioCard(form.area === key)}>
                  <input type="radio" name="area" value={key} checked={form.area === key} onChange={set('area')} className="mt-1 accent-[var(--primary)]" />
                  <span className="flex-1">
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-xs text-slate-500">{time}</span>
                  </span>
                  <span className="font-bold text-primary">{taka(areaCharge(key))}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="card p-5 md:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Icon name="card" className="h-5 w-5 text-primary" /> Payment Method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {methods.map((m) => (
                <label key={m.key} className={radioCard(payment === m.key)}>
                  <input type="radio" name="payment" value={m.key} checked={payment === m.key} onChange={() => setPayment(m.key)} className="mt-1 accent-[var(--primary)]" />
                  <span>
                    <span className="block font-semibold">{m.label}</span>
                    <span className="block text-xs text-slate-500">{m.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="card h-fit p-5 md:p-6 lg:sticky lg:top-36">
          <h2 className="text-lg font-semibold">Order Summary</h2>
          <p className="mb-3 text-sm text-slate-500">Items ({quote?.lines?.length || items.length})</p>
          <ul className="divide-y divide-slate-100">
            {(quote?.lines || []).map((l) => (
              <li key={lineKey(l)} className="flex gap-3 py-3">
                <Image src={imgUrl(l.image)} alt="" width={60} height={60} className="h-15 w-15 shrink-0 rounded-lg border border-slate-100 bg-slate-50 object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">{l.name}</p>
                  {l.variant_name ? <p className="text-xs text-slate-500">{l.variant_name}</p> : null}
                  {l.error ? <p className="text-xs font-medium text-rose-600">{l.error}</p> : null}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <QtyStepper size="sm" value={l.qty} max={l.stock > 0 ? l.stock : 1} onChange={(q) => setQty(l, q)} />
                    <span className="text-sm font-semibold">{taka(l.line_total)}</span>
                  </div>
                </div>
                <button type="button" onClick={() => removeLine(l)} className="self-start p-1 text-slate-400 hover:text-rose-600" aria-label="Remove"><Icon name="x" className="h-4 w-4" /></button>
              </li>
            ))}
            {loading && !quote ? <li className="py-6 text-center text-sm text-slate-400">Loading…</li> : null}
          </ul>

          <div className="mt-3 flex gap-2">
            <input className="input input-sm h-10" placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} />
            {coupon ? (
              <button type="button" className="btn btn-sm btn-outline h-10" onClick={() => { setCoupon(''); setCouponInput(''); }}>Remove</button>
            ) : (
              <button type="button" className="btn btn-sm btn-dark h-10" onClick={() => couponInput && setCoupon(couponInput.trim())}>Apply</button>
            )}
          </div>
          {coupon && quote?.coupon_error ? <p className="mt-1 text-xs text-rose-600">{quote.coupon_error}</p> : null}
          {coupon && quote?.coupon ? <p className="mt-1 text-xs text-emerald-600">Coupon “{quote.coupon}” applied</p> : null}

          <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium">{taka(quote?.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Shipping</dt><dd className="font-medium">{taka(quote?.shipping)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="font-medium text-emerald-600">-{taka(quote?.discount)}</dd></div>
            {Number(quote?.tax) > 0 ? <div className="flex justify-between"><dt className="text-slate-500">VAT / Tax</dt><dd className="font-medium">{taka(quote?.tax)}</dd></div> : null}
            <div className="flex justify-between border-t border-slate-100 pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="text-xl font-bold text-primary">{taka(quote?.total)}</dd></div>
          </dl>

          {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <button type="submit" disabled={placing || loading || guestBlocked || !quote?.lines?.length} className="btn btn-primary mt-5 h-13 w-full text-base">
            {placing ? 'Placing order…' : <>Confirm Order <span className="opacity-90">· {taka(quote?.total)}</span></>}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500"><Icon name="lock" className="h-3.5 w-3.5" /> Secure Checkout · SSL Protected</p>
        </aside>
      </form>
    </div>
  );
}
