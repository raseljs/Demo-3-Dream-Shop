'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { api, getToken, logout, saveAuth } from '@/lib/client';
import { fmtDate, imgUrl, PAYMENT_STATUS, STATUS, taka } from '@/lib/format';

function OrderDetail({ orderNo, onClose }) {
  const [o, setO] = useState(null);
  useEffect(() => { api(`/my/orders/${encodeURIComponent(orderNo)}`).then(setO).catch(() => onClose()); }, [orderNo]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Order #{orderNo}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        {!o ? <p className="py-8 text-center text-slate-400">Loading…</p> : (
          <>
            <p className="text-sm text-slate-500">{fmtDate(o.created_at, true)} · <span className={`badge ${STATUS[o.delivery_status]?.cls}`}>{STATUS[o.delivery_status]?.label}</span></p>
            <ul className="mt-3 divide-y divide-slate-100">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2.5">
                  <Image src={imgUrl(i.image)} alt="" width={48} height={48} className="h-12 w-12 rounded-lg bg-slate-50 object-contain" />
                  <div className="min-w-0 flex-1 text-sm"><p className="line-clamp-1">{i.name}</p><p className="text-xs text-slate-500">{i.variant_name ? `${i.variant_name} · ` : ''}{i.qty} × {taka(i.price)}</p></div>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between"><span>Shipping</span><span>{taka(o.shipping)}</span></div>
              {Number(o.discount) > 0 ? <div className="flex justify-between"><span>Discount</span><span>-{taka(o.discount)}</span></div> : null}
              <div className="flex justify-between font-bold"><span>Total</span><span>{taka(o.total)}</span></div>
            </div>
            <p className="mt-3 text-sm text-slate-600">{o.address}</p>
            {o.courier_tracking ? <p className="mt-2 text-sm">Courier: <b className="capitalize">{o.courier}</b> — {o.courier_tracking}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('orders');
  const [open, setOpen] = useState(null);
  const [profile, setProfile] = useState({ name: '', email: '', address: '', current_password: '', password: '' });
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!getToken()) { router.replace('/login?next=/dashboard'); return; }
    api('/auth/me').then((u) => {
      setUser(u);
      setProfile((p) => ({ ...p, name: u.name, email: u.email || '', address: u.address || '' }));
    }).catch(() => router.replace('/login?next=/dashboard'));
    api('/my/orders').then(setData).catch(() => setData({ orders: [], stats: {} }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const u = await api('/auth/profile', { method: 'PUT', body: profile });
      saveAuth(getToken(), u);
      setUser(u);
      setProfile((p) => ({ ...p, current_password: '', password: '' }));
      setMsg({ ok: true, text: 'Profile updated' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  if (!user) return <div className="container-x py-20 text-center text-slate-400">Loading…</div>;
  const stats = data?.stats || {};

  return (
    <div className="container-x py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.name} 👋</h1>
          <p className="text-sm text-slate-500">{user.phone}</p>
        </div>
        <div className="flex gap-2">
          {user.is_staff ? <Link href="/admin" className="btn btn-brand"><Icon name="settings" className="h-4 w-4" /> Admin Panel</Link> : null}
          <button type="button" onClick={() => { logout(); router.replace('/'); }} className="btn btn-outline"><Icon name="logout" className="h-4 w-4" /> Logout</button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[['Total Orders', stats.total, 'package'], ['Pending Orders', stats.pending, 'clock'], ['Delivered Orders', stats.delivered, 'check-circle']].map(([label, value, icon]) => (
          <div key={label} className="card flex items-center gap-3 p-4">
            <span className="hidden h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary sm:grid"><Icon name={icon} /></span>
            <div><p className="text-2xl font-bold">{value ?? 0}</p><p className="text-xs text-slate-500">{label}</p></div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-2 border-b border-slate-200">
        {[['orders', 'Recent Orders'], ['profile', 'Profile']].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === k ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}>{l}</button>
        ))}
      </div>

      {tab === 'orders' ? (
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Order #</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.orders || []).map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium">#{o.order_no}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS[o.delivery_status]?.cls}`}>{STATUS[o.delivery_status]?.label}</span></td>
                  <td className="px-4 py-3"><span className={`badge ${PAYMENT_STATUS[o.payment_status]?.cls}`}>{PAYMENT_STATUS[o.payment_status]?.label}</span></td>
                  <td className="px-4 py-3 text-right font-semibold">{taka(o.total)}</td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => setOpen(o.order_no)} className="btn btn-sm btn-outline">View</button></td>
                </tr>
              ))}
              {data && !data.orders.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No orders yet. <Link href="/shop" className="text-primary">Start shopping</Link></td></tr> : null}
            </tbody>
          </table>
        </div>
      ) : (
        <form onSubmit={saveProfile} className="card mt-4 grid max-w-2xl gap-4 p-5 sm:grid-cols-2">
          <div><label className="label">Name</label><input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
          <div><label className="label">Email</label><input type="email" className="input" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Default delivery address</label><textarea className="input" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></div>
          <div><label className="label">Current password</label><input type="password" className="input" value={profile.current_password} onChange={(e) => setProfile({ ...profile, current_password: e.target.value })} placeholder="Only to change password" /></div>
          <div><label className="label">New password</label><input type="password" className="input" value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} /></div>
          {msg ? <p className={`sm:col-span-2 text-sm ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p> : null}
          <div className="sm:col-span-2"><button className="btn btn-primary">Save Changes</button></div>
        </form>
      )}
      {open ? <OrderDetail orderNo={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
