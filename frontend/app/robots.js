export default function robots() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/checkout', '/cart', '/dashboard', '/order-success'] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
