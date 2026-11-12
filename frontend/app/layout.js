import { Poppins, Hind_Siliguri } from 'next/font/google';
import './globals.css';
import { getLayout } from '@/lib/api';
import { imgUrl } from '@/lib/format';
import CartProvider from '@/components/store/CartProvider';
import CustomCode from '@/components/store/CustomCode';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap' });
// Bengali glyphs are a big download and only a few buttons use them, so they load when needed instead of being preloaded
const bangla = Hind_Siliguri({ subsets: ['bengali'], weight: ['400', '600'], variable: '--font-bangla', display: 'swap', preload: false });

export async function generateMetadata() {
  const { settings: s } = await getLayout();
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    metadataBase: site ? new URL(site) : undefined,
    title: { default: s.tagline ? `${s.site_title} | ${s.tagline}` : s.site_title, template: `%s | ${s.site_title}` },
    description: s.meta_description || s.tagline || undefined,
    icons: { icon: s.favicon ? imgUrl(s.favicon) : '/icon-default.png' },
    openGraph: { siteName: s.site_title, type: 'website', images: s.logo ? [imgUrl(s.logo)] : undefined },
  };
}

export async function generateViewport() {
  const { settings: s } = await getLayout();
  return { themeColor: s.header_color || '#0054CF', width: 'device-width', initialScale: 1 };
}

export default async function RootLayout({ children }) {
  const { settings } = await getLayout();
  const theme = { '--primary': settings.primary_color || '#FC6D04', '--brand': settings.header_color || '#0054CF' };
  return (
    <html lang="en" className={`${poppins.variable} ${bangla.variable}`} style={theme} suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions (ColorZilla, Grammarly…) add attributes to <body>/<html> before React loads */}
      <body className="font-sans" suppressHydrationWarning>
        <CartProvider>{children}</CartProvider>
        {settings.custom_code ? <CustomCode code={settings.custom_code} /> : null}
      </body>
    </html>
  );
}
