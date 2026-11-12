'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, Suspense, useCallback, useContext, useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { api, getToken, logout } from '@/lib/client';
import OrderAlerts from './OrderAlerts';
import { Loading } from './ui';

const AdminCtx = createContext(null);
export const useAdmin = () => useContext(AdminCtx);

export const NAV = [
  { label: 'Dashboard', icon: 'chart', href: '/admin', perm: 'dashboard' },
  { label: 'POS', icon: 'pos', href: '/admin/pos', perm: 'pos' },
  { label: 'Brands', icon: 'award', href: '/admin/r/brands', perm: 'catalog' },
  { label: 'Categories', icon: 'layers', href: '/admin/r/categories', perm: 'catalog' },
  { label: 'Products', icon: 'package', perm: 'products', children: [
    { label: 'All Products', href: '/admin/products' },
    { label: 'Add New', href: '/admin/products/new' },
    { label: 'Attributes', href: '/admin/r/attributes', perm: 'catalog' },
    { label: 'Size Charts', href: '/admin/r/size-charts', perm: 'catalog' },
    { label: 'Print Labels', href: '/admin/labels' },
    { label: 'Import / Bulk Price', href: '/admin/products/tools' },
  ] },
  { label: 'Inventory', icon: 'boxes', perm: 'inventory', children: [
    { label: 'Purchases (Stock In)', href: '/admin/purchases' },
    { label: 'New Purchase', href: '/admin/purchases/new' },
    { label: 'Suppliers & Dues', href: '/admin/suppliers' },
    { label: 'Stock History', href: '/admin/stock' },
  ] },
  { label: 'Online Orders', icon: 'cart', perm: 'orders', children: [
    { label: 'All orders', href: '/admin/orders' },
    { label: 'Pending orders', href: '/admin/orders?delivery_status=pending' },
    { label: 'Confirmed orders', href: '/admin/orders?delivery_status=confirmed' },
    { label: 'On the way orders', href: '/admin/orders?delivery_status=on_the_way' },
    { label: 'Delivered orders', href: '/admin/orders?delivery_status=delivered' },
    { label: 'Cancelled orders', href: '/admin/orders?delivery_status=cancel' },
    { label: 'Incomplete orders', href: '/admin/incomplete' },
    { label: 'COD Settlement', href: '/admin/settlements' },
  ] },
  { label: 'Customers', icon: 'user', href: '/admin/customers', perm: 'orders' },
  { label: 'Return Lists', icon: 'undo', href: '/admin/returns', perm: 'returns' },
  { label: 'Expenses', icon: 'dollar', perm: 'expenses', children: [
    { label: 'Expense Lists', href: '/admin/r/expenses' },
    { label: 'Category', href: '/admin/r/expense-categories' },
  ] },
  { label: 'Reports', icon: 'file', perm: 'reports', children: [
    { label: 'Profit & Loss report', href: '/admin/reports/profit-loss' },
    { label: 'Sales report', href: '/admin/reports/sale' },
    { label: 'City Wise report', href: '/admin/reports/city' },
    { label: 'Products report', href: '/admin/reports/product' },
  ] },
  { label: 'Landing', icon: 'megaphone', perm: 'marketing', children: [
    { label: 'Create', href: '/admin/campaigns/new' },
    { label: 'Campaigns', href: '/admin/campaigns' },
  ] },
  { label: 'Coupons', icon: 'ticket', href: '/admin/r/coupons', perm: 'marketing' },
  { label: 'Flash Sales', icon: 'zap', href: '/admin/flash-sales', perm: 'marketing' },
  { label: 'Bulk SMS', icon: 'message', href: '/admin/sms', perm: 'marketing' },
  { label: 'Users', icon: 'users', perm: 'users', children: [
    { label: 'All Users', href: '/admin/users' },
    { label: 'Blocklists', href: '/admin/r/blocklists' },
    { label: 'Roles', href: '/admin/roles' },
  ] },
  { label: 'Product Reviews', icon: 'star', href: '/admin/r/reviews', perm: 'reviews' },
  { label: 'Menus', icon: 'list', href: '/admin/menus', perm: 'appearance' },
  { label: 'Sliders', icon: 'image', href: '/admin/r/sliders', perm: 'appearance' },
  { label: 'Pages', icon: 'file', href: '/admin/r/pages', perm: 'appearance' },
  { label: 'Settings', icon: 'settings', perm: 'settings', children: [
    { label: 'General Settings', href: '/admin/settings/general' },
    { label: 'Shipping Settings', href: '/admin/settings/shipping' },
    { label: 'Courier Settings', href: '/admin/settings/courier' },
    { label: 'Payment Settings', href: '/admin/settings/payment' },
    { label: 'SMS Settings', href: '/admin/settings/sms' },
    { label: 'Order Alerts', href: '/admin/settings/notifications' },
    { label: 'Facebook Pixel & CAPI', href: '/admin/settings/marketing' },
  ] },
  { label: 'System', icon: 'database', perm: 'settings', children: [
    { label: 'Activity Log', href: '/admin/activity' },
    { label: 'Backups', href: '/admin/backups' },
  ] },
];

