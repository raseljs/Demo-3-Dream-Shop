import OrderSuccess from '@/components/store/OrderSuccess';

export const metadata = { title: 'Order placed', robots: { index: false } };

export default async function OrderSuccessPage({ params, searchParams }) {
  const { orderNo } = await params;
  const sp = await searchParams;
  return <OrderSuccess orderNo={decodeURIComponent(orderNo)} accessKey={sp.key || ''} paid={sp.paid === '1'} paymentFailed={sp.payment === 'failed'} />;
}
