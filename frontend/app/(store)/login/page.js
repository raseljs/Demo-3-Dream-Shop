import { getLayout } from '@/lib/api';
import AuthForm from '@/components/store/AuthForm';

export const metadata = { title: 'Login', robots: { index: false } };

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const { settings } = await getLayout();
  return <AuthForm mode="login" next={sp.next || ''} otp={!!settings.otp_verification} />;
}