function SideNav({ can, onNavigate }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const full = pathname + (search.toString() ? `?${search}` : '');
  const isActive = (href) => (href === '/admin' ? pathname === '/admin' : href.includes('?') ? full === href : pathname === href || (pathname.startsWith(href + '/') && href !== '/admin/products' && href !== '/admin/purchases'));
  const [open, setOpen] = useState(() => NAV.filter((n) => n.children?.some((c) => isActive(c.href) || pathname.startsWith(c.href.split('?')[0]))).map((n) => n.label));
  const toggle = (l) => setOpen((o) => (o.includes(l) ? o.filter((x) => x !== l) : [...o, l]));
  const link = (active) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`;

  return (
    <nav className="space-y-0.5 px-3 pb-6">
      {NAV.filter((n) => can(n.perm)).map((n) => (n.children ? (
        <div key={n.label}>
          <button type="button" onClick={() => toggle(n.label)} className={`${link(false)} w-full`}>
            <Icon name={n.icon} className="h-4.5 w-4.5" />
            <span className="flex-1 text-left">{n.label}</span>
            <Icon name={open.includes(n.label) ? 'chevron-up' : 'chevron-down'} className="h-4 w-4 opacity-60" />
          </button>
          {open.includes(n.label) ? (
            <div className="my-1 ml-5 space-y-0.5 border-l border-white/10 pl-3">
              {n.children.filter((c) => can(c.perm || n.perm)).map((c) => (
                <Link key={c.href} href={c.href} onClick={onNavigate} className={`block rounded-md px-3 py-1.5 text-[13px] transition ${isActive(c.href) ? 'bg-white/10 font-medium text-white' : 'text-slate-400 hover:text-white'}`}>{c.label}</Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <Link key={n.href} href={n.href} onClick={onNavigate} className={link(isActive(n.href))}>
          <Icon name={n.icon} className="h-4.5 w-4.5" /> {n.label}
        </Link>
      )))}
    </nav>
  );
}

export function Guard({ perm, children }) {
  const { can } = useAdmin();
  if (!can(perm)) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Icon name="lock" className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 font-semibold">You don&apos;t have permission for this section.</p>
        <p className="mt-1 text-sm text-slate-500">Ask an admin to update your role.</p>
      </div>
    );
  }
  return children;
}

export default function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [meta, setMeta] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!getToken()) { router.replace(`/login?next=${encodeURIComponent(pathname)}`); return; }
    api('/auth/me')
      .then((u) => (u.is_staff ? setUser(u) : router.replace('/dashboard')))
      .catch(() => router.replace(`/login?next=${encodeURIComponent(pathname)}`));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMeta = useCallback(async () => {
    const m = await api('/admin/meta');
    setMeta(m);
    return m;
  }, []);
  useEffect(() => { if (user) loadMeta().catch(() => {}); }, [user, loadMeta]);

  const can = useCallback((perm) => !perm || !!user?.permissions?.some((p) => p === '*' || p === perm), [user]);
  const toast = useCallback((text, type = 'success') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  if (!user) return <div className="min-h-screen bg-slate-100"><Loading text="Checking access…" /></div>;

  return (
    <AdminCtx.Provider value={{ user, can, meta, loadMeta, toast }}>
      <div className="min-h-screen bg-slate-100 lg:flex">
        <aside className={`no-print fixed inset-y-0 left-0 z-50 w-64 shrink-0 overflow-y-auto bg-slate-900 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-5 py-4">
            <Link href="/admin" className="text-lg font-bold text-white">Admin Panel</Link>
            <button type="button" className="text-slate-400 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu"><Icon name="x" /></button>
          </div>
          <Suspense fallback={null}><SideNav can={can} onNavigate={() => setMenuOpen(false)} /></Suspense>
        </aside>
        {menuOpen ? <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} /> : null}

        <div className="min-w-0 flex-1">
          <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 md:px-6">
            <button type="button" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
            <Link href="/" target="_blank" className="btn btn-sm btn-ghost"><Icon name="store" className="h-4 w-4" /> Web</Link>
            {can('pos') ? <Link href="/admin/pos" className="btn btn-sm btn-ghost"><Icon name="pos" className="h-4 w-4" /> POS</Link> : null}
            <div className="ml-auto flex items-center gap-3">
              {can('orders') || can('dashboard') ? <OrderAlerts /> : null}
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-slate-500">{user.role}</p>
              </div>
              <button type="button" onClick={() => { logout(); router.replace('/login'); }} className="btn btn-sm btn-outline"><Icon name="logout" className="h-4 w-4" /> Logout</button>
            </div>
          </header>
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
      <div className="no-print fixed bottom-4 right-4 z-[70] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`animate-fade rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${t.type === 'error' ? 'bg-rose-600' : 'bg-slate-900'}`}>{t.text}</div>
        ))}
      </div>
    </AdminCtx.Provider>
  );
}
