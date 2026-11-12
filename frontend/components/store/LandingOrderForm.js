'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { imgUrl, isValidPhone, taka } from '@/lib/format';
import { QtyStepper } from './CartDrawer';

export default function LandingOrderForm({ product: p, campaignId, shipping, buttonLabel }) {
  const router = useRouter();
  const variants = (p.variants || []).filter((v) => v.qty > 0);
  const [variantId, setVariantId] = useState(variants[0]?.id || null);
  const [qty, setQty] = useState(1);
  const [f, setF] = useState({ name: '', phone: '', address: '', area: 'inside' });
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const items = [{ product_id: p.id, variant_id: p.type === 'variable' ? variantId : null, qty }];

  useEffect(() => {
    api('/checkout/quote', { method: 'POST', auth: false, body: { items, area: f.area } }).then(setQuote).catch(() => setQuote(null));
  }, [variantId, qty, f.area]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidPhone(f.phone)) return setError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX)');
    setBusy(true);
    try {
      const r = await api('/orders', { method: 'POST', body: { ...f, items, source: 'landing', campaign_id: campaignId, payment_method: 'cod' } });
      router.push(`/order-success/${encodeURIComponent(r.order.order_no)}?key=${r.key}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const line = quote?.lines?.[0];
  return (
    <form onSubmit={submit} className="mt-6 grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div><label className="label">আপনার নাম *</label><input className="input" value={f.name} onChange={set('name')} required /></div>
        <div><label className="label">মোবাইল নম্বর *</label><input className="input" value={f.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" inputMode="tel" required /></div>
        <div><label className="label">সম্পূর্ণ ঠিকানা *</label><textarea className="input" value={f.address} onChange={set('address')} required /></div>
        <div className="grid grid-cols-2 gap-2">
          {[['inside', shipping.inside_label || 'Inside Dhaka', shipping.shipping_inside_dhaka], ['outside', shipping.outside_label || 'Outside Dhaka', shipping.shipping_outside_dhaka]].map(([k, l, c]) => (
            <label key={k} className={`cursor-pointer rounded-xl border-2 p-3 text-sm ${f.area === k ? 'border-primary bg-primary/5' : 'border-slate-200'}`}>
              <input type="radio" name="area" value={k} checked={f.area === k} onChange={set('area')} className="mr-2 accent-[var(--primary)]" />
              {l} <b className="float-right">{taka(c)}</b>
            </label>
          ))}
        </div>
      </div>
      <div className="card h-fit p-5">
        <div className="flex items-center gap-3">
          <Image src={imgUrl(line?.image || p.thumbnail)} alt="" width={64} height={64} className="h-16 w-16 rounded-xl bg-slate-50 object-contain" />
          <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold">{p.name}</p><p className="text-primary">{taka(line?.price ?? p.price)}</p></div>
        </div>
        {p.type === 'variable' ? (
          <select className="input mt-4" value={variantId || ''} onChange={(e) => setVariantId(Number(e.target.value))}>
            {variants.map((v) => <option key={v.id} value={v.id}>{v.name} — {taka(v.price)}</option>)}
          </select>
        ) : null}
        <div className="mt-4 flex items-center justify-between"><span className="text-sm">পরিমাণ</span><QtyStepper value={qty} onChange={setQty} max={line?.stock > 0 ? line.stock : 99} /></div>
        <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{taka(quote?.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery charge</dt><dd>{taka(quote?.shipping)}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd className="text-primary">{taka(quote?.total)}</dd></div>
        </dl>
        {line?.error ? <p className="mt-2 text-sm text-rose-600">{line.error}</p> : null}
        {error ? <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <button className="btn mt-4 h-13 w-full bg-primary text-lg text-[var(--lp-text,#fff)] hover:opacity-90" disabled={busy || !!line?.error}>
          {busy ? 'অপেক্ষা করুন…' : buttonLabel}
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন</p>
      </div>
    </form>
  );
}
