'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { taka } from '@/lib/format';
import { useCart } from './CartProvider';
import { useCurrentUser } from './HeaderClient';

export default function MobileNav({ menu }) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const { count, subtotal, setOpen: openCart, popKey } = useCart();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => setOpen(false), [pathname]);

  const tab = (href, icon, label, active) => (
    <Link href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active ? 'text-primary' : 'text-slate-600'}`}>
      <Icon name={icon} className="h-5 w-5" />
      {label}
    </Link>
  );

  return (
    <>
      {/* Floating cart summary (like the original site) */}
      {pathname !== '/checkout' && pathname !== '/cart' ? (
        <button
          type="button"
          onClick={() => openCart(true)}
          className="no-print fixed right-0 top-1/2 z-30 -translate-y-1/2 overflow-hidden rounded-l-xl text-center text-white shadow-lg"
          aria-label="Open cart"
        >
          <span data-cart-target="float" className="block bg-slate-900 px-2.5 py-2">
            <Icon name="cart" className="mx-auto h-5 w-5" />
            <span key={popKey} className={`${popKey ? 'cart-badge-pop ' : ''}mt-1 block text-[10px] font-semibold`}>{count} ITEMS</span>
          </span>
          <span className="block bg-primary px-2 py-1.5 text-xs font-bold">{taka(subtotal)}</span>
        </button>
      ) : null}

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
        {tab('/', 'home', 'Home', pathname === '/')}
        {tab('/shop', 'cart', 'Shop', pathname.startsWith('/shop'))}
        <button type="button" onClick={() => setOpen(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-slate-600">
          <Icon name="menu" className="h-5 w-5" />
          Menu
        </button>
        {tab(user ? (user.is_staff ? '/admin' : '/dashboard') : '/login', 'user', 'Account', pathname.startsWith('/dashboard') || pathname === '/login')}
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 animate-fade" onClick={() => setOpen(false)} />
          <aside className="animate-slide-left absolute inset-y-0 left-0 flex w-[82%] max-w-sm flex-col bg-white">
            <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
              <span className="font-semibold">Categories</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="x" /></button>
            </div>
            <ul className="flex-1 overflow-y-auto py-2 text-sm">
              <li><Link href="/shop" className="block px-4 py-3 font-medium">All Products</Link></li>
              {menu.map((item, i) => (
                <li key={i} className="border-t border-slate-100">
                  <div className="flex items-center">
                    <Link href={item.url || '#'} className="flex-1 px-4 py-3 font-medium">{item.label}</Link>
                    {item.children?.length ? (
                      <button type="button" className="px-4 py-3" onClick={() => setExpanded(expanded === i ? null : i)} aria-label="Expand">
                        <Icon name={expanded === i ? 'minus' : 'plus'} className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  {expanded === i ? (
                    <ul className="bg-slate-50 pb-2">
                      {item.children.map((c, j) => (
                        <li key={j}><Link href={c.url || '#'} className="block px-8 py-2 text-slate-600">{c.label}</Link></li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
              <li className="border-t border-slate-100"><Link href="/track-order" className="block px-4 py-3 font-medium">Track Order</Link></li>
            </ul>
          </aside>
        </div>
      ) : null}
    </>
  );
}
