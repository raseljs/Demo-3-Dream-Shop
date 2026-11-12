import Icon from '@/components/Icon';
import { STATUS, telLink, waLink } from '@/lib/format';

// Same steps (and names) the customer will see on the tracking result page.
const STEPS = [['pending', 'package'], ['confirmed', 'check'], ['on_the_way', 'truck'], ['delivered', 'home']];

export default function HomeTrack({ settings: s }) {
  const contacts = [
    s.phone ? { href: telLink(s.phone), icon: 'phone', label: 'Call us', value: s.phone, tone: 'bg-primary/10 text-primary' } : null,
    s.whatsapp ? { href: waLink(s.whatsapp, 'Hi, I need help with my order'), icon: 'whatsapp', label: 'WhatsApp', value: s.whatsapp, tone: 'bg-emerald-100 text-emerald-600', external: true } : null,
    s.email ? { href: `mailto:${s.email}`, icon: 'mail', label: 'Email', value: s.email, tone: 'bg-blue-100 text-brand' } : null,
  ].filter(Boolean);

  return (
    <section data-reveal className="container-x pb-8 md:pb-12">
      <div className="relative overflow-hidden rounded-[32px] bg-brand text-white">
        {/* a delivery route drawn faintly across the panel */}
        <svg aria-hidden="true" className="pointer-events-none absolute -right-10 -top-6 h-[130%] w-[70%] text-white/10" viewBox="0 0 600 400" fill="none">
          <path d="M20 380 C 140 300, 120 180, 260 170 S 420 260, 470 150 S 560 40, 600 20" stroke="currentColor" strokeWidth="3" strokeDasharray="10 12" strokeLinecap="round" />
          <circle cx="260" cy="170" r="9" fill="currentColor" />
          <circle cx="470" cy="150" r="9" fill="currentColor" />
        </svg>

        <div className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-[32px] md:leading-tight">Track your order</h2>
            <p className="mt-2 max-w-[52ch] text-sm leading-6 text-white/80 md:text-[15px]">
              Enter your order number, or the phone number you ordered with, to see where your parcel is.
            </p>

            <form action="/track-order" className="mt-6 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-1.5 shadow-xl shadow-black/15 focus-within:ring-4 focus-within:ring-white/30">
              <Icon name="search" className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
              <label htmlFor="home-track" className="sr-only">Order number or phone</label>
              <input id="home-track" name="q" required placeholder="Order number or phone" className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
              <button className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Track</button>
            </form>

            <ol className="mt-8 grid max-w-xl grid-cols-4" aria-label="How an order moves">
              {STEPS.map(([key, icon], i) => (
                <li key={key} className="relative flex flex-col items-center text-center">
                  {i < STEPS.length - 1 ? (
                    <span aria-hidden="true" className="absolute left-1/2 top-5 w-full border-t-2 border-dashed border-white/35" />
                  ) : null}
                  <span className={`relative grid h-10 w-10 place-items-center rounded-full ${i === STEPS.length - 1 ? 'bg-white text-brand' : 'bg-black/20 text-white ring-1 ring-white/30'}`}>
                    <Icon name={icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="mt-2 text-[11px] font-medium text-white/85 md:text-xs">{STATUS[key].label}</span>
                </li>
              ))}
            </ol>
          </div>

          {contacts.length || s.address ? (
            <div className="self-center rounded-3xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-sm md:p-6">
              <h3 className="text-lg font-semibold">Need help with an order?</h3>
              <p className="mt-1 text-sm text-white/75">Our team can check it for you.</p>
              <div className="mt-4 space-y-2">
                {contacts.map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-slate-800 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${c.tone}`}><Icon name={c.icon} className="h-[18px] w-[18px]" /></span>
                    <span className="min-w-0">
                      <span className="block text-xs text-slate-500">{c.label}</span>
                      <span className="block truncate text-sm font-semibold">{c.value}</span>
                    </span>
                  </a>
                ))}
              </div>
              {s.address ? (
                <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-white/80">
                  <Icon name="map-pin" className="mt-1 h-4 w-4 shrink-0" />{s.address}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
