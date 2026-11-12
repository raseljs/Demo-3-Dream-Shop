import ShopView from '@/components/store/ShopView';

export const metadata = { title: 'Shop', description: 'Browse all products' };

export default async function ShopPage({ searchParams }) {
  return <ShopView searchParams={await searchParams} />;
}
