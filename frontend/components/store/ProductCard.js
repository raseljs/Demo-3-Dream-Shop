import Link from 'next/link';
import Image from 'next/image';
import { discountPct, imgUrl, taka } from '@/lib/format';
import CardActions from './CardActions';

export default function ProductCard({ product: p, priority = false, index = 0 }) {
  const off = discountPct(p.regular_price, p.sale_price);
  return (
    <div data-product-card data-preview={JSON.stringify({ name: p.name, price: p.price, regular: p.regular_price, sale: p.sale_price })} data-reveal style={{ '--reveal-delay': `${(index % 5) * 70}ms` }} className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
      <Link prefetch={false} href={`/product/${p.slug}`} className="relative block aspect-square overflow-hidden bg-slate-50">
        <Image
          src={imgUrl(p.thumbnail)}
          alt={p.name}
          fill
          priority={priority}
          fetchPriority={priority ? 'high' : undefined}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
          className="object-contain p-1 transition duration-500 group-hover:scale-105"
        />
        {off > 0 ? (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">-{off}%</span>
        ) : null}
        {!p.in_stock ? (
          <span className="absolute right-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-medium text-white">Stock out</span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-2 text-center md:p-3">
        <Link prefetch={false} href={`/product/${p.slug}`}>
          <h3 className="line-clamp-2 min-h-10 text-[13px] font-medium leading-5 text-slate-900 transition group-hover:text-primary md:text-[15px]">
            {p.name}
          </h3>
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2">
          {off > 0 ? <span className="text-xs text-slate-400 line-through md:text-sm">{taka(p.regular_price)}</span> : null}
          <span className="text-base font-bold text-slate-900 md:text-xl">{taka(p.price)}</span>
        </div>
        <div className="mt-auto pt-3">
          <CardActions product={p} />
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({ products, priorityCount = 0 }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} priority={i < priorityCount} />)}
    </div>
  );
}
