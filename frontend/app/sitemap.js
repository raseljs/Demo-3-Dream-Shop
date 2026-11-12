import { getJSON } from '@/lib/api';

export const revalidate = 3600;

export default async function sitemap() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const data = (await getJSON('/sitemap', { tags: ['products', 'pages'], revalidate: 3600 })) || { products: [], categories: [], pages: [] };
  return [
    { url: `${site}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${site}/shop`, changeFrequency: 'daily', priority: 0.9 },
    ...data.categories.map((c) => ({ url: `${site}/category/${encodeURIComponent(c.slug)}`, changeFrequency: 'weekly', priority: 0.8 })),
    ...data.products.map((p) => ({ url: `${site}/product/${encodeURIComponent(p.slug)}`, lastModified: p.updated_at ? new Date(p.updated_at.replace(' ', 'T')) : undefined, priority: 0.7 })),
    ...data.pages.map((p) => ({ url: `${site}/${encodeURIComponent(p.slug)}`, priority: 0.3 })),
  ];
}
