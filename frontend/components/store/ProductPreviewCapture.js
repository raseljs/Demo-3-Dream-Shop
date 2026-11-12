'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { savePreview } from '@/lib/productPreview';
import ProductPreviewView from './ProductPreviewView';

// Makes opening a product feel instant: the moment a product card is clicked, the product page
// layout appears with the card's photo, name and price (already in the browser), and stays until the
// real page has taken over. The same data is kept for product/[slug]/loading.js.
export default function ProductPreviewCapture() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(null); // { data, top }

  // Links don't prefetch just because they are on screen (that downloaded a dozen pages during page load,
  // slowing it down on mobile data). Instead a page starts loading the moment a finger touches its link
  // or the mouse moves over it — still well before the click finishes.
  useEffect(() => {
    const done = new Set();
    const warm = (e) => {
      const a = e.target.closest?.('a[href^="/"]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('/api') || href.startsWith('/uploads') || href.startsWith('/admin') || done.has(href)) return;
      done.add(href);
      try { router.prefetch(href); } catch { /* ignore */ }
    };
    document.addEventListener('pointerover', warm, { passive: true });
    document.addEventListener('touchstart', warm, { passive: true, capture: true });
    document.addEventListener('focusin', warm);
    return () => {
      document.removeEventListener('pointerover', warm);
      document.removeEventListener('touchstart', warm, { capture: true });
      document.removeEventListener('focusin', warm);
    };
  }, [router]);

  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest?.('a[href*="/product/"]');
      const card = a?.closest('[data-product-card]');
      if (!card) return;
      let data;
      try { data = JSON.parse(card.dataset.preview || '{}'); } catch { return; }
      const img = card.querySelector('img');
      data.image = img?.currentSrc || img?.src || null;
      const url = new URL(a.href, window.location.href);
      const slug = url.pathname.split('/product/')[1];
      if (!slug) return;
      savePreview(slug, data);

      const newTab = e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank';
      if (newTab || url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      const header = document.querySelector('header');
      const top = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      setPending({ data, top });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // the new page (or its loading screen, which looks the same) is on screen → hand over
  useEffect(() => { setPending(null); }, [pathname]);

  // never leave the preview up if the navigation was cancelled
  useEffect(() => {
    if (!pending) return undefined;
    const t = setTimeout(() => setPending(null), 10000);
    return () => clearTimeout(t);
  }, [pending]);

  if (!pending) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[35] overflow-hidden bg-white" style={{ top: pending.top }}>
      <ProductPreviewView p={pending.data} />
    </div>
  );
}
