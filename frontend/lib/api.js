// Server-side data fetching with Next.js caching (ISR + on-demand revalidation by tag).
// Pages render once, are cached, and refresh instantly when the admin changes something.
const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const DEV = process.env.NODE_ENV === 'development';

export async function getJSON(path, { tags = [], revalidate = 600 } = {}) {
  try {
    // In `npm run dev` always fetch fresh data so admin changes show immediately
    const res = await fetch(`${API_URL}/api${path}`, DEV ? { cache: 'no-store' } : { next: { revalidate, tags } });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('[api]', path, e.message);
    return null;
  }
}

const EMPTY_LAYOUT = { settings: { site_title: 'My Shop', shipping: {}, payment_methods: [] }, menus: {}, categories: [] };

export async function getLayout() {
  return (await getJSON('/layout', { tags: ['layout'] })) || EMPTY_LAYOUT;
}

export const getHome = () => getJSON('/home', { tags: ['home', 'products'] });
export const getProduct = (slug) => getJSON(`/products/${encodeURIComponent(slug)}`, { tags: ['products'] });
export const getCategory = (slug) => getJSON(`/categories/${encodeURIComponent(slug)}`, { tags: ['layout'] });
export const getBrands = () => getJSON('/brands', { tags: ['products'] });
export const getPage = (slug) => getJSON(`/pages/${encodeURIComponent(slug)}`, { tags: ['pages'] });
export const getCampaign = (slug) => getJSON(`/campaigns/${encodeURIComponent(slug)}`, { tags: ['campaigns', 'products'] });

export function getProducts(params = {}) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, v);
  return getJSON(`/products?${s}`, { tags: ['products'], revalidate: 300 });
}
