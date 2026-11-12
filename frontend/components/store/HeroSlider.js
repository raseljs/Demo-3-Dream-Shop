'use client';
import Link from 'next/link';
import { getImageProps } from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { preload } from 'react-dom';
import Icon from '@/components/Icon';
import { imgUrl } from '@/lib/format';

function Slide({ s, priority, mobileAspect, later }) {
  const cls = `block w-full object-cover ${mobileAspect ? 'aspect-[4/3] md:aspect-[20/7]' : 'aspect-[20/7]'}`;
  // banners that aren't on screen yet wait until the page has finished loading, so they don't slow the first one down
  if (later) return <div className={`${cls} bg-slate-100`} />;
  if (s.type === 'video') {
    return <video src={imgUrl(s.desktop_media)} autoPlay muted loop playsInline className={cls} />;
  }
  const common = { alt: s.title || 'Banner', sizes: '(max-width: 1280px) 100vw, 1280px' };
  const { props: { srcSet: desktop, ...rest } } = getImageProps({ ...common, src: imgUrl(s.desktop_media), width: 1600, height: 560, quality: 80, priority });
  const { props: { srcSet: mobile, src: mobileSrc } } = getImageProps({ ...common, src: imgUrl(s.mobile_media || s.desktop_media), width: 800, height: 600, quality: 75, priority });
  if (priority) {
    // The first banner is the biggest thing on screen (LCP): start downloading it with the HTML,
    // and only the one that fits the screen (phone or desktop).
    preload(mobileSrc, { as: 'image', imageSrcSet: mobile, imageSizes: common.sizes, media: '(max-width: 767px)', fetchPriority: 'high' });
    preload(rest.src, { as: 'image', imageSrcSet: desktop, imageSizes: common.sizes, media: '(min-width: 768px)', fetchPriority: 'high' });
  }
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={mobile} sizes={common.sizes} />
      <source media="(min-width: 768px)" srcSet={desktop} sizes={common.sizes} />
      {/* eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element */}
      <img {...rest} fetchPriority={priority ? 'high' : undefined} decoding={priority ? 'sync' : 'async'} className={cls} />
    </picture>
  );
}

export default function HeroSlider({ slides }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loadRest, setLoadRest] = useState(false);
  const touch = useRef(null);
  const n = slides.length;
  const mobileAspect = slides.every((s) => s.mobile_media);

  useEffect(() => {
    if (n < 2) return undefined;
    const go = () => setTimeout(() => setLoadRest(true), 1500);
    if (document.readyState === 'complete') { const t = go(); return () => clearTimeout(t); }
    let t;
    const onLoad = () => { t = go(); };
    window.addEventListener('load', onLoad, { once: true });
    return () => { window.removeEventListener('load', onLoad); clearTimeout(t); };
  }, [n]);

  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n, paused]);

  const go = (i) => setIndex((i + n) % n);

  return (
    <section className="mx-auto max-w-7xl md:mt-4 md:px-4" aria-roledescription="carousel">
      <div
        className="relative overflow-hidden bg-slate-100 md:rounded-2xl"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}
      >
        <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((s, i) => (
            <Link prefetch={false} key={s.id} href={s.link || '#'} className="w-full shrink-0" aria-hidden={i !== index} tabIndex={i === index ? 0 : -1}>
              <Slide s={s} priority={i === 0} mobileAspect={mobileAspect} later={i > 0 && !loadRest && i !== index} />
            </Link>
          ))}
        </div>
        {n > 1 ? (
          <>
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide"
              className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-800 shadow md:grid">
              <Icon name="chevron-left" />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next slide"
              className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-800 shadow md:grid">
              <Icon name="chevron-right" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((s, i) => (
                <button key={s.id} type="button" onClick={() => go(i)} aria-label={`Slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-primary' : 'w-2 bg-white/80'}`} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
