'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { getUser } from '@/lib/client';
import { taka } from '@/lib/format';
import { useCart } from './CartProvider';

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const load = () => setUser(getUser());
    load();
    window.addEventListener('auth-change', load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('auth-change', load);
      window.removeEventListener('storage', load);
    };
  }, []);
  return user;
}

export function AccountLink() {
  const user = useCurrentUser();
  const href = user ? (user.is_staff ? '/admin' : '/dashboard') : '/login';
  return (
    <Link href={href} className="group hidden items-center gap-2 md:flex">
      <span className="grid h-9 w-9 place-items-center rounded-full border border-primary transition group-hover:bg-primary">
        <Icon name="user" className="h-4 w-4" />
      </span>
      <span className="hidden leading-tight xl:block">
        <span className="block text-sm font-semibold">{user ? user.name.split(' ')[0] : 'Login'}</span>
        <span className="block text-xs opacity-80">{user ? (user.is_staff ? 'Admin panel' : 'My account') : 'Enter your account'}</span>
      </span>
    </Link>
  );
}

export function HeaderCart() {
  const { count, subtotal, setOpen, popKey } = useCart();
  return (
    <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2" aria-label="Open cart">
      <span data-cart-target="header" className="relative grid h-9 w-9 place-items-center rounded-full border border-primary">
        <Icon name="cart" className="h-4 w-4" />
        <span key={popKey} className={`${popKey ? 'cart-badge-pop ' : ''}absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold`}>
          {count}
        </span>
      </span>
      <span className="hidden text-left leading-tight lg:block">
        <span className="block text-xs opacity-80">My Cart</span>
        <span className="block text-sm font-semibold">{taka(subtotal)}</span>
      </span>
    </button>
  );
}
