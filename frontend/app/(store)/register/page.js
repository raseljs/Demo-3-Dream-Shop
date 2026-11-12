import { getLayout } from '@/lib/api';
import AuthForm from '@/components/store/AuthForm';

export const metadata = { title: 'Create account', robots: { index: false } };

export default async function RegisterPage({ searchParams }) {
  const sp = await searchParams;
  const { settings } = await getLayout();
  return <AuthForm mode="register" next={sp.next || ''} otp={!!settings.otp_verification} />;
}
