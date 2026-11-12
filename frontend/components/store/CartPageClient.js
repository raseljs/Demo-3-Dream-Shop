'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { api } from '@/lib/client';
import { imgUrl, taka } from '@/lib/format';
import { useCart } from './CartProvider';
import { QtyStepper } from './CartDrawer';

export default function CartPageClient() {
  const { items, ready, update, remove, clear } = useCart();
  const [quote, setQuote] = useState(null);
  const key = JSON.stringify(items.map((i) => [i.product_id, i.variant_id, i.qty]));

  // Re-check live prices & stock
  useEffect(() => {
    if (!ready || !items.length) { setQuote(null); return; }
    api('/checkout/quote', { method: 'POST', auth: false, body: { items: items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty })) } })
      .then(setQuote).catch(() => setQuote(null));
  }, [key, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const lineFor = (it) => quote?.lines?.find((l) => l.product_id === it.product_id && (l.variant_id || null) === (it.variant_id || null));

  if (!ready) return <div className="container-x py-16 text-center text-slate-400">Loading…</div>;
  if (!items.length) {
    return (
      <div className="container-x flex flex-col items-center py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400"><Icon name="cart" className="h-8 w-8" /></span>
        <h1 className="mt-4 text-xl font-semibold">Your cart is currently empty.</h1>
        <p className="mt-1 text-sm text-slate-500">Looks like you haven&apos;t added any items to your cart yet.</p>
        <Link href="/shop" className="btn btn-primary mt-6">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container-x py-6 md:py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          <p className="text-sm text-slate-500">{items.length} item(s)</p>
        </div>
        <button type="button" onClick={clear} className="text-sm font-medium text-rose-600 hover:underline">Clear cart</button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="card divide-y divide-slate-100">
          {items.map((it) => {
            const l = lineFor(it);
            const price = l ? l.price : it.price;
            return (
              <li key={it.key} className="flex gap-4 p-4">
                <Link href={`/product/${it.slug}`} className="shrink-0">
                  <Image src={imgUrl(it.image)} alt="" width={96} height={96} className="h-24 w-24 rounded-xl border border-slate-100 bg-slate-50 object-contain" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${it.slug}`} className="line-clamp-2 font-medium hover:text-primary">{it.name}</Link>
                  {it.variant_name ? <p className="text-sm text-slate-500">{it.variant_name}</p> : null}
                  <p className="mt-1 text-sm text-slate-500">{taka(price)} each</p>
                  {l?.error ? <p className="mt-1 text-sm font-medium text-rose-600">{l.error}</p> : null}
                  <div className="mt-3 flex items-center justify-between">
                    <QtyStepper value={it.qty} max={l?.stock > 0 ? l.stock : it.stock > 0 ? it.stock : 9999} onChange={(q) => update(it.key, q)} />
                    <span className="font-semibold">{taka(price * it.qty)}</span>
                  </div>
                </div>
                <button type="button" onClick={() => remove(it.key)} className="self-start p-1 text-slate-400 hover:text-rose-600" aria-label="Remove"><Icon name="trash" className="h-5 w-5" /></button>
              </li>
            );
          })}
        </ul>
        <aside className="card h-fit p-5 lg:sticky lg:top-36">
          <h2 className="text-lg font-semibold">Cart Totals</h2>
          <div className="mt-4 flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{taka(quote ? quote.subtotal : items.reduce((s, i) => s + i.price * i.qty, 0))}</span></div>
          <p className="mt-2 text-xs text-slate-500">Shipping & discounts are calculated at checkout.</p>
          <Link href="/checkout" className="btn btn-primary mt-5 h-12 w-full">Proceed to Checkout</Link>
          <Link href="/shop" className="btn btn-ghost mt-2 w-full">Continue Shopping</Link>
        </aside>
      </div>
    </div>
  );
}
