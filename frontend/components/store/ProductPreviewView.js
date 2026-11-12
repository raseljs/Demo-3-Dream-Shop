import { discountPct, taka } from '@/lib/format';

const Bar = ({ className }) => <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;

/** Product-page-shaped placeholder: shows the card's photo, name and price if we have them. */
export default function ProductPreviewView({ p }) {
  const off = p ? discountPct(p.regular, p.sale) : 0;
  return (
    <div className="container-x py-4 md:py-6" aria-busy="true">
      <Bar className="h-4 w-56" />
      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:gap-10">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {p?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt={p.name || ''} className="absolute inset-0 h-full w-full object-contain" />
          ) : <div className="absolute inset-0 animate-pulse bg-slate-100" />}
        </div>
        <div>
          {p?.name ? <h1 className="text-xl font-semibold leading-snug text-slate-900 md:text-2xl">{p.name}</h1> : <Bar className="h-7 w-3/4" />}
          <Bar className="mt-3 h-4 w-1/2" />
          <div className="mt-4 flex flex-wrap items-end gap-3">
            {p ? (
              <>
                <span className="text-3xl font-bold text-primary">{taka(p.price)}</span>
                {off > 0 ? <span className="pb-1 text-lg text-slate-400 line-through">{taka(p.regular)}</span> : null}
              </>
            ) : <Bar className="h-9 w-40" />}
          </div>
          <Bar className="mt-3 h-4 w-24" />
          <Bar className="mt-6 h-10 w-48" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Bar className="h-12" /><Bar className="h-12" /><Bar className="h-11" /><Bar className="h-11" />
          </div>
          <Bar className="mt-6 h-4 w-full" />
          <Bar className="mt-2 h-4 w-5/6" />
          <Bar className="mt-2 h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
