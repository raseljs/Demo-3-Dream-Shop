import TrackOrder from '@/components/store/TrackOrder';

export const metadata = { title: 'Track Order' };

export default async function TrackOrderPage({ searchParams }) {
  const sp = await searchParams;
  return <TrackOrder initial={sp.q || ''} />;
}
