import Link from 'next/link';
import Icon from '@/components/Icon';
import { telLink, waLink } from '@/lib/format';
import { Logo } from './Header';

// Developer credit: opens a WhatsApp chat with DreamSpaceIT with this message already typed
const DEVELOPER_WHATSAPP = waLink(
  '8801317768213',
  'আপনাদের তৈরি করা ওয়েবসাইটটি দেখলাম, খুব ভালো লেগেছে। আমি ওয়েবসাইট তৈরি করা বিষয়ে কথা বলতে চাই।',
);

export default function Footer({ settings: s, menus }) {
  const socials = [
    ['facebook', s.fb_link],
    ['youtube', s.yt_link],
    ['instagram', s.insta_link],
    ['twitter', s.x_link],
  ].filter(([, url]) => url);
  const columns = [
    ['Know Us', menus.footer_1 || []],
    ['Shopping Information', menus.footer_2 || []],
  ];
  return (
    <footer className="no-print mt-12 bg-slate-900 pb-16 text-slate-300 md:pb-0">
      <div className="container-x grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Link prefetch={false} href="/" className="inline-block text-white"><Logo settings={s} /></Link>
          {s.tagline ? <p className="mt-3 max-w-md text-sm text-slate-400">{s.tagline}</p> : null}
          <ul className="mt-4 space-y-2 text-sm">
            {s.address ? <li className="flex gap-2"><Icon name="map-pin" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{s.address}</li> : null}
            {s.phone ? <li className="flex gap-2"><Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><a href={telLink(s.phone)} className="hover:text-white">{s.phone}</a></li> : null}
            {s.email ? <li className="flex gap-2"><Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><a href={`mailto:${s.email}`} className="hover:text-white">{s.email}</a></li> : null}
          </ul>
          {socials.length ? (
            <div className="mt-4 flex gap-2">
              {socials.map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={name}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition hover:bg-primary hover:text-white">
                  <Icon name={name} className="h-4 w-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
        {columns.map(([title, items]) => (
          <div key={title}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">{title}</h3>
            <ul className="space-y-2 text-sm">
              {items.map((it, i) => (
                <li key={i}><Link prefetch={false} href={it.url || '#'} className="transition hover:text-primary">{it.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-4 text-xs text-slate-400 sm:flex-row">
          <p>{s.copyright || `© ${new Date().getFullYear()} ${s.site_title}. All rights reserved.`}</p>
          <p className="flex items-center gap-2"><Icon name="shield" className="h-4 w-4" /> Cash on Delivery · Secure Checkout</p>
          <p>
            Developed by{' '}
            <a
              href={DEVELOPER_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              title="Chat with DreamSpaceIT on WhatsApp"
              className="font-semibold text-white underline-offset-4 transition hover:text-primary hover:underline"
            >
              DreamSpaceIT
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
