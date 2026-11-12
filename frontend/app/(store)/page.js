import Link from 'next/link';
import Image from 'next/image';
import { getBrands, getHome, getLayout } from '@/lib/api';
import { imgUrl } from '@/lib/format';
import HeroSlider from '@/components/store/HeroSlider';
import { ProductGrid } from '@/components/store/ProductCard';
import { SectionTitle, TrustBar, EmptyState } from '@/components/store/Bits';
import HomeAbout from '@/components/store/HomeAbout';
import HomeTrack from '@/components/store/HomeTrack';
import { FlashSaleBand } from '@/components/store/FlashCountdown';

export const revalidate = 600;

export default async function HomePage() {
  const [home, { settings: s }, brands] = await Promise.all([getHome(), getLayout(), getBrands()]);
  if (!home) {
    return (
      <div className="container-x py-16">
        <EmptyState title="Shop is getting ready" text="We could not load products right now. Please refresh in a moment." />
      </div>
    );
  }
  const sections = home.sections.length ? home.sections : home.latest.length ? [{ category: { name: 'New Arrivals', slug: null }, products: home.latest }] : [];
  // one product from each home section (TV, fan, fridge…) shows the range of the shop in the About block
  const shelf = [...new Map([...sections.map((sec) => sec.products[0]), ...home.latest].filter(Boolean).map((p) => [p.id, p])).values()];
  // brands with the most products on the home page are named first
  const names = [...sections.flatMap((sec) => sec.products), ...home.latest].map((p) => p.name.toLowerCase());
  const rankedBrands = (brands || [])
    .map((b) => ({ ...b, n: names.filter((n) => n.startsWith(b.name.toLowerCase())).length }))
    .sort((a, b) => b.n - a.n);

  return (
    <>
      {home.sliders.length ? <HeroSlider slides={home.sliders} /> : null}

      {home.banners.length ? (
        <section data-reveal className="container-x mt-3 grid grid-cols-2 gap-2 md:mt-4 md:gap-4">
          {home.banners.map((b) => (
            <Link prefetch={false} key={b.id} href={b.link || '#'} className="relative block aspect-[5/2] overflow-hidden rounded-xl bg-slate-100 md:rounded-2xl">
              <Image src={imgUrl(b.desktop_media)} alt={b.title || 'Offer'} fill sizes="(max-width: 768px) 50vw, 640px" className="object-cover transition duration-500 hover:scale-105" />
            </Link>
          ))}
        </section>
      ) : null}

      <TrustBar />

      {home.flash?.products?.length ? (
        <FlashSaleBand title={home.flash.title} endsAt={home.flash.ends_at}>
          <ProductGrid products={home.flash.products} />
        </FlashSaleBand>
      ) : null}

      {home.featured_categories.length ? (
        <section data-reveal className="container-x mb-8">
          <SectionTitle eyebrow="Explore" title="Featured Categories" href="/shop" linkLabel="See More" />
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {home.featured_categories.map((c) => (
              <Link prefetch={false} key={c.id} href={`/category/${c.slug}`} className="group flex flex-col items-center gap-2 rounded-xl p-1.5 text-center transition hover:bg-slate-50 md:p-2">
                <span className="relative block aspect-square w-full max-w-24 overflow-hidden rounded-full border border-slate-200 bg-white transition group-hover:border-primary">
                  <Image src={imgUrl(c.image)} alt={c.name} fill sizes="96px" className="object-cover" />
                </span>
                <span className="line-clamp-2 text-[11px] font-medium leading-tight text-slate-700 group-hover:text-primary md:text-sm">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {sections.map((sec, i) => (
        <section key={sec.category.slug || i} className="container-x py-4">
          <SectionTitle
            reveal
            title={sec.category.name}
            subtitle={sec.category.description}
            href={sec.category.slug ? `/category/${sec.category.slug}` : '/shop'}
          />
          <ProductGrid products={sec.products} priorityCount={i === 0 && !home.sliders.length ? 4 : 0} />
        </section>
      ))}

      {s.about_text ? <HomeAbout settings={s} products={shelf} brands={rankedBrands} /> : null}

      <HomeTrack settings={s} />
    </>
  );
}
