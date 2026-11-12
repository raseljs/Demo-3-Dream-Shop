import { getLayout } from '@/lib/api';
import { waLink } from '@/lib/format';
import Header from '@/components/store/Header';
import Footer from '@/components/store/Footer';
import MobileNav from '@/components/store/MobileNav';
import CartDrawer from '@/components/store/CartDrawer';
import RevealOnScroll from '@/components/store/RevealOnScroll';
import ProductPreviewCapture from '@/components/store/ProductPreviewCapture';
import FacebookPixel from '@/components/store/FacebookPixel';
import Preloader from '@/components/store/Preloader';
import Icon from '@/components/Icon';

export default async function StoreLayout({ children }) {
  const { settings, menus, categories } = await getLayout();
  const menu = menus.header?.length ? menus.header : categories.map((c) => ({
    label: c.name, url: `/category/${c.slug}`, children: c.children.map((ch) => ({ label: ch.name, url: `/category/${ch.slug}` })),
  }));
  return (
    <>
      <Preloader settings={settings} />
      <Header settings={settings} menu={menu} />
      <main className="min-h-[60vh] pb-20 md:pb-0">{children}</main>
      <Footer settings={settings} menus={menus} />
      <MobileNav menu={menu} />
      <CartDrawer />
      <RevealOnScroll />
      <ProductPreviewCapture />
      <FacebookPixel pixelId={settings.fb_pixel_id} />
      {settings.whatsapp ? (
        <a
          href={waLink(settings.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="no-print fixed bottom-24 right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 md:bottom-6"
        >
          <Icon name="whatsapp" className="h-7 w-7" />
        </a>
      ) : null}
    </>
  );
}
