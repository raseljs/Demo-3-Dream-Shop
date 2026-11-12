// Facebook Pixel helpers. Safe to call anywhere: does nothing when no pixel is set up.
export function track(event, data, eventId) {
  if (typeof window === 'undefined') return;
  if (!window.__fbPixelId) {
    // the pixel loads in the layout, which starts after the page itself — keep the event until it's ready
    (window.__pxq = window.__pxq || []).push([event, data, eventId]);
    if (window.__pxq.length > 20) window.__pxq.shift();
    return;
  }
  try {
    if (eventId) window.fbq('track', event, data, { eventID: eventId });
    else window.fbq('track', event, data);
  } catch { /* never break the shop because of tracking */ }
}

export const productData = (items) => ({
  currency: 'BDT',
  content_type: 'product',
  content_ids: items.map((i) => String(i.product_id ?? i.id)),
  contents: items.map((i) => ({ id: String(i.product_id ?? i.id), quantity: Number(i.qty || 1), item_price: Number(i.price || 0) })),
  value: items.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0),
});
