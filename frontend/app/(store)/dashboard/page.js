import CustomerDashboard from '@/components/store/CustomerDashboard';

export const metadata = { title: 'My Account', robots: { index: false } };

export default function DashboardPage() {
  return <CustomerDashboard />;
}
