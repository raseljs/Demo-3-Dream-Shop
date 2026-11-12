// Small server-rendered building blocks
import Link from 'next/link';
import Icon from '@/components/Icon';

export function Breadcrumb({ items }) {
  const list = items.filter(Boolean);
  return (
    <nav aria-label="Breadcrumb" className="overflow-x-auto text-sm text-slate-500 no-scrollbar">
      <ol className="flex items-center gap-1.5 whitespace-nowrap">
        {list.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 ? <Icon name="chevron-right" className="h-3.5 w-3.5 text-slate-300" /> : null}
            {it.href && i < list.length - 1 ? (
              <Link prefetch={false} href={it.href} className="hover:text-primary">{it.name}</Link>
            ) : (
              <span className="max-w-[60vw] truncate font-medium text-slate-700">{it.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SectionTitle({ eyebrow, title, subtitle, href, linkLabel = 'View All', reveal = false }) {
  return (
    <div data-reveal={reveal ? '' : undefined} className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p> : null}
        <h2 className="text-lg font-bold text-slate-900 md:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-1 line-clamp-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link prefetch={false} href={href} className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary md:text-sm">
          {linkLabel} <Icon name="arrow-right" className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

export function Stars({ rating = 0, className = 'h-4 w-4' }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name={i <= Math.round(rating) ? 'star-fill' : 'star'} className={`${className} ${i <= Math.round(rating) ? '' : 'text-slate-300'}`} />
      ))}
    </span>
  );
}

const TRUST = [
  ['shield', 'Safe Payments'],
  ['truck', 'Nationwide Delivery'],
  ['refresh', 'Easy Return Policy'],
  ['tag', 'Best Price Guaranteed'],
  ['award', '100% Authentic'],
  ['wrench', 'After-Sales Service'],
];

export function TrustBar() {
  return (
    <div className="container-x my-6 md:my-8">
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {TRUST.map(([icon, label]) => (
          <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-center sm:flex-row sm:gap-2.5 sm:px-3 sm:py-3 sm:text-left">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary sm:h-9 sm:w-9">
              <Icon name={icon} className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </span>
            <span className="text-[10px] font-semibold uppercase leading-tight text-slate-700 sm:text-[11px] md:text-xs">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Pagination({ page, lastPage, hrefFor }) {
  if (lastPage <= 1) return null;
  const pages = [];
  for (let i = 1; i <= lastPage; i++) {
    if (i === 1 || i === lastPage || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  const cls = 'grid h-10 min-w-10 place-items-center rounded-lg border px-3 text-sm font-medium transition';
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 ? <Link prefetch={false} href={hrefFor(page - 1)} className={`${cls} border-slate-200 hover:border-primary hover:text-primary`}>Previous</Link> : null}
      {pages.map((p, i) => (p === '…' ? (
        <span key={`e${i}`} className="px-1 text-slate-400">…</span>
      ) : (
        <Link prefetch={false} key={p} href={hrefFor(p)} aria-current={p === page ? 'page' : undefined}
          className={`${cls} ${p === page ? 'border-primary bg-primary text-white' : 'border-slate-200 hover:border-primary hover:text-primary'}`}>{p}</Link>
      )))}
      {page < lastPage ? <Link prefetch={false} href={hrefFor(page + 1)} className={`${cls} border-slate-200 hover:border-primary hover:text-primary`}>Next</Link> : null}
    </nav>
  );
}

export function EmptyState({ icon = 'package', title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-slate-400 shadow-sm"><Icon name={icon} className="h-7 w-7" /></span>
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {text ? <p className="max-w-sm text-sm text-slate-500">{text}</p> : null}
      {action}
    </div>
  );
}
