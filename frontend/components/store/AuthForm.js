'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { api, saveAuth } from '@/lib/client';

export default function AuthForm({ mode: initialMode, next, otp }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode); // login | register | reset
  const [f, setF] = useState({ name: '', login: '', phone: '', email: '', password: '', confirm: '', otp: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [show, setShow] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const done = (r) => {
    saveAuth(r.token, r.user);
    const dest = next && next.startsWith('/') ? next : r.user.is_staff ? '/admin' : '/dashboard';
    router.replace(dest);
    router.refresh();
  };

  const sendOtp = async () => {
    setMsg(null);
    try {
      const r = await api('/auth/send-otp', { method: 'POST', body: { phone: f.phone }, auth: false });
      setOtpSent(true);
      setMsg({ ok: true, text: r.message });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if ((mode === 'register' || mode === 'reset') && f.password !== f.confirm) return setMsg({ ok: false, text: 'Passwords do not match.' });
    setBusy(true);
    try {
      if (mode === 'login') done(await api('/auth/login', { method: 'POST', body: { login: f.login, password: f.password }, auth: false }));
      else if (mode === 'register') done(await api('/auth/register', { method: 'POST', body: { name: f.name, phone: f.phone, email: f.email, password: f.password, otp: f.otp }, auth: false }));
      else {
        const r = await api('/auth/reset-password', { method: 'POST', body: { phone: f.phone, otp: f.otp, password: f.password }, auth: false });
        setMsg({ ok: true, text: r.message });
        setMode('login');
        setF((x) => ({ ...x, login: x.phone, password: '' }));
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const title = { login: 'Welcome back', register: 'Create your account', reset: 'Reset password' }[mode];
  const pwd = (key, label) => (
    <div>
      <label className="label" htmlFor={key}>{label}</label>
      <div className="relative">
        <input id={key} type={show ? 'text' : 'password'} className="input pr-11" value={f[key]} onChange={set(key)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Show password"><Icon name="eye" className="h-4 w-4" /></button>
      </div>
    </div>
  );

  return (
    <div className="container-x py-10">
      <div className="card mx-auto max-w-md p-6 md:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Icon name="user" /></span>
          <h1 className="mt-3 text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{mode === 'login' ? 'Log in with your phone number or email' : mode === 'register' ? 'It only takes a minute' : 'We will send a code to your phone'}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' ? (
            <div><label className="label" htmlFor="name">Full Name</label><input id="name" className="input" value={f.name} onChange={set('name')} required autoComplete="name" /></div>
          ) : null}
          {mode === 'login' ? (
            <div><label className="label" htmlFor="login">Phone or Email</label><input id="login" className="input" value={f.login} onChange={set('login')} placeholder="01XXXXXXXXX" required autoComplete="username" /></div>
          ) : (
            <div>
              <label className="label" htmlFor="phone">Phone Number</label>
              <div className="flex gap-2">
                <input id="phone" className="input" value={f.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" inputMode="tel" required autoComplete="tel" />
                {otp || mode === 'reset' ? <button type="button" onClick={sendOtp} className="btn btn-dark shrink-0">{otpSent ? 'Resend' : 'Send OTP'}</button> : null}
              </div>
            </div>
          )}
          {(otp && mode === 'register') || mode === 'reset' ? (
            <div><label className="label" htmlFor="otp">OTP Code</label><input id="otp" className="input tracking-[0.4em]" value={f.otp} onChange={set('otp')} inputMode="numeric" maxLength={6} required /></div>
          ) : null}
          {mode === 'register' ? (
            <div><label className="label" htmlFor="email">Email (optional)</label><input id="email" type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" /></div>
          ) : null}
          {pwd('password', mode === 'reset' ? 'New Password' : 'Password')}
          {mode !== 'login' ? pwd('confirm', 'Confirm Password') : null}

          {msg ? <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{msg.text}</p> : null}
          <button className="btn btn-primary h-12 w-full text-base" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log In' : mode === 'register' ? 'Register' : 'Update Password'}
          </button>
        </form>
        <div className="mt-6 space-y-2 text-center text-sm text-slate-600">
          {mode === 'login' ? (
            <>
              <p>New here? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-primary">Create an account</Link></p>
              {otp ? <button type="button" onClick={() => { setMode('reset'); setMsg(null); }} className="text-slate-500 hover:text-primary">Forgot password?</button> : null}
            </>
          ) : (
            <p>Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} onClick={() => setMode('login')} className="font-semibold text-primary">Log in</Link></p>
          )}
        </div>
      </div>
    </div>
  );
}
