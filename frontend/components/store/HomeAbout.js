import Link from 'next/link';
import Image from 'next/image';
import Icon from '@/components/Icon';
import { imgUrl, taka } from '@/lib/format';

// "About" block on the home page. The picture side shows the shop's own products (a live shelf);
// if the admin uploads an About image in Settings → General, that photo is shown instead.
export default function HomeAbout({ settings: s, products = [], brands = [] }) {
  const tiles = products.filter((p) => p.thumbnail).slice(0, 5);
  const names = brands.map((b) => b.name);
  const facts = [
    names.length ? {
      icon: 'award',
      title: `${names.length} trusted brands`,
      text: `${names.slice(0, 4).join(', ')}${names.length > 4 ? ' and more' : ''}`,
    } : null,
    { icon: 'truck', title: 'Cash on delivery all over Bangladesh', text: 'Pay when your order reaches you.' },
    { icon: 'shield', title: 'Official brand warranty', text: 'Products come with their manufacturer warranty.' },
  ].filter(Boolean);

  return (
    <section data-reveal className="container-x py-10 md:py-16">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[34px] md:leading-[1.15]">
            {s.about_title || `About ${s.site_title || 'us'}`}
          </h2>
          <p className="mt-4 max-w-[60ch] whitespace-pre-line text-[15px] leading-7 text-slate-600">{s.about_text}</p>

          <ul className="mt-6 max-w-xl divide-y divide-slate-100 border-y border-slate-100">
            {facts.map((f) => (
              <li key={f.title} className="flex items-center gap-4 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-slate-900">{f.title}</span>
                  <span className="block truncate text-sm text-slate-500">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <Link prefetch={false} href="/about-us" className="btn btn-primary mt-7 px-6">More about us</Link>
        </div>

        {s.about_image ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-slate-100">
            <Image src={imgUrl(s.about_image)} alt={s.about_title || ''} fill sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" />
          </div>
        ) : tiles.length ? (
          <div className="grid aspect-[2/1] grid-cols-4 grid-rows-2 gap-2.5 md:gap-3">
            {tiles.map((p, i) => (
              <Link prefetch={false}
                key={p.id}
                href={`/product/${p.slug}`}
                className={`group relative overflow-hidden border border-slate-200 bg-white ${i === 0 ? 'col-span-2 row-span-2 rounded-[28px]' : 'rounded-2xl'}`}
              >
                <Image
                  src={imgUrl(p.thumbnail)}
                  alt={p.name}
                  fill
                  sizes={i === 0 ? '(max-width: 1024px) 50vw, 320px' : '(max-width: 1024px) 25vw, 160px'}
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                {i === 0 ? (
                  <span className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/90 px-3.5 py-2.5 shadow-sm backdrop-blur">
                    <span className="line-clamp-1 text-xs font-medium text-slate-700 md:text-sm">{p.name}</span>
                    <span className="block text-sm font-bold text-primary md:text-base">{taka(p.price)}</span>
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
