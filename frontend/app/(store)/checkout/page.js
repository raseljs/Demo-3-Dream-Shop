import { getLayout } from '@/lib/api';
import CheckoutClient from '@/components/store/CheckoutClient';

export const metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage({ searchParams }) {
  const sp = await searchParams;
  const { settings } = await getLayout();
  const buy = sp.buy ? { product_id: Number(sp.buy), variant_id: sp.variant ? Number(sp.variant) : null, qty: Math.max(1, Number(sp.qty) || 1) } : null;
  return <CheckoutClient settings={settings} buy={buy} />;
}
