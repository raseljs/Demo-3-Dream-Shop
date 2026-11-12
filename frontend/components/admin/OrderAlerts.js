'use client';
// New-order alerts for the admin panel: checks every 15 seconds, then chimes,
// shows a pop-up card and (if allowed) a desktop notification.
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { api } from '@/lib/client';
import { taka } from '@/lib/format';

const POLL_MS = 15000;
const SOUND_KEY = 'admin_order_sound';

let audioCtx = null;
function unlockAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch { return null; }
}

function chime() {
  const ctx = unlockAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  [[880, 0], [1175, 0.16], [1568, 0.32]].forEach(([freq, delay]) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t + delay);
    g.gain.exponentialRampToValueAtTime(0.25, t + delay + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.45);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t + delay);
    o.stop(t + delay + 0.5);
  });
}

const canNotify = () => typeof window !== 'undefined' && 'Notification' in window;

export default function OrderAlerts() {
  const [sound, setSound] = useState(true);
  const [recent, setRecent] = useState([]); // new orders since the panel was opened
  const [unseen, setUnseen] = useState(0);
  const [pops, setPops] = useState([]);
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState('default');
  const last = useRef(null);
  const soundRef = useRef(true);
  const baseTitle = useRef('');

  useEffect(() => {
    try { const v = localStorage.getItem(SOUND_KEY); if (v !== null) { setSound(v === '1'); soundRef.current = v === '1'; } } catch { /* storage blocked */ }
    if (canNotify()) setPerm(Notification.permission);
    baseTitle.current = document.title.replace(/^\(\d+\)\s*/, '');
    // browsers only allow sound after the user has clicked somewhere once
    const unlock = () => { unlockAudio(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    const t = baseTitle.current || document.title.replace(/^\(\d+\)\s*/, '');
    document.title = unseen ? `(${unseen}) ${t}` : t;
  }, [unseen]);

  const check = useCallback(async () => {
    try {
      const r = await api(`/admin/notifications/orders${last.current === null ? '' : `?after_id=${last.current}`}`);
      if (last.current !== null && r.orders.length) {
        setRecent((x) => [...r.orders.slice().reverse(), ...x].slice(0, 20));
        setUnseen((n) => n + r.orders.length);
        setPops((p) => [...p, ...r.orders].slice(-3));
        if (soundRef.current) chime();
        if (canNotify() && Notification.permission === 'granted') {
          for (const o of r.orders.slice(-3)) {
            try {
              const n = new Notification(`New order #${o.order_no}`, { body: `${o.name || 'Customer'} · ${taka(o.total)}`, tag: `order-${o.id}` });
              n.onclick = () => { window.focus(); window.location.href = `/admin/orders/${o.id}`; };
            } catch { /* some browsers need a service worker */ }
          }
        }
      }
      last.current = Math.max(Number(r.latest_id) || 0, last.current || 0);
    } catch { /* offline or no permission — try again next time */ }
  }, []);

  useEffect(() => {
    check();
    const t = setInterval(check, POLL_MS);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [check]);

  // pop-up cards disappear on their own
  useEffect(() => {
    if (!pops.length) return;
    const t = setTimeout(() => setPops((p) => p.slice(1)), 12000);
    return () => clearTimeout(t);
  }, [pops]);

  const toggleSound = () => {
    const v = !sound;
    setSound(v);
    soundRef.current = v;
    try { localStorage.setItem(SOUND_KEY, v ? '1' : '0'); } catch { /* ignore */ }
    if (v) chime();
  };
  const askPermission = async () => {
    if (!canNotify()) return;
    try { setPerm(await Notification.requestPermission()); } catch { /* ignore */ }
  };

  return (
    <>
      <div className="relative">
        <button type="button" onClick={() => { setOpen((o) => !o); setUnseen(0); }} className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100" aria-label={`New orders${unseen ? ` (${unseen})` : ''}`}>
          <Icon name="bell" className="h-5 w-5" />
          {unseen ? <span key={unseen} className="cart-badge-pop absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unseen}</span> : null}
        </button>
        {open ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="font-semibold">New orders</p>
                <button type="button" onClick={toggleSound} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                  <Icon name={sound ? 'volume' : 'volume-off'} className="h-4 w-4" /> Sound {sound ? 'on' : 'off'}
                </button>
              </div>
              <ul className="max-h-80 divide-y divide-slate-100 overflow-auto">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} onClick={() => setOpen(false)} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                      <span className="min-w-0"><b className="text-primary">#{o.order_no}</b> <span className="truncate text-slate-600">{o.name}</span></span>
                      <span className="shrink-0 font-semibold">{taka(o.total)}</span>
                    </Link>
                  </li>
                ))}
                {!recent.length ? <li className="px-4 py-6 text-center text-sm text-slate-500">New orders will appear here while this panel is open.</li> : null}
              </ul>
              {canNotify() && perm !== 'granted' ? (
                <div className="border-t border-slate-100 px-4 py-3 text-xs">
                  {perm === 'denied'
                    ? <p className="text-slate-500">Desktop pop-ups are blocked for this site in your browser settings.</p>
                    : <button type="button" className="font-medium text-primary" onClick={askPermission}>Show desktop pop-ups for new orders</button>}
                </div>
              ) : null}
              <Link href="/admin/orders?delivery_status=pending" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-slate-50">All pending orders</Link>
            </div>
          </>
        ) : null}
      </div>

      <div className="no-print pointer-events-none fixed right-4 top-16 z-[75] w-80 space-y-2">
        {pops.map((o) => (
          <div key={o.id} className="pointer-events-auto animate-fade overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl">
            <div className="flex items-start gap-3 p-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Icon name="cart" className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">New order #{o.order_no}</p>
                <p className="truncate text-xs text-slate-600">{o.name || 'Customer'} · {o.phone}</p>
                <p className="text-sm font-semibold text-emerald-700">{taka(o.total)}</p>
              </div>
              <button type="button" onClick={() => setPops((p) => p.filter((x) => x.id !== o.id))} className="rounded p-0.5 text-slate-400 hover:bg-slate-100" aria-label="Dismiss"><Icon name="x" className="h-4 w-4" /></button>
            </div>
            <Link href={`/admin/orders/${o.id}`} onClick={() => setPops((p) => p.filter((x) => x.id !== o.id))} className="block bg-emerald-600 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-700">Open order</Link>
          </div>
        ))}
      </div>
    </>
  );
}
