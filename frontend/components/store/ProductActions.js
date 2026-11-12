'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { discountPct, imgUrl, taka, telLink, waLink } from '@/lib/format';
import { useCart } from './CartProvider';
import { QtyStepper } from './CartDrawer';
import { flyToCart } from '@/lib/flyToCart';
import { productData, track } from '@/lib/pixel';
import { FlashSaleStrip } from './FlashCountdown';

/** Attribute list from the product, falling back to whatever the variants contain */
function useAttributes(product) {
  return useMemo(() => {
    const variants = product.variants || [];
    const names = [];
    for (const a of product.attributes || []) if (a?.name && !names.includes(a.name)) names.push(a.name);
    for (const v of variants) for (const k of Object.keys(v.attrs || {})) if (!names.includes(k)) names.push(k);
    return names.map((name) => {
      const declared = (product.attributes || []).find((a) => a.name === name)?.values || [];
      const used = [...new Set(variants.map((v) => v.attrs?.[name]).filter(Boolean))];
      return { name, values: declared.length ? declared.filter((x) => used.includes(x)) : used };
    }).filter((a) => a.values.length);
  }, [product]);
}

export default function ProductActions({ product: p, contact }) {
  const router = useRouter();
  const { add } = useCart();
  const variants = p.variants || [];
  const isVariable = p.type === 'variable' && variants.length > 0;
  const attrs = useAttributes(p);
  const [sel, setSel] = useState(() => {
    if (!isVariable) return {};
    const first = variants.find((v) => v.qty > 0) || variants[0];
    return { ...(first.attrs || {}) };
  });
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [sizeOpen, setSizeOpen] = useState(false);

  const variant = isVariable ? variants.find((v) => attrs.every((a) => v.attrs?.[a.name] === sel[a.name])) || null : null;
  const src = variant || p;
  const price = Number(src.sale_price) > 0 ? Number(src.sale_price) : Number(src.regular_price);
  const off = discountPct(src.regular_price, src.sale_price);
  const stock = isVariable ? (variant ? Number(variant.qty) : 0) : Number(p.qty);
  const inStock = stock > 0;

  useEffect(() => {
    track('ViewContent', { ...productData([{ product_id: p.id, price, qty: 1 }]), content_name: p.name });
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const available = (name, value) => variants.some((v) => v.attrs?.[name] === value && v.qty > 0
    && attrs.every((a) => a.name === name || !sel[a.name] || v.attrs?.[a.name] === sel[a.name]));

  const choose = (name, value) => {
    const next = { ...sel, [name]: value };
    // keep a valid combination: if none matches, pick the first variant with this value
    if (!variants.some((v) => attrs.every((a) => v.attrs?.[a.name] === next[a.name]))) {
      const fallback = variants.find((v) => v.attrs?.[name] === value && v.qty > 0) || variants.find((v) => v.attrs?.[name] === value);
      if (fallback) Object.assign(next, fallback.attrs);
    }
    setSel(next);
    setError('');
    setQty(1);
    const v = variants.find((x) => attrs.every((a) => x.attrs?.[a.name] === next[a.name]));
    if (v?.image) window.dispatchEvent(new CustomEvent('variant-image', { detail: v.image }));
  };

  const ready = () => {
    if (isVariable && !variant) { setError('Please choose an option'); return false; }
    if (!inStock) { setError('Sorry, this item is out of stock'); return false; }
    return true;
  };

  const addToCart = () => {
    if (!ready()) return;
    const item = {
      product_id: p.id, variant_id: variant?.id || null, name: p.name, variant_name: variant?.name || null, slug: p.slug,
      image: variant?.image || p.thumbnail, price, regular_price: Number(src.regular_price), stock,
    };
    const count = qty;
    const photo = [...document.querySelectorAll('[data-product-gallery] img')].find((el) => el.getBoundingClientRect().width > 0);
    flyToCart(photo, { onLand: () => add(item, count, { open: false }) });
  };
  const orderNow = () => {
    if (!ready()) return;
    router.push(`/checkout?buy=${p.id}${variant ? `&variant=${variant.id}` : ''}&qty=${qty}`);
  };

  const waText = `I want to order: ${p.name}${variant ? ` (${variant.name})` : ''} — Qty: ${qty}`;
  const openWhatsApp = (e) => {
    e.preventDefault();
    window.open(waLink(contact.whatsapp, `${waText}\n${window.location.href}`), '_blank', 'noopener');
  };

  return (
    <div className="mt-4">
      {p.flash ? <div className="mb-3"><FlashSaleStrip title={p.flash.title} endsAt={p.flash.ends_at} /></div> : null}
      <div className="flex flex-wrap items-end gap-3">
        <span className="text-3xl font-bold text-primary">{taka(price)}</span>
        {off > 0 ? (
          <>
            <span className="pb-1 text-lg text-slate-400 line-through">{taka(src.regular_price)}</span>
            <span className="mb-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">Save {off}%</span>
          </>
        ) : null}
      </div>
      <p className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium ${inStock ? 'text-emerald-600' : 'text-rose-600'}`}>
        <span className={`h-2 w-2 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        {inStock ? (stock <= 5 ? `Only ${stock} left in stock` : 'In Stock') : 'Out of Stock'}
      </p>

      {attrs.map((a) => (
        <div key={a.name} className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">{a.name}: <span className="font-semibold text-slate-900">{sel[a.name] || '—'}</span></p>
          <div className="flex flex-wrap gap-2">
            {a.values.map((val) => {
              const active = sel[a.name] === val;
              const ok = available(a.name, val);
              return (
                <button key={val} type="button" onClick={() => choose(a.name, val)}
                  className={`min-w-11 rounded-lg border px-3 py-2 text-sm font-medium transition ${active ? 'border-primary bg-primary text-white' : ok ? 'border-slate-300 hover:border-primary' : 'border-slate-200 text-slate-400 line-through'}`}>
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {p.size_chart ? (
        <button type="button" onClick={() => setSizeOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <Icon name="ruler" className="h-4 w-4" /> Size Guide
        </button>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Quantity:</span>
        <QtyStepper value={qty} onChange={setQty} max={stock > 0 ? stock : 1} />
      </div>
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={orderNow} disabled={!inStock} className="btn btn-primary h-12 text-base">
          <Icon name="package" className="h-5 w-5" /> <span className="font-bn">অর্ডার করুন</span>
        </button>
        <button type="button" onClick={addToCart} disabled={!inStock} className="btn btn-outline h-12 text-base">
          <Icon name="cart" className="h-5 w-5" /> Add To Cart
        </button>
        {contact.phone ? (
          <a href={telLink(contact.phone)} className="btn btn-brand"><Icon name="phone" className="h-4 w-4" /> Call For Order</a>
        ) : null}
        {contact.whatsapp ? (
          <a href={waLink(contact.whatsapp, waText)} onClick={openWhatsApp} target="_blank" rel="noopener noreferrer" className="btn btn-wa"><Icon name="whatsapp" className="h-4 w-4" /> Order On WhatsApp</a>
        ) : null}
      </div>

      {/* Sticky bar on phones */}
      <div className="no-print fixed inset-x-0 bottom-[57px] z-30 flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-slate-500">{p.name}</p>
          <p className="font-bold text-primary">{taka(price)}</p>
        </div>
        <button type="button" onClick={addToCart} disabled={!inStock} className="btn btn-outline btn-sm h-10" aria-label="Add to cart"><Icon name="cart" className="h-4 w-4" /></button>
        <button type="button" onClick={orderNow} disabled={!inStock} className="btn btn-primary btn-sm font-bn h-10 px-4 text-sm">অর্ডার করুন</button>
      </div>

      {sizeOpen && p.size_chart ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSizeOpen(false)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{p.size_chart.name || 'Size Guide'}</h3>
              <button type="button" onClick={() => setSizeOpen(false)} aria-label="Close"><Icon name="x" /></button>
            </div>
            {p.size_chart.image ? (
              <Image src={imgUrl(p.size_chart.image)} alt="Size chart" width={900} height={700} className="h-auto w-full rounded-xl" />
            ) : <p className="text-sm text-slate-500">No size chart image.</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
