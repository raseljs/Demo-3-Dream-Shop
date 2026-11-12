import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getCampaign, getLayout } from '@/lib/api';
import { discountPct, imgUrl, taka, telLink } from '@/lib/format';
import { Logo } from '@/components/store/Header';
import LandingOrderForm from '@/components/store/LandingOrderForm';
import Icon from '@/components/Icon';

export const revalidate = 600;
export async function generateStaticParams() { return []; }

const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const c = await getCampaign(decode(slug));
  if (!c) return {};
  return { title: c.title, description: c.content?.subtitle || c.title, openGraph: c.image ? { images: [imgUrl(c.image)] } : undefined };
}

function VideoEmbed({ url }) {
  if (!url) return null;
  const yt = String(url).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/);
  const src = yt ? `https://www.youtube.com/embed/${yt[1]}` : /facebook\.com|fb\.watch/.test(url) ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false` : null;
  if (!src) return null;
  return (
    <div className="mt-6 aspect-video overflow-hidden rounded-2xl bg-black">
      <iframe src={src} title="Video" loading="lazy" allowFullScreen className="h-full w-full" />
    </div>
  );
}

export default async function CampaignPage({ params }) {
  const { slug } = await params;
  const [c, { settings }] = await Promise.all([getCampaign(decode(slug)), getLayout()]);
  if (!c) notFound();
  const ct = c.content || {};
  const colors = ct.colors || {};
  const p = c.product;
  const off = p ? discountPct(p.regular_price, p.sale_price) : 0;
  const style = { '--primary': colors.primary_color || settings.primary_color || '#FC6D04', '--lp-text': colors.primary_text || '#ffffff' };
  const cta = (
    <a href="#order" className="btn h-13 bg-primary px-8 text-lg text-[var(--lp-text)] shadow-lg hover:opacity-90">
      <Icon name="cart" /> {ct.order_now || 'অর্ডার করুন'}
    </a>
  );

  return (
    <div style={style} className="font-bn min-h-screen bg-slate-50">
      <header className="bg-brand text-white">
        <div className="container-x flex items-center justify-between py-3">
          <Link href="/"><Logo settings={settings} /></Link>
          {settings.phone ? <a href={telLink(settings.phone)} className="flex items-center gap-2 text-sm font-semibold"><Icon name="phone" className="h-4 w-4" /> {settings.phone}</a> : null}
        </div>
      </header>

      <section className="bg-white">
        <div className="container-x max-w-4xl py-8 text-center md:py-12">
          <h1 className="text-2xl font-extrabold leading-tight text-slate-900 md:text-4xl">{c.title}</h1>
          {ct.subtitle ? <p className="mt-3 text-lg text-slate-600">{ct.subtitle}</p> : null}
          {c.image ? (
            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl">
              <Image src={imgUrl(c.image)} alt={c.title} fill priority sizes="(max-width: 896px) 100vw, 896px" className="object-cover" />
            </div>
          ) : null}
          {p ? (
            <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary px-6 py-4">
              {off > 0 ? <p className="text-slate-500">{ct.regular_price || 'Regular price'}: <span className="text-lg line-through">{taka(p.regular_price)}</span></p> : null}
              <p className="text-slate-800">{ct.offer_price || 'Offer price'}: <span className="text-3xl font-extrabold text-primary">{taka(p.price)}</span></p>
            </div>
          ) : null}
          <div className="mt-6">{cta}</div>
        </div>
      </section>

      {(c.carousel?.length || ct.gallery?.heading) ? (
        <section className="container-x max-w-5xl py-10 text-center">
          {ct.gallery?.heading ? <h2 className="text-2xl font-bold">{ct.gallery.heading}</h2> : null}
          {ct.gallery?.text ? <p className="mx-auto mt-2 max-w-2xl whitespace-pre-line text-slate-600">{ct.gallery.text}</p> : null}
          <div className="no-scrollbar mt-6 flex snap-x gap-4 overflow-x-auto pb-2">
            {(c.carousel || []).map((src, i) => (
              <div key={i} className="relative aspect-square w-64 shrink-0 snap-center overflow-hidden rounded-2xl bg-white md:w-80">
                <Image src={imgUrl(src)} alt="" fill sizes="320px" className="object-cover" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {(ct.about?.heading || ct.about?.body || ct.about?.video_url) ? (
        <section className="bg-white">
          <div className="container-x max-w-4xl py-10">
            {ct.about?.heading ? <h2 className="text-center text-2xl font-bold">{ct.about.heading}</h2> : null}
            {ct.about?.body ? <p className="mt-4 whitespace-pre-line text-center text-slate-600">{ct.about.body}</p> : null}
            <VideoEmbed url={ct.about?.video_url} />
            <div className="mt-6 text-center">{cta}</div>
          </div>
        </section>
      ) : null}

      {c.reviews?.length ? (
        <section className="container-x max-w-5xl py-10">
          <h2 className="text-center text-2xl font-bold">{ct.review_section_heading || 'Customer Reviews'}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {c.reviews.map((r, i) => (
              <div key={i} className="card p-5">
                {r.image ? <div className="relative mb-3 aspect-video overflow-hidden rounded-xl"><Image src={imgUrl(r.image)} alt="" fill sizes="400px" className="object-cover" /></div> : null}
                <div className="flex text-amber-400">{[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star-fill" className="h-4 w-4" />)}</div>
                <p className="mt-2 text-slate-700">{r.text}</p>
                <p className="mt-3 text-sm font-semibold">— {r.name}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section id="order" className="bg-white py-10">
        <div className="container-x max-w-3xl">
          <h2 className="text-center text-2xl font-bold">{ct.order_form_heading || 'অর্ডার করতে নিচের ফর্মটি পূরণ করুন'}</h2>
          {p ? <LandingOrderForm product={p} campaignId={c.id} shipping={settings.shipping || {}} buttonLabel={ct.order_now || 'অর্ডার করুন'} /> : <p className="mt-4 text-center text-slate-500">No product linked to this campaign.</p>}
        </div>
      </section>

      <footer className="bg-slate-900 py-6 text-center text-sm text-slate-400">
        {settings.copyright || `© ${settings.site_title}`}
      </footer>
    </div>
  );
}
