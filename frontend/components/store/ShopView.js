import Link from 'next/link';
import { getBrands, getLayout, getProducts } from '@/lib/api';
import { qs } from '@/lib/format';
import Icon from '@/components/Icon';
import { ProductGrid } from './ProductCard';
import { Breadcrumb, EmptyState, Pagination } from './Bits';
import SortControls from './SortControls';

const KEYS = ['q', 'brand', 'min', 'max', 'sort', 'per_page', 'category'];

function Filters({ base, query, categories, brands, activeCategory, fixedCategory }) {
  const href = (patch) => base + qs({ ...query, ...patch, page: undefined });
  const activeBrands = (query.brand || '').split(',').filter(Boolean);
  const toggleBrand = (slug) => {
    const next = activeBrands.includes(slug) ? activeBrands.filter((b) => b !== slug) : [...activeBrands, slug];
    return href({ brand: next.join(',') || undefined });
  };
  const catLink = (slug) => (fixedCategory ? `/category/${slug}${qs({ ...query, category: undefined, page: undefined })}` : href({ category: slug === activeCategory ? undefined : slug }));
  const Cat = ({ c, depth = 0 }) => (
    <li>
      <Link href={catLink(c.slug)} className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition hover:bg-slate-50 ${c.slug === activeCategory ? 'font-semibold text-primary' : 'text-slate-600'}`} style={{ paddingLeft: 8 + depth * 14 }}>
        {c.name}
      </Link>
      {c.children?.length ? <ul>{c.children.map((ch) => <Cat key={ch.id} c={ch} depth={depth + 1} />)}</ul> : null}
    </li>
  );
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-900">Category</h3>
        <ul className="max-h-80 overflow-y-auto">{categories.map((c) => <Cat key={c.id} c={c} />)}</ul>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-900">Price</h3>
        <form action={base} className="flex items-center gap-2">
          {Object.entries(query).filter(([k, v]) => v && !['min', 'max', 'page'].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <input name="min" type="number" min="0" defaultValue={query.min || ''} placeholder="Min" className="input input-sm" />
          <span className="text-slate-400">–</span>
          <input name="max" type="number" min="0" defaultValue={query.max || ''} placeholder="Max" className="input input-sm" />
          <button className="btn btn-sm btn-primary">Go</button>
        </form>
      </div>
      {brands?.length ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-900">Brand</h3>
          <ul className="space-y-1">
            {brands.map((b) => (
              <li key={b.id}>
                <Link href={toggleBrand(b.slug)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                  <span className={`grid h-4 w-4 place-items-center rounded border ${activeBrands.includes(b.slug) ? 'border-primary bg-primary text-white' : 'border-slate-300'}`}>
                    {activeBrands.includes(b.slug) ? <Icon name="check" className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link href={base} className="inline-block text-sm font-medium text-primary hover:underline">Clear all filters</Link>
    </div>
  );
}

export default async function ShopView({ searchParams, category = null }) {
  const query = {};
  for (const k of KEYS) if (searchParams[k]) query[k] = String(searchParams[k]);
  if (category) delete query.category;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const base = category ? `/category/${category.slug}` : '/shop';
  const activeCategory = category ? category.slug : query.category;

  const [data, brands, layout] = await Promise.all([
    getProducts({ ...query, category: activeCategory, page, per_page: query.per_page || 16 }),
    getBrands(),
    getLayout(),
  ]);
  const products = data?.data || [];
  const total = data?.total || 0;
  const perPage = data?.per_page || 16;
  const from = total ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(total, page * perPage);
  const title = category ? category.name : query.q ? `Search: “${query.q}”` : 'Shop';

  const filters = <Filters base={base} query={query} categories={layout.categories} brands={brands} activeCategory={activeCategory} fixedCategory={!!category} />;

  return (
    <div className="container-x py-4 md:py-6">
      <Breadcrumb items={[{ name: 'Home', href: '/' }, category ? { name: 'Shop', href: '/shop' } : null, ...(category?.breadcrumb?.slice(0, -1).map((b) => ({ name: b.name, href: `/category/${b.slug}` })) || []), { name: title }]} />
      <div className="mt-4 flex gap-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-36 rounded-2xl border border-slate-200 p-4">{filters}</div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h1>
              <p className="text-sm text-slate-500">{total ? `Showing ${from} to ${to} of ${total} results` : 'No results'}</p>
            </div>
            <SortControls base={base} query={query} />
          </div>
          {category?.children?.length ? (
            <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
              {category.children.map((c) => (
                <Link key={c.id} href={`/category/${c.slug}`} className="shrink-0 rounded-full border border-slate-200 px-4 py-1.5 text-sm hover:border-primary hover:text-primary">{c.name}</Link>
              ))}
            </div>
          ) : null}
          <details className="mb-4 rounded-2xl border border-slate-200 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold">
              <Icon name="filter" className="h-4 w-4" /> Filters
            </summary>
            <div className="border-t border-slate-200 p-4">{filters}</div>
          </details>
          {products.length ? (
            <ProductGrid products={products} priorityCount={4} />
          ) : (
            <EmptyState title="No products found" text="Try another category, a wider price range or a different search word." action={<Link href="/shop" className="btn btn-primary">View all products</Link>} />
          )}
          <Pagination page={page} lastPage={data?.last_page || 1} hrefFor={(p) => base + qs({ ...query, page: p > 1 ? p : undefined })} />
        </div>
      </div>
    </div>
  );
}
