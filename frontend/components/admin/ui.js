'use client';
// Admin UI kit
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { api } from '@/lib/client';
import { imgUrl, PAYMENT_STATUS, STATUS, taka } from '@/lib/format';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, actions, children, className = '', bodyClass = 'p-4 md:p-5' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title || actions ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 md:px-5">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          {actions}
        </div>
      ) : null}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Field({ label, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      {label ? <label className="label">{label}{required ? <span className="text-rose-500"> *</span> : null}</label> : null}
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2.5">
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-primary' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-5.5' : 'left-0.5'}`} />
      </span>
      <input type="checkbox" className="sr-only" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      {label ? <span className="text-sm text-slate-700">{label}</span> : null}
    </label>
  );
}

export const StatusBadge = ({ status }) => <span className={`badge ${STATUS[status]?.cls || 'bg-slate-100'}`}>{STATUS[status]?.label || status}</span>;
export const PayBadge = ({ status }) => <span className={`badge ${PAYMENT_STATUS[status]?.cls || 'bg-slate-100'}`}>{PAYMENT_STATUS[status]?.label || status}</span>;

export function Modal({ open, onClose, title, children, footer, size = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 md:items-center" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/50 animate-fade" onClick={onClose} />
      <div className={`relative my-8 w-full ${size} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-slate-100" aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Pager({ page, lastPage, total, onChange }) {
  if (!lastPage || lastPage <= 1) return total !== undefined ? <p className="px-4 py-3 text-xs text-slate-500">{total} record(s)</p> : null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-xs text-slate-500">Page {page} of {lastPage}{total !== undefined ? ` · ${total} records` : ''}</span>
      <div className="flex gap-1">
        <button type="button" className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => onChange(page - 1)}><Icon name="chevron-left" className="h-4 w-4" /></button>
        <button type="button" className="btn btn-sm btn-outline" disabled={page >= lastPage} onClick={() => onChange(page + 1)}><Icon name="chevron-right" className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export const Spinner = ({ className = 'h-5 w-5' }) => (
  <svg className={`animate-spin text-primary ${className}`} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".2" strokeWidth="4" /><path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
);

export function Loading({ text = 'Loading…' }) {
  return <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500"><Spinner /> {text}</div>;
}

export function Thumb({ src, size = 40, className = '' }) {
  return <Image src={imgUrl(src)} alt="" width={size} height={size} className={`shrink-0 rounded-lg border border-slate-100 bg-slate-50 object-contain ${className}`} style={{ width: size, height: size }} />;
}

/** Simple data loader: const { data, loading, error, reload } = useApi('/admin/x?...') */
export function useApi(path, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const load = useCallback(async () => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      setState({ data: await api(path), loading: false, error: null });
    } catch (e) {
      setState({ data: null, loading: false, error: e.message });
    }
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: load };
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = 'w-full sm:w-64' }) {
  const [v, setV] = useState(value || '');
  const t = useRef(null);
  useEffect(() => setV(value || ''), [value]);
  return (
    <div className={`relative ${className}`}>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className="input h-10 pl-9"
        value={v}
        placeholder={placeholder}
        onChange={(e) => {
          setV(e.target.value);
          clearTimeout(t.current);
          const val = e.target.value;
          t.current = setTimeout(() => onChange(val), 350);
        }}
      />
    </div>
  );
}

/** Async product search + pick. onPick(product) */
export function ProductPicker({ onPick, placeholder = 'Search product by name or SKU…', withVariants = false }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (q.trim().length < 1) { setList([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api(`/admin/products?search=${encodeURIComponent(q)}&per_page=15${withVariants ? '&with_variants=1' : ''}`);
        setList(r.data);
        setOpen(true);
      } catch { setList([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, withVariants]);
  return (
    <div className="relative">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className="input h-10 pl-9" value={q} placeholder={placeholder} onChange={(e) => setQ(e.target.value)} onFocus={() => list.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} />
      {open && list.length ? (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50" onMouseDown={() => { onPick(p); setQ(''); setOpen(false); }}>
                <Thumb src={p.thumbnail} size={32} />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="text-xs text-slate-500">{taka(Number(p.sale_price) > 0 ? p.sale_price : p.regular_price)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function Stat({ label, value, icon, tone = 'bg-primary/10 text-primary', href }) {
  const inner = (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon name={icon} /></span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

export const thCls = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500';
export const tdCls = 'px-3 py-2.5 align-middle';
