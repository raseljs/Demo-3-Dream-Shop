'use client';
// Loads the Facebook Pixel (ID from Settings → Facebook Pixel & CAPI) and sends a PageView on every page change.
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { track } from '@/lib/pixel';

function loadPixel(id) {
  if (window.__fbPixelId === id) return;
  if (typeof window.fbq !== 'function') {
    const n = function fbq() { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; // eslint-disable-line prefer-rest-params
    window.fbq = n;
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
  }
  window.fbq('init', id);
  window.__fbPixelId = id;
}

function Tracker({ pixelId }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    loadPixel(pixelId);
    window.fbq('track', 'PageView');
    const queued = window.__pxq || [];
    window.__pxq = [];
    for (const [event, data, eventId] of queued) track(event, data, eventId);
  }, [pixelId, pathname, search]);
  return null;
}

export default function FacebookPixel({ pixelId }) {
  if (!pixelId) return null;
  return <Suspense fallback={null}><Tracker pixelId={pixelId} /></Suspense>;
}
