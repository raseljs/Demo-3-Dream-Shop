'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { productData, track } from '@/lib/pixel';

const CartCtx = createContext(null);
const KEY = 'cart_v1';

export const useCart = () => useContext(CartCtx);

export default function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [popKey, setPopKey] = useState(0); // bumps on every add → cart badges replay their "pop"

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { /* ignore */ }
    setReady(true);
    const sync = (e) => {
      if (e.key === KEY) try { setItems(JSON.parse(e.newValue || '[]')); } catch { /* ignore */ }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  /** item: { product_id, variant_id, name, variant_name, slug, image, price, regular_price, stock } */
  const add = useCallback((item, qty = 1, { open: openDrawer = true } = {}) => {
    const key = `${item.product_id}-${item.variant_id || 0}`;
    setItems((prev) => {
      const max = item.stock > 0 ? item.stock : 9999;
      const found = prev.find((i) => i.key === key);
      if (found) return prev.map((i) => (i.key === key ? { ...i, ...item, key, qty: Math.min(max, i.qty + qty) } : i));
      return [...prev, { ...item, key, qty: Math.min(max, qty) }];
    });
    setPopKey((k) => k + 1);
    track('AddToCart', { ...productData([{ ...item, qty }]), content_name: item.name });
    if (openDrawer) setOpen(true);
  }, []);

  const update = useCallback((key, qty) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(i.stock > 0 ? i.stock : 9999, qty)) } : i)));
  }, []);
  const remove = useCallback((key) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({
    items, ready, open, setOpen, add, update, remove, clear, popKey,
    count: items.reduce((s, i) => s + i.qty, 0),
    subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
  }), [items, ready, open, add, update, remove, clear, popKey]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
