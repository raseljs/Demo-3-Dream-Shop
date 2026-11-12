'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import Icon from '@/components/Icon';
import { imgUrl, taka } from '@/lib/format';
import { useCart } from './CartProvider';

export function QtyStepper({ value, onChange, max = 9999, size = 'md' }) {
  const h = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
      <button type="button" className={`${h} grid place-items-center hover:bg-slate-50 disabled:opacity-40`} onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Decrease">
        <Icon name="minus" className="h-4 w-4" />
      </button>
      <span className={`min-w-8 text-center text-sm font-semibold ${size === 'sm' ? '' : 'min-w-10'}`}>{value}</span>
      <button type="button" className={`${h} grid place-items-center hover:bg-slate-50 disabled:opacity-40`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase">
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CartDrawer() {
  const { items, open, setOpen, update, remove, subtotal, count } = useCart();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="absolute inset-0 bg-black/50 animate-fade" onClick={() => setOpen(false)} />
      <aside className="animate-slide-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold">Shopping Cart <span className="text-sm font-normal text-slate-500">({count})</span></h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-slate-100" aria-label="Close cart">
            <Icon name="x" />
          </button>
        </div>
        {items.length ? (
          <>
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
              {items.map((it) => (
                <li key={it.key} className="flex gap-3 py-4">
                  <Link href={`/product/${it.slug}`} onClick={() => setOpen(false)} className="shrink-0">
                    <Image src={imgUrl(it.image)} alt="" width={72} height={72} className="h-18 w-18 rounded-xl border border-slate-100 bg-slate-50 object-contain" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${it.slug}`} onClick={() => setOpen(false)} className="line-clamp-2 text-sm font-medium hover:text-primary">{it.name}</Link>
                    {it.variant_name ? <p className="text-xs text-slate-500">{it.variant_name}</p> : null}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <QtyStepper size="sm" value={it.qty} max={it.stock > 0 ? it.stock : 9999} onChange={(q) => update(it.key, q)} />
                      <span className="text-sm font-semibold">{taka(it.price * it.qty)}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => remove(it.key)} className="self-start p-1 text-slate-400 hover:text-rose-600" aria-label="Remove">
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-200 p-5">
              <div className="mb-4 flex items-center justify-between text-base">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-bold">{taka(subtotal)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/cart" onClick={() => setOpen(false)} className="btn btn-outline">View Cart</Link>
                <Link href="/checkout" onClick={() => setOpen(false)} className="btn btn-primary">Checkout</Link>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400"><Icon name="cart" className="h-8 w-8" /></span>
            <p className="font-semibold">Your cart is currently empty.</p>
            <p className="text-sm text-slate-500">Looks like you haven&apos;t added any items to your cart yet.</p>
            <Link href="/shop" onClick={() => setOpen(false)} className="btn btn-primary mt-2">Start Shopping</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
