'use client';
import { useEffect } from 'react';

// Elements marked data-reveal fade and rise into place the first time they scroll into view.
// Nothing is hidden until this script runs (html gets data-reveal-on), so content is always
// visible without JavaScript, and elements added later (pagination, client navigation) are picked up too.
export default function RevealOnScroll() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* ignore */ }
    if (reduce) return undefined;

    const show = (el) => { el.dataset.revealed = '1'; io.unobserve(el); };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) show(e.target);
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    const scan = (root) => {
      const list = root.matches?.('[data-reveal]') ? [root] : [];
      root.querySelectorAll?.('[data-reveal]').forEach((el) => list.push(el));
      for (const el of list) {
        if (el.dataset.revealed) continue;
        const r = el.getBoundingClientRect();
        // Already on screen (or scrolled past) when it appears → leave it as it is. Only things further
        // down are hidden and rise in on scroll. Hiding content people can already see and fading it back
        // in looks like a flash, and it delays when the page counts as loaded (Lighthouse LCP/Speed Index).
        if (r.top < window.innerHeight) el.dataset.revealed = 'shown';
        else io.observe(el);
      }
    };

    scan(document.body);
    document.documentElement.dataset.revealOn = '1';
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => { if (n.nodeType === 1) scan(n); });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      delete document.documentElement.dataset.revealOn;
      document.querySelectorAll('[data-reveal]').forEach((el) => { el.dataset.revealed = 'shown'; });
    };
  }, []);
  return null;
}
