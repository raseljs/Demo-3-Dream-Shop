import Link from 'next/link';
import Image from 'next/image';
import { imgUrl, telLink } from '@/lib/format';
import Icon from '@/components/Icon';
import SearchBox from './SearchBox';
import { HeaderCart } from './HeaderClient';

export function Logo({ settings, className = 'h-9 md:h-10' }) {
  if (settings.logo) {
    return (
      <Image
        src={imgUrl(settings.logo)}
        alt={settings.site_title || 'Logo'}
        width={180}
        height={45}
        loading="eager"
        className={`${className} w-auto object-contain`}
      />
    );
  }
  return <span className="text-xl font-bold tracking-tight md:text-2xl">{settings.site_title}</span>;
}

export default function Header({ settings, menu }) {
  return (
    <header className="no-print sticky top-0 z-40 bg-brand text-white shadow-md">
      <div className="container-x flex items-center gap-3 py-2.5 md:gap-6 md:py-3">
        <Link href="/" className="shrink-0" aria-label="Home">
          <Logo settings={settings} />
        </Link>
        <div className="hidden flex-1 md:block md:max-w-2xl">
          <SearchBox />
        </div>
        <nav className="ml-auto flex items-center gap-3 md:gap-5">
          <Link href="/track-order" className="group hidden items-center gap-2 md:flex">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-primary transition group-hover:bg-primary">
              <Icon name="truck" className="h-4 w-4" />
            </span>
            <span className="hidden leading-tight xl:block">
              <span className="block text-sm font-semibold">Track Order</span>
              <span className="block text-xs opacity-80">Know your order status</span>
            </span>
          </Link>
          {settings.phone ? (
            <a href={telLink(settings.phone)} className="group hidden items-center gap-2 lg:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-primary transition group-hover:bg-primary">
                <Icon name="phone" className="h-4 w-4" />
              </span>
              <span className="hidden leading-tight xl:block">
                <span className="block text-xs opacity-80">Call us</span>
                <span className="block text-sm font-semibold">{settings.phone}</span>
              </span>
            </a>
          ) : null}
          <HeaderCart />
        </nav>
      </div>
      <div className="container-x pb-2.5 md:hidden">
        <SearchBox />
      </div>
      {menu.length ? <CategoryNav menu={menu} /> : null}
    </header>
  );
}

function CategoryNav({ menu }) {
  return (
    <nav className="hidden border-b border-slate-200 bg-white text-slate-700 md:block">
      <ul className="container-x flex items-center gap-1 text-sm font-medium">
        <li>
          <Link href="/shop" className="flex items-center gap-1.5 px-3 py-2.5 hover:text-primary">
            <Icon name="grid" className="h-4 w-4" /> All Products
          </Link>
        </li>
        {menu.map((item, i) => (
          <li key={i} className="group relative">
            <Link href={item.url || '#'} className="flex items-center gap-1 px-3 py-2.5 hover:text-primary">
              {item.label}
              {item.children?.length ? <Icon name="chevron-down" className="h-3.5 w-3.5" /> : null}
            </Link>
            {item.children?.length ? (
              <ul className="invisible absolute left-0 top-full z-50 min-w-52 rounded-xl border border-slate-200 bg-white py-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                {item.children.map((c, j) => (
                  <li key={j}>
                    <Link href={c.url || '#'} className="block px-4 py-2 hover:bg-slate-50 hover:text-primary">{c.label}</Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}
