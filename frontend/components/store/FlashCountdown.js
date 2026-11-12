'use client';
// Flash sale countdown. Sale times come from the server in Bangladesh time (UTC+6).
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';

const endOf = (s) => new Date(`${String(s).replace(' ', 'T').slice(0, 19)}+06:00`).getTime();
const pad = (n) => String(n).padStart(2, '0');

function parts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Seconds left until endsAt, ticking every second. null before the first tick (avoids a server/browser mismatch). */
function useLeft(endsAt) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const end = endOf(endsAt);
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return left;
}

function Digits({ left, size = 'md' }) {
  const t = left === null ? null : parts(left);
  const box = size === 'sm'
    ? 'min-w-7 rounded-md px-1 py-0.5 text-sm'
    : 'min-w-10 rounded-lg px-1.5 py-1 text-lg md:min-w-12 md:text-2xl';
  const units = [
    ...(t && t.d ? [['d', t.d]] : []),
    ['h', t ? t.h : null], ['m', t ? t.m : null], ['s', t ? t.s : null],
  ];
  return (
    <span className="inline-flex items-center gap-1" role="timer" aria-label={t ? `${t.d ? `${t.d} days ` : ''}${t.h} hours ${t.m} minutes ${t.s} seconds left` : 'Time left'}>
      {units.map(([u, v], i) => (
        <span key={u} className="inline-flex items-center gap-1">
          {i ? <span className="font-bold text-slate-400">:</span> : null}
          <span className={`bg-slate-900 text-center font-bold tabular-nums text-white ${box}`}>{v === null ? '--' : pad(v)}</span>
          {u === 'd' ? <span className="text-xs font-semibold text-slate-500">d</span> : null}
        </span>
      ))}
    </span>
  );
}

/** Home page band: hides itself when the countdown reaches zero. */
export function FlashSaleBand({ title, endsAt, children }) {
  const left = useLeft(endsAt);
  if (left === 0) return null;
  return (
    <section className="container-x py-4">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.07] to-transparent p-3 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm shadow-primary/30 md:h-12 md:w-12">
              <Icon name="zap" className="h-5 w-5 md:h-6 md:w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold text-primary">Flash sale</p>
              <h2 className="text-lg font-bold leading-tight text-slate-900 md:text-2xl">{title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Ends in</span>
            <Digits left={left} />
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

/** Product page strip above the price. */
export function FlashSaleStrip({ title, endsAt }) {
  const left = useLeft(endsAt);
  if (left === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary px-3 py-2 text-white">
      <span className="flex items-center gap-1.5 text-sm font-bold"><Icon name="zap" className="h-4 w-4" /> {title}</span>
      <span className="flex items-center gap-2 text-xs font-medium">Ends in <Digits left={left} size="sm" /></span>
    </div>
  );
}
