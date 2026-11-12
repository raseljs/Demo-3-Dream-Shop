import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLayout, getProduct } from '@/lib/api';
import { imgUrl, stripHtml, taka } from '@/lib/format';
import { Breadcrumb, SectionTitle, Stars } from '@/components/store/Bits';
import { ProductGrid } from '@/components/store/ProductCard';
import ProductGallery from '@/components/store/ProductGallery';
import ProductActions from '@/components/store/ProductActions';
import ProductTabs from '@/components/store/ProductTabs';
import ShareButtons from '@/components/store/ShareButtons';
import Icon from '@/components/Icon';

export const revalidate = 600;
export async function generateStaticParams() { return []; } // build on first visit, then cached

const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProduct(decode(slug));
  if (!p) return { title: 'Product not found' };
  return {
    title: p.meta_title || p.name,
    description: p.meta_description || stripHtml(p.short_des || p.long_des) || p.name,
    openGraph: { title: p.name, images: p.thumbnail ? [imgUrl(p.thumbnail)] : undefined, type: 'website' },
    alternates: { canonical: `/product/${p.slug}` },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const [p, { settings }] = await Promise.all([getProduct(decode(slug)), getLayout()]);
  if (!p) notFound();

  const images = [...new Set([p.thumbnail, ...(p.images || [])].filter(Boolean))];
  const cat = p.categories?.[p.categories.length - 1] || p.categories?.[0];
  const ship = settings.shipping || {};
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    image: images.map(imgUrl),
    sku: p.sku || undefined,
    description: stripHtml(p.short_des || p.long_des, 300),
    brand: p.brand ? { '@type': 'Brand', name: p.brand.name } : undefined,
    offers: { '@type': 'Offer', priceCurrency: 'BDT', price: p.price, availability: p.qty > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    aggregateRating: p.reviews?.length ? { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews.length } : undefined,
  };

  return (
    <div className="container-x py-4 md:py-6">
      <Breadcrumb items={[{ name: 'Home', href: '/' }, cat ? { name: cat.name, href: `/category/${cat.slug}` } : null, { name: p.name }]} />

      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:gap-10">
        <ProductGallery images={images} name={p.name} />
        <div>
          <h1 className="text-xl font-semibold leading-snug text-slate-900 md:text-2xl">{p.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            {p.sku ? <span>SKU: <b className="font-medium text-slate-700">{p.sku}</b></span> : null}
            {p.brand ? <span>Brand: <Link href={`/shop?brand=${p.brand.slug}`} className="font-medium text-primary">{p.brand.name}</Link></span> : null}
            <span className="flex items-center gap-1.5"><Stars rating={p.rating} /> <span>{Number(p.rating).toFixed(1)} ({p.reviews.length} reviews)</span></span>
          </div>

          <ProductActions
            product={{
              id: p.id, name: p.name, slug: p.slug, type: p.type, thumbnail: p.thumbnail, qty: p.qty,
              regular_price: p.regular_price, sale_price: p.sale_price, price: p.price,
              attributes: p.attributes, variants: p.variants, size_chart: p.size_chart, flash: p.flash || null,
            }}
            contact={{ phone: settings.phone, whatsapp: settings.whatsapp }}
          />

          {p.short_des ? <div className="prose-content mt-5 border-t border-slate-100 pt-4" dangerouslySetInnerHTML={{ __html: p.short_des }} /> : null}

          <div className="mt-5 grid gap-2 rounded-2xl border border-slate-200 p-4 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Icon name="truck" className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-slate-800">{ship.inside_label || 'Inside Dhaka'}: {p.free_shipping ? 'Free' : taka(p.shipping_inside > 0 ? p.shipping_inside : ship.shipping_inside_dhaka)}</p>
                <p className="text-xs text-slate-500">{ship.inside_time}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="truck" className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-slate-800">{ship.outside_label || 'Outside Dhaka'}: {p.free_shipping ? 'Free' : taka(p.shipping_outside > 0 ? p.shipping_outside : ship.shipping_outside_dhaka)}</p>
                <p className="text-xs text-slate-500">{ship.outside_time}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:col-span-2"><Icon name="shield" className="h-5 w-5 text-primary" /><span>Cash on delivery available · 100% original product</span></div>
          </div>

          <ShareButtons name={p.name} />
        </div>
      </div>

      <ProductTabs description={p.long_des} video={p.video} reviews={p.reviews} productId={p.id} rating={p.rating} />

      {p.related?.length ? (
        <section className="mt-10">
          <SectionTitle title="You might also like" href={cat ? `/category/${cat.slug}` : '/shop'} />
          <ProductGrid products={p.related} />
        </section>
      ) : null}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </div>
  );
}
