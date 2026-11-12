import { notFound } from 'next/navigation';
import { getCategory } from '@/lib/api';
import { imgUrl, stripHtml } from '@/lib/format';
import ShopView from '@/components/store/ShopView';

const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cat = await getCategory(decode(slug));
  if (!cat) return {};
  return {
    title: cat.name,
    description: stripHtml(cat.description) || `Buy ${cat.name} online at the best price.`,
    openGraph: cat.image ? { images: [imgUrl(cat.image)] } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const cat = await getCategory(decode(slug));
  if (!cat) notFound();
  return <ShopView searchParams={await searchParams} category={cat} />;
}
